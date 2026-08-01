/**
 * 模組：主頁與提醒
 * 用途：今日入住、退房、房務、營收、低庫存及維修提醒。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 主頁渲染 =====
function renderDashboard() {
  let d=today(), ins=state.bookings.filter(b=>b.checkIn===d&&b.status!=='cancelled'), outs=state.bookings.filter(b=>b.checkOut===d&&b.status!=='cancelled'), stay=state.bookings.filter(b=>b.checkIn<=d&&b.checkOut>d&&b.status!=='cancelled'), rec=getRecord(d),ds=dayStats(rec), low=state.inventory.filter(i=>+i.qty<=+i.min), pending=state.maintenance.filter(m=>m.status!=='done');
  $('dashboardDate').textContent=d;
  $('headerUserName').textContent=state.settings.userName||'民宿主人';
  $('kpiGrid').innerHTML=kpis([ ['今日入住',ins.length], ['今日退房',outs.length], ['住宿中',stay.length], ['房務完成',ds.pct+'%'] ]);
  $('todayCards').innerHTML=[ ['🧳','入住',ins.map(b=>`${roomName(b.roomId)} ${b.guest}${b.checkInTime?' '+b.checkInTime:''}`).join('、')||'今日無入住','bookingsView'], ['🚪','退房',outs.map(b=>roomName(b.roomId)+' '+b.guest).join('、')||'今日無退房','bookingsView'], ['🧹','房務',`${ds.done}/${ds.total} 項已完成`,'housekeepingView'], ['💰','本月營收','$'+monthIncome(d.slice(0,7)).toLocaleString(),'financeView'] ].map(x=>`<button class="module-card" data-go="${x[3]}"><span>${x[0]}</span><strong>${x[1]}</strong><small>${esc(x[2])}</small></button>`).join('');
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>show(b.dataset.go));
  let alerts=[];
  ins.sort((a,b)=>(a.checkInTime||'23:59').localeCompare(b.checkInTime||'23:59')).forEach(b=> {
    alerts.push(`<div class="alert">今日 ${esc(b.checkInTime||'時間未設定')} 入住：${esc(roomName(b.roomId))}－${esc(b.guest)}</div>`);
  });
  low.forEach(i=>alerts.push(`<div class="alert warn">備品「${esc(i.name)}」剩 ${i.qty}${esc(i.unit)}，低於安全量 ${i.min}${esc(i.unit)}</div>`));
  pending.forEach(m=>alerts.push(`<div class="alert danger">待維修：${esc(roomName(m.roomId))}－${esc(m.title)}</div>`));
  $('alertsList').innerHTML=alerts.join('')||'<div class="alert">目前沒有需要處理的提醒。</div>';
}

// ===== 主頁小工具 =====
function kpis(arr) {
  return arr.map(([a,b])=>`<div class="kpi"><small>${a}</small><strong>${b}</strong></div>`).join('')
}

function monthIncome(m) {
  return state.transactions.filter(t=>t.date.startsWith(m)&&['income','deposit'].includes(t.type)).reduce((s,t)=>s+(+t.amount||0),0)-state.transactions.filter(t=>t.date.startsWith(m)&&t.type==='refund').reduce((s,t)=>s+(+t.amount||0),0)
}
