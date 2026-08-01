/* ================================================================
   finance.js — 收入、訂金、退款與支出
   ================================================================ */
'use strict';

function monthlyNet(month) {
  return state.transactions
    .filter(item => item.date.startsWith(month))
    .reduce((sum, item) => {
      const direction = ['refund', 'expense'].includes(item.type) ? -1 : 1;
      return sum + direction * Number(item.amount);
    }, 0);
}

function renderFinance(params = {}) {
  const month = params.month || today().slice(0, 7);
  const items = state.transactions
    .filter(item => item.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));

  const income = items
    .filter(item => ['income', 'deposit'].includes(item.type))
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const expenses = items
    .filter(item => ['refund', 'expense'].includes(item.type))
    .reduce((sum, item) => sum + Number(item.amount), 0);

  $('#app').innerHTML = `
    <section class="page">
      ${settingsBack()}
      ${pageHeader({
        eyebrow: 'FINANCE',
        title: '收支管理',
        subtitle: `${month}・淨額 ${money(income - expenses)}`,
        actions: '<button class="primary-button" data-add-transaction>＋新增交易</button>'
      })}

      <div class="toolbar">
        <input id="financeMonth" type="month" value="${month}">
      </div>

      <div class="grid grid-3">
        <div class="card"><div class="muted">收入與訂金</div><strong>${money(income)}</strong></div>
        <div class="card"><div class="muted">退款與支出</div><strong>${money(expenses)}</strong></div>
        <div class="card"><div class="muted">淨額</div><strong>${money(income - expenses)}</strong></div>
      </div>

      <div class="list section">
        ${items.length ? items.map(transactionCard).join('') : emptyState('這個月份沒有收支紀錄。')}
      </div>
    </section>
  `;

  bindSettingsBack();
  $('#financeMonth').onchange = event => navigate('finance', { month: event.target.value });
  $('[data-add-transaction]').onclick = () => openTransactionForm();

  $$('[data-edit-transaction]').forEach(button => {
    button.onclick = () => {
      const item = state.transactions.find(entry => entry.id === button.dataset.editTransaction);
      openTransactionForm(item);
    };
  });

  $$('[data-delete-transaction]').forEach(button => {
    button.onclick = () => deleteTransaction(button.dataset.deleteTransaction);
  });
}

function transactionCard(item) {
  const negative = ['refund', 'expense'].includes(item.type);
  return `
    <article class="list-card">
      <div class="list-head">
        <div>
          <div class="list-title">${escapeHtml(item.description || item.category)}</div>
          <div class="list-meta">${escapeHtml(item.date)}・${transactionTypeLabel(item.type)}・${escapeHtml(item.category || '')}</div>
        </div>
        <strong>${negative ? '-' : '+'}${money(item.amount)}</strong>
      </div>
      <div class="button-row section">
        <button class="secondary-button compact" data-edit-transaction="${item.id}">修改</button>
        <button class="ghost-button" data-delete-transaction="${item.id}">刪除</button>
      </div>
    </article>
  `;
}

function transactionTypeLabel(type) {
  return ({ income: '收入', deposit: '訂金', refund: '退款', expense: '支出' })[type] || type;
}

function openTransactionForm(item = {}) {
  openForm({
    title: item.id ? '修改交易' : '新增交易',
    fields: [
      { name: 'date', label: '日期', type: 'date', value: item.date || today(), required: true },
      {
        name: 'type',
        label: '類型',
        type: 'select',
        value: item.type || 'income',
        options: [
          { value: 'income', label: '收入' },
          { value: 'deposit', label: '訂金' },
          { value: 'refund', label: '退款' },
          { value: 'expense', label: '支出' }
        ]
      },
      { name: 'amount', label: '金額', type: 'number', value: item.amount || 0, min: 0, required: true },
      { name: 'category', label: '分類', value: item.category || '' },
      { name: 'description', label: '說明', value: item.description || '', wide: true }
    ],
    onSubmit: async values => {
      const target = item.id
        ? state.transactions.find(entry => entry.id === item.id)
        : { id: uid('tx') };

      Object.assign(target, values, { amount: Number(values.amount) });
      if (!item.id) state.transactions.push(target);

      await saveState();
      navigate('finance', { month: values.date.slice(0, 7) });
    }
  });
}

async function deleteTransaction(id) {
  const confirmed = await confirmAction('刪除交易', '確定刪除這筆交易嗎？');
  if (!confirmed) return;

  state.transactions = state.transactions.filter(item => item.id !== id);
  await saveState();
  renderRoute();
}
