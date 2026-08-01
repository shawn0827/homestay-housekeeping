/* dashboard.js — 主頁、提醒與快速入口 */
'use strict';

function renderDashboard() {
  const date = today();
  const arrivals = state.bookings.filter(item => item.checkIn === date && item.status !== 'cancelled');
  const departures = state.bookings.filter(item => item.checkOut === date && item.status !== 'cancelled');
  const staying = state.bookings.filter(item => item.checkIn <= date && item.checkOut > date && !['cancelled', 'completed'].includes(item.status));
  const housekeeping = housekeepingStats(date);
  const lowInventory = state.inventory.filter(item => Number(item.qty) <= Number(item.min));
  const openMaintenance = state.maintenance.filter(item => item.status !== 'done');
  const month = date.slice(0, 7);
  const net = monthlyNet(month);

  $('#app').innerHTML = `<section class="page page-home">
    ${pageHeader({ eyebrow: 'TODAY', title: '今日營運', subtitle: date, actions: '<button class="primary-button" data-action="quick-booking">＋新增訂房</button>' })}
    <div class="grid grid-4" id="dashboardKpis">
      ${dashboardKpi('今日入住', arrivals.length, '查看今日入住', 'checkin')}
      ${dashboardKpi('今日退房', departures.length, '查看今日退房', 'checkout')}
      ${dashboardKpi('住宿中', staying.length, '查看住宿中的客人', 'staying')}
      ${dashboardKpi('房務完成', `${housekeeping.percent}%`, '前往今日房務', 'housekeeping')}
    </div>
    <section class="section">
      <div class="section-title"><h2>提醒事項</h2><span class="muted">${arrivals.length + lowInventory.length + openMaintenance.length} 項</span></div>
      <div class="alert-list">${renderAlerts(arrivals, lowInventory, openMaintenance)}</div>
    </section>
    <section class="section">
      <div class="section-title"><h2>今日工作</h2></div>
      <div class="grid grid-2">
        ${moduleCard('🧳', '入住', arrivals.map(item => `${item.checkInTime || '15:00'} ${roomName(item.roomId)}・${item.guest}`).join('、') || '今天沒有入住', 'bookings', { filter: 'checkin', date })}
        ${moduleCard('🚪', '退房', departures.map(item => `${roomName(item.roomId)}・${item.guest}`).join('、') || '今天沒有退房', 'bookings', { filter: 'checkout', date })}
        ${moduleCard('🧹', '房務', `${housekeeping.done}/${housekeeping.total} 項完成`, 'housekeeping', { date })}
        ${moduleCard('💰', '本月淨額', money(net), 'finance', { month })}
      </div>
    </section>
    <section class="section"><div class="section-title"><h2>營運概況</h2></div><div class="grid grid-3">
      <div class="card"><div class="muted">低庫存</div><strong>${lowInventory.length} 項</strong></div>
      <div class="card"><div class="muted">待維修</div><strong>${openMaintenance.length} 件</strong></div>
      <div class="card"><div class="muted">本月訂房</div><strong>${state.bookings.filter(item => item.checkIn.startsWith(month) && item.status !== 'cancelled').length} 筆</strong></div>
    </div></section>
  </section>`;

  $('[data-action="quick-booking"]').onclick = () => openBookingForm();
  $$('[data-kpi]').forEach(button => button.onclick = () => handleDashboardKpi(button.dataset.kpi, date));
  $$('[data-module-route]').forEach(button => button.onclick = () => navigate(button.dataset.moduleRoute, JSON.parse(button.dataset.moduleParams || '{}')));
}

function dashboardKpi(label, value, hint, action) {
  return `<button class="kpi-card" data-kpi="${action}"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(hint)} →</small></button>`;
}

function handleDashboardKpi(action, date) {
  if (action === 'housekeeping') navigate('housekeeping', { date });
  else navigate('bookings', { filter: action, date });
}

function moduleCard(icon, title, subtitle, route, params = {}) {
  return `<button class="module-card" data-module-route="${route}" data-module-params='${escapeHtml(JSON.stringify(params))}'><span class="icon">${icon}</span><span class="copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(subtitle)}</small></span><span class="chevron">›</span></button>`;
}

function renderAlerts(arrivals, lowInventory, maintenance) {
  const alerts = [];
  arrivals.sort((a, b) => (a.checkInTime || '').localeCompare(b.checkInTime || '')).forEach(item => {
    alerts.push(`<button class="alert" data-alert-route="bookings" data-alert-filter="checkin"><span class="alert-icon">⏰</span><span><strong>${escapeHtml(item.checkInTime || '15:00')} 客人入住</strong>${escapeHtml(roomName(item.roomId))}・${escapeHtml(item.guest)}</span></button>`);
  });
  lowInventory.forEach(item => alerts.push(`<button class="alert warning" data-alert-route="inventory"><span class="alert-icon">📦</span><span><strong>低庫存：${escapeHtml(item.name)}</strong>剩餘 ${item.qty}${escapeHtml(item.unit)}，安全量 ${item.min}${escapeHtml(item.unit)}</span></button>`));
  maintenance.forEach(item => alerts.push(`<button class="alert danger" data-alert-route="maintenance"><span class="alert-icon">🛠️</span><span><strong>待維修：${escapeHtml(item.title)}</strong>${escapeHtml(roomName(item.roomId))}</span></button>`));
  if (!alerts.length) return '<div class="alert"><span class="alert-icon">✓</span><span><strong>目前沒有待處理提醒</strong>今天的營運狀況正常。</span></div>';
  setTimeout(() => $$('[data-alert-route]').forEach(button => button.onclick = () => navigate(button.dataset.alertRoute, button.dataset.alertFilter ? { filter: button.dataset.alertFilter, date: today() } : {})), 0);
  return alerts.join('');
}
