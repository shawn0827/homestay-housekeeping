/* ================================================================
   inventory.js — 備品庫存、進度條與耗用管理

   畫面設計：
   - 每個品項使用一整列，不使用兩欄格狀卡片。
   - 同一列顯示庫存、安全量、目標、累計耗用與操作按鈕。
   ================================================================ */
'use strict';
/** 顯示備品管理頁面。 */
function renderInventory() {
  $('#app').innerHTML = `
    <section class="page">
      ${pageHeader({
        eyebrow: 'INVENTORY',
        title: '備品管理',
        subtitle: '庫存、安全量與累計耗用',
        actions: '<button class="primary-button" data-add-inventory>＋新增備品</button>'
      })}

      <div class="inventory-list">
        ${state.inventory.length
          ? state.inventory.map(inventoryRow).join('')
          : emptyState('尚未建立備品。')}
      </div>
    </section>
  `;
  $('[data-add-inventory]').onclick = () => openInventoryForm();

  $$('[data-inventory-minus]').forEach(button => {
    button.onclick = () => changeInventory(button.dataset.inventoryMinus, -1);
  });

  $$('[data-inventory-plus]').forEach(button => {
    button.onclick = () => changeInventory(button.dataset.inventoryPlus, 1);
  });
  $$('[data-inventory-edit]').forEach(button => {
    button.onclick = () => {
      const item = state.inventory.find(entry => entry.id === button.dataset.inventoryEdit);
      openInventoryForm(item);
    };
  });

  $$('[data-inventory-delete]').forEach(button => {
    button.onclick = () => deleteInventory(button.dataset.inventoryDelete);
  });
}
/** 建立單一備品橫列。 */
function inventoryRow(item) {
  const quantity = Number(item.qty || 0);
  const minimum = Number(item.min || 0);
  const target = Math.max(Number(item.target || 0), minimum * 2, 1);
  const usage = Number(item.usage || 0);
  const percent = Math.round((quantity / target) * 100);
  const low = quantity <= minimum;
  const tone = quantity <= minimum / 2 ? 'danger' : low ? 'warning' : '';
  return `
    <article class="inventory-row">
      <div class="inventory-row-main">
        <div class="inventory-row-head">
          <div>
            <div class="list-title">${escapeHtml(item.name)}</div>
            <div class="list-meta">目標庫存 ${target}${escapeHtml(item.unit)}</div>
          </div>
          <span class="status ${low ? 'danger' : 'success'}">
            ${low ? '需要補貨' : '庫存正常'}
          </span>
        </div>
        <div class="inventory-metrics">
          <div><span>目前庫存</span><strong>${quantity}${escapeHtml(item.unit)}</strong></div>
          <div><span>安全量</span><strong>${minimum}${escapeHtml(item.unit)}</strong></div>
          <div><span>累計耗用</span><strong>${usage}${escapeHtml(item.unit)}</strong></div>
        </div>
        ${progressBar(percent, tone)}
        <div class="progress-meta">
          <span>庫存進度 ${Math.min(100, Math.max(0, percent))}%</span>
          <span>${quantity}／${target}${escapeHtml(item.unit)}</span>
        </div>
      </div>
      <div class="inventory-row-actions">
        <button class="secondary-button compact" data-inventory-minus="${item.id}">−1</button>
        <button class="secondary-button compact" data-inventory-plus="${item.id}">＋1</button>
        <button class="secondary-button compact" data-inventory-edit="${item.id}">修改</button>
        <button class="ghost-button compact" data-inventory-delete="${item.id}">刪除</button>
      </div>
    </article>
  `;
}
/** 增減庫存；只有減少庫存時才增加累計耗用。 */
async function changeInventory(id, difference) {
  const item = state.inventory.find(entry => entry.id === id);
  if (!item) return;
  if (difference < 0 && Number(item.qty) <= 0) return;

  item.qty = Math.max(0, Number(item.qty) + difference);

  if (difference < 0) {
    item.usage = Number(item.usage || 0) + Math.abs(difference);
  }

  await saveState();
  renderInventory();
}
/** 新增或修改備品。 */
function openInventoryForm(item = {}) {
  openForm({
    title: item.id ? '修改備品' : '新增備品',
    fields: [
      { name: 'name', label: '品項名稱', value: item.name, required: true },
      { name: 'qty', label: '目前數量', type: 'number', value: item.qty || 0, min: 0, required: true },
      { name: 'min', label: '最低安全量', type: 'number', value: item.min || 0, min: 0, required: true },
      {
        name: 'target',
        label: '庫存目標',
        type: 'number',
        value: item.target || Math.max(item.qty || 0, (item.min || 0) * 2),
        min: 1,
        help: '進度條以此數量作為 100%。'
      },
      { name: 'unit', label: '單位', value: item.unit || '個', required: true },
      { name: 'usage', label: '累計耗用', type: 'number', value: item.usage || 0, min: 0 }
    ],
    onSubmit: async values => {
      const target = item.id
        ? state.inventory.find(entry => entry.id === item.id)
        : { id: uid('stock') };
      Object.assign(target, {
        name: values.name,
        qty: Number(values.qty),
        min: Number(values.min),
        target: Number(values.target),
        unit: values.unit,
        usage: Number(values.usage || 0)
      });

      if (!item.id) state.inventory.push(target);

      await saveState();
      renderInventory();
    }
  });
}

/** 刪除備品。 */
async function deleteInventory(id) {
  const item = state.inventory.find(entry => entry.id === id);
  if (!item) return;
  const confirmed = await confirmAction('刪除備品', `確定刪除「${item.name}」嗎？`);
  if (!confirmed) return;

  state.inventory = state.inventory.filter(entry => entry.id !== id);
  await saveState();
  renderInventory();
}
