/* ================================================================
   settings.js — 民宿基本資料、帳號、Google Drive、SOP 與系統設定
   ================================================================ */
'use strict';

/** 顯示設定首頁或指定的設定子頁。 */
function renderSettings(params = {}) {
  const page = params.page;

  // 相容舊版網址：basic、account、google 都導向新的整合頁。
  if (['profile', 'basic', 'account', 'google'].includes(page)) {
    return renderProfileSettings();
  }

  if (page === 'areas') return renderAreaSettings(params);

  $('#app').innerHTML = `
    <section class="page">
      ${pageHeader({
        eyebrow: 'SETTINGS',
        title: '系統設定',
        subtitle: `Version ${APP_VERSION}`
      })}

      <div class="settings-menu">
        ${settingsRow(
          './icons/settings-basic.svg',
          '民宿基本資料與帳號',
          '民宿資料、Google 帳號與 Drive 同步',
          'profile'
        )}
        ${settingsRow(
          './icons/settings-areas.svg',
          '房務區域與 SOP',
          '房間、分類與工作項目',
          'areas'
        )}
        ${settingsRow(
          './icons/settings-maintenance.svg',
          '維修管理',
          '設備異常與進度',
          'route:maintenance'
        )}
        ${settingsRow(
          './icons/settings-finance.svg',
          '收支管理',
          '收入、訂金、退款與支出',
          'route:finance'
        )}
        ${settingsRow(
          './icons/settings-reports.svg',
          '報表與備份',
          'Excel、JSON 與還原',
          'route:reports'
        )}
      </div>
    </section>
  `;

  $$('[data-settings-page]').forEach(button => {
    button.onclick = () => {
      const target = button.dataset.settingsPage;

      if (target.startsWith('route:')) {
        navigate(target.split(':')[1]);
        return;
      }

      navigate('settings', { page: target });
    };
  });
}

/** 建立設定首頁的一列選單。 */
function settingsRow(icon, title, subtitle, page) {
  const iconMarkup = icon.endsWith('.svg')
    ? `<img src="${escapeHtml(icon)}" alt="">`
    : `<span class="settings-emoji">${escapeHtml(icon)}</span>`;

  return `
    <button class="settings-row" data-settings-page="${escapeHtml(page)}">
      <span class="icon">${iconMarkup}</span>
      <span class="copy">
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(subtitle)}</small>
      </span>
      <span class="chevron">›</span>
    </button>
  `;
}

/** 設定子頁共用的返回按鈕。 */
function settingsBack() {
  return '<button class="back-button" data-settings-back>← 返回設定</button>';
}

/** 綁定返回設定按鈕。 */
function bindSettingsBack() {
  const button = $('[data-settings-back]');
  if (button) button.onclick = () => navigate('settings');
}

/**
 * 民宿基本資料、Google 帳號與 Google Drive 的整合頁。
 * 舊版的 basic、account、google 頁面都會導向這裡。
 */
function renderProfileSettings() {
  const account = state.settings.account;
  const config = sharedConfig();
  const signedIn = googleConnected();
  const roleLabels = { admin: '管理員', editor: '可編輯', viewer: '僅檢視' };

  $('#app').innerHTML = `
    <section class="page page-profile-settings">
      ${settingsBack()}
      ${pageHeader({
        eyebrow: 'PROPERTY & SHARED ACCOUNT',
        title: '民宿基本資料與帳號',
        subtitle: '多人使用同一份資料，備份固定存到主帳 Google Drive'
      })}

      <div class="settings-stack">
        <section class="card settings-section">
          <h2>民宿基本資料</h2>
          <div class="form-grid">
            <label class="field">
              民宿名稱
              <input id="propertyNameInput" value="${escapeHtml(state.settings.propertyName)}">
            </label>
            <label class="field">
              本機顯示名稱
              <input id="userNameInput" value="${escapeHtml(state.settings.userName)}">
            </label>
          </div>
        </section>

        <section class="card settings-section">
          <h2>共用後端設定</h2>
          <p class="muted settings-section-description">
            主帳與副帳都填相同的後端網址和 Google Client ID。
          </p>
          <div class="form-grid">
            <label class="field wide">
              Cloudflare Worker 後端網址
              <input
                id="sharedBackendUrl"
                value="${escapeHtml(config.backendUrl || '')}"
                placeholder="https://homestay-api.你的帳號.workers.dev"
                autocomplete="url"
              >
            </label>
            <label class="field wide">
              Google OAuth Client ID
              <input
                id="sharedGoogleClientId"
                value="${escapeHtml(config.googleClientId || '')}"
                placeholder="xxxx.apps.googleusercontent.com"
                autocomplete="off"
              >
            </label>
          </div>
          <button class="primary-button section" data-save-shared-settings>儲存連線設定</button>
        </section>

        <section class="card settings-section">
          <h2>登入帳號</h2>
          <div class="account-profile">
            <div class="account-profile-avatar">
              ${account.picture
                ? `<img src="${escapeHtml(account.picture)}" alt="Google 帳號頭像">`
                : '<img class="account-default-icon" src="./icons/account.svg" alt="">'}
            </div>
            <div class="account-profile-copy">
              <div class="list-title">${escapeHtml(account.name || state.settings.userName)}</div>
              <div class="list-meta">${escapeHtml(account.email || '尚未登入')}</div>
            </div>
          </div>

          <div class="account-status-grid section">
            <div>
              <span>登入狀態</span>
              <strong>${signedIn ? '已登入' : '未登入'}</strong>
            </div>
            <div>
              <span>權限</span>
              <strong>${escapeHtml(roleLabels[config.role] || '—')}</strong>
            </div>
            <div>
              <span>共用資料版本</span>
              <strong>${Number(config.revision || 0)}</strong>
            </div>
            <div>
              <span>最後資料同步</span>
              <strong>${config.lastServerSyncAt
                ? new Date(config.lastServerSyncAt).toLocaleString('zh-TW')
                : '尚未同步'}</strong>
            </div>
          </div>

          <div class="button-row section">
            <button class="primary-button" data-connect-google>
              ${signedIn ? '切換／重新登入帳號' : '使用 Google 帳號登入'}
            </button>
            ${signedIn
              ? '<button class="danger-button" data-disconnect-google>登出</button>'
              : ''}
          </div>
        </section>

        <section class="card settings-section">
          <h2>主帳 Google Drive 備份</h2>
          <p class="muted settings-section-description">
            不論哪個副帳操作，Excel 與 JSON 都由後端固定寫入主帳 Drive。
          </p>

          <div class="cloud-backup-summary section">
            <div class="cloud-backup-item">
              <span>Excel 紀錄</span>
              <strong>${config.lastBackupFiles?.excel?.size
                ? `${Math.ceil(config.lastBackupFiles.excel.size / 1024)} KB`
                : '尚未備份'}</strong>
            </div>
            <div class="cloud-backup-item">
              <span>JSON 還原檔</span>
              <strong>${config.lastBackupFiles?.json?.size
                ? `${Math.ceil(config.lastBackupFiles.json.size / 1024)} KB`
                : '尚未備份'}</strong>
            </div>
            <div class="cloud-backup-item">
              <span>最後備份</span>
              <strong>${config.lastBackupAt
                ? new Date(config.lastBackupAt).toLocaleString('zh-TW')
                : '尚未備份'}</strong>
            </div>
          </div>

          <div class="button-row section">
            <button class="secondary-button" data-refresh-shared>取得共用最新資料</button>
            <button class="primary-button" data-sync-google>備份 Excel＋JSON 到主帳</button>
            ${config.role === 'admin'
              ? '<button class="secondary-button" data-restore-google>從主帳 Drive 還原</button>'
              : ''}
          </div>
        </section>
      </div>
    </section>
  `;

  bindSettingsBack();

  $('[data-save-shared-settings]').onclick = saveSharedSettings;
  $('[data-connect-google]').onclick = async () => {
    const saved = await saveSharedSettings({ notify: false });
    if (saved) await connectGoogle();
  };

  const logout = $('[data-disconnect-google]');
  if (logout) logout.onclick = disconnectGoogle;

  $('[data-refresh-shared]').onclick = async () => {
    const loaded = await loadSharedStateFromServer();
    if (loaded) {
      renderProfileSettings();
      showToast('已取得共用最新資料');
    }
  };

  $('[data-sync-google]').onclick = async () => {
    const ok = await syncGoogleDrive();
    if (ok) renderProfileSettings();
  };

  const restore = $('[data-restore-google]');
  if (restore) restore.onclick = restoreGoogleDriveBackup;
}

/** 儲存本機的共用後端設定。 */
async function saveSharedSettings({ notify = true } = {}) {
  state.settings.propertyName =
    $('#propertyNameInput').value.trim() || '我的民宿';
  state.settings.userName =
    $('#userNameInput').value.trim() || '民宿主人';

  const config = sharedConfig();
  const nextBackendUrl = $('#sharedBackendUrl').value.trim().replace(/\/+$/, '');
  const nextClientId = $('#sharedGoogleClientId').value.trim();

  if (
    (config.backendUrl && config.backendUrl !== nextBackendUrl)
    || (config.googleClientId && config.googleClientId !== nextClientId)
  ) {
    config.sessionToken = '';
    config.role = '';
    state.settings.account = {
      connected: false,
      name: '',
      email: '',
      picture: '',
      connectedAt: ''
    };
  }

  config.backendUrl = nextBackendUrl;
  config.googleClientId = nextClientId;

  await saveState({ skipShared: true });
  updateHeader();

  if (notify) showToast('連線設定已儲存');
  return true;
}

/** 舊網址相容。 */
function renderBasicSettings() {
  return renderProfileSettings();
}

function renderAccountSettings() {
  return renderProfileSettings();
}

function renderGoogleSettings() {
  return renderProfileSettings();
}

/** 房務區域與 SOP 的分層設定入口。 */
function renderAreaSettings(params = {}) {
  const area = params.area
    ? state.areas.find(item => item.id === params.area)
    : null;
  const group = params.group;

  if (area && group) return renderTaskSettings(area, group);
  if (area) return renderGroupSettings(area);

  $('#app').innerHTML = `
    <section class="page">
      ${settingsBack()}
      ${pageHeader({
        eyebrow: 'AREAS',
        title: '房務區域與 SOP',
        actions: '<button class="primary-button" data-add-area>＋新增區域</button>'
      })}

      <div class="settings-menu">
        ${state.areas.map(item => settingsRow(
          item.icon,
          item.name,
          `${new Set(item.items.map(task => task.group)).size} 個分類・${item.items.length} 項工作`,
          item.id
        )).join('')}
      </div>
    </section>
  `;

  bindSettingsBack();
  $('[data-add-area]').onclick = () => openAreaForm();

  $$('[data-settings-page]').forEach(button => {
    button.onclick = () => navigate('settings', {
      page: 'areas',
      area: button.dataset.settingsPage
    });
  });
}

/** 顯示單一房務區域的工作分類。 */
function renderGroupSettings(area) {
  const groups = [...new Set(area.items.map(item => item.group))];

  $('#app').innerHTML = `
    <section class="page">
      <button class="back-button" data-area-back>← 返回房務區域</button>
      ${pageHeader({
        eyebrow: 'AREA',
        title: `${area.icon} ${area.name}`,
        actions: '<button class="secondary-button" data-edit-area>修改區域</button>'
      })}

      <div class="settings-menu">
        ${groups.map(group => settingsRow(
          '📝',
          group,
          `${area.items.filter(item => item.group === group).length} 項工作`,
          group
        )).join('')}
      </div>

      <button class="primary-button section" data-add-task>＋新增工作項目</button>
    </section>
  `;

  $('[data-area-back]').onclick = () => navigate('settings', { page: 'areas' });
  $('[data-edit-area]').onclick = () => openAreaForm(area);
  $('[data-add-task]').onclick = () => openTaskForm(area);

  $$('[data-settings-page]').forEach(button => {
    button.onclick = () => navigate('settings', {
      page: 'areas',
      area: area.id,
      group: button.dataset.settingsPage
    });
  });
}

/** 顯示單一工作分類中的所有項目。 */
function renderTaskSettings(area, group) {
  const items = area.items.filter(item => item.group === group);

  $('#app').innerHTML = `
    <section class="page">
      <button class="back-button" data-group-back>← 返回 ${escapeHtml(area.name)}</button>
      ${pageHeader({
        eyebrow: 'SOP',
        title: group,
        actions: '<button class="primary-button" data-add-task>＋新增項目</button>'
      })}

      <div class="list">
        ${items.length
          ? items.map(item => `
              <article class="list-card">
                <div class="list-head">
                  <div class="list-title">${escapeHtml(item.text)}</div>
                  <div class="button-row">
                    <button class="secondary-button compact" data-edit-task="${item.id}">修改</button>
                    <button class="ghost-button" data-delete-task="${item.id}">刪除</button>
                  </div>
                </div>
              </article>
            `).join('')
          : emptyState('此分類沒有工作項目。')}
      </div>
    </section>
  `;

  $('[data-group-back]').onclick = () => navigate('settings', {
    page: 'areas',
    area: area.id
  });

  $('[data-add-task]').onclick = () => openTaskForm(area, { group });

  $$('[data-edit-task]').forEach(button => {
    button.onclick = () => {
      const item = area.items.find(task => task.id === button.dataset.editTask);
      openTaskForm(area, item);
    };
  });

  $$('[data-delete-task]').forEach(button => {
    button.onclick = () => deleteTask(area, button.dataset.deleteTask, group);
  });
}

/** 新增或修改房務區域。 */
function openAreaForm(area = {}) {
  openForm({
    title: area.id ? '修改區域' : '新增區域',
    fields: [
      { name: 'name', label: '區域名稱', value: area.name, required: true },
      { name: 'icon', label: '圖示', value: area.icon || '🏠' }
    ],
    onSubmit: async values => {
      const target = area.id
        ? state.areas.find(item => item.id === area.id)
        : { id: uid('area'), items: [] };

      Object.assign(target, values);
      if (!area.id) state.areas.push(target);

      await saveState();
      navigate('settings', { page: 'areas', area: target.id });
    }
  });
}

/** 新增或修改 SOP 工作項目。 */
function openTaskForm(area, item = {}) {
  openForm({
    title: item.id ? '修改工作項目' : '新增工作項目',
    fields: [
      { name: 'group', label: '分類', value: item.group || '', required: true },
      { name: 'text', label: '工作內容', value: item.text || '', required: true, wide: true }
    ],
    onSubmit: async values => {
      const target = item.id
        ? area.items.find(task => task.id === item.id)
        : { id: uid('task') };

      Object.assign(target, values);
      if (!item.id) area.items.push(target);

      await saveState();
      navigate('settings', {
        page: 'areas',
        area: area.id,
        group: values.group
      });
    }
  });
}

/** 刪除 SOP 工作項目。 */
async function deleteTask(area, id, group) {
  const confirmed = await confirmAction('刪除工作項目', '確定刪除此工作項目嗎？');
  if (!confirmed) return;

  area.items = area.items.filter(item => item.id !== id);
  await saveState();
  renderTaskSettings(area, group);
}
