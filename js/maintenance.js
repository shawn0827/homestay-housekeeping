/* ================================================================
   maintenance.js — 維修與異常紀錄
   ================================================================ */
'use strict';

function renderMaintenance() {
  const items = [...state.maintenance].sort((a, b) => b.date.localeCompare(a.date));

  $('#app').innerHTML = `
    <section class="page">
      ${settingsBack()}
      ${pageHeader({
        eyebrow: 'MAINTENANCE',
        title: '維修管理',
        subtitle: '設備異常與處理進度',
        actions: '<button class="primary-button" data-add-maintenance>＋新增維修</button>'
      })}

      <div class="list">
        ${items.length ? items.map(maintenanceCard).join('') : emptyState('目前沒有維修紀錄。')}
      </div>
    </section>
  `;

  bindSettingsBack();
  $('[data-add-maintenance]').onclick = () => openMaintenanceForm();

  $$('[data-edit-maintenance]').forEach(button => {
    button.onclick = () => {
      const item = state.maintenance.find(entry => entry.id === button.dataset.editMaintenance);
      openMaintenanceForm(item);
    };
  });

  $$('[data-toggle-maintenance]').forEach(button => {
    button.onclick = async () => {
      const item = state.maintenance.find(entry => entry.id === button.dataset.toggleMaintenance);
      item.status = item.status === 'done' ? 'open' : 'done';
      await saveState();
      renderMaintenance();
    };
  });

  $$('[data-delete-maintenance]').forEach(button => {
    button.onclick = () => deleteMaintenance(button.dataset.deleteMaintenance);
  });
}

function maintenanceCard(item) {
  const done = item.status === 'done';
  return `
    <article class="list-card">
      <div class="list-head">
        <div>
          <div class="list-title">${escapeHtml(item.title)}</div>
          <div class="list-meta">${escapeHtml(roomName(item.roomId))}・${escapeHtml(item.date)}</div>
        </div>
        <span class="status ${done ? 'success' : 'warning'}">${done ? '已完成' : '待處理'}</span>
      </div>
      ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
      <div class="button-row section">
        <button class="secondary-button compact" data-edit-maintenance="${item.id}">修改</button>
        <button class="primary-button compact" data-toggle-maintenance="${item.id}">${done ? '重新開啟' : '標記完成'}</button>
        <button class="ghost-button" data-delete-maintenance="${item.id}">刪除</button>
      </div>
    </article>
  `;
}

function openMaintenanceForm(item = {}) {
  openForm({
    title: item.id ? '修改維修' : '新增維修',
    fields: [
      { name: 'title', label: '維修項目', value: item.title, required: true },
      {
        name: 'roomId',
        label: '區域',
        type: 'select',
        value: item.roomId || state.areas[0]?.id,
        options: state.areas.map(area => ({ value: area.id, label: area.name }))
      },
      { name: 'date', label: '發現日期', type: 'date', value: item.date || today(), required: true },
      {
        name: 'status',
        label: '狀態',
        type: 'select',
        value: item.status || 'open',
        options: [
          { value: 'open', label: '待處理' },
          { value: 'done', label: '已完成' }
        ]
      },
      { name: 'notes', label: '備註', type: 'textarea', value: item.notes, wide: true }
    ],
    onSubmit: async values => {
      const target = item.id
        ? state.maintenance.find(entry => entry.id === item.id)
        : { id: uid('repair') };

      Object.assign(target, values);
      if (!item.id) state.maintenance.push(target);

      await saveState();
      renderMaintenance();
    }
  });
}

async function deleteMaintenance(id) {
  const item = state.maintenance.find(entry => entry.id === id);
  if (!item) return;

  const confirmed = await confirmAction('刪除維修', `確定刪除「${item.title}」嗎？`);
  if (!confirmed) return;

  state.maintenance = state.maintenance.filter(entry => entry.id !== id);
  await saveState();
  renderMaintenance();
}
