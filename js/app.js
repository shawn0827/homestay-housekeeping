/* ================================================================
   app.js — 系統啟動、路由與手機下拉重新整理
   ================================================================ */
'use strict';

const renderers = {
  home: () => renderDashboard(),
  bookings: params => renderBookings(params),
  housekeeping: params => renderHousekeeping(params),
  inventory: () => renderInventory(),
  maintenance: () => renderMaintenance(),
  finance: params => renderFinance(params),
  reports: () => renderReports(),
  settings: params => renderSettings(params),
  account: () => renderProfileSettings()
};

function renderRoute() {
  currentRoute = parseHash();
  const renderer = renderers[currentRoute.name] || renderers.home;
  renderer(currentRoute.params);
  setActiveNavigation(currentRoute.name);
  document.title = `${routeTitle(currentRoute.name)}｜${state.settings.propertyName}`;
  updateHeader();
  $('#app').focus({ preventScroll: true });
}

function updateHeader() {
  $('#propertyTitle').textContent = state.settings.propertyName || '我的民宿';
  const account = state.settings.account;
  $('#accountName').textContent = account?.name || state.settings.userName || '民宿主人';
  $('#accountAvatar').innerHTML = account?.picture
    ? `<img src="${escapeHtml(account.picture)}" alt="帳號頭像">`
    : '<img class="account-default-icon" src="./icons/account.svg" alt="">';
}

function bindGlobalEvents() {
  $('#homeBrand').onclick = () => navigate('home');
  $('#accountButton').onclick = () => navigate('settings', { page: 'profile' });
  $$('.bottom-nav button').forEach(button => button.onclick = () => navigate(button.dataset.route));
  window.addEventListener('hashchange', renderRoute);
  enablePullToRefresh();
}

function enablePullToRefresh() {
  let startY = 0;
  let distance = 0;
  let tracking = false;
  const indicator = $('#pullRefresh');
  document.addEventListener('touchstart', event => {
    if (window.scrollY === 0 && event.touches.length === 1) {
      startY = event.touches[0].clientY;
      distance = 0;
      tracking = true;
    }
  }, { passive: true });
  document.addEventListener('touchmove', event => {
    if (!tracking) return;
    distance = Math.max(0, event.touches[0].clientY - startY);
    if (distance > 18) {
      indicator.classList.add('visible');
      indicator.textContent = distance >= 72 ? '放開重新整理' : '下拉重新整理';
    }
  }, { passive: true });
  document.addEventListener('touchend', async () => {
    if (!tracking) return;
    tracking = false;
    if (distance >= 72) {
      indicator.textContent = '更新中…';
      if (typeof refreshSharedData === 'function') {
        await refreshSharedData();
      }
      await refreshCurrentPage();
    }
    setTimeout(() => indicator.classList.remove('visible'), 350);
  }, { passive: true });
}

async function startApplication() {
  await loadState();
  bindGlobalEvents();

  // 先使用已保存的 App Session 恢復登入，再下載多人共用的最新資料。
  const sessionRestored = await restoreGoogleDriveSession().catch(() => false);
  if (sessionRestored) {
    await loadSharedStateFromServer().catch(console.warn);
  }

  if (!location.hash) navigate('home', {}, { replace: true });
  else renderRoute();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  }
}

document.addEventListener('DOMContentLoaded', () => startApplication().catch(error => {
  console.error(error);
  $('#app').innerHTML = `<div class="empty">系統啟動失敗：${escapeHtml(error.message)}</div>`;
}));
