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

  // --------------------------------------------------------------
  // 1. 營運總覽
  // --------------------------------------------------------------
  const totalIncome = state.transactions
    .filter(item => ['income', 'deposit'].includes(item.type))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpense = state.transactions
    .filter(item => ['expense', 'refund'].includes(item.type))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const completedHousekeepingDays = Object.values(state.housekeepingRecords)
    .filter(record => record.completedAt)
    .length;

  const overview = [
    ['民宿營運管理系統', '完整紀錄'],
    ['匯出時間', new Date().toLocaleString('zh-TW')],
    ['系統版本', APP_VERSION],
    ['民宿名稱', state.settings.propertyName],
    ['使用者', state.settings.account?.name || state.settings.userName],
    ['訂房筆數', state.bookings.length],
    ['完成房務天數', completedHousekeepingDays],
    ['備品項目', state.inventory.length],
    ['維修紀錄', state.maintenance.length],
    ['收入與訂金合計', totalIncome],
    ['退款與支出合計', totalExpense],
    ['累計淨額', totalIncome - totalExpense]
  ];
  appendWorksheet(workbook, overview, '營運總覽', [24, 28]);

  // --------------------------------------------------------------
  // 2. 訂房紀錄
  // --------------------------------------------------------------
  const bookings = [
    ['姓名', '電話', '房間', '入住日期', '入住時間', '退房日期', '人數', '平台', '總房價', '訂金', '狀態', '備註'],
    ...state.bookings.map(item => [
      item.guest || '',
      item.phone || '',
      roomName(item.roomId),
      item.checkIn || '',
      item.checkInTime || '',
      item.checkOut || '',
      Number(item.guests || 0),
      item.platform || '',
      Number(item.amount || 0),
      Number(item.deposit || 0),
      item.status || '',
      item.notes || ''
    ])
  ];
  appendWorksheet(workbook, bookings, '訂房紀錄', [16, 16, 16, 13, 11, 13, 8, 18, 12, 12, 12, 30]);

  // --------------------------------------------------------------
  // 3. 房務逐項明細
  // --------------------------------------------------------------
  const housekeeping = [
    ['日期', '區域', '分類', '工作項目', '完成', '區域備註', '區域儲存時間', '全日完成時間', '照片數量']
  ];

  Object.entries(state.housekeepingRecords)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .forEach(([date, record]) => {
      state.areas.forEach(area => {
        const areaRecord = record.areas?.[area.id] || {};
        area.items.forEach(item => {
          housekeeping.push([
            date,
            area.name,
            item.group,
            item.text,
            areaRecord.checks?.[item.id] ? '是' : '否',
            areaRecord.notes || '',
            areaRecord.savedAt || '',
            record.completedAt || '',
            areaRecord.photos?.length || 0
          ]);
        });
      });
    });

  appendWorksheet(workbook, housekeeping, '房務明細', [13, 18, 16, 38, 8, 30, 22, 22, 10]);

  // --------------------------------------------------------------
  // 4. 房務照片索引
  // 實際照片資料保存在 JSON；Excel 記錄照片數量供稽核。
  // --------------------------------------------------------------
  const photoIndex = [['日期', '區域', '照片數量', '說明']];
  Object.entries(state.housekeepingRecords)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .forEach(([date, record]) => {
      state.areas.forEach(area => {
        const count = record.areas?.[area.id]?.photos?.length || 0;
        if (count > 0) {
          photoIndex.push([
            date,
            area.name,
            count,
            '完整照片內容保存在同一次同步的 JSON 系統還原備份中'
          ]);
        }
      });
    });
  appendWorksheet(workbook, photoIndex, '房務照片索引', [13, 18, 12, 48]);

  // --------------------------------------------------------------
  // 5. 備品
  // --------------------------------------------------------------
  const inventory = [
    ['品項', '目前數量', '安全量', '庫存目標', '單位', '累計耗用', '庫存狀態'],
    ...state.inventory.map(item => [
      item.name,
      Number(item.qty || 0),
      Number(item.min || 0),
      Number(item.target || 0),
      item.unit,
      Number(item.usage || 0),
      Number(item.qty || 0) <= Number(item.min || 0) ? '需要補貨' : '庫存正常'
    ])
  ];
  appendWorksheet(workbook, inventory, '備品', [18, 12, 12, 12, 10, 12, 14]);

  // --------------------------------------------------------------
  // 6. 維修
  // --------------------------------------------------------------
  const maintenance = [
    ['日期', '區域', '項目', '狀態', '備註'],
    ...state.maintenance.map(item => [
      item.date || '',
      roomName(item.roomId),
      item.title || '',
      item.status || '',
      item.notes || ''
    ])
  ];
  appendWorksheet(workbook, maintenance, '維修', [13, 18, 24, 14, 36]);

  // --------------------------------------------------------------
  // 7. 收支
  // --------------------------------------------------------------
  const transactions = [
    ['日期', '類型', '金額', '分類', '說明'],
    ...state.transactions.map(item => [
      item.date || '',
      transactionTypeLabel(item.type),
      Number(item.amount || 0),
      item.category || '',
      item.description || ''
    ])
  ];
  appendWorksheet(workbook, transactions, '收支', [13, 14, 14, 18, 36]);

  // --------------------------------------------------------------
  // 8. SOP 設定
  // --------------------------------------------------------------
  const sop = [['區域', '圖示', '分類', '工作項目', '項目 ID']];
  state.areas.forEach(area => {
    area.items.forEach(item => {
      sop.push([
        area.name,
        area.icon || '',
        item.group,
        item.text,
        item.id
      ]);
    });
  });
  appendWorksheet(workbook, sop, 'SOP設定', [18, 8, 18, 42, 24]);

  return workbook;
}

/** 加入工作表並設定欄寬。 */
function appendWorksheet(workbook, rows, sheetName, columnWidths = []) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

/** 將完整 Excel 活頁簿轉成可上傳的 Blob。 */
function createWorkbookBlob() {
  const data = XLSX.write(createWorkbook(), {
    bookType: 'xlsx',
    type: 'array',
    compression: true
  });

  return new Blob(
    [data],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
}

/** 建立完整系統 JSON 還原備份 Blob。 */
function createJsonBackupBlob() {
  const payload = JSON.stringify({
    app: '民宿營運管理系統',
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: state
  }, null, 2);

  return new Blob([payload], { type: 'application/json' });
}

function exportExcel() {
  try {
    XLSX.writeFile(createWorkbook(), `民宿營運完整紀錄_${today()}.xlsx`);
  } catch (error) {
    showToast(error.message);
  }
}

function exportJson() {
  const blob = createJsonBackupBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `民宿營運完整備份_${today()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
