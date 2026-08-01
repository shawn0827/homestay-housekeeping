/* ================================================================
   settings.js — 基本資料、帳號、SOP 與系統設定
   ================================================================ */
'use strict';

/** 顯示設定首頁或指定的設定子頁。 */
function renderSettings(params = {}) {
  const page = params.page;

  if (page === 'basic') return renderBasicSettings();
  if (page === 'account') return renderAccountSettings();
  if (page === 'areas') return renderAreaSettings(params);
  if (page === 'google') return renderGoogleSettings();

  $('#app').innerHTML = `
    <section class="page">
      ${pageHeader({
        eyebrow: 'SETTINGS',
        title: '系統設定',
        subtitle: `Version ${APP_VERSION}`
      })}

      <div class="settings-menu">
        ${settingsRow('🏡', '民宿基本資料', '民宿與使用者名稱', 'basic')}
        ${settingsRow('👤', '使用者帳號', 'Google 帳號連接與狀態', 'account')}
        ${settingsRow('🛏️', '房務區域與 SOP', '房間、分類與工作項目', 'areas')}
        ${settingsRow('🛠️', '維修管理', '設備異常與進度', 'route:maintenance')}
        ${settingsRow('💰', '收支管理', '收入、訂金、退款與支出', 'route:finance')}
        ${settingsRow('📊', '報表與備份', 'Excel、JSON 與還原', 'route:reports')}
        ${settingsRow('☁️', 'Google Drive', 'Client ID 與雲端同步', 'google')}
      </div>
    </section>
  `;

  $$('[data-settings-page]').forEach(button => {
    button.onclick = () => {
      const target = button.dataset.settingsPage;
      if (target.startsWith('route:')) {
        navigate(target.split(':')[1]);
      } else {
        navigate('settings', { page: target });
      }
    };
  });
}

/** 建立設定首頁的一列選單。 */
function settingsRow(icon, title, subtitle, page) {
  return `
    <button class="settings-row" data-settings-page="${escapeHtml(page)}">
      <span class="icon">${icon}</span>
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

/** 民宿名稱與本機使用者名稱。 */
function renderBasicSettings() {
  $('#app').innerHTML = `
    <section class="page">
      ${settingsBack()}
      ${pageHeader({ eyebrow: 'BASIC', title: '民宿基本資料' })}

      <div class="card">
        <div class="form-grid">
          <label class="field">
            民宿名稱
            <input id="propertyNameInput" value="${escapeHtml(state.settings.propertyName)}">
          </label>
          <label class="field">
            使用者名稱
            <input id="userNameInput" value="${escapeHtml(state.settings.userName)}">
          </label>
        </div>
        <button class="primary-button section" data-save-basic>儲存</button>
      </div>
    </section>
  `;

  bindSettingsBack();

  $('[data-save-basic]').onclick = async () => {
    state.settings.propertyName = $('#propertyNameInput').value.trim() || '我的民宿';
    state.settings.userName = $('#userNameInput').value.trim() || '民宿主人';
    await saveState();
    updateHeader();
    showToast('基本資料已儲存');
  };
}

/** Google 帳號連接、授權與登出。 */
function renderAccountSettings() {
  const account = state.settings.account;
  const remembered = googleAccountRemembered();
  const driveStatus = googleConnected() ? 'Drive 已授權' : '需要同步時續接授權';

  $('#app').innerHTML = `
    <section class="page">
      ${settingsBack()}
      ${pageHeader({ eyebrow: 'ACCOUNT', title: '使用者帳號' })}

      <div class="card account-profile-card">
        <div class="account-profile">
          <div class="account-profile-avatar">
            ${account.picture
              ? `<img src="${escapeHtml(account.picture)}" alt="Google 帳號頭像">`
              : '👤'}
          </div>
          <div>
            <div class="list-title">${escapeHtml(account.name || state.settings.userName)}</div>
            <div class="list-meta">${escapeHtml(account.email || '尚未連接 Google 帳號')}</div>
          </div>
        </div>

        <div class="account-status-grid section">
          <div>
            <span>帳號狀態</span>
            <strong>${remembered ? '已登入並記住' : '未登入'}</strong>
          </div>
          <div>
            <span>Google Drive</span>
            <strong>${escapeHtml(driveStatus)}</strong>
          </div>
        </div>

        <div class="button-row section">
          <button class="primary-button" data-connect-google>
            ${remembered ? '重新授權 Google Drive' : '使用 Google 帳號登入'}
          </button>
          ${remembered
            ? '<button class="danger-button" data-disconnect-google>登出 Google 帳號</button>'
            : ''}
        </div>

        <p class="muted section">
          帳號身分會保留在本機，重新開啟後仍顯示登入。為保護 Drive 權限，存取權杖到期時系統會在同步前重新續接授權。
        </p>
      </div>
    </section>
  `;

  bindSettingsBack();
  $('[data-connect-google]').onclick = () => connectGoogle();

  const logoutButton = $('[data-disconnect-google]');
  if (logoutButton) logoutButton.onclick = disconnectGoogle;
}

/** Google Drive Client ID 與同步設定。 */
function renderGoogleSettings() {
  $('#app').innerHTML = `
    <section class="page">
      ${settingsBack()}
      ${pageHeader({ eyebrow: 'GOOGLE DRIVE', title: 'Google 雲端設定' })}

      <div class="card">
        <div class="form-grid">
          <label class="field wide">
            OAuth Client ID
            <input id="googleClientId" value="${escapeHtml(state.settings.google.clientId)}" placeholder="xxxx.apps.googleusercontent.com">
          </label>
          <label class="field wide">
            備份資料夾名稱
            <input id="googleFolderName" value="${escapeHtml(state.settings.google.folderName)}">
          </label>
        </div>

        <label class="check-row section">
          <input id="googleAutoSync" type="checkbox" ${state.settings.google.autoSync ? 'checked' : ''}>
          <span>完成房務後自動同步</span>
        </label>

        <div class="button-row section">
          <button class="primary-button" data-save-google>儲存設定</button>
          <button class="secondary-button" data-sync-google>立即同步</button>
        </div>
      </div>
    </section>
  `;

  bindSettingsBack();

  $('[data-save-google]').onclick = async () => {
    const newClientId = $('#googleClientId').value.trim();
    const changed = state.settings.google.clientId !== newClientId;

    state.settings.google.clientId = newClientId;
    state.settings.google.folderName = $('#googleFolderName').value.trim() || '民宿營運管理系統備份';
    state.settings.google.autoSync = $('#googleAutoSync').checked;

    if (changed) {
      state.settings.google.folderId = '';
      googleAccessToken = '';
      googleTokenExpiresAt = 0;
      googleIdentityInitialized = false;
    }

    await saveState();
    initializePersistentGoogleAccount().catch(console.warn);
    showToast('Google 設定已儲存');
  };

  $('[data-sync-google]').onclick = () => syncGoogleDrive();
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
