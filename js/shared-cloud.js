/* ================================================================
   shared-cloud.js — 多使用者登入、共用資料與主帳號 Drive 備份

   架構：
   - 每位使用者以自己的 Google 帳號登入。
   - 後端驗證 Google ID token，回傳 30 天 App Session。
   - 所有使用者讀寫同一份後端資料。
   - Excel / JSON 永遠由後端使用主帳號授權寫入主帳 Drive。
   - 前端永遠接觸不到主帳號 refresh token 或 Client Secret。
   ================================================================ */
'use strict';

let sharedSaveTimer = null;
let sharedApplyingRemoteState = false;
let sharedSyncInProgress = false;

/** 取得多人共用設定。 */
function sharedConfig() {
  state.settings.shared ||= {
    backendUrl: '',
    googleClientId: '',
    sessionToken: '',
    revision: 0,
    role: '',
    lastServerSyncAt: '',
    lastBackupAt: '',
    lastBackupFiles: { excel: null, json: null }
  };
  return state.settings.shared;
}

/** 標準化後端網址。 */
function normalizedBackendUrl() {
  return String(sharedConfig().backendUrl || '').trim().replace(/\/+$/, '');
}

/** 是否已有可用的 App Session。 */
function googleConnected() {
  return Boolean(sharedConfig().sessionToken && state.settings.account?.connected);
}

/** 是否已記住登入者身分。 */
function googleAccountRemembered() {
  return Boolean(state.settings.account?.connected && state.settings.account?.email);
}

/** 建立後端 API 請求。 */
async function sharedApi(path, options = {}) {
  const baseUrl = normalizedBackendUrl();
  if (!baseUrl) throw new Error('請先設定共用後端網址');

  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (sharedConfig().sessionToken) {
    headers.set('Authorization', `Bearer ${sharedConfig().sessionToken}`);
  }

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });

  if (response.status === 401) {
    sharedConfig().sessionToken = '';
    sharedConfig().role = '';
    await saveState({ skipShared: true });
    updateHeader();
  }

  const type = response.headers.get('content-type') || '';
  const body = type.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  if (!response.ok) {
    const error = new Error(body?.error || body?.message || `伺服器錯誤 ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

/** 等候 Google Identity Services 載入。 */
async function waitForGoogleLibrary(timeout = 8000) {
  const started = Date.now();
  while (!window.google?.accounts?.id && Date.now() - started < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return Boolean(window.google?.accounts?.id);
}

/** 後端登入成功後保存 Session 與使用者資料。 */
async function rememberSharedSession(result) {
  const config = sharedConfig();
  config.sessionToken = result.sessionToken;
  config.role = result.user.role;
  config.revision = Number(result.revision || config.revision || 0);

  state.settings.account = {
    connected: true,
    name: result.user.name || '',
    email: result.user.email || '',
    picture: result.user.picture || '',
    connectedAt: state.settings.account?.connectedAt || new Date().toISOString()
  };

  await saveState({ skipShared: true });
  updateHeader();
}

/** 將 Google ID credential 交給後端驗證並登入。 */
async function authenticateWithBackend(credential) {
  const result = await sharedApi('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential })
  });

  await rememberSharedSession(result);
  await loadSharedStateFromServer({ seedWhenEmpty: true });
  renderRoute();
  showToast(`已登入：${result.user.name || result.user.email}`);
  return true;
}

/** 顯示 Google 登入視窗。 */
async function connectGoogle() {
  const config = sharedConfig();

  if (!config.backendUrl) {
    showToast('請先輸入共用後端網址');
    return false;
  }

  if (!config.googleClientId) {
    showToast('請先輸入 Google OAuth Client ID');
    return false;
  }

  if (!(await waitForGoogleLibrary())) {
    showToast('Google 登入元件尚未載入');
    return false;
  }

  const dialog = $('#formDialog');
  const body = $('#formDialogBody');
  body.className = 'dialog-card';
  body.innerHTML = `
    <h2>使用 Google 帳號登入</h2>
    <p class="muted">
      主帳與副帳都使用自己的 Google 帳號登入；所有紀錄由後端集中保存。
    </p>
    <div id="sharedGoogleButton" class="google-signin-container"></div>
    <div class="dialog-actions">
      <button type="button" class="secondary-button" data-close>取消</button>
    </div>
  `;

  $('[data-close]', body).onclick = () => dialog.close();

  google.accounts.id.initialize({
    client_id: config.googleClientId,
    callback: async response => {
      try {
        await authenticateWithBackend(response.credential);
        dialog.close();
      } catch (error) {
        showToast(error.message);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    use_fedcm_for_prompt: true
  });

  google.accounts.id.renderButton($('#sharedGoogleButton'), {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    width: 280
  });

  dialog.showModal();
  return true;
}

/** 重新開啟 App 時，以已保存的 App Session 恢復登入。 */
async function restoreGoogleDriveSession() {
  if (!sharedConfig().sessionToken) return false;

  try {
    const result = await sharedApi('/api/me');
    sharedConfig().role = result.user.role;
    state.settings.account = {
      connected: true,
      name: result.user.name || '',
      email: result.user.email || '',
      picture: result.user.picture || '',
      connectedAt: state.settings.account?.connectedAt || new Date().toISOString()
    };
    await saveState({ skipShared: true });
    updateHeader();
    return true;
  } catch (error) {
    if (error.status !== 401) console.warn('Session 恢復失敗', error);
    return false;
  }
}

/** 保留舊函式名稱，啟動時由 App 呼叫。 */
async function initializePersistentGoogleAccount() {
  return restoreGoogleDriveSession();
}

/** 登出目前的 App 帳號。 */
async function disconnectGoogle() {
  const confirmed = await confirmAction(
    '登出帳號',
    '確定要登出目前的 Google 帳號嗎？本機未同步資料仍會保留。'
  );
  if (!confirmed) return;

  try {
    if (sharedConfig().sessionToken) {
      await sharedApi('/api/auth/logout', { method: 'POST' }).catch(() => {});
    }
  } finally {
    sharedConfig().sessionToken = '';
    sharedConfig().role = '';
    state.settings.account = {
      connected: false,
      name: '',
      email: '',
      picture: '',
      connectedAt: ''
    };

    if (window.google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }

    await saveState({ skipShared: true });
    updateHeader();
    renderRoute();
    showToast('帳號已登出');
  }
}

/** 從後端取得所有使用者共用的最新資料。 */
async function loadSharedStateFromServer({ seedWhenEmpty = false } = {}) {
  if (!googleConnected()) return false;

  try {
    const result = await sharedApi('/api/state');

    if (result.empty) {
      if (seedWhenEmpty && ['admin', 'editor'].includes(sharedConfig().role)) {
        await saveSharedStateNow({ initial: true });
        return true;
      }
      return false;
    }

    const localOnly = {
      backendUrl: sharedConfig().backendUrl,
      googleClientId: sharedConfig().googleClientId,
      sessionToken: sharedConfig().sessionToken,
      role: sharedConfig().role
    };

    sharedApplyingRemoteState = true;
    state = result.state;
    migrateState();
    state.settings.shared = {
      ...state.settings.shared,
      ...localOnly,
      revision: Number(result.revision || 0),
      lastServerSyncAt: result.updatedAt || ''
    };
    await saveState({ skipShared: true });
    sharedApplyingRemoteState = false;
    return true;
  } catch (error) {
    sharedApplyingRemoteState = false;
    showToast(`讀取共用資料失敗：${error.message}`);
    return false;
  }
}

/** 排程將本機變更同步到共用後端。 */
function queueSharedStateSave() {
  if (sharedApplyingRemoteState || !googleConnected()) return;
  if (!['admin', 'editor'].includes(sharedConfig().role)) return;

  clearTimeout(sharedSaveTimer);
  sharedSaveTimer = setTimeout(() => {
    saveSharedStateNow().catch(error => {
      console.error(error);
      showToast(error.message);
    });
  }, 700);
}

/** 立即把完整狀態寫入共用後端。 */
async function saveSharedStateNow({ initial = false } = {}) {
  if (!googleConnected()) return false;
  if (!['admin', 'editor'].includes(sharedConfig().role)) return false;
  if (sharedSyncInProgress) return false;

  sharedSyncInProgress = true;
  try {
    const config = sharedConfig();
    const result = await sharedApi('/api/state', {
      method: 'PUT',
      body: JSON.stringify({
        revision: initial ? 0 : Number(config.revision || 0),
        state: sanitizeStateForServer(state)
      })
    });

    config.revision = Number(result.revision || config.revision || 0);
    config.lastServerSyncAt = result.updatedAt || new Date().toISOString();
    await saveState({ skipShared: true });
    return true;
  } catch (error) {
    if (error.status === 409) {
      throw new Error('資料已由其他使用者更新，請重新整理取得最新資料後再修改');
    }
    throw error;
  } finally {
    sharedSyncInProgress = false;
  }
}

/** 移除只應保存在本機的 Session 欄位。 */
function sanitizeStateForServer(input) {
  const copy = structuredClone(input);
  copy.settings.shared ||= {};
  copy.settings.shared.sessionToken = '';
  copy.settings.shared.backendUrl = '';
  copy.settings.shared.googleClientId = '';
  copy.settings.account ||= {};
  return copy;
}

/** ArrayBuffer 轉 Base64，供後端建立 Excel。 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

/** 由後端使用主帳號權限建立 Excel 與 JSON。 */
async function syncGoogleDrive({ silent = false } = {}) {
  try {
    if (!googleConnected()) {
      if (!silent) showToast('請先登入帳號');
      return false;
    }

    if (!['admin', 'editor'].includes(sharedConfig().role)) {
      throw new Error('此帳號只有檢視權限，不能建立備份');
    }

    await saveSharedStateNow();

    const excelBuffer = XLSX.write(createWorkbook(), {
      bookType: 'xlsx',
      type: 'array',
      compression: true
    });

    const result = await sharedApi('/api/backup', {
      method: 'POST',
      body: JSON.stringify({
        state: sanitizeStateForServer(state),
        excelBase64: arrayBufferToBase64(excelBuffer)
      })
    });

    sharedConfig().lastBackupAt = result.backedUpAt;
    sharedConfig().lastBackupFiles = result.files;
    await saveState({ skipShared: true });

    if (!silent) showToast('主帳 Google Drive 已完成 Excel＋JSON 備份');
    return true;
  } catch (error) {
    if (!silent) showToast(`備份失敗：${error.message}`);
    return false;
  }
}

/** 從主帳號 Drive 的 JSON 還原所有共用資料。 */
async function restoreGoogleDriveBackup() {
  try {
    if (!googleConnected()) {
      showToast('請先登入帳號');
      return;
    }

    if (sharedConfig().role !== 'admin') {
      throw new Error('只有管理員可以從雲端還原');
    }

    const confirmed = await confirmAction(
      '從主帳 Google Drive 還原',
      '還原會覆蓋所有使用者目前共用的資料，確定繼續嗎？'
    );
    if (!confirmed) return;

    const result = await sharedApi('/api/backup/restore', { method: 'POST' });
    const localConfig = {
      backendUrl: sharedConfig().backendUrl,
      googleClientId: sharedConfig().googleClientId,
      sessionToken: sharedConfig().sessionToken,
      role: sharedConfig().role
    };

    state = result.state;
    migrateState();
    state.settings.shared = {
      ...state.settings.shared,
      ...localConfig,
      revision: result.revision
    };
    await saveState({ skipShared: true });
    renderRoute();
    showToast('已從主帳 Google Drive 還原');
  } catch (error) {
    showToast(error.message);
  }
}

/** 手機下拉重新整理時，同時更新共用資料。 */
async function refreshSharedData() {
  if (googleConnected()) {
    await loadSharedStateFromServer();
  }
}
