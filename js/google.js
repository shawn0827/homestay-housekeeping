/* ================================================================
   google.js — Google 帳號身分與 Drive 備份

   安全原則：
   - 帳號姓名、Email、頭像會保存在 IndexedDB，重新開啟後仍顯示登入。
   - Google Drive access token 不永久寫入瀏覽器；需要呼叫 Drive 時再續接授權。
   - 登出會清除本機帳號資料、停用自動選取，並撤銷目前 token。
   ================================================================ */
'use strict';

const GOOGLE_SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file';

let googleAccessToken = '';
let googleTokenExpiresAt = 0;
let googleTokenClient = null;
let googleIdentityInitialized = false;

/** 是否有可用的 Drive access token。 */
function googleConnected() {
  return Boolean(googleAccessToken && Date.now() < googleTokenExpiresAt);
}

/** 是否已在本機記住 Google 帳號身分。 */
function googleAccountRemembered() {
  return Boolean(state.settings.account?.connected && state.settings.account?.email);
}

/** 等候 Google Identity Services 腳本完成載入。 */
async function waitForGoogleLibrary(timeout = 6000) {
  const started = Date.now();
  while (!window.google?.accounts && Date.now() - started < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return Boolean(window.google?.accounts);
}

/** 解析 Google ID token 的公開基本資料；只用於介面身分顯示。 */
function decodeGoogleCredential(credential) {
  try {
    const payload = credential.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const decoded = decodeURIComponent(
      atob(payload)
        .split('')
        .map(character => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    return JSON.parse(decoded);
  } catch (error) {
    console.warn('無法解析 Google credential', error);
    return null;
  }
}

/** 保存 Google 帳號基本資料。 */
async function rememberGoogleAccount(profile = {}) {
  state.settings.account = {
    connected: true,
    name: profile.name || state.settings.account?.name || '',
    email: profile.email || state.settings.account?.email || '',
    picture: profile.picture || state.settings.account?.picture || '',
    connectedAt: state.settings.account?.connectedAt || new Date().toISOString()
  };
  await saveState();
  updateHeader();
}

/** Google One Tap 回傳身分後更新本機帳號。 */
async function handleGoogleIdentityCredential(response) {
  const profile = decodeGoogleCredential(response.credential);
  if (!profile) return;
  await rememberGoogleAccount(profile);
  if (currentRoute.name === 'settings' && currentRoute.params.page === 'account') {
    renderAccountSettings();
  }
}

/**
 * 啟用 Google 自動登入。
 * 已連接過帳號時，重新開啟 App 會嘗試由 Google 自動確認身分。
 */
async function initializePersistentGoogleAccount() {
  const clientId = state.settings.google.clientId;
  if (!clientId || !googleAccountRemembered()) return;
  if (!(await waitForGoogleLibrary())) return;
  if (!window.google?.accounts?.id || googleIdentityInitialized) return;

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleIdentityCredential,
    auto_select: true,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true
  });

  googleIdentityInitialized = true;
  google.accounts.id.prompt();
}

/** 取得 Drive 授權並保存帳號資料。 */
async function connectGoogle({ prompt = 'consent' } = {}) {
  const clientId = state.settings.google.clientId;
  if (!clientId) {
    showToast('請先在 Google Drive 設定輸入 Client ID');
    return false;
  }

  if (!(await waitForGoogleLibrary()) || !window.google?.accounts?.oauth2) {
    showToast('Google 元件尚未載入');
    return false;
  }

  try {
    await new Promise((resolve, reject) => {
      googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: async response => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }

          googleAccessToken = response.access_token;
          googleTokenExpiresAt = Date.now() + (Number(response.expires_in || 3600) - 60) * 1000;

          try {
            const profile = await googleFetch('https://www.googleapis.com/oauth2/v3/userinfo');
            await rememberGoogleAccount(profile);
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });

      googleTokenClient.requestAccessToken({ prompt });
    });

    googleIdentityInitialized = false;
    initializePersistentGoogleAccount().catch(console.warn);
    renderRoute();
    return true;
  } catch (error) {
    showToast(error.message);
    return false;
  }
}

/**
 * 登出 Google 帳號。
 * 清除本機身分、停用自動選取，並撤銷目前 access token。
 */
async function disconnectGoogle() {
  const confirmed = await confirmAction('登出 Google 帳號', '確定要登出並斷開 Google 連接嗎？');
  if (!confirmed) return;

  if (googleAccessToken && window.google?.accounts?.oauth2) {
    google.accounts.oauth2.revoke(googleAccessToken, () => {});
  }

  if (window.google?.accounts?.id) {
    google.accounts.id.disableAutoSelect();
  }

  googleAccessToken = '';
  googleTokenExpiresAt = 0;
  googleTokenClient = null;
  googleIdentityInitialized = false;

  state.settings.account = {
    connected: false,
    name: '',
    email: '',
    picture: '',
    connectedAt: ''
  };

  await saveState();
  updateHeader();
  renderRoute();
  showToast('Google 帳號已登出');
}

/** 帶著目前 access token 呼叫 Google API。 */
async function googleFetch(url, options = {}) {
  if (!googleConnected()) {
    throw new Error('Google Drive 授權已過期，請重新授權');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${googleAccessToken}`);

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message || `Google API 錯誤 ${response.status}`);
  }

  const type = response.headers.get('content-type') || '';
  return type.includes('json') ? response.json() : response;
}

/** 建立或找到 Google Drive 備份資料夾。 */
async function ensureGoogleFolder() {
  const config = state.settings.google;
  if (config.folderId) return config.folderId;

  const escapedName = config.folderName.replaceAll("'", "\\'");
  const query = encodeURIComponent(
    `name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );

  const data = await googleFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`
  );

  if (data.files?.[0]) {
    config.folderId = data.files[0].id;
  } else {
    const folder = await googleFetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: config.folderName,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    config.folderId = folder.id;
  }

  await saveState();
  return config.folderId;
}

/** 將完整系統 JSON 備份同步到 Google Drive。 */
async function syncGoogleDrive({ silent = false } = {}) {
  try {
    if (!googleConnected()) {
      const connected = await connectGoogle({ prompt: googleAccountRemembered() ? '' : 'consent' });
      if (!connected || !googleConnected()) return;
    }

    const folderId = await ensureGoogleFolder();
    const payload = JSON.stringify({
      app: '民宿營運管理系統',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data: state
    }, null, 2);

    const name = '民宿營運_系統還原備份.json';
    const query = encodeURIComponent(
      `name='${name}' and '${folderId}' in parents and trashed=false`
    );

    const found = await googleFetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)&spaces=drive`
    );

    const boundary = `homestay_${Date.now()}`;
    const metadata = found.files?.[0] ? {} : { name, parents: [folderId] };
    const body = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify(metadata),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      payload,
      `--${boundary}--`
    ].join('\r\n');

    const fileId = found.files?.[0]?.id;
    const uploadUrl = fileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

    await googleFetch(uploadUrl, {
      method: fileId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body
    });

    if (!silent) showToast('Google Drive 同步完成');
  } catch (error) {
    showToast(error.message);
  }
}
