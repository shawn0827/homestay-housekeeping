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
let googleSessionRestorePromise = null;
let googleSilentReconnectAttempted = false;

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
  if (
    currentRoute.name === 'settings'
    && ['profile', 'basic', 'account', 'google'].includes(currentRoute.params.page)
  ) {
    renderProfileSettings();
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

/**
 * 取得 Google Drive access token。
 *
 * prompt:
 * - 'consent'：第一次連接或需要使用者重新同意。
 * - ''：背景嘗試無提示續接。
 *
 * silent:
 * - true 時不顯示錯誤訊息，也不強制重新渲染頁面。
 */
async function connectGoogle({
  prompt = 'consent',
  silent = false,
  refreshView = true
} = {}) {
  const clientId = state.settings.google.clientId;

  if (!clientId) {
    if (!silent) {
      showToast('請先在「民宿基本資料與帳號」輸入 Client ID');
    }
    return false;
  }

  if (googleConnected()) return true;

  if (!(await waitForGoogleLibrary()) || !window.google?.accounts?.oauth2) {
    if (!silent) showToast('Google 元件尚未載入');
    return false;
  }

  try {
    await new Promise((resolve, reject) => {
      googleTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: GOOGLE_SCOPES,
        callback: async response => {
          if (response.error) {
            reject(new Error(
              response.error_description
              || response.error
              || 'Google 授權未完成'
            ));
            return;
          }

          googleAccessToken = response.access_token;
          googleTokenExpiresAt =
            Date.now() + (Number(response.expires_in || 3600) - 60) * 1000;

          try {
            const profile = await googleFetch(
              'https://www.googleapis.com/oauth2/v3/userinfo'
            );
            await rememberGoogleAccount(profile);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        error_callback: error => {
          reject(new Error(
            error?.message
            || error?.type
            || 'Google 授權視窗無法完成'
          ));
        }
      });

      googleTokenClient.requestAccessToken({ prompt });
    });

    googleIdentityInitialized = false;
    initializePersistentGoogleAccount().catch(console.warn);

    if (refreshView) {
      renderRoute();
    } else {
      updateHeader();
    }

    return true;
  } catch (error) {
    // 無提示續接失敗屬正常情況，留待使用者真正同步時再互動授權。
    if (!silent) showToast(error.message);
    return false;
  }
}

/**
 * App 啟動或重新整理後，背景嘗試恢復 Google Drive 工作階段。
 *
 * 帳號姓名、Email 與頭像由 IndexedDB 立即恢復；
 * Drive access token 則使用 prompt:'' 嘗試重新取得。
 * Safari 或 Google 若要求使用者互動，這裡會安靜失敗，
 * 不會跳出錯誤或登入視窗。
 */
async function restoreGoogleDriveSession() {
  if (googleConnected()) return true;
  if (!googleAccountRemembered()) return false;
  if (!state.settings.google.clientId) return false;

  if (googleSessionRestorePromise) {
    return googleSessionRestorePromise;
  }

  // 同一次頁面生命週期只自動嘗試一次，避免重複請求。
  if (googleSilentReconnectAttempted) return false;
  googleSilentReconnectAttempted = true;

  googleSessionRestorePromise = connectGoogle({
    prompt: '',
    silent: true,
    refreshView: false
  }).finally(() => {
    googleSessionRestorePromise = null;
  });

  return googleSessionRestorePromise;
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
  googleSessionRestorePromise = null;
  googleSilentReconnectAttempted = false;

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

/**
 * 尋找指定備份資料夾中的同名檔案。
 */
async function findGoogleDriveFile(folderId, name) {
  const escapedName = name.replaceAll("'", "\\'");
  const query = encodeURIComponent(
    `name='${escapedName}' and '${folderId}' in parents and trashed=false`
  );

  const result = await googleFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}` +
    '&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&spaces=drive'
  );

  return result.files?.[0] || null;
}

/**
 * 建立 Google Drive 檔案的 metadata。
 * 檔案內容會在下一步以 uploadType=media 上傳。
 */
async function createGoogleDriveFileMetadata(folderId, name, mimeType) {
  return googleFetch(
    'https://www.googleapis.com/drive/v3/files' +
    '?fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        parents: [folderId],
        mimeType
      })
    }
  );
}

/**
 * 建立或更新 Google Drive 中的檔案。
 * 回傳 Google Drive 實際檔案 metadata，供同步後驗證。
 */
async function upsertGoogleDriveFile(folderId, name, blob, mimeType) {
  let file = await findGoogleDriveFile(folderId, name);

  if (!file) {
    file = await createGoogleDriveFileMetadata(folderId, name, mimeType);
  }

  await googleFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${file.id}` +
    '?uploadType=media&fields=id,name,mimeType,size,modifiedTime,webViewLink',
    {
      method: 'PATCH',
      headers: { 'Content-Type': mimeType },
      body: blob
    }
  );

  // 上傳後重新讀取 metadata，確認檔名、格式與檔案大小。
  const verified = await googleFetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}` +
    '?fields=id,name,mimeType,size,modifiedTime,webViewLink'
  );

  if (verified.name !== name) {
    throw new Error(`雲端檔名驗證失敗：${name}`);
  }

  if (verified.mimeType !== mimeType) {
    throw new Error(`雲端檔案格式驗證失敗：${name}`);
  }

  if (Number(verified.size || 0) <= 0) {
    throw new Error(`雲端檔案內容為空：${name}`);
  }

  return verified;
}

/**
 * 從 Google Drive 下載 JSON 完整還原備份。
 */
async function downloadGoogleJsonBackup() {
  const folderId = await ensureGoogleFolder();
  const name = '民宿營運_系統還原備份.json';
  const file = await findGoogleDriveFile(folderId, name);

  if (!file) {
    throw new Error('Google Drive 中找不到系統還原備份');
  }

  const response = await googleFetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`
  );

  return response.json();
}

/**
 * 從 Google Drive 還原完整系統 JSON。
 */
async function restoreGoogleDriveBackup() {
  try {
    if (!googleConnected() && googleAccountRemembered()) {
      await restoreGoogleDriveSession();
    }

    if (!googleConnected()) {
      const connected = await connectGoogle({
        prompt: 'consent',
        silent: false,
        refreshView: false
      });
      if (!connected || !googleConnected()) return;
    }

    const confirmed = await confirmAction(
      '從 Google Drive 還原',
      '還原會覆蓋目前裝置內的資料，確定繼續嗎？'
    );
    if (!confirmed) return;

    const payload = await downloadGoogleJsonBackup();
    const incoming = payload.data || payload;

    if (
      !incoming.settings
      || !Array.isArray(incoming.bookings)
      || !incoming.housekeepingRecords
      || !Array.isArray(incoming.inventory)
    ) {
      throw new Error('Google Drive 備份格式不完整');
    }

    state = incoming;
    migrateState();
    await saveState();

    showToast('Google Drive 備份已還原');
    navigate('home');
  } catch (error) {
    showToast(error.message);
  }
}

/**
 * 同步完整系統備份到 Google Drive。
 *
 * 每次同步一定包含：
 * 1. 民宿營運_完整紀錄.xlsx（人工查看、篩選、列印）
 * 2. 民宿營運_系統還原備份.json（完整系統還原）
 *
 * 上傳後會重新查詢 metadata，確認兩個檔案都存在且不是空檔。
 */
async function syncGoogleDrive({ silent = false } = {}) {
  try {
    if (!googleConnected() && googleAccountRemembered()) {
      await restoreGoogleDriveSession();
    }

    if (!googleConnected()) {
      const connected = await connectGoogle({
        prompt: 'consent',
        silent: false,
        refreshView: false
      });
      if (!connected || !googleConnected()) return false;
    }

    if (!window.XLSX) {
      throw new Error('Excel 元件尚未載入，無法建立雲端 Excel');
    }

    const folderId = await ensureGoogleFolder();

    const excelName = '民宿營運_完整紀錄.xlsx';
    const jsonName = '民宿營運_系統還原備份.json';

    const excelFile = await upsertGoogleDriveFile(
      folderId,
      excelName,
      createWorkbookBlob(),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    const jsonFile = await upsertGoogleDriveFile(
      folderId,
      jsonName,
      createJsonBackupBlob(),
      'application/json'
    );

    state.settings.google.lastSyncAt = new Date().toISOString();
    state.settings.google.lastSyncFiles = {
      excel: {
        id: excelFile.id,
        name: excelFile.name,
        mimeType: excelFile.mimeType,
        size: Number(excelFile.size || 0),
        modifiedTime: excelFile.modifiedTime || '',
        webViewLink: excelFile.webViewLink || ''
      },
      json: {
        id: jsonFile.id,
        name: jsonFile.name,
        mimeType: jsonFile.mimeType,
        size: Number(jsonFile.size || 0),
        modifiedTime: jsonFile.modifiedTime || '',
        webViewLink: jsonFile.webViewLink || ''
      }
    };

    await saveState();

    if (!silent) {
      showToast('Google Drive 已完成 Excel 與 JSON 雙重備份');
    }

    return true;
  } catch (error) {
    showToast(`Google Drive 備份失敗：${error.message}`);
    return false;
  }
}
