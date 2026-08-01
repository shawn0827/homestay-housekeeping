/* ================================================================
   reports.js — Excel 與 JSON 報表、備份及還原
   ================================================================ */
'use strict';

function renderReports() {
  $('#app').innerHTML = `
    <section class="page">
      ${settingsBack()}
      ${pageHeader({
        eyebrow: 'REPORTS',
        title: '報表與備份',
        subtitle: 'Excel 查看、JSON 完整還原'
      })}

      <div class="grid grid-2">
        <div class="card">
          <h2>Excel 營運紀錄</h2>
          <p class="muted">包含訂房、房務明細、備品、維修與收支。</p>
          <button class="primary-button full" data-export-excel>匯出 Excel</button>
        </div>

        <div class="card">
          <h2>完整系統備份</h2>
          <p class="muted">JSON 用於完整還原，不建議手動修改。</p>
          <div class="button-row">
            <button class="secondary-button" data-export-json>下載 JSON</button>
            <label class="secondary-button">
              匯入 JSON
              <input data-import-json type="file" accept="application/json" hidden>
            </label>
          </div>
        </div>
      </div>
    </section>
  `;

  bindSettingsBack();
  $('[data-export-excel]').onclick = exportExcel;
  $('[data-export-json]').onclick = exportJson;
  $('[data-import-json]').onchange = event => importJson(event.target.files[0]);
}

/** 建立完整 Excel 活頁簿。 */
function createWorkbook() {
  if (!window.XLSX) throw new Error('Excel 元件尚未載入');

  const workbook = XLSX.utils.book_new();

  const bookings = [
    ['姓名', '電話', '房間', '入住日期', '入住時間', '退房日期', '人數', '平台', '總房價', '訂金', '狀態', '備註'],
    ...state.bookings.map(item => [
      item.guest,
      item.phone,
      roomName(item.roomId),
      item.checkIn,
      item.checkInTime,
      item.checkOut,
      item.guests,
      item.platform,
      item.amount,
      item.deposit,
      item.status,
      item.notes
    ])
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(bookings), '訂房紀錄');

  const housekeeping = [['日期', '區域', '分類', '工作項目', '完成', '備註', '完成時間']];
  Object.entries(state.housekeepingRecords)
    .sort()
    .forEach(([date, record]) => {
      state.areas.forEach(area => {
        area.items.forEach(item => {
          housekeeping.push([
            date,
            area.name,
            item.group,
            item.text,
            record.areas[area.id]?.checks?.[item.id] ? '是' : '否',
            record.areas[area.id]?.notes || '',
            record.completedAt || ''
          ]);
        });
      });
    });
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(housekeeping), '房務明細');

  const inventory = state.inventory.map(item => ({
    品項: item.name,
    目前數量: item.qty,
    安全量: item.min,
    庫存目標: item.target,
    單位: item.unit,
    累計耗用: item.usage
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(inventory), '備品');

  const maintenance = state.maintenance.map(item => ({
    日期: item.date,
    區域: roomName(item.roomId),
    項目: item.title,
    狀態: item.status,
    備註: item.notes
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(maintenance), '維修');

  const transactions = state.transactions.map(item => ({
    日期: item.date,
    類型: transactionTypeLabel(item.type),
    金額: item.amount,
    分類: item.category,
    說明: item.description
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactions), '收支');

  return workbook;
}

function exportExcel() {
  try {
    XLSX.writeFile(createWorkbook(), `民宿營運完整紀錄_${today()}.xlsx`);
  } catch (error) {
    showToast(error.message);
  }
}

function exportJson() {
  const payload = JSON.stringify({
    app: '民宿營運管理系統',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state
  }, null, 2);

  downloadBlob(payload, `民宿營運完整備份_${today()}.json`, 'application/json');
}

function downloadBlob(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importJson(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const payload = JSON.parse(reader.result);
      const incoming = payload.data || payload;

      if (!incoming.settings || !incoming.bookings) {
        throw new Error('備份格式不正確');
      }

      const confirmed = await confirmAction('匯入備份', '匯入會覆蓋目前資料，確定繼續嗎？');
      if (!confirmed) return;

      state = incoming;
      migrateState();
      await saveState();
      showToast('備份已還原');
      navigate('home');
    } catch (error) {
      showToast(error.message);
    }
  };

  reader.readAsText(file);
}
