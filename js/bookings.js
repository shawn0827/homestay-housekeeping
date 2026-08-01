/* bookings.js — 訂房、入住與退房管理 */
'use strict';

function renderBookings(params = {}) {
  const month = params.month || params.date?.slice(0, 7) || today().slice(0, 7);
  const filter = params.filter || 'all';
  const date = params.date || today();
  const items = filterBookings({ month, filter, date });
  $('#app').innerHTML = `<section class="page">
    ${pageHeader({ eyebrow: 'BOOKINGS', title: '訂房管理', subtitle: bookingFilterLabel(filter, date), actions: '<button class="primary-button" data-add-booking>＋新增訂房</button>' })}
    <div class="toolbar"><input id="bookingMonth" type="month" value="${month}"><select id="bookingFilter">${bookingFilterOptions(filter)}</select><button class="secondary-button" data-clear-filter>顯示全部</button></div>
    <div class="list">${items.length ? items.map(bookingCard).join('') : emptyState('目前沒有符合條件的訂房。')}</div>
  </section>`;
  $('[data-add-booking]').onclick = () => openBookingForm();
  $('[data-clear-filter]').onclick = () => navigate('bookings', { month });
  $('#bookingMonth').onchange = event => navigate('bookings', { month: event.target.value, filter: filter === 'all' ? '' : filter, date });
  $('#bookingFilter').onchange = event => navigate('bookings', { month, filter: event.target.value, date });
  $$('[data-booking-edit]').forEach(button => button.onclick = () => openBookingForm(state.bookings.find(item => item.id === button.dataset.bookingEdit)));
  $$('[data-booking-status]').forEach(button => button.onclick = () => updateBookingStatus(button.dataset.bookingStatus, button.dataset.status));
  $$('[data-booking-delete]').forEach(button => button.onclick = () => deleteBooking(button.dataset.bookingDelete));
}

function filterBookings({ month, filter, date }) {
  return state.bookings.filter(item => {
    if (filter === 'checkin') return item.checkIn === date && item.status !== 'cancelled';
    if (filter === 'checkout') return item.checkOut === date && item.status !== 'cancelled';
    if (filter === 'staying') return item.checkIn <= date && item.checkOut > date && !['cancelled', 'completed'].includes(item.status);
    if (filter === 'confirmed') return item.status === 'confirmed' && (item.checkIn.startsWith(month) || item.checkOut.startsWith(month));
    if (filter === 'cancelled') return item.status === 'cancelled' && (item.checkIn.startsWith(month) || item.checkOut.startsWith(month));
    return item.checkIn.startsWith(month) || item.checkOut.startsWith(month);
  }).sort((a, b) => `${a.checkIn}${a.checkInTime}`.localeCompare(`${b.checkIn}${b.checkInTime}`));
}

function bookingFilterLabel(filter, date) {
  return ({ checkin: `${date} 今日入住`, checkout: `${date} 今日退房`, staying: `${date} 住宿中`, confirmed: '已確認訂房', cancelled: '已取消訂房', all: '全部訂房' })[filter] || '全部訂房';
}

function bookingFilterOptions(selected) {
  return [['all','全部'],['checkin','今日入住'],['checkout','今日退房'],['staying','住宿中'],['confirmed','已確認'],['cancelled','已取消']].map(([value,label]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`).join('');
}

function bookingCard(item) {
  const statusMap = { confirmed: ['已確認', ''], checkedin: ['已入住', 'success'], completed: ['已退房', 'success'], cancelled: ['已取消', 'danger'] };
  const [statusLabel, tone] = statusMap[item.status] || [item.status, ''];
  return `<article class="list-card"><div class="list-head"><div><div class="list-title">${escapeHtml(item.guest)}・${escapeHtml(roomName(item.roomId))}</div><div class="list-meta">${escapeHtml(item.checkIn)} ${escapeHtml(item.checkInTime || '15:00')} → ${escapeHtml(item.checkOut)}・${item.guests || 1} 人・${escapeHtml(item.platform || '直接訂房')}<br>${money(item.amount)}・訂金 ${money(item.deposit)}${item.phone ? `・${escapeHtml(item.phone)}` : ''}</div></div><span class="status ${tone}">${statusLabel}</span></div>${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}<div class="button-row section"><button class="secondary-button compact" data-booking-edit="${item.id}">修改</button>${item.status === 'confirmed' ? `<button class="primary-button compact" data-booking-status="${item.id}" data-status="checkedin">標記入住</button>` : ''}${item.status === 'checkedin' ? `<button class="primary-button compact" data-booking-status="${item.id}" data-status="completed">標記退房</button>` : ''}${!['cancelled','completed'].includes(item.status) ? `<button class="secondary-button compact" data-booking-status="${item.id}" data-status="cancelled">取消訂房</button>` : ''}<button class="ghost-button" data-booking-delete="${item.id}">刪除</button></div></article>`;
}

function openBookingForm(booking = {}) {
  const arrival = booking.checkIn || today();
  openForm({ title: booking.id ? '修改訂房' : '新增訂房', fields: [
    { name: 'guest', label: '客人姓名', value: booking.guest, required: true },
    { name: 'phone', label: '電話', value: booking.phone },
    { name: 'roomId', label: '房間', type: 'select', value: booking.roomId || state.areas[0]?.id, options: state.areas.filter(area => !['common','laundry'].includes(area.id)).map(area => ({ value: area.id, label: area.name })), required: true },
    { name: 'guests', label: '入住人數', type: 'number', value: booking.guests || 2, min: 1, required: true },
    { name: 'checkIn', label: '入住日期', type: 'date', value: arrival, required: true },
    { name: 'checkInTime', label: '預計入住時間', type: 'time', value: booking.checkInTime || '15:00' },
    { name: 'checkOut', label: '退房日期', type: 'date', value: booking.checkOut || addDays(arrival, 1), required: true },
    { name: 'platform', label: '訂房平台', value: booking.platform || '官網／直接訂房' },
    { name: 'amount', label: '總房價', type: 'number', value: booking.amount || 0, min: 0 },
    { name: 'deposit', label: '訂金', type: 'number', value: booking.deposit || 0, min: 0 },
    { name: 'notes', label: '備註', type: 'textarea', value: booking.notes, wide: true }
  ], onSubmit: async values => {
    if (values.checkOut <= values.checkIn) { showToast('退房日期必須晚於入住日期'); return false; }
    const target = booking.id ? state.bookings.find(item => item.id === booking.id) : { id: uid('booking'), status: 'confirmed' };
    const previousDeposit = Number(target.deposit || 0);
    Object.assign(target, { ...values, guests: Number(values.guests), amount: Number(values.amount || 0), deposit: Number(values.deposit || 0), checkInTime: values.checkInTime || '15:00' });
    if (!booking.id) state.bookings.push(target);
    const depositDifference = Number(target.deposit) - previousDeposit;
    if (depositDifference > 0) state.transactions.push({ id: uid('tx'), date: today(), type: 'deposit', amount: depositDifference, category: '訂金', description: `${target.guest}・${roomName(target.roomId)}` });
    await saveState();
    renderRoute();
    showToast('訂房已儲存');
  }});
  const form = $('#formDialogBody');
  const checkIn = form.elements.checkIn;
  const checkOut = form.elements.checkOut;
  const updateMinimum = () => { const next = addDays(checkIn.value, 1); checkOut.min = next; if (checkOut.value < next) checkOut.value = next; };
  checkIn.addEventListener('change', updateMinimum);
  updateMinimum();
}

async function updateBookingStatus(id, status) {
  const booking = state.bookings.find(item => item.id === id);
  if (!booking) return;
  booking.status = status;
  if (status === 'completed') ensureHousekeepingRecord(booking.checkOut);
  await saveState();
  renderRoute();
}

async function deleteBooking(id) {
  const booking = state.bookings.find(item => item.id === id);
  if (!booking || !(await confirmAction('刪除訂房', `確定刪除 ${booking.guest} 的訂房嗎？`))) return;
  state.bookings = state.bookings.filter(item => item.id !== id);
  await saveState();
  renderRoute();
}
