/**
 * 模組：訂房管理
 * 用途：訂房清單、新增／修改訂房、入住與退房狀態。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 訂房清單 =====
function renderBookings() {
  let m=$('bookingMonth').value||today().slice(0,7),f=$('bookingFilter').value;
  $('bookingMonth').value=m;
  $('bookingRoom').innerHTML=state.rooms.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  let bs=state.bookings.filter(b=>b.checkIn.startsWith(m)||b.checkOut.startsWith(m)).filter(b=>f==='all'||(f==='upcoming'&&bookingStatus(b)==='已確認')||(f==='stay'&&bookingStatus(b)==='住宿中')||(f==='completed'&&bookingStatus(b)==='已退房')||(f==='cancelled'&&bookingStatus(b)==='已取消')).sort((a,b)=>a.checkIn.localeCompare(b.checkIn));
  $('bookingList').innerHTML=bs.map(b=>`<article class="list-item"><div class="list-head"><div><strong>${esc(b.guest)}｜${esc(roomName(b.roomId))}</strong><div class="muted">${b.checkIn}${b.checkInTime?` ${b.checkInTime}`:""} → ${b.checkOut}・${b.guests}人・${esc(b.platform)}</div></div><span class="tag">${bookingStatus(b)}</span></div><div>房價 $${(+b.amount||0).toLocaleString()}・訂金 $${(+b.deposit||0).toLocaleString()}</div>${b.notes?`<p class="muted">${esc(b.notes)}</p>`:''}<div class="list-actions"><button class="secondary-btn compact" onclick="editBooking('${b.id}')">修改</button><button class="secondary-btn compact" onclick="checkInBooking('${b.id}')">入住</button><button class="secondary-btn compact" onclick="checkoutBooking('${b.id}')">退房</button><button class="secondary-btn compact danger-text" onclick="deleteBooking('${b.id}')">刪除</button></div></article>`).join('')||'<div class="card">沒有符合條件的訂房。</div>'
}

function plusDays(dateString,days) {
  const d=new Date(dateString+'T12:00:00');
  d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ===== 新增／修改訂房 =====
function openBooking(b= {
}) {
  const arrival=b.checkIn||today();
  $('bookingDialogTitle').textContent=b.id?'修改訂房':'新增訂房';
  $('bookingId').value=b.id||'';
  $('guestName').value=b.guest||'';
  $('guestPhone').value=b.phone||'';
  $('bookingRoom').innerHTML=state.rooms.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  $('bookingRoom').value=b.roomId||state.rooms[0]?.id;
  $('checkInDate').value=arrival;
  $('checkOutDate').value=b.checkOut||plusDays(arrival,1);
  $('checkOutDate').min=plusDays(arrival,1);
  $('checkInTime').value=b.checkInTime||'15:00';
  $('guestCount').value=b.guests||2;
  $('bookingPlatform').value=b.platform||'官網／直接訂房';
  $('bookingAmount').value=b.amount||0;
  $('bookingDeposit').value=b.deposit||0;
  $('bookingStatus').value=b.status||'confirmed';
  $('bookingNotes').value=b.notes||'';
  $('bookingDialog').showModal();
} window.editBooking=id=>openBooking(state.bookings.find(b=>b.id===id));
window.deleteBooking=async id=> {
  if(confirm('確定刪除？')) {
    state.bookings=state.bookings.filter(b=>b.id!==id);
    await save();
    renderBookings();
    renderDashboard()
  }
};
window.checkInBooking=async id=> {
  let b=state.bookings.find(x=>x.id===id);
  b.status='checkedin';
  await save();
  renderBookings()
};
window.checkoutBooking=async id=> {
  let b=state.bookings.find(x=>x.id===id);
  b.status='completed';
  let r=getRecord(today());
  if(r.areas[b.roomId])r.areas[b.roomId].required=true;
  await save();
  renderBookings();
  renderDashboard()
};
