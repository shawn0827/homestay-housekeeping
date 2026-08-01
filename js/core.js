/* ================================================================
   core.js — 資料模型、IndexedDB、路由與共用 UI
   ================================================================ */
'use strict';

const APP_VERSION = '10.1.0';
// 保留 v9 的資料庫名稱，避免升級 v10 後既有資料消失。
const DB_NAME = 'homestay_operation_v9';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const STATE_KEY = 'app';

let db = null;
let state = null;
let currentRoute = { name: 'home', params: {} };
let saveTimer = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const today = () => localDate(new Date());
const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function localDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

function money(value) {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function defaultAreas() {
  const createItems = groups => groups.flatMap(([group, texts]) => texts.map(text => ({ id: uid('task'), group, text })));
  return [
    { id: 'double', name: '雙人房', icon: '🛏️', items: createItems([
      ['進房整理', ['確認客人已退房', '開窗通風並關閉冷氣', '檢查遺留物', '收垃圾與使用過的布巾']],
      ['浴室', ['清潔鏡子與洗手台', '清潔馬桶與淋浴區', '清潔排水孔', '確認地板乾燥且無毛髮']],
      ['客房', ['擦拭家具、遙控器、門把與開關', '更換並整理床鋪', '吸塵床底與角落', '由內向外拖地']],
      ['備品驗房', ['補礦泉水與衛生紙', '補洗髮精、沐浴乳與潤髮乳', '更換垃圾袋', '確認吹風機、冷氣、電視與 Wi-Fi', '確認無異味並鎖門']]
    ])},
    { id: 'quad', name: '四人房', icon: '👨‍👩‍👧‍👦', items: createItems([
      ['進房整理', ['確認客人已退房', '開窗通風並關閉冷氣', '檢查遺留物', '收垃圾與全部使用過的布巾']],
      ['浴室', ['清潔鏡子與洗手台', '清潔馬桶與淋浴區', '清潔排水孔', '確認地板乾燥且無毛髮']],
      ['客房', ['擦拭家具、遙控器、門把與開關', '更換並整理全部床鋪', '吸塵床底與角落', '由內向外拖地']],
      ['備品驗房', ['依四人份補礦泉水', '補衛生紙與沐浴備品', '更換垃圾袋', '確認吹風機、冷氣、電視與 Wi-Fi', '確認無異味並鎖門']]
    ])},
    { id: 'common', name: '一樓客餐廳', icon: '🛋️', items: createItems([
      ['整理', ['整理沙發與抱枕', '收拾桌面', '清空並分類垃圾']],
      ['清潔', ['擦拭餐桌、椅子與流理台', '擦拭門把與高接觸位置', '掃地或吸塵', '由內向外拖地']],
      ['確認', ['更換垃圾袋', '確認空調、燈光、氣味與入口整潔']]
    ])},
    { id: 'laundry', name: '洗衣與布巾', icon: '🧺', items: createItems([
      ['分類清洗', ['乾淨與待洗布巾分開', '依材質分類', '檢查並預處理污漬', '選擇正確洗程']],
      ['烘乾收納', ['確認完全乾燥且無異味', '摺疊並放回固定位置', '記錄破損或需汰換品項']]
    ])}
  ];
}

function defaultState() {
  return {
    version: APP_VERSION,
    settings: {
      propertyName: '我的民宿',
      userName: '民宿主人',
      google: { clientId: '', folderName: '民宿營運管理系統備份', autoSync: true, folderId: '', backupFileId: '' },
      account: { connected: false, name: '', email: '', picture: '', connectedAt: '' }
    },
    areas: defaultAreas(),
    bookings: [],
    housekeepingRecords: {},
    inventory: [
      { id: 'water', name: '礦泉水', qty: 24, min: 8, target: 24, unit: '瓶', usage: 0 },
      { id: 'tissue', name: '衛生紙', qty: 12, min: 4, target: 12, unit: '捲', usage: 0 },
      { id: 'shampoo', name: '洗髮精', qty: 4, min: 1, target: 4, unit: '瓶', usage: 0 },
      { id: 'bodywash', name: '沐浴乳', qty: 4, min: 1, target: 4, unit: '瓶', usage: 0 },
      { id: 'conditioner', name: '潤髮乳', qty: 4, min: 1, target: 4, unit: '瓶', usage: 0 },
      { id: 'trashbag', name: '垃圾袋', qty: 30, min: 10, target: 30, unit: '個', usage: 0 }
    ],
    maintenance: [],
    transactions: []
  };
}

async function openDatabase() {
  if (db) return db;
  db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return db;
}

async function loadState() {
  const database = await openDatabase();
  const stored = await new Promise((resolve, reject) => {
    const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(STATE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  state = stored || defaultState();
  migrateState();
  return state;
}

function migrateState() {
  const defaults = defaultState();
  state.settings ||= defaults.settings;
  state.settings.account ||= defaults.settings.account;
  state.settings.account.connected = Boolean(state.settings.account.connected || state.settings.account.email);
  state.settings.account.connectedAt ||= '';
  state.settings.google ||= defaults.settings.google;
  state.areas ||= defaults.areas;
  state.bookings ||= [];
  state.bookings.forEach(booking => booking.checkInTime ||= '15:00');
  state.housekeepingRecords ||= {};
  state.inventory ||= defaults.inventory;
  state.inventory.forEach(item => { item.usage ||= 0; item.target ||= Math.max(item.qty, item.min * 2, 1); });
  state.maintenance ||= [];
  state.transactions ||= [];
  state.version = APP_VERSION;
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveState, 80);
}

async function saveState() {
  if (!state) return;
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '') || localStorage.getItem('lastRoute') || 'home';
  const [name = 'home', query = ''] = raw.split('?');
  return { name, params: Object.fromEntries(new URLSearchParams(query)) };
}

function navigate(name, params = {}, { replace = false } = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null)).toString();
  const hash = `#/${name}${query ? `?${query}` : ''}`;
  localStorage.setItem('lastRoute', `${name}${query ? `?${query}` : ''}`);
  if (replace) history.replaceState(null, '', hash); else location.hash = hash;
  if (location.hash === hash) renderRoute();
}

function routeTitle(name) {
  return ({ home: '主頁', bookings: '訂房', housekeeping: '房務', inventory: '備品', maintenance: '維修', finance: '收支', reports: '報表', settings: '設定', account: '帳號' })[name] || '主頁';
}

function setActiveNavigation(name) {
  $$('.bottom-nav button').forEach(button => button.classList.toggle('active', button.dataset.route === name));
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function pageHeader({ eyebrow, title, subtitle = '', actions = '' }) {
  return `<header class="page-header"><div><div class="eyebrow">${escapeHtml(eyebrow)}</div><h1>${escapeHtml(title)}</h1>${subtitle ? `<div class="muted">${escapeHtml(subtitle)}</div>` : ''}</div><div class="page-actions">${actions}</div></header>`;
}

function emptyState(message) { return `<div class="empty">${escapeHtml(message)}</div>`; }
function progressBar(percent, tone = '') { return `<div class="progress ${tone}"><span style="width:${Math.max(0, Math.min(100, percent))}%"></span></div>`; }
function roomName(id) { return state.areas.find(area => area.id === id)?.name || '未指定區域'; }
function roomIcon(id) { return state.areas.find(area => area.id === id)?.icon || '🏠'; }

function openForm({ title, fields, submitText = '儲存', onSubmit }) {
  const dialog = $('#formDialog');
  const form = $('#formDialogBody');
  form.className = 'dialog-card';
  form.innerHTML = `<h2>${escapeHtml(title)}</h2><div class="form-grid">${fields.map(renderField).join('')}</div><div class="dialog-actions"><button type="button" class="secondary-button" data-close>取消</button><button type="submit" class="primary-button">${escapeHtml(submitText)}</button></div>`;
  $('[data-close]', form).onclick = () => dialog.close();
  form.onsubmit = async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const result = await onSubmit(values, form);
    if (result !== false) dialog.close();
  };
  dialog.showModal();
}

function renderField(field) {
  const wide = field.wide ? ' wide' : '';
  const value = field.value ?? '';
  if (field.type === 'select') {
    return `<label class="field${wide}">${escapeHtml(field.label)}<select name="${field.name}" ${field.required ? 'required' : ''}>${field.options.map(option => `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}</select>${field.help ? `<small>${escapeHtml(field.help)}</small>` : ''}</label>`;
  }
  if (field.type === 'textarea') {
    return `<label class="field${wide}">${escapeHtml(field.label)}<textarea name="${field.name}" rows="4" ${field.required ? 'required' : ''}>${escapeHtml(value)}</textarea>${field.help ? `<small>${escapeHtml(field.help)}</small>` : ''}</label>`;
  }
  return `<label class="field${wide}">${escapeHtml(field.label)}<input name="${field.name}" type="${field.type || 'text'}" value="${escapeHtml(value)}" ${field.min != null ? `min="${field.min}"` : ''} ${field.step != null ? `step="${field.step}"` : ''} ${field.required ? 'required' : ''}>${field.help ? `<small>${escapeHtml(field.help)}</small>` : ''}</label>`;
}

function confirmAction(title, message) {
  return new Promise(resolve => {
    const dialog = $('#confirmDialog');
    $('#confirmTitle').textContent = title;
    $('#confirmMessage').textContent = message;
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'default'), { once: true });
    dialog.showModal();
  });
}

async function refreshCurrentPage() {
  renderRoute();
  showToast('畫面已重新整理');
}
