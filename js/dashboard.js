/* ================================================================
   dashboard.js — 主頁、提醒與營運概況
   ================================================================ */
'use strict';

const DASHBOARD_ICONS = {
  clock: './icons/alert-clock.svg',
  inventory: './icons/alert-inventory.svg',
  maintenance: './icons/alert-maintenance.svg',
  ok: './icons/alert-ok.svg'
};

/** 顯示今日營運主頁。 */
function renderDashboard() {
  const date = today();
  const month = date.slice(0, 7);
  const arrivals = state.bookings.filter(item =>
    item.checkIn === date && item.status !== 'cancelled'
  );

  const departures = state.bookings.filter(item =>
    item.checkOut === date && item.status !== 'cancelled'
  );

  const staying = state.bookings.filter(item =>
    item.checkIn <= date &&
    item.checkOut > date &&
    !['cancelled', 'completed'].includes(item.status)
  );
  const housekeeping = housekeepingStats(date);
  const lowInventory = state.inventory.filter(item =>
    Number(item.qty) <= Number(item.min)
  );
  const openMaintenance = state.maintenance.filter(item => item.status !== 'done');
  const net = monthlyNet(month);
  $('#app').innerHTML = `
    <section class="page page-home">
      ${dashboardResponsiveStyles()}
      ${pageHeader({
        eyebrow: 'TODAY',
        title: '今日營運',
        subtitle: date,
        actions: '<button class="primary-button dashboard-booking-mobile" data-action="quick-booking">＋本日訂房</button>'
      })}
      <div class="grid grid-4" id="dashboardKpis">
        ${dashboardKpi('今日入住', arrivals.length, '查看今日入住', 'checkin')}
        ${dashboardKpi('今日退房', departures.length, '查看今日退房', 'checkout')}
        ${dashboardKpi('住宿中', staying.length, '查看住宿中的客人', 'staying')}
        ${dashboardKpi('房務完成', `${housekeeping.percent}%`, '前往今日房務', 'housekeeping')}
      </div>
      <section class="section">
        <div class="section-title">
          <h2>提醒事項</h2>
          <span class="muted">${arrivals.length + lowInventory.length + openMaintenance.length} 項</span>
        </div>
        <div class="alert-list">
          ${renderAlerts(arrivals, lowInventory, openMaintenance)}
        </div>
      </section>
      <section class="section">
        <div class="section-title"><h2>營運概況</h2></div>
        <div class="grid grid-4 operation-overview">
          <div class="card operation-card operation-card-net">
            <div class="muted">本月淨額</div>
            <strong>${money(net)}</strong>
            <button class="primary-button compact dashboard-booking-desktop" data-action="quick-booking">＋本日訂房</button>
          </div>
          <div class="card operation-card">
            <div class="muted">低庫存</div>
            <strong>${lowInventory.length} 項</strong>
          </div>
          <div class="card operation-card">
            <div class="muted">待維修</div>
            <strong>${openMaintenance.length} 件</strong>
          </div>
          <div class="card operation-card">
            <div class="muted">本月訂房</div>
            <strong>${state.bookings.filter(item =>
              item.checkIn.startsWith(month) && item.status !== 'cancelled'
            ).length} 筆</strong>
          </div>
        </div>
      </section>
    </section>
  `;

  $$('[data-action="quick-booking"]').forEach(button => {
    button.onclick = () => openBookingForm();
  });

  $$('[data-kpi]').forEach(button => {
    button.onclick = () => handleDashboardKpi(button.dataset.kpi, date);
  });

  bindDashboardAlerts();
}

function dashboardResponsiveStyles() {
  return `
    <style>
      .dashboard-booking-mobile { display: none; }
      .operation-card-net { align-items: flex-start; }
      .dashboard-booking-desktop { margin-top: 2px; }
      @media (max-width: 560px) {
        .dashboard-booking-mobile { display: inline-flex; }
        .dashboard-booking-desktop { display: none; }
      }
    </style>
  `;
}

/** 建立主頁上方的統計捷徑。 */
function dashboardKpi(label, value, hint, action) {
  return `
    <button class="kpi-card" data-kpi="${action}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(hint)} →</small>
    </button>
  `;
}

/** 處理主頁統計卡片點擊。 */
function handleDashboardKpi(action, date) {
  if (action === 'housekeeping') {
    navigate('housekeeping', { date });
    return;
  }

  navigate('bookings', { filter: action, date });
}

/** 建立提醒清單。 */
function renderAlerts(arrivals, lowInventory, maintenance) {
  const alerts = [];
  arrivals
    .sort((a, b) => (a.checkInTime || '').localeCompare(b.checkInTime || ''))
    .forEach(item => {
      alerts.push(`
        <button class="alert" data-alert-route="bookings" data-alert-filter="checkin">
          ${alertIcon(DASHBOARD_ICONS.clock)}
          <span>
            <strong>${escapeHtml(item.checkInTime || '15:00')} 客人入住</strong>
            ${escapeHtml(roomName(item.roomId))}・${escapeHtml(item.guest)}
          </span>
        </button>
      `);
    });

  lowInventory.forEach(item => {
    alerts.push(`
      <button class="alert warning" data-alert-route="inventory">
        ${alertIcon(DASHBOARD_ICONS.inventory)}
        <span>
          <strong>低庫存：${escapeHtml(item.name)}</strong>
          剩餘 ${item.qty}${escapeHtml(item.unit)}，安全量 ${item.min}${escapeHtml(item.unit)}
        </span>
      </button>
    `);
  });

  maintenance.forEach(item => {
    alerts.push(`
      <button class="alert danger" data-alert-route="maintenance">
        ${alertIcon(DASHBOARD_ICONS.maintenance)}
        <span>
          <strong>待維修：${escapeHtml(item.title)}</strong>
          ${escapeHtml(roomName(item.roomId))}
        </span>
      </button>
    `);
  });

  if (!alerts.length) {
    return `
      <div class="alert">
        ${alertIcon(DASHBOARD_ICONS.ok)}
        <span>
          <strong>目前沒有待處理提醒</strong>
          今天的營運狀況正常。
        </span>
      </div>
    `;
  }

  return alerts.join('');
}

/** 建立提醒圖示。 */
function alertIcon(path) {
  return `<span class="alert-icon"><img src="${escapeHtml(path)}" alt=""></span>`;
}

/** 綁定提醒清單的頁面跳轉。 */
function bindDashboardAlerts() {
  $$('[data-alert-route]').forEach(button => {
    button.onclick = () => navigate(
      button.dataset.alertRoute,
      button.dataset.alertFilter
        ? { filter: button.dataset.alertFilter, date: today() }
        : {}
    );
  });
}
