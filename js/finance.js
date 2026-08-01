/**
 * 模組：收支管理
 * 用途：收入、訂金、退款及支出紀錄。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 收支列表與月統計 =====
function renderFinance() {
  let m=$('financeMonth').value||today().slice(0,7),f=$('financeFilter').value;
  $('financeMonth').value=m;
  let ts=state.transactions.filter(t=>t.date.startsWith(m)&&(f==='all'||t.type===f)).sort((a,b)=>b.date.localeCompare(a.date)),inc=ts.filter(t=>['income','deposit'].includes(t.type)).reduce((s,t)=>s+(+t.amount||0),0),ref=ts.filter(t=>t.type==='refund').reduce((s,t)=>s+(+t.amount||0),0),exp=ts.filter(t=>t.type==='expense').reduce((s,t)=>s+(+t.amount||0),0);
  $('financeSummary').innerHTML=kpis([['收入／訂金','$'+inc.toLocaleString()],['退款','$'+ref.toLocaleString()],['支出','$'+exp.toLocaleString()],['淨額','$'+(inc-ref-exp).toLocaleString()]]);
  $('transactionList').innerHTML=ts.map(t=>`<article class="list-item"><div class="list-head"><div><strong>${esc(t.title)}</strong><div class="muted">${t.date}・${typeName(t.type)}・${esc(t.platform||'')}</div></div><strong>$${(+t.amount).toLocaleString()}</strong></div><div class="list-actions"><button class="secondary-btn compact" onclick="editTransaction('${t.id}')">修改</button><button class="secondary-btn compact danger-text" onclick="deleteTransaction('${t.id}')">刪除</button></div></article>`).join('')||'<div class="card">沒有紀錄。</div>'
}

function typeName(x) {
  return( {
    income:'收入',deposit:'訂金',refund:'退款',expense:'支出'
  })[x]||x
}
