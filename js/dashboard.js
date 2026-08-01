/**
 * 模組：主頁與提醒
 * 用途：今日入住、退房、房務、營收、低庫存及維修提醒。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 主頁渲染 =====
function renderDashboard() {
  const date = today();
  const arrivals = state.bookings.filter((booking) =>
    booking.checkIn === date && booking.status !== "cancelled"
  );
  const departures = state.bookings.filter((booking) =>
    booking.checkOut === date && booking.status !== "cancelled"
  );
  const staying = state.bookings.filter((booking) =>
    booking.checkIn <= date &&
    booking.checkOut > date &&
    booking.status !== "cancelled"
  );
  const record = getRecord(date);
  const housekeeping = dayStats(record);
  const lowInventory = state.inventory.filter((item) => +item.qty <= +item.min);
  const pendingMaintenance = state.maintenance.filter((item) => item.status !== "done");

  $("dashboardDate").textContent = date;
  refreshHeaderUser();

  $("kpiGrid").innerHTML = kpis([
    { label: "今日入住", value: arrivals.length, action: "today-in" },
    { label: "今日退房", value: departures.length, action: "today-out" },
    { label: "住宿中", value: staying.length, action: "stay" },
    { label: "房務完成", value: `${housekeeping.pct}%`, action: "housekeeping" },
  ]);

  document.querySelectorAll("[data-kpi-action]").forEach((button) => {
    button.onclick = () => openDashboardKpi(button.dataset.kpiAction);
  });

  const todayModules = [
    {
      icon: "🧳",
      title: "入住",
      detail: arrivals.map((booking) =>
        `${roomName(booking.roomId)} ${booking.guest}${booking.checkInTime ? ` ${booking.checkInTime}` : ""}`
      ).join("、") || "今日無入住",
      action: "today-in",
    },
    {
      icon: "🚪",
      title: "退房",
      detail: departures.map((booking) =>
        `${roomName(booking.roomId)} ${booking.guest}`
      ).join("、") || "今日無退房",
      action: "today-out",
    },
    {
      icon: "🧹",
      title: "房務",
      detail: `${housekeeping.done}/${housekeeping.total} 項已完成`,
      action: "housekeeping",
    },
    {
      icon: "💰",
      title: "本月營收",
      detail: `$${monthIncome(date.slice(0, 7)).toLocaleString()}`,
      action: "finance",
    },
  ];

  $("todayCards").innerHTML = todayModules.map((module) => `
    <button class="module-card" data-dashboard-action="${module.action}">
      <span>${module.icon}</span>
      <strong>${module.title}</strong>
      <small>${esc(module.detail)}</small>
    </button>
  `).join("");

  document.querySelectorAll("[data-dashboard-action]").forEach((button) => {
    button.onclick = () => openDashboardKpi(button.dataset.dashboardAction);
  });

  const alerts = [];

  arrivals
    .sort((left, right) => (left.checkInTime || "23:59").localeCompare(right.checkInTime || "23:59"))
    .forEach((booking) => {
      alerts.push(`
        <div class="alert">
          今日 ${esc(booking.checkInTime || "時間未設定")} 入住：
          ${esc(roomName(booking.roomId))}－${esc(booking.guest)}
        </div>
      `);
    });

  lowInventory.forEach((item) => {
    alerts.push(`
      <div class="alert warn">
        備品「${esc(item.name)}」剩 ${item.qty}${esc(item.unit)}，
        低於安全量 ${item.min}${esc(item.unit)}
      </div>
    `);
  });

  pendingMaintenance.forEach((item) => {
    alerts.push(`
      <div class="alert danger">
        待維修：${esc(roomName(item.roomId))}－${esc(item.title)}
      </div>
    `);
  });

  $("alertsList").innerHTML = alerts.join("") ||
    '<div class="alert">目前沒有需要處理的提醒。</div>';
}

function openDashboardKpi(action) {
  if (["today-in", "today-out", "stay"].includes(action)) {
    $("bookingMonth").value = today().slice(0, 7);
    $("bookingFilter").value = action;
    sessionStorage.setItem("homestay_booking_filter", action);
    show("bookingsView");
    return;
  }

  if (action === "housekeeping") {
    $("workDate").value = today();
    sessionStorage.setItem("homestay_work_date", today());
    show("housekeepingView");
    return;
  }

  if (action === "finance") {
    $("financeMonth").value = today().slice(0, 7);
    show("financeView");
  }
}

// ===== 主頁小工具 =====
function kpis(items) {
  return items.map((item) => `
    <button class="kpi kpi-button" data-kpi-action="${item.action}">
      <small>${esc(item.label)}</small>
      <strong>${esc(item.value)}</strong>
    </button>
  `).join("");
}

function monthIncome(m) {
  return state.transactions.filter(t=>t.date.startsWith(m)&&['income','deposit'].includes(t.type)).reduce((s,t)=>s+(+t.amount||0),0)-state.transactions.filter(t=>t.date.startsWith(m)&&t.type==='refund').reduce((s,t)=>s+(+t.amount||0),0)
}
