/* inventory.js — 備品庫存、進度條與耗用 */
'use strict';

function renderInventory() {
  $('#app').innerHTML = `<section class="page">${pageHeader({ eyebrow: 'INVENTORY', title: '備品管理', subtitle: '庫存、安全量與累計耗用', actions: '<button class="primary-button" data-add-inventory>＋新增備品</button>' })}<div class="grid grid-2">${state.inventory.map(inventoryCard).join('') || emptyState('尚未建立備品。')}</div></section>`;
  $('[data-add-inventory]').onclick = () => openInventoryForm();
  $$('[data-inventory-minus]').forEach(button => button.onclick = () => changeInventory(button.dataset.inventoryMinus, -1));
  $$('[data-inventory-plus]').forEach(button => button.onclick = () => changeInventory(button.dataset.inventoryPlus, 1));
  $$('[data-inventory-edit]').forEach(button => button.onclick = () => openInventoryForm(state.inventory.find(item => item.id === button.dataset.inventoryEdit)));
  $$('[data-inventory-delete]').forEach(button => button.onclick = () => deleteInventory(button.dataset.inventoryDelete));
}

function inventoryCard(item) {
  const target = Math.max(Number(item.target || 0), Number(item.min || 0) * 2, 1);
  const percent = Math.round(Number(item.qty || 0) / target * 100);
  const low = Number(item.qty) <= Number(item.min);
  const tone = Number(item.qty) <= Number(item.min) / 2 ? 'danger' : low ? 'warning' : '';
  return `<article class="card"><div class="list-head"><div><div class="list-title">${escapeHtml(item.name)}</div><div class="list-meta">安全量 ${item.min}${escapeHtml(item.unit)}・累計耗用 ${item.usage || 0}${escapeHtml(item.unit)}</div></div><span class="status ${low ? 'danger' : 'success'}">${low ? '需要補貨' : '庫存正常'}</span></div><div class="section"><strong style="font-size:30px">${item.qty}${escapeHtml(item.unit)}</strong></div>${progressBar(percent,tone)}<div class="progress-meta"><span>目前 ${Math.min(100,Math.max(0,percent))}%</span><span>目標 ${target}${escapeHtml(item.unit)}</span></div><div class="button-row section"><button class="secondary-button" data-inventory-minus="${item.id}">−1</button><button class="secondary-button" data-inventory-plus="${item.id}">＋1</button><button class="secondary-button" data-inventory-edit="${item.id}">修改</button><button class="ghost-button" data-inventory-delete="${item.id}">刪除</button></div></article>`;
}

async function changeInventory(id, difference) {
  const item = state.inventory.find(entry => entry.id === id);
  if (!item) return;
  if (difference < 0 && Number(item.qty) <= 0) return;
  item.qty = Math.max(0, Number(item.qty) + difference);
  if (difference < 0) item.usage = Number(item.usage || 0) + Math.abs(difference);
  else if (item.usage > 0) item.usage = Math.max(0, Number(item.usage) - difference);
  await saveState();
  renderInventory();
}

function openInventoryForm(item = {}) {
  openForm({ title: item.id ? '修改備品' : '新增備品', fields: [
    { name:'name', label:'品項名稱', value:item.name, required:true },
    { name:'qty', label:'目前數量', type:'number', value:item.qty || 0, min:0, required:true },
    { name:'min', label:'最低安全量', type:'number', value:item.min || 0, min:0, required:true },
    { name:'target', label:'庫存目標', type:'number', value:item.target || Math.max(item.qty || 0,(item.min || 0)*2), min:1, help:'進度條以此數量作為 100%。' },
    { name:'unit', label:'單位', value:item.unit || '個', required:true },
    { name:'usage', label:'累計耗用', type:'number', value:item.usage || 0, min:0, help:'誤按時可在此直接修正數字。' }
  ], onSubmit: async values => {
    const target = item.id ? state.inventory.find(entry => entry.id === item.id) : { id:uid('stock') };
    Object.assign(target,{ name:values.name, qty:Number(values.qty), min:Number(values.min), target:Number(values.target), unit:values.unit, usage:Number(values.usage || 0) });
    if (!item.id) state.inventory.push(target);
    await saveState(); renderInventory();
  }});
}

async function deleteInventory(id) {
  const item = state.inventory.find(entry => entry.id === id);
  if (!item || !(await confirmAction('刪除備品', `確定刪除「${item.name}」嗎？`))) return;
  state.inventory = state.inventory.filter(entry => entry.id !== id);
  await saveState(); renderInventory();
}
