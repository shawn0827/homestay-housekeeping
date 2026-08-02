/* housekeeping.js — 房務清單、驗房與照片 */
'use strict';

const HOUSEKEEPING_MAX_PHOTOS_PER_AREA = 8;
const HOUSEKEEPING_MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const HOUSEKEEPING_MAX_DATA_URL_BYTES = 1.5 * 1024 * 1024;

function ensureHousekeepingRecord(date) {
  state.housekeepingRecords[date] ||= { date, areas: {}, completedAt: null };
  const record = state.housekeepingRecords[date];
  state.areas.forEach(area => {
    record.areas[area.id] ||= { checks: {}, notes: '', photos: [], savedAt: null };
    area.items.forEach(item => { if (!(item.id in record.areas[area.id].checks)) record.areas[area.id].checks[item.id] = false; });
  });
  return record;
}
function areaHousekeepingStats(date, areaId) {
  const area = state.areas.find(item => item.id === areaId);
  const record = ensureHousekeepingRecord(date).areas[areaId];
  const total = area?.items.length || 0;
  const done = area?.items.filter(item => record.checks[item.id]).length || 0;
  return { done, total, percent: total ? Math.round(done / total * 100) : 100 };
}
function housekeepingStats(date) {
  let done = 0, total = 0;
  state.areas.forEach(area => { const stats = areaHousekeepingStats(date, area.id); done += stats.done; total += stats.total; });
  return { done, total, percent: total ? Math.round(done / total * 100) : 100 };
}
function renderHousekeeping(params = {}) {
  const date = params.date || today();
  const selectedArea = params.area;
  if (selectedArea) return renderHousekeepingChecklist(date, selectedArea, params.group);
  const record = ensureHousekeepingRecord(date);
  const stats = housekeepingStats(date);
  $('#app').innerHTML = `<section class="page">${pageHeader({ eyebrow: 'HOUSEKEEPING', title: '房務管理', subtitle: `${date}・完成率 ${stats.percent}%`, actions: `<input id="housekeepingDate" type="date" value="${date}">` })}<div class="card">${progressBar(stats.percent)}<div class="progress-meta"><span>${stats.done}/${stats.total} 項完成</span><span>${record.completedAt ? `已保存 ${new Date(record.completedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}` : '尚未完成'}</span></div></div><div class="housekeeping-grid section">${state.areas.map(area => housekeepingRoomCard(date, area)).join('')}</div><div class="button-row section"><button class="primary-button" data-complete-housekeeping>完成並保存今日房務</button><button class="secondary-button" data-reset-housekeeping>清除本日房務</button></div></section>`;
  $('#housekeepingDate').onchange = event => navigate('housekeeping', { date: event.target.value });
  $$('[data-area-card]').forEach(button => button.onclick = () => navigate('housekeeping', { date, area: button.dataset.areaCard }));
  $('[data-complete-housekeeping]').onclick = () => completeHousekeeping(date);
  $('[data-reset-housekeeping]').onclick = () => resetHousekeeping(date);
}
function housekeepingRoomCard(date, area) {
  const stats = areaHousekeepingStats(date, area.id);
  const tone = stats.percent < 50 ? 'danger' : stats.percent < 100 ? 'warning' : '';
  return `<button class="card room-card" data-area-card="${area.id}"><div class="room-card-header"><span class="room-name"><span class="room-icon">${area.icon}</span>${escapeHtml(area.name)}</span><span class="status ${stats.percent === 100 ? 'success' : ''}">${stats.percent}%</span></div>${progressBar(stats.percent, tone)}<div class="progress-meta"><span>${stats.done}/${stats.total} 項</span><span>進入清單 ›</span></div></button>`;
}
function renderHousekeepingChecklist(date, areaId, requestedGroup) {
  const area = state.areas.find(item => item.id === areaId);
  if (!area) return navigate('housekeeping', { date }, { replace: true });
  const groups = [...new Set(area.items.map(item => item.group))];
  const activeGroup = groups.includes(requestedGroup) ? requestedGroup : groups[0];
  const record = ensureHousekeepingRecord(date).areas[areaId];
  const stats = areaHousekeepingStats(date, areaId);
  const photoCount = (record.photos || []).length;
  const photoHelp = photoCount >= HOUSEKEEPING_MAX_PHOTOS_PER_AREA
    ? `已達每區 ${HOUSEKEEPING_MAX_PHOTOS_PER_AREA} 張上限`
    : `${photoCount}/${HOUSEKEEPING_MAX_PHOTOS_PER_AREA} 張`;

  $('#app').innerHTML = `<section class="page"><button class="back-button" data-back-housekeeping>← 返回房務總覽</button>${pageHeader({ eyebrow: 'CHECKLIST', title: `${area.icon} ${area.name}`, subtitle: `${date}・${stats.done}/${stats.total} 項`, actions: `<span class="status ${stats.percent === 100 ? 'success' : ''}">${stats.percent}%</span>` })}<div class="checklist-layout"><aside class="group-menu">${groups.map(group => `<button class="group-button ${group === activeGroup ? 'active' : ''}" data-group="${escapeHtml(group)}"><span>${escapeHtml(group)}</span><span>${area.items.filter(item => item.group === group && record.checks[item.id]).length}/${area.items.filter(item => item.group === group).length}</span></button>`).join('')}</aside><div><div class="check-group">${area.items.filter(item => item.group === activeGroup).map(item => `<label class="check-row"><input type="checkbox" data-task="${item.id}" ${record.checks[item.id] ? 'checked' : ''}><span>${escapeHtml(item.text)}</span></label>`).join('')}</div><section class="section card"><label class="field">備註／異常紀錄<textarea id="housekeepingNotes" rows="4" placeholder="例如：吹風機異常、床單污損……">${escapeHtml(record.notes || '')}</textarea></label></section><section class="section card"><div class="section-title"><div><h2>完成照片</h2><div class="muted">${photoHelp}</div></div><label class="secondary-button compact ${photoCount >= HOUSEKEEPING_MAX_PHOTOS_PER_AREA ? 'disabled' : ''}">＋拍照／選取<input id="housekeepingPhoto" type="file" accept="image/*" capture="environment" hidden ${photoCount >= HOUSEKEEPING_MAX_PHOTOS_PER_AREA ? 'disabled' : ''}></label></div><div class="photo-grid">${(record.photos || []).map((photo,index) => `<div class="photo-card"><img src="${photo}" alt="房務照片"><button data-delete-photo="${index}" aria-label="刪除照片">×</button></div>`).join('') || '<div class="muted">尚未加入照片</div>'}</div></section><button class="primary-button full section" data-save-area>儲存此區</button></div></div></section>`;
  $('[data-back-housekeeping]').onclick = () => navigate('housekeeping', { date });
  $$('[data-group]').forEach(button => button.onclick = () => navigate('housekeeping', { date, area: areaId, group: button.dataset.group }));
  $$('[data-task]').forEach(input => input.onchange = async () => { record.checks[input.dataset.task] = input.checked; ensureHousekeepingRecord(date).completedAt = null; scheduleSave(); renderHousekeepingChecklist(date, areaId, activeGroup); });
  $('[data-save-area]').onclick = async () => { record.notes = $('#housekeepingNotes').value.trim(); record.savedAt = new Date().toISOString(); await saveState(); showToast('此區房務已儲存'); };
  const photoInput = $('#housekeepingPhoto');
  if (photoInput) photoInput.onchange = event => addHousekeepingPhoto(date, areaId, event.target.files[0], activeGroup);
  $$('[data-delete-photo]').forEach(button => button.onclick = async () => {
    record.photos.splice(Number(button.dataset.deletePhoto), 1);
    await saveState();
    renderHousekeepingChecklist(date, areaId, activeGroup);
  });
}
async function addHousekeepingPhoto(date, areaId, file, group) {
  if (!file) return;
  const areaRecord = ensureHousekeepingRecord(date).areas[areaId];

  if (!file.type.startsWith('image/')) {
    showToast('請選擇圖片檔案');
    return;
  }
  if (file.size > HOUSEKEEPING_MAX_SOURCE_BYTES) {
    showToast('原始照片過大，請選擇 10MB 以下的圖片');
    return;
  }
  if ((areaRecord.photos || []).length >= HOUSEKEEPING_MAX_PHOTOS_PER_AREA) {
    showToast(`每個區域最多保存 ${HOUSEKEEPING_MAX_PHOTOS_PER_AREA} 張照片`);
    return;
  }

  try {
    const data = await compressImage(file, 1280, .72);
    if (data.length > HOUSEKEEPING_MAX_DATA_URL_BYTES) {
      throw new Error('壓縮後照片仍過大，請改用較小的圖片');
    }

    areaRecord.photos.push(data);
    try {
      await saveState();
    } catch (error) {
      areaRecord.photos.pop();
      if (error?.name === 'QuotaExceededError') {
        throw new Error('裝置儲存空間不足，請刪除舊照片後再試');
      }
      throw error;
    }
    renderHousekeepingChecklist(date, areaId, group);
  } catch (error) {
    showToast(error.message || '照片處理失敗');
  }
}
function compressImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    const release = () => URL.revokeObjectURL(objectUrl);

    image.onload = () => {
      try {
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('瀏覽器無法處理照片');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        reject(error);
      } finally {
        release();
      }
    };
    image.onerror = () => {
      release();
      reject(new Error('照片讀取失敗'));
    };
    image.src = objectUrl;
  });
}
async function completeHousekeeping(date) {
  const stats = housekeepingStats(date);
  if (stats.percent !== 100) return showToast(`目前完成率 ${stats.percent}%，請先完成全部項目`);
  ensureHousekeepingRecord(date).completedAt = new Date().toISOString();
  await saveState();
  renderHousekeeping({ date });
  showToast('今日房務已完成');

  if (state.settings.google.autoSync) {
    try {
      const connected = googleConnected() || await restoreGoogleDriveSession();
      if (connected) {
        await syncGoogleDrive({ silent: true });
      } else {
        showToast('房務已保存；Google 授權需重新連線，尚未自動備份');
      }
    } catch (error) {
      console.error(error);
      showToast('房務已保存，但 Google Drive 自動備份失敗');
    }
  }
}
async function resetHousekeeping(date) {
  if (!(await confirmAction('刪除本日房務資料', `確定刪除 ${date} 的全部勾選、備註、完成時間與照片嗎？此動作無法復原。`))) return;
  delete state.housekeepingRecords[date];
  await saveState();
  renderHousekeeping({ date });
}
