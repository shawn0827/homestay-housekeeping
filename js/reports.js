/**
 * 模組：Excel 與檔案匯出
 * 用途：建立 Excel 工作簿、下載檔案及 JSON 備份。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== Excel 工作簿 =====
function workbook() {
  if(!window.XLSX)throw Error('Excel 元件未載入');
  let wb=XLSX.utils.book_new(),add=(n,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),n);
  add('營運總覽',[['民宿',state.settings.propertyName],['匯出時間',new Date().toLocaleString('zh-TW')],[],['訂房數',state.bookings.length],['房務日期數',Object.keys(state.records).length],['維修件數',state.maintenance.length],['交易筆數',state.transactions.length]]);
  add('訂房紀錄',[['姓名','電話','房間','入住日期','入住時間','退房日期','人數','平台','房價','訂金','狀態','備註'],...state.bookings.map(b=>[b.guest,b.phone,roomName(b.roomId),b.checkIn,b.checkInTime||'',b.checkOut,b.guests,b.platform,b.amount,b.deposit,bookingStatus(b),b.notes])]);
  let hk=[['日期','區域','分類','工作項目','完成','備註','完成時間']];
  Object.entries(state.records).forEach(([d,r])=>state.templates.forEach(a=>a.items.forEach(i=>hk.push([d,a.name,i.group,i.text,r.areas[a.id]?.checks[i.id]?'是':'否',r.areas[a.id]?.notes||'',r.completedAt||'']))));
  add('房務明細',hk);
  add('備品庫存',[['品項','現有量','安全量','單位','累計耗用'],...state.inventory.map(i=>[i.name,i.qty,i.min,i.unit,i.usage||0])]);
  add('維修紀錄',[['日期','區域','項目','狀態','備註'],...state.maintenance.map(m=>[m.date,roomName(m.roomId),m.title,m.status==='done'?'已完成':'待處理',m.notes])]);
  add('營收與退款',[['日期','類型','說明','金額','平台'],...state.transactions.map(t=>[t.date,typeName(t.type),t.title,t.amount,t.platform])]);
  add('SOP設定',[['區域','分類','工作項目'],...state.templates.flatMap(a=>a.items.map(i=>[a.name,i.group,i.text]))]);
  return XLSX.write(wb, {
    bookType:'xlsx',type:'array',compression:true
  })
}

// ===== 檔案下載 =====
function download(data,name,type) {
  let a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([data], {
    type
  }));
  a.download=name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}
