/**
 * 模組：統計分析
 * 用途：入住率、營收、平台及備品耗用分析。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 營運統計 =====
function renderAnalytics() {
  let m=$('analyticsMonth').value||today().slice(0,7);
  $('analyticsMonth').value=m;
  let days=new Date(+m.slice(0,4),+m.slice(5,7),0).getDate(),bs=state.bookings.filter(b=>b.status!=='cancelled'&&b.checkIn.slice(0,7)<=m&&b.checkOut.slice(0,7)>=m),nights=0,byRoom= {
  };
  bs.forEach(b=> {
    let s=new Date(Math.max(new Date(b.checkIn),new Date(m+'-01'))),e=new Date(Math.min(new Date(b.checkOut),new Date(+m.slice(0,4),+m.slice(5,7),1)));
    let n=Math.max(0,(e-s)/86400000);
    nights+=n;
    byRoom[b.roomId]=(byRoom[b.roomId]||0)+n
  });
  let capacity=state.rooms.length*days,rate=capacity?Math.round(nights/capacity*100):0,rev=monthIncome(m),avg=bs.length?Math.round(rev/bs.length):0;
  $('analyticsCards').innerHTML=kpis([['入住晚數',nights],['入住率',rate+'%'],['淨營收','$'+rev.toLocaleString()],['每筆平均','$'+avg.toLocaleString()]]);
  $('roomAnalytics').innerHTML=bars(state.rooms.map(r=>[r.name,byRoom[r.id]||0,days]));
  let platforms= {
  };
  state.transactions.filter(t=>t.date.startsWith(m)&&['income','deposit'].includes(t.type)).forEach(t=>platforms[t.platform||'未分類']=(platforms[t.platform||'未分類']||0)+(+t.amount||0));
  let max=Math.max(1,...Object.values(platforms));
  $('platformAnalytics').innerHTML=bars(Object.entries(platforms).map(([k,v])=>[k,v,max]));
  let umax=Math.max(1,...state.inventory.map(i=>i.usage||0));
  $('usageAnalytics').innerHTML=bars(state.inventory.map(i=>[i.name,i.usage||0,umax]))
}

function bars(arr) {
  return arr.map(([n,v,max])=>`<div class="bar-row"><span>${esc(n)}</span><div class="bar"><div style="width:${Math.min(100,v/max*100)}%"></div></div><strong>${v}</strong></div>`).join('')||'<p class="muted">尚無資料。</p>'
}
