/* housekeeping.js — 房務清單、驗房與照片 */
'use strict';

const MAX_HOUSEKEEPING_PHOTOS_PER_AREA = 6;
const MAX_HOUSEKEEPING_PHOTO_BYTES = 900 * 1024;

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
  $('#app').innerHTML = `<section class="page">${pageHeader({ eyebrow: 'HOUSEKEEPING', title: '房務管理', subtitle: `${date}・完成率 ${stats.percent}%`, actions: `<input id="housekeepingDate" type="date" value="${date}">` })}<div class="card">${progressBar(stats.percent)}<div class="progress-meta"><span>${stats.done}/${stats.total} 項完成</span><span>${record.completedAt ? `已保存 ${new Date(record.completedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})}` : '尚未完成'}</span></div></div><div class="housekeeping-grid section">${state.areas.map(area => housekeepingRoomCard(date, area)).join('')}</div><div class="button-row section"><button class="primary-button" data-complete-housekeeping>完成並保存今日房務</button><button class="secondary-button" data-reset-housekeeping>清除本日勾選</button></div></section>`;
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
  $('#app').innerHTML = `<section class="page"><button class="back-button" data-back-housekeeping>← 返回房務總覽</button>${pageHeader({ eyebrow: 'CHECKLIST', title: `${area.icon} ${area.name}`, subtitle: `${date}・${stats.done}/${stats.total} 項`, actions: `<span class="status ${stats.percent === 100 ? 'success' : ''}">${stats.percent}%</span>` })}<div class="checklist-layout"><aside class="group-menu">${groups.map(group => `<button class="group-button ${group === activeGroup ? 'active' : ''}" data-group="${escapeHtml(group)}"><span>${escapeHtml(group)}</span><span>${area.items.filter(item => item.group === group && record.checks[item.id]).length}/${area.items.filter(item => item.group === group).length}</span></button>`).join('')}</aside><div><div class="check-group">${area.items.filter(item => item.group === activeGroup).map(item => `<label class="check-row"><input type="checkbox" data-task="${item.id}" ${record.checks[item.id] ? 'checked' : ''}><span>${escapeHtml(item.text)}</span></label>`).join('')}</div><section class="section card"><label class="field">備註／異常紀錄<textarea id="housekeepingNotes" rows="4" placeholder="例如：吹風機異常、床單污損……">${escapeHtml(record.notes || '')}</textarea></label></section><section class="section card"><div class="section-title"><h2>完成照片</h2><label class="secondary-button compact">＋拍照／選取<input id="housekeepingPhoto" type="file" accept="image/*" capture="environment" hidden></label></div><div class="muted">每區最多 ${MAX_HOUSEKEEPING_PHOTOS_PER_AREA} 張，單張壓縮後上限約 900 KB。</div><div class="photo-grid">${(record.photos || []).map((photo,index) => `<div class="photo-card"><img src="${photo}" alt="房務照片"><button data-delete-photo="${index}">×</button></div>`).join('') || '<div class="muted">尚未加入照片</div>'}</div></section><button class="primary-button full section" data-save-area>儲存此區</button></div></div></section>`;
  $('[data-back-housekeeping]').onclick = () => navigate('housekeeping', { date });
  $$('[data-group]').forEach(button => button.onclick = () => navigate('housekeeping', { date, area: areaId, group: button.dataset.group }));
  $$('[data-task]').forEach(input => input.onchange = async () => { record.checks[input.dataset.task] = input.checked; ensureHousekeepingRecord(date).completedAt = null; scheduleSave(); renderHousekeepingChecklist(date, areaId, activeGroup); });
  $('[data-save-area]').onclick = async () => { record.notes = $('#housekeepingNotes').value.trim(); record.savedAt = new Date().toISOString(); await saveState(); showToast('此區房務已儲存'); };
  $('#housekeepingPhoto').onchange = event => addHousekeepingPhoto(date, areaId, event.target.files[0], activeGroup);
  $$('[data-delete-photo]').forEach(button => button.onclick = async () => { record.photos.splice(Number(button.dataset.deletePhoto),1); await saveState(); renderHousekeepingChecklist(date, areaId, activeGroup); });
}

function dataUrlByteSize(dataUrl) {
  const base64 = String(dataUrl).split(',')[1] || '';
  return Math.ceil(base64.length * 3 / 4);
}

async function addHousekeepingPhoto(date, areaId, file, group) {
  if (!file) return;
  if (!file.type?.startsWith('image/')) {
    showToast('請選擇圖片檔案');
    return;
  }

  const photos = ensureHousekeepingRecord(date).areas[areaId].photos;
  if (photos.length >= MAX_HOUSEKEEPING_PHOTOS_PER_AREA) {
    showToast(`每區最多 ${MAX_HOUSEKEEPING_PHOTOS_PER_AREA} 張照片`);
    return;
  }

  try {
    const data = await compressImage(file, 1024, .7);
    if (dataUrlByteSize(data) > MAX_HOUSEKEEPING_PHOTO_BYTES) {
      showToast('照片壓縮後仍過大，請改用較小的照片');
      return;
    }

    photos.push(data);
    try {
      await saveState();
    } catch (error) {
      photos.pop();
      console.error('房務照片儲存失敗', error);
      showToast('照片儲存失敗，裝置空間可能不足');
      return;
    }

    renderHousekeepingChecklist(date, areaId, group);
  } catch (error) {
    console.error('房務照片處理失敗', error);
    showToast('照片處理失敗，請重新選擇');
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
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        reject(error);
      } finally {
        release();
      }
    };

    image.onerror = error => {
      release();
      reject(error);
    };
    image.src = objectUrl;
  });
}

async function autoSyncHousekeeping() {
  if (!state.settings.google.autoSync) return;
  if (
    typeof googleConnected !== 'function'
    || typeof restoreGoogleDriveSession !== 'function'
    || typeof syncGoogleDrive !== 'function'
  ) return;

  try {
    const connected = googleConnected() || await restoreGoogleDriveSession();
    if (!connected) {
      showToast('房務已完成；Google Drive 尚未同步');
      return;
    }

    const synced = await syncGoogleDrive({ silent: true });
    if (!synced) showToast('房務已完成；Google Drive 同步失敗');
  } catch (error) {
    console.error('房務自動同步失敗', error);
    showToast('房務已完成；Google Drive 同步失敗');
  }
}

async function completeHousekeeping(date) {
  const stats = housekeepingStats(date);
  if (stats.percent !== 100) return showToast(`目前完成率 ${stats.percent}%，請先完成全部項目`);
  ensureHousekeepingRecord(date).completedAt = new Date().toISOString();
  await saveState();
  renderHousekeeping({ date });
  showToast('今日房務已完成');
  await autoSyncHousekeeping();
}

async function resetHousekeeping(date) {
  if (!(await confirmAction('清除本日房務', `確定清除 ${date} 的全部勾選與備註嗎？已拍攝的照片會保留。`))) return;

  const record = ensureHousekeepingRecord(date);
  Object.values(record.areas).forEach(areaRecord => {
    Object.keys(areaRecord.checks || {}).forEach(itemId => {
      areaRecord.checks[itemId] = false;
    });
    areaRecord.notes = '';
    areaRecord.savedAt = null;
  });
  record.completedAt = null;

  await saveState();
  renderHousekeeping({ date });
}
