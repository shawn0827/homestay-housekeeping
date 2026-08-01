const STORAGE_KEY="homestay_housekeeping_v2";
const DB_NAME="homestay_housekeeping_db";
const DB_VERSION=1;
const DB_STORE="app_state";
let dbHandle=null;

function openDb(){
  return new Promise((resolve,reject)=>{
    if(dbHandle)return resolve(dbHandle);
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE);
    };
    req.onsuccess=()=>{dbHandle=req.result;resolve(dbHandle)};
    req.onerror=()=>reject(req.error||new Error("無法開啟 IndexedDB"));
  });
}
async function dbGet(key){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,"readonly");
    const req=tx.objectStore(DB_STORE).get(key);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbSet(key,value){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,"readwrite");
    tx.objectStore(DB_STORE).put(value,key);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbDelete(key){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,"readwrite");
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
}

function uid(prefix="id"){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function defaultTemplates(){
  return [
    {id:"double",name:"雙人房",icon:"🛏️",items:[
      {id:uid("i"),group:"進房與整理",text:"確認客人已退房"},
      {id:uid("i"),group:"進房與整理",text:"開窗通風並關閉冷氣"},
      {id:uid("i"),group:"進房與整理",text:"檢查床底、抽屜、冰箱與浴室遺留物"},
      {id:uid("i"),group:"進房與整理",text:"收房內及浴室垃圾"},
      {id:uid("i"),group:"進房與整理",text:"收床單、被套、枕套、浴巾、毛巾及地墊"},
      {id:uid("i"),group:"浴室",text:"清潔鏡子與洗手台"},
      {id:uid("i"),group:"浴室",text:"清潔水龍頭與五金"},
      {id:uid("i"),group:"浴室",text:"清潔馬桶"},
      {id:uid("i"),group:"浴室",text:"清潔淋浴區、牆面與排水孔"},
      {id:uid("i"),group:"浴室",text:"擦乾地板並確認無毛髮"},
      {id:uid("i"),group:"客房",text:"擦拭桌面、床頭、家具、電視及遙控器"},
      {id:uid("i"),group:"客房",text:"擦拭門把、開關、冰箱外觀及吹風機"},
      {id:uid("i"),group:"客房",text:"更換並整理床鋪"},
      {id:uid("i"),group:"客房",text:"吸塵床底、桌下及角落"},
      {id:uid("i"),group:"客房",text:"由內向外拖地"},
      {id:uid("i"),group:"備品與驗房",text:"補礦泉水"},
      {id:uid("i"),group:"備品與驗房",text:"補衛生紙"},
      {id:uid("i"),group:"備品與驗房",text:"補洗髮精、沐浴乳及潤髮乳"},
      {id:uid("i"),group:"備品與驗房",text:"更換垃圾袋"},
      {id:uid("i"),group:"備品與驗房",text:"確認吹風機、冷氣、電視、冰箱與 Wi-Fi"},
      {id:uid("i"),group:"備品與驗房",text:"確認房內無異味、浴室乾爽並鎖好房門"}
    ]},
    {id:"quad",name:"四人房",icon:"🛏️",items:[
      {id:uid("i"),group:"進房與整理",text:"確認客人已退房"},
      {id:uid("i"),group:"進房與整理",text:"開窗通風並關閉冷氣"},
      {id:uid("i"),group:"進房與整理",text:"檢查床底、抽屜、冰箱與浴室遺留物"},
      {id:uid("i"),group:"進房與整理",text:"收房內及浴室垃圾"},
      {id:uid("i"),group:"進房與整理",text:"收全部床單、被套、枕套、浴巾、毛巾及地墊"},
      {id:uid("i"),group:"浴室",text:"清潔鏡子、洗手台、水龍頭及五金"},
      {id:uid("i"),group:"浴室",text:"清潔馬桶、淋浴區、牆面及排水孔"},
      {id:uid("i"),group:"浴室",text:"擦乾地板並確認無毛髮"},
      {id:uid("i"),group:"客房",text:"擦拭桌面、床頭、家具、電視及遙控器"},
      {id:uid("i"),group:"客房",text:"擦拭門把、開關、冰箱外觀及吹風機"},
      {id:uid("i"),group:"客房",text:"更換並整理全部床鋪"},
      {id:uid("i"),group:"客房",text:"吸塵床底、桌下及角落"},
      {id:uid("i"),group:"客房",text:"由內向外拖地"},
      {id:uid("i"),group:"備品與驗房",text:"依四人份補礦泉水"},
      {id:uid("i"),group:"備品與驗房",text:"補衛生紙、洗髮精、沐浴乳及潤髮乳"},
      {id:uid("i"),group:"備品與驗房",text:"更換垃圾袋"},
      {id:uid("i"),group:"備品與驗房",text:"確認吹風機、冷氣、電視、冰箱與 Wi-Fi"},
      {id:uid("i"),group:"備品與驗房",text:"確認房內無異味、浴室乾爽並鎖好房門"}
    ]},
    {id:"common",name:"一樓客餐廳",icon:"🛋️",items:[
      {id:uid("i"),group:"整理",text:"整理沙發與抱枕"},
      {id:uid("i"),group:"整理",text:"收拾桌面雜物"},
      {id:uid("i"),group:"整理",text:"清空並分類垃圾"},
      {id:uid("i"),group:"清潔",text:"擦拭餐桌、椅子與流理台"},
      {id:uid("i"),group:"清潔",text:"擦拭門把及高接觸位置"},
      {id:uid("i"),group:"清潔",text:"掃地或吸塵"},
      {id:uid("i"),group:"清潔",text:"由內向外拖地"},
      {id:uid("i"),group:"最後確認",text:"更換垃圾袋"},
      {id:uid("i"),group:"最後確認",text:"確認空調、燈光、氣味及入口整潔"}
    ]},
    {id:"laundry",name:"洗衣與布巾",icon:"🧺",items:[
      {id:uid("i"),group:"分類與清洗",text:"乾淨與待洗布巾分開"},
      {id:uid("i"),group:"分類與清洗",text:"床單、毛巾及清潔抹布分類"},
      {id:uid("i"),group:"分類與清洗",text:"檢查污漬並預處理"},
      {id:uid("i"),group:"分類與清洗",text:"依材質選擇正確洗程"},
      {id:uid("i"),group:"烘乾與收納",text:"確認布巾完全乾燥且無異味"},
      {id:uid("i"),group:"烘乾與收納",text:"摺疊整齊並放回固定位置"},
      {id:uid("i"),group:"烘乾與收納",text:"記錄破損或需汰換品項"}
    ]}
  ]
}
const defaultInventory=[
  {id:"water",name:"礦泉水",qty:24,min:8,unit:"瓶"},
  {id:"tissue",name:"衛生紙",qty:12,min:4,unit:"捲"},
  {id:"shampoo",name:"洗髮精",qty:4,min:1,unit:"瓶"},
  {id:"bodywash",name:"沐浴乳",qty:4,min:1,unit:"瓶"},
  {id:"conditioner",name:"潤髮乳",qty:4,min:1,unit:"瓶"},
  {id:"trashbag",name:"垃圾袋",qty:30,min:10,unit:"個"}
];
function initialState(){return{
  settings:{
    propertyName:"我的民宿",
    google:{
      clientId:"",
      folderName:"民宿房務管理系統備份",
      autoSync:true,
      folderId:"",
      latestFileId:"",
      latestExcelFileId:"",
      pendingDates:[]
    }
  },
  templates:defaultTemplates(),
  records:{},
  inventory:structuredClone(defaultInventory)
}}
async function loadState(){
  try{
    let x=await dbGet("state");
    if(!x){
      const oldRaw=localStorage.getItem(STORAGE_KEY);
      if(oldRaw){
        try{
          x=JSON.parse(oldRaw);
          await dbSet("state",x);
          localStorage.setItem("homestay_indexeddb_migrated","1");
        }catch(e){}
      }
    }
    if(x&&x.records){
      if(!x.templates)x.templates=defaultTemplates();
      if(!x.settings)x.settings={propertyName:"我的民宿"};
      if(!x.settings.google)x.settings.google={
        clientId:"",
        folderName:"民宿房務管理系統備份",
        autoSync:true,
        folderId:"",
        latestFileId:"",
        latestExcelFileId:"",
        pendingDates:[]
      };
      if(!Array.isArray(x.settings.google.pendingDates))x.settings.google.pendingDates=[];
      return x;
    }
  }catch(e){
    console.error("IndexedDB 載入失敗",e);
  }
  return initialState();
}
let state=null,selectedDate=localDate(),activeAreaId=null;
let saveTimer=null;
function save(){
  if(!state)return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>dbSet("state",state).catch(e=>console.error("IndexedDB 儲存失敗",e)),50);
}
async function saveNow(){
  clearTimeout(saveTimer);
  await dbSet("state",state);
}
function localDate(d=new Date()){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function getArea(id){return state.templates.find(x=>x.id===id)}
function getRecord(date=selectedDate){
  if(!state.records[date])state.records[date]={date,areas:{},completedAt:null,updatedAt:new Date().toISOString()};
  const r=state.records[date];
  for(const area of state.templates){
    if(!r.areas[area.id])r.areas[area.id]={checks:{},notes:"",savedAt:null};
    for(const item of area.items)if(!(item.id in r.areas[area.id].checks))r.areas[area.id].checks[item.id]=false;
  }
  return r;
}
function areaStats(areaId,r=getRecord()){
  const area=getArea(areaId);if(!area)return{done:0,total:0,pct:0};
  const checks=r.areas[areaId]?.checks||{};
  const done=area.items.filter(i=>checks[i.id]).length,total=area.items.length;
  return{done,total,pct:total?Math.round(done/total*100):100}
}
function dayStats(r=getRecord()){
  let done=0,total=0;for(const a of state.templates){const s=areaStats(a.id,r);done+=s.done;total+=s.total}
  return{done,total,pct:total?Math.round(done/total*100):100}
}
function showView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  if(id==="dashboardView")renderDashboard();
  if(id==="historyView")renderHistory();
  if(id==="inventoryView")renderInventory();
  if(id==="settingsView")renderAreaSettings();
  scrollTo(0,0);
}
function renderDashboard(){
  const r=getRecord(),s=dayStats(r);
  workDate.value=selectedDate;totalPercent.textContent=s.pct+"%";totalProgress.style.width=s.pct+"%";
  dayStatus.textContent=r.completedAt?`已保存｜${formatDateTime(r.completedAt)}`:s.pct===100?"所有項目已完成，請保存紀錄":`已完成 ${s.done}／${s.total} 項`;
  areaCards.innerHTML="";
  for(const a of state.templates){
    const st=areaStats(a.id,r),btn=document.createElement("button");
    btn.className="area-card"+(st.pct===100?" done":"");
    btn.innerHTML=`<div class="area-icon">${escapeHtml(a.icon||"✓")}</div><div><div class="area-title">${escapeHtml(a.name)}</div><div class="area-meta">${st.done}／${st.total} 項 · ${st.pct}%</div></div><div class="mini-progress"><div style="width:${st.pct}%"></div></div>`;
    btn.onclick=()=>openChecklist(a.id);areaCards.appendChild(btn);
  }
  save();
}
function openChecklist(id){
  activeAreaId=id;const area=getArea(id),r=getRecord(),ar=r.areas[id];
  checklistTitle.textContent=area.name;areaNotes.value=ar.notes||"";checklistGroups.innerHTML="";
  const groups=[...new Set(area.items.map(i=>i.group))];
  for(const g of groups){
    const sec=document.createElement("section");sec.className="check-group";sec.innerHTML=`<h3>${escapeHtml(g)}</h3>`;
    for(const item of area.items.filter(i=>i.group===g)){
      const lab=document.createElement("label");lab.className="check-item";
      lab.innerHTML=`<input type="checkbox" ${ar.checks[item.id]?"checked":""}><span>${escapeHtml(item.text)}</span>`;
      lab.querySelector("input").onchange=e=>{ar.checks[item.id]=e.target.checked;ar.savedAt=null;r.completedAt=null;r.updatedAt=new Date().toISOString();save();updateAreaPercent()};
      sec.appendChild(lab);
    }
    checklistGroups.appendChild(sec);
  }
  updateAreaPercent();showView("checklistView");
}
function updateAreaPercent(){if(activeAreaId)areaPercent.textContent=areaStats(activeAreaId).pct+"%"}
function saveArea(){const r=getRecord(),ar=r.areas[activeAreaId];ar.notes=areaNotes.value.trim();ar.savedAt=new Date().toISOString();r.completedAt=null;save();showView("dashboardView")}
async function completeDay(){
  const r=getRecord(),s=dayStats(r);
  if(s.pct!==100)return alert(`目前完成率 ${s.pct}%，請先完成全部項目。`);
  r.completedAt=new Date().toISOString();
  r.cloudSyncStatus="pending";
  markPendingDate(selectedDate);
  save();
  renderDashboard();

  if(state.settings.google.autoSync && googleAccessToken){
    try{
      await syncToGoogleDrive({date:selectedDate,silent:true});
      alert("今日房務紀錄已保存，並已同步至 Google Drive。");
    }catch(err){
      console.error(err);
      alert("今日紀錄已保存在本機；Google Drive 同步未完成，之後重新連線即可補傳。");
    }
  }else{
    alert("今日房務紀錄已保存在本機。Google Drive 未連線，已標記為待同步。");
  }
}
function resetDay(){if(confirm(`確定清除 ${selectedDate} 的所有勾選與備註嗎？`)){delete state.records[selectedDate];save();renderDashboard()}}
function shiftDate(n){const d=new Date(selectedDate+"T12:00:00");d.setDate(d.getDate()+n);selectedDate=localDate(d);renderDashboard()}
function formatDateTime(iso){return iso?new Intl.DateTimeFormat("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso)):""}
function renderHistory(){
  const month=historyMonth.value||selectedDate.slice(0,7);historyMonth.value=month;
  const ds=Object.keys(state.records).filter(d=>d.startsWith(month)).sort().reverse();
  historyList.innerHTML=ds.length?"":'<div class="empty">這個月份尚無工作紀錄。</div>';
  for(const date of ds){
    const r=state.records[date],s=dayStats(r),notes=state.templates.map(a=>r.areas[a.id]?.notes?`${a.name}：${r.areas[a.id].notes}`:"").filter(Boolean).join("<br>");
    const el=document.createElement("article");el.className="history-item";
    el.innerHTML=`<div class="history-head"><div><strong>${date}</strong><div class="muted">${s.done}／${s.total} 項</div></div><span class="${r.completedAt?"status-ok":"status-open"}">${r.completedAt?"已完成":"進行中"} ${s.pct}%</span></div><div class="history-detail">${state.templates.map(a=>`${escapeHtml(a.name)} ${areaStats(a.id,r).pct}%`).join("　")}${notes?`<br><br>${notes}`:""}${r.completedAt?`<br>保存時間：${formatDateTime(r.completedAt)}`:""}</div>`;
    historyList.appendChild(el);
  }
}
function requireExcelLibrary(){
  if(!window.XLSX)throw new Error("Excel 元件尚未載入，請確認網路後重新開啟系統。");
}
function safeSheetName(name){
  return String(name||"工作表").replace(/[\\/?*\[\]:]/g," ").slice(0,31)||"工作表";
}
function setSheetWidths(ws,widths){
  ws["!cols"]=widths.map(w=>({wch:w}));
}
function createDailyWorkbook(date){
  requireExcelLibrary();
  const r=state.records[date]||getRecord(date);
  const stats=dayStats(r);
  const wb=XLSX.utils.book_new();

  const summary=[
    ["民宿房務每日紀錄"],
    ["民宿名稱",state.settings.propertyName],
    ["工作日期",date],
    ["紀錄狀態",r.completedAt?"已完成":"進行中"],
    ["總完成率",stats.pct+"%"],
    ["完成項目",stats.done],
    ["全部項目",stats.total],
    ["完成時間",r.completedAt?new Date(r.completedAt).toLocaleString("zh-TW"):""],
    ["雲端同步時間",r.cloudSyncedAt?new Date(r.cloudSyncedAt).toLocaleString("zh-TW"):""]
  ];
  const wsSummary=XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!merges"]=[XLSX.utils.decode_range("A1:D1")];
  setSheetWidths(wsSummary,[18,38,18,18]);
  XLSX.utils.book_append_sheet(wb,wsSummary,"每日總覽");

  const detail=[["日期","區域","分類","工作項目","完成","區域備註","保存時間"]];
  for(const area of state.templates){
    const ar=r.areas?.[area.id]||{checks:{},notes:"",savedAt:null};
    for(const item of area.items){
      detail.push([
        date,area.name,item.group,item.text,
        ar.checks?.[item.id]?"是":"否",
        ar.notes||"",
        ar.savedAt?new Date(ar.savedAt).toLocaleString("zh-TW"):""
      ]);
    }
  }
  const wsDetail=XLSX.utils.aoa_to_sheet(detail);
  wsDetail["!autofilter"]={ref:`A1:G${detail.length}`};
  setSheetWidths(wsDetail,[13,18,18,48,10,40,22]);
  XLSX.utils.book_append_sheet(wb,wsDetail,"房務明細");
  return wb;
}
function createFullHistoryWorkbook(){
  requireExcelLibrary();
  const wb=XLSX.utils.book_new();
  const dates=Object.keys(state.records).sort();

  const summary=[["日期","狀態","總完成率","完成項目","全部項目","完成時間","雲端同步時間","備註"]];
  for(const date of dates){
    const r=state.records[date],s=dayStats(r);
    const notes=state.templates.map(a=>r.areas?.[a.id]?.notes?`${a.name}：${r.areas[a.id].notes}`:"").filter(Boolean).join("；");
    summary.push([
      date,r.completedAt?"已完成":"進行中",s.pct+"%",s.done,s.total,
      r.completedAt?new Date(r.completedAt).toLocaleString("zh-TW"):"",
      r.cloudSyncedAt?new Date(r.cloudSyncedAt).toLocaleString("zh-TW"):"",
      notes
    ]);
  }
  const wsSummary=XLSX.utils.aoa_to_sheet(summary);
  wsSummary["!autofilter"]={ref:`A1:H${Math.max(1,summary.length)}`};
  setSheetWidths(wsSummary,[13,12,12,12,12,22,22,55]);
  XLSX.utils.book_append_sheet(wb,wsSummary,"歷史總覽");

  const detail=[["日期","區域","分類","工作項目","完成","區域備註","完成時間"]];
  for(const date of dates){
    const r=state.records[date];
    for(const area of state.templates){
      const ar=r.areas?.[area.id]||{checks:{},notes:""};
      for(const item of area.items){
        detail.push([date,area.name,item.group,item.text,ar.checks?.[item.id]?"是":"否",ar.notes||"",r.completedAt?new Date(r.completedAt).toLocaleString("zh-TW"):""]);
      }
    }
  }
  const wsDetail=XLSX.utils.aoa_to_sheet(detail);
  wsDetail["!autofilter"]={ref:`A1:G${Math.max(1,detail.length)}`};
  setSheetWidths(wsDetail,[13,18,18,48,10,40,22]);
  XLSX.utils.book_append_sheet(wb,wsDetail,"全部房務明細");

  const inv=[["品項","目前數量","安全量","單位","庫存狀態"]];
  for(const x of state.inventory)inv.push([x.name,Number(x.qty),Number(x.min),x.unit,Number(x.qty)<=Number(x.min)?"需要補貨":"庫存正常"]);
  const wsInv=XLSX.utils.aoa_to_sheet(inv);
  wsInv["!autofilter"]={ref:`A1:E${Math.max(1,inv.length)}`};
  setSheetWidths(wsInv,[24,14,14,12,16]);
  XLSX.utils.book_append_sheet(wb,wsInv,"備品庫存");

  const sop=[["區域","圖示","分類","工作項目"]];
  for(const area of state.templates)for(const item of area.items)sop.push([area.name,area.icon||"",item.group,item.text]);
  const wsSop=XLSX.utils.aoa_to_sheet(sop);
  wsSop["!autofilter"]={ref:`A1:D${Math.max(1,sop.length)}`};
  setSheetWidths(wsSop,[20,8,20,55]);
  XLSX.utils.book_append_sheet(wb,wsSop,"SOP設定");
  return wb;
}
function workbookArrayBuffer(wb){
  requireExcelLibrary();
  return XLSX.write(wb,{bookType:"xlsx",type:"array",compression:true});
}
function exportExcel(){
  try{
    const wb=createFullHistoryWorkbook();
    const bytes=workbookArrayBuffer(wb);
    downloadBlobContent(bytes,`民宿房務完整紀錄_${localDate()}.xlsx`,"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }catch(err){alert(err.message)}
}
function downloadBlobContent(content,name,type){
  const a=document.createElement("a");
  const blob=content instanceof Blob?content:new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderInventory(){
  inventoryList.innerHTML="";
  for(const item of state.inventory){
    const low=Number(item.qty)<=Number(item.min),el=document.createElement("article");el.className="inventory-item"+(low?" low":"");
    el.innerHTML=`<div class="inventory-head"><div><strong>${escapeHtml(item.name)}</strong><div class="muted">安全量 ${item.min} ${escapeHtml(item.unit)}</div></div><span class="${low?"status-open":"status-ok"}">${low?"需要補貨":"庫存正常"}</span></div><div class="inventory-controls"><button data-a="minus">−</button><strong>${item.qty} ${escapeHtml(item.unit)}</strong><button data-a="plus">＋</button><button class="small-link" data-a="edit">編輯</button><button class="small-link danger" data-a="delete">刪除</button></div>`;
    el.querySelector('[data-a="minus"]').onclick=()=>{item.qty=Math.max(0,+item.qty-1);save();renderInventory()};
    el.querySelector('[data-a="plus"]').onclick=()=>{item.qty=+item.qty+1;save();renderInventory()};
    el.querySelector('[data-a="edit"]').onclick=()=>openInventory(item);
    el.querySelector('[data-a="delete"]').onclick=()=>{if(confirm(`刪除「${item.name}」？`)){state.inventory=state.inventory.filter(x=>x.id!==item.id);save();renderInventory()}};
    inventoryList.appendChild(el);
  }
  if(!state.inventory.length)inventoryList.innerHTML='<div class="empty">尚未建立備品。</div>';
}
function openInventory(item=null){
  inventoryDialogTitle.textContent=item?"編輯備品":"新增備品";inventoryId.value=item?.id||"";inventoryName.value=item?.name||"";inventoryQty.value=item?.qty??0;inventoryMin.value=item?.min??0;inventoryUnit.value=item?.unit||"";inventoryDialog.showModal()
}
function saveInventory(e){
  e.preventDefault();const id=inventoryId.value,data={id:id||uid("stock"),name:inventoryName.value.trim(),qty:+inventoryQty.value,min:+inventoryMin.value,unit:inventoryUnit.value.trim()};
  if(id){const n=state.inventory.findIndex(x=>x.id===id);state.inventory[n]=data}else state.inventory.push(data);
  save();inventoryDialog.close();renderInventory()
}
function renderAreaSettings(){
  areaSettingsList.innerHTML="";
  for(const area of state.templates){
    const wrap=document.createElement("article");wrap.className="settings-area";
    wrap.innerHTML=`<div class="settings-area-head"><div><strong>${escapeHtml(area.icon||"✓")} ${escapeHtml(area.name)}</strong><div class="muted">${area.items.length} 個工作項目</div></div><div class="settings-actions"><button class="small-link" data-a="editArea">修改</button><button class="small-link danger" data-a="deleteArea">刪除</button></div></div><div class="settings-items"></div><button class="secondary-btn add-item-btn" data-a="addItem">＋新增工作項目</button>`;
    wrap.querySelector('[data-a="editArea"]').onclick=()=>openArea(area);
    wrap.querySelector('[data-a="deleteArea"]').onclick=()=>deleteArea(area);
    wrap.querySelector('[data-a="addItem"]').onclick=()=>openItem(area.id);
    const holder=wrap.querySelector(".settings-items");
    for(const item of area.items){
      const row=document.createElement("div");row.className="settings-item";
      row.innerHTML=`<div class="settings-item-main"><small>${escapeHtml(item.group)}</small>${escapeHtml(item.text)}</div><div class="settings-actions"><button class="small-link" data-a="edit">修改</button><button class="small-link danger" data-a="delete">刪除</button></div>`;
      row.querySelector('[data-a="edit"]').onclick=()=>openItem(area.id,item);
      row.querySelector('[data-a="delete"]').onclick=()=>deleteItem(area,item);
      holder.appendChild(row);
    }
    areaSettingsList.appendChild(wrap);
  }
  if(!state.templates.length)areaSettingsList.innerHTML='<div class="empty">尚未建立房務區域。</div>';
}
function openArea(area=null){areaDialogTitle.textContent=area?"修改區域":"新增區域";areaId.value=area?.id||"";areaName.value=area?.name||"";areaIcon.value=area?.icon||"";areaDialog.showModal()}
function saveAreaSetting(e){
  e.preventDefault();const id=areaId.value;
  if(id){const a=getArea(id);a.name=areaName.value.trim();a.icon=areaIcon.value.trim()||"✓"}
  else state.templates.push({id:uid("area"),name:areaName.value.trim(),icon:areaIcon.value.trim()||"✓",items:[]});
  save();areaDialog.close();renderAreaSettings();renderDashboard()
}
function deleteArea(area){
  if(!confirm(`確定刪除「${area.name}」及其全部工作項目？歷史紀錄仍會保留在備份資料中，但畫面不再顯示此區域。`))return;
  state.templates=state.templates.filter(a=>a.id!==area.id);save();renderAreaSettings();renderDashboard()
}
function openItem(areaId,item=null){itemDialogTitle.textContent=item?"修改工作項目":"新增工作項目";itemAreaId.value=areaId;itemId.value=item?.id||"";itemGroup.value=item?.group||"";itemText.value=item?.text||"";itemDialog.showModal()}
function saveItem(e){
  e.preventDefault();const area=getArea(itemAreaId.value),id=itemId.value;
  if(id){const item=area.items.find(i=>i.id===id);item.group=itemGroup.value.trim();item.text=itemText.value.trim()}
  else area.items.push({id:uid("i"),group:itemGroup.value.trim(),text:itemText.value.trim()});
  save();itemDialog.close();renderAreaSettings();renderDashboard()
}
function deleteItem(area,item){if(confirm(`刪除「${item.text}」？`)){area.items=area.items.filter(i=>i.id!==item.id);save();renderAreaSettings();renderDashboard()}}
function backup(){download(JSON.stringify({app:"民宿房務管理系統",version:2,exportedAt:new Date().toISOString(),data:state},null,2),`民宿房務完整備份_${localDate()}.json`,"application/json")}
function restore(file){const r=new FileReader();r.onload=async()=>{try{const p=JSON.parse(r.result),d=p.data||p;if(!d.records||!d.templates)throw 0;if(confirm("匯入會覆蓋目前資料，確定繼續嗎？")){state=d;await saveNow();location.reload()}}catch(e){alert("無法匯入：檔案格式錯誤。")}};r.readAsText(file)}
function download(content,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;document.body.appendChild(a);a.click();a.remove()}

/* =========================
   Google Drive 雲端備份
   ========================= */
const GOOGLE_SCOPE="https://www.googleapis.com/auth/drive.file";
let googleTokenClient=null;
let googleAccessToken="";
let googleTokenExpiresAt=0;
let googleSyncInProgress=false;

function googleConfig(){
  return state.settings.google;
}
function markPendingDate(date){
  const cfg=googleConfig();
  if(!cfg.pendingDates.includes(date))cfg.pendingDates.push(date);
}
function clearPendingDate(date){
  const cfg=googleConfig();
  cfg.pendingDates=cfg.pendingDates.filter(d=>d!==date);
}
function setGoogleStatus(type,title,text){
  const card=document.getElementById("googleStatusCard");
  if(!card)return;
  card.className="cloud-status "+type;
  googleStatusTitle.textContent=title;
  googleStatusText.textContent=text;
}
function renderGoogleSettings(){
  const cfg=googleConfig();
  googleClientIdInput.value=cfg.clientId||"";
  googleFolderNameInput.value=cfg.folderName||"民宿房務管理系統備份";
  googleAutoSyncInput.checked=cfg.autoSync!==false;
  if(googleAccessToken && Date.now()<googleTokenExpiresAt){
    setGoogleStatus("connected","Google Drive 已連接",
      `待同步 ${cfg.pendingDates.length} 天紀錄。連線權杖只在本次開啟期間有效。`);
  }else{
    setGoogleStatus("disconnected","尚未連接 Google Drive",
      cfg.pendingDates.length?`目前有 ${cfg.pendingDates.length} 天紀錄等待同步。`:"本機資料已保存，可按「連接 Google Drive」進行雲端同步。");
  }
}
function saveGoogleSettings(){
  const cfg=googleConfig();
  const newClientId=googleClientIdInput.value.trim();
  const newFolderName=googleFolderNameInput.value.trim()||"民宿房務管理系統備份";
  if(cfg.clientId && cfg.clientId!==newClientId){
    cfg.folderId="";
    cfg.latestFileId="";
    googleAccessToken="";
    googleTokenClient=null;
  }
  if(cfg.folderName && cfg.folderName!==newFolderName){
    cfg.folderId="";
    cfg.latestFileId="";
  }
  cfg.clientId=newClientId;
  cfg.folderName=newFolderName;
  cfg.autoSync=googleAutoSyncInput.checked;
  save();
  renderGoogleSettings();
  alert("Google 雲端設定已儲存。");
}
function initGoogleTokenClient(){
  const cfg=googleConfig();
  if(!cfg.clientId)throw new Error("請先輸入並儲存 Google OAuth Client ID。");
  if(!window.google?.accounts?.oauth2)throw new Error("Google 授權程式尚未載入，請確認網路連線後重試。");
  googleTokenClient=google.accounts.oauth2.initTokenClient({
    client_id:cfg.clientId,
    scope:GOOGLE_SCOPE,
    callback:()=>{}
  });
}
function requestGoogleAccessToken(){
  return new Promise((resolve,reject)=>{
    try{
      initGoogleTokenClient();
      googleTokenClient.callback=(response)=>{
        if(response.error){
          reject(new Error(response.error_description||response.error));
          return;
        }
        googleAccessToken=response.access_token;
        const expires=Number(response.expires_in||3600);
        googleTokenExpiresAt=Date.now()+(expires-60)*1000;
        renderGoogleSettings();
        resolve(response.access_token);
      };
      googleTokenClient.error_callback=(err)=>reject(new Error(err?.message||"Google 授權視窗無法開啟。"));
      googleTokenClient.requestAccessToken({prompt:googleAccessToken?"":"consent"});
    }catch(err){reject(err)}
  });
}
async function connectGoogle(){
  try{
    setGoogleStatus("syncing","正在連接 Google Drive","請在 Google 視窗中選擇帳戶並允許授權。");
    await requestGoogleAccessToken();
    setGoogleStatus("connected","Google Drive 已連接","正在檢查待同步紀錄……");
    if(googleConfig().pendingDates.length)await syncToGoogleDrive({allPending:true,silent:true});
    renderGoogleSettings();
    alert("Google Drive 連接完成。");
  }catch(err){
    console.error(err);
    setGoogleStatus("error","Google Drive 連接失敗",err.message);
    alert(err.message);
  }
}
function disconnectGoogle(){
  if(googleAccessToken && window.google?.accounts?.oauth2){
    try{google.accounts.oauth2.revoke(googleAccessToken,()=>{})}catch(e){}
  }
  googleAccessToken="";
  googleTokenExpiresAt=0;
  googleTokenClient=null;
  renderGoogleSettings();
}
async function authorizedFetch(url,options={}){
  if(!googleAccessToken || Date.now()>=googleTokenExpiresAt)throw new Error("Google 連線已過期，請重新按「連接 Google Drive」。");
  const headers=new Headers(options.headers||{});
  headers.set("Authorization","Bearer "+googleAccessToken);
  const response=await fetch(url,{...options,headers});
  if(response.status===401){
    googleAccessToken="";
    googleTokenExpiresAt=0;
    renderGoogleSettings();
    throw new Error("Google 授權已過期，請重新連接。");
  }
  if(!response.ok){
    let detail="";
    try{detail=(await response.json())?.error?.message||""}catch(e){}
    throw new Error(detail||`Google Drive API 錯誤（${response.status}）`);
  }
  return response;
}
function driveQueryEscape(value){
  return String(value).replaceAll("\\","\\\\").replaceAll("'","\\'");
}
async function findDriveFile(query,fields="files(id,name,mimeType,modifiedTime)"){
  const params=new URLSearchParams({q:query,spaces:"drive",fields,pageSize:"100"});
  const response=await authorizedFetch("https://www.googleapis.com/drive/v3/files?"+params);
  const data=await response.json();
  return data.files||[];
}
async function ensureBackupFolder(){
  const cfg=googleConfig();
  if(cfg.folderId){
    try{
      await authorizedFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(cfg.folderId)}?fields=id,name,trashed`);
      return cfg.folderId;
    }catch(e){cfg.folderId="";}
  }
  const name=cfg.folderName||"民宿房務管理系統備份";
  const files=await findDriveFile(
    `name='${driveQueryEscape(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  if(files[0]){
    cfg.folderId=files[0].id;save();return cfg.folderId;
  }
  const response=await authorizedFetch("https://www.googleapis.com/drive/v3/files?fields=id,name",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder"})
  });
  const folder=await response.json();
  cfg.folderId=folder.id;save();return folder.id;
}
function multipartBody(metadata,content,mimeType="application/json"){
  const boundary="-------homestay_"+Math.random().toString(36).slice(2);
  const body=
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`+
    `--${boundary}\r\nContent-Type: ${mimeType}; charset=UTF-8\r\n\r\n${content}\r\n`+
    `--${boundary}--`;
  return{body,boundary};
}
async function createDriveJsonFile(name,payload,folderId){
  const content=JSON.stringify(payload,null,2);
  const mp=multipartBody({name,parents:[folderId]},content);
  const response=await authorizedFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime",{
    method:"POST",
    headers:{"Content-Type":`multipart/related; boundary=${mp.boundary}`},
    body:mp.body
  });
  return response.json();
}
async function updateDriveJsonFile(fileId,payload){
  const content=JSON.stringify(payload,null,2);
  const mp=multipartBody({},content);
  const response=await authorizedFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,webViewLink,modifiedTime`,{
    method:"PATCH",
    headers:{"Content-Type":`multipart/related; boundary=${mp.boundary}`},
    body:mp.body
  });
  return response.json();
}
function multipartBinaryBody(metadata,arrayBuffer,mimeType){
  const boundary="-------homestay_binary_"+Math.random().toString(36).slice(2);
  const encoder=new TextEncoder();
  const start=encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`+
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const end=encoder.encode(`\r\n--${boundary}--`);
  return{body:new Blob([start,arrayBuffer,end],{type:`multipart/related; boundary=${boundary}`}),boundary};
}
async function createDriveBinaryFile(name,arrayBuffer,mimeType,folderId){
  const mp=multipartBinaryBody({name,parents:[folderId]},arrayBuffer,mimeType);
  const response=await authorizedFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime",{
    method:"POST",
    headers:{"Content-Type":`multipart/related; boundary=${mp.boundary}`},
    body:mp.body
  });
  return response.json();
}
async function updateDriveBinaryFile(fileId,arrayBuffer,mimeType){
  const mp=multipartBinaryBody({},arrayBuffer,mimeType);
  const response=await authorizedFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,webViewLink,modifiedTime`,{
    method:"PATCH",
    headers:{"Content-Type":`multipart/related; boundary=${mp.boundary}`},
    body:mp.body
  });
  return response.json();
}
function fullBackupPayload(){
  return{
    app:"民宿房務管理系統",
    version:4,
    exportedAt:new Date().toISOString(),
    propertyName:state.settings.propertyName,
    data:state
  };
}
function dailyRecordPayload(date){
  const r=state.records[date];
  return{
    app:"民宿房務管理系統",
    version:4,
    recordType:"daily",
    propertyName:state.settings.propertyName,
    date,
    exportedAt:new Date().toISOString(),
    completedAt:r?.completedAt||null,
    record:r||null,
    templates:state.templates
  };
}
async function upsertDailyFile(date,folderId){
  const name=`房務紀錄_${date}.xlsx`;
  const matches=await findDriveFile(
    `name='${driveQueryEscape(name)}' and '${driveQueryEscape(folderId)}' in parents and trashed=false`
  );
  const bytes=workbookArrayBuffer(createDailyWorkbook(date));
  const mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if(matches[0])return updateDriveBinaryFile(matches[0].id,bytes,mime);
  return createDriveBinaryFile(name,bytes,mime,folderId);
}
async function upsertLatestBackup(folderId){
  const cfg=googleConfig();

  // Excel: easy to inspect
  const excelName="民宿房務_完整歷史紀錄.xlsx";
  const excelBytes=workbookArrayBuffer(createFullHistoryWorkbook());
  const excelMime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if(cfg.latestExcelFileId){
    try{await updateDriveBinaryFile(cfg.latestExcelFileId,excelBytes,excelMime)}
    catch(e){cfg.latestExcelFileId=""}
  }
  if(!cfg.latestExcelFileId){
    const matches=await findDriveFile(
      `name='${driveQueryEscape(excelName)}' and '${driveQueryEscape(folderId)}' in parents and trashed=false`
    );
    if(matches[0]){
      cfg.latestExcelFileId=matches[0].id;
      await updateDriveBinaryFile(cfg.latestExcelFileId,excelBytes,excelMime);
    }else{
      const file=await createDriveBinaryFile(excelName,excelBytes,excelMime,folderId);
      cfg.latestExcelFileId=file.id;
    }
  }

  // JSON: system recovery
  const jsonName="民宿房務_系統還原備份.json";
  if(cfg.latestFileId){
    try{await updateDriveJsonFile(cfg.latestFileId,fullBackupPayload());save();return}
    catch(e){cfg.latestFileId=""}
  }
  const jsonMatches=await findDriveFile(
    `name='${driveQueryEscape(jsonName)}' and '${driveQueryEscape(folderId)}' in parents and trashed=false`
  );
  if(jsonMatches[0]){
    cfg.latestFileId=jsonMatches[0].id;
    await updateDriveJsonFile(cfg.latestFileId,fullBackupPayload());
  }else{
    const file=await createDriveJsonFile(jsonName,fullBackupPayload(),folderId);
    cfg.latestFileId=file.id;
  }
  save();
}
async function syncToGoogleDrive({date=null,allPending=false,silent=false}={}){
  if(googleSyncInProgress)throw new Error("目前已有同步作業進行中。");
  googleSyncInProgress=true;
  try{
    setGoogleStatus("syncing","正在同步 Google Drive","請保持此頁開啟。");
    const folderId=await ensureBackupFolder();
    let dates=[];
    if(allPending)dates=[...googleConfig().pendingDates];
    else if(date)dates=[date];
    else dates=Object.keys(state.records).filter(d=>state.records[d]?.completedAt);
    dates=[...new Set(dates)].sort();
    for(const d of dates){
      if(!state.records[d])continue;
      await upsertDailyFile(d,folderId);
      state.records[d].cloudSyncStatus="synced";
      state.records[d].cloudSyncedAt=new Date().toISOString();
      clearPendingDate(d);
      save();
    }
    await upsertLatestBackup(folderId);
    save();
    setGoogleStatus("connected","Google Drive 同步完成",
      `已同步 ${dates.length} 天紀錄，並更新 Excel「民宿房務_完整歷史紀錄.xlsx」。`);
    if(!silent)alert("Google Drive 同步完成。");
  }catch(err){
    setGoogleStatus("error","Google Drive 同步失敗",err.message);
    if(!silent)alert(err.message);
    throw err;
  }finally{
    googleSyncInProgress=false;
  }
}
async function manualGoogleSync(){
  try{
    if(!googleAccessToken)await requestGoogleAccessToken();
    await syncToGoogleDrive({allPending:true});
  }catch(err){console.error(err)}
}
async function restoreLatestFromGoogle(){
  try{
    if(!googleAccessToken)await requestGoogleAccessToken();
    const folderId=await ensureBackupFolder();
    const name="民宿房務_系統還原備份.json";
    let fileId=googleConfig().latestFileId;
    if(!fileId){
      const matches=await findDriveFile(
        `name='${driveQueryEscape(name)}' and '${driveQueryEscape(folderId)}' in parents and trashed=false`
      );
      if(!matches[0])throw new Error("Google Drive 中找不到系統還原備份。");
      fileId=matches[0].id;
    }
    const response=await authorizedFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`);
    const payload=await response.json();
    const incoming=payload.data||payload;
    if(!incoming.records||!incoming.templates)throw new Error("雲端備份格式不正確。");
    if(!confirm("從 Google Drive 還原會覆蓋本機目前資料，確定繼續嗎？"))return;
    state=incoming;
    if(!state.settings.google)state.settings.google=initialState().settings.google;
    await saveNow();
    alert("Google Drive 備份還原完成，系統將重新載入。");
    location.reload();
  }catch(err){
    console.error(err);
    setGoogleStatus("error","雲端還原失敗",err.message);
    alert(err.message);
  }
}


workDate.onchange=e=>{selectedDate=e.target.value;renderDashboard()};prevDateBtn.onclick=()=>shiftDate(-1);nextDateBtn.onclick=()=>shiftDate(1);backBtn.onclick=()=>showView("dashboardView");finishAreaBtn.onclick=saveArea;completeDayBtn.onclick=completeDay;resetDayBtn.onclick=resetDay;historyMonth.onchange=renderHistory;exportCsvBtn.onclick=exportExcel;
addInventoryBtn.onclick=()=>openInventory();cancelInventoryBtn.onclick=()=>inventoryDialog.close();inventoryForm.onsubmit=saveInventory;
saveSettingsBtn.onclick=()=>{state.settings.propertyName=propertyNameInput.value.trim()||"我的民宿";save();propertyTitle.textContent=state.settings.propertyName;alert("名稱已儲存。")};
addAreaBtn.onclick=()=>openArea();cancelAreaBtn.onclick=()=>areaDialog.close();areaForm.onsubmit=saveAreaSetting;cancelItemBtn.onclick=()=>itemDialog.close();itemForm.onsubmit=saveItem;
backupBtn.onclick=backup;restoreInput.onchange=e=>{if(e.target.files[0])restore(e.target.files[0]);e.target.value=""};
saveGoogleSettingsBtn.onclick=saveGoogleSettings;
connectGoogleBtn.onclick=connectGoogle;
syncGoogleBtn.onclick=manualGoogleSync;
restoreGoogleBtn.onclick=restoreLatestFromGoogle;
disconnectGoogleBtn.onclick=disconnectGoogle;
resetTemplatesBtn.onclick=()=>{if(confirm("確定恢復預設房務清單？目前自訂的區域與項目會被取代。")){state.templates=defaultTemplates();save();renderAreaSettings();renderDashboard()}};
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showView(b.dataset.view));

async function startApp(){
  state=await loadState();
  propertyTitle.textContent=state.settings.propertyName;
  propertyNameInput.value=state.settings.propertyName;
  historyMonth.value=selectedDate.slice(0,7);
  renderDashboard();
  renderGoogleSettings();
}
startApp().catch(err=>{
  console.error(err);
  alert("系統資料庫無法啟動，請重新開啟 App。");
});
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));