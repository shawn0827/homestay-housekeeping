/**
 * 模組：備品管理
 * 用途：庫存、安全量、耗用統計與進度條。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 備品列表與庫存進度 =====
function renderInventory() {
  $('inventoryList').innerHTML=state.inventory.map(i=> {
    let target=Math.max(+i.min*2,1),pct=Math.min(100,Math.round((+i.qty/target)*100)),low=+i.qty<=+i.min;
    return `<article class="list-item ${low?'inventory-low':''}"><div class="list-head"><div><strong>${esc(i.name)}</strong><div class="muted">安全量 ${i.min}${esc(i.unit)}・累計耗用 ${i.usage||0}${esc(i.unit)}</div><div class="usage-adjust"><span>誤按可點「修改」修正耗用量</span><strong>${i.usage||0}${esc(i.unit)}</strong></div></div><span class="tag ${low?'tag-warn':''}">${i.qty}${esc(i.unit)}</span></div><div class="inventory-progress-wrap"><div class="inventory-progress-label"><span>${low?'低於安全量':'庫存狀況'}</span><span>${pct}%</span></div><div class="inventory-progress"><div class="${low?'low':''}" style="width:${pct}%"></div></div></div><div class="list-actions"><button class="secondary-btn compact" onclick="changeStock('${i.id}',-1)">−1</button><button class="secondary-btn compact" onclick="changeStock('${i.id}',1)">＋1</button><button class="secondary-btn compact" onclick="editInventory('${i.id}')">修改</button><button class="secondary-btn compact danger-text" onclick="deleteInventory('${i.id}')">刪除</button></div></article>`
  }).join('')||'<div class="card">尚無備品。</div>'
} window.changeStock=async(id,n)=> {
  let i=state.inventory.find(x=>x.id===id);
  i.qty=Math.max(0,+i.qty+n);
  if(n<0)i.usage=(i.usage||0)+Math.abs(n);
  await save();
  renderInventory();
  renderDashboard()
};
