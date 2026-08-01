/**
 * 模組：維修管理
 * 用途：設備故障、待處理與已完成維修紀錄。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 維修列表 =====
function renderMaintenance() {
  $('maintenanceList').innerHTML=state.maintenance.sort((a,b)=>b.date.localeCompare(a.date)).map(m=>`<article class="list-item"><div class="list-head"><div><strong>${esc(m.title)}</strong><div class="muted">${m.date}・${esc(roomName(m.roomId))}</div></div><span class="tag">${m.status==='done'?'已完成':'待處理'}</span></div><p>${esc(m.notes||'')}</p><div class="list-actions"><button class="secondary-btn compact" onclick="toggleMaintenance('${m.id}')">${m.status==='done'?'改為待處理':'標記完成'}</button><button class="secondary-btn compact" onclick="editMaintenance('${m.id}')">修改</button><button class="secondary-btn compact danger-text" onclick="deleteMaintenance('${m.id}')">刪除</button></div></article>`).join('')||'<div class="card">目前沒有維修紀錄。</div>'
} window.toggleMaintenance=async id=> {
  let m=state.maintenance.find(x=>x.id===id);
  m.status=m.status==='done'?'open':'done';
  await save();
  renderMaintenance();
  renderDashboard()
};
