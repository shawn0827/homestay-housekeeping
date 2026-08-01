const STORAGE_KEY="homestay_housekeeping_v1";
const TEMPLATES={
 double:{name:"雙人房",icon:"🛏️",groups:[
  ["進房與整理",["確認客人已退房","開窗通風並關閉冷氣","檢查床底、抽屜、冰箱與浴室遺留物","收房內及浴室垃圾","收床單、被套、枕套、浴巾、毛巾及地墊"]],
  ["浴室",["清潔鏡子與洗手台","清潔水龍頭與五金","清潔馬桶","清潔淋浴區與牆面","清潔排水孔","擦乾地板並確認無毛髮"]],
  ["客房",["擦拭桌面、床頭與家具","擦拭電視、遙控器、門把及開關","擦拭冰箱外觀與吹風機","更換並整理床鋪","吸塵床底、桌下及角落","由內向外拖地"]],
  ["備品與驗房",["補礦泉水","補衛生紙","補洗髮精、沐浴乳及潤髮乳","更換垃圾袋","確認吹風機、冷氣、電視、冰箱與 Wi‑Fi","確認房內無異味、床鋪平整、浴室乾爽","關窗、確認燈光並鎖好房門"]]
 ]},
 quad:{name:"四人房",icon:"🛏️",groups:[
  ["進房與整理",["確認客人已退房","開窗通風並關閉冷氣","檢查床底、抽屜、冰箱與浴室遺留物","收房內及浴室垃圾","收全部床單、被套、枕套、浴巾、毛巾及地墊"]],
  ["浴室",["清潔鏡子與洗手台","清潔水龍頭與五金","清潔馬桶","清潔淋浴區與牆面","清潔排水孔","擦乾地板並確認無毛髮"]],
  ["客房",["擦拭桌面、床頭與家具","擦拭電視、遙控器、門把及開關","擦拭冰箱外觀與吹風機","更換並整理全部床鋪","吸塵床底、桌下及角落","由內向外拖地"]],
  ["備品與驗房",["依四人份補礦泉水","補衛生紙","補洗髮精、沐浴乳及潤髮乳","更換垃圾袋","確認吹風機、冷氣、電視、冰箱與 Wi‑Fi","確認房內無異味、床鋪平整、浴室乾爽","關窗、確認燈光並鎖好房門"]]
 ]},
 common:{name:"一樓客餐廳",icon:"🛋️",groups:[
  ["整理",["整理沙發與抱枕","收拾桌面雜物","清空並分類垃圾","檢查入口及大門周邊"]],
  ["清潔",["擦拭餐桌及椅子","擦拭流理台與常用設備外觀","擦拭門把及高接觸位置","掃地或吸塵","由內向外拖地"]],
  ["最後確認",["垃圾袋已更換","空調與燈光正常","空間無異味","物品已放回固定位置"]]
 ]},
 laundry:{name:"洗衣與布巾",icon:"🧺",groups:[
  ["分類與清洗",["乾淨與待洗布巾分開","床單、毛巾及清潔抹布分類","檢查污漬並預處理","依材質選擇正確洗程"]],
  ["烘乾與收納",["布巾完全乾燥","檢查是否仍有污漬或異味","摺疊整齊","依房型放回固定收納位置","記錄破損或需汰換品項"]]
 ]}
};
const DEFAULT_INVENTORY=[
 {id:"water",name:"礦泉水",qty:24,min:8,unit:"瓶"},{id:"tissue",name:"衛生紙",qty:12,min:4,unit:"捲"},
 {id:"shampoo",name:"洗髮精",qty:4,min:1,unit:"瓶"},{id:"bodywash",name:"沐浴乳",qty:4,min:1,unit:"瓶"},
 {id:"conditioner",name:"潤髮乳",qty:4,min:1,unit:"瓶"},{id:"trashbag",name:"垃圾袋",qty:30,min:10,unit:"個"}
];
let state=loadState(),selectedDate=localDateString(),activeArea=null;
function localDateString(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function initialState(){return {settings:{propertyName:"我的民宿"},records:{},inventory:structuredClone(DEFAULT_INVENTORY)}}
function loadState(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY));return p&&p.records?p:initialState()}catch{return initialState()}}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function getRecord(date=selectedDate){
 if(!state.records[date])state.records[date]={date,areas:{},completedAt:null,updatedAt:new Date().toISOString()};
 for(const key of Object.keys(TEMPLATES)){if(!state.records[date].areas[key]){const n=TEMPLATES[key].groups.reduce((x,g)=>x+g[1].length,0);state.records[date].areas[key]={checks:Array(n).fill(false),notes:"",savedAt:null}}}
 return state.records[date]
}
function areaStats(key,r=getRecord()){const c=r.areas[key].checks,d=c.filter(Boolean).length;return {done:d,total:c.length,pct:c.length?Math.round(d/c.length*100):0}}
function dayStats(r=getRecord()){const c=Object.keys(TEMPLATES).flatMap(k=>r.areas[k].checks),d=c.filter(Boolean).length;return {done:d,total:c.length,pct:c.length?Math.round(d/c.length*100):0}}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function showView(id){document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===id));if(id==="dashboardView")renderDashboard();if(id==="historyView")renderHistory();if(id==="inventoryView")renderInventory();scrollTo({top:0,behavior:"smooth"})}
function renderDashboard(){
 const r=getRecord(),s=dayStats(r);workDate.value=selectedDate;totalPercent.textContent=s.pct+"%";totalProgress.style.width=s.pct+"%";
 dayStatus.textContent=r.completedAt?`已保存｜${formatDateTime(r.completedAt)}`:s.pct===100?"所有項目已完成，請保存紀錄":`已完成 ${s.done}／${s.total} 項`;
 areaCards.innerHTML="";
 for(const [key,t] of Object.entries(TEMPLATES)){const a=areaStats(key,r),b=document.createElement("button");b.className="area-card"+(a.pct===100?" done":"");b.innerHTML=`<div class="area-icon">${t.icon}</div><div><div class="area-title">${t.name}</div><div class="area-meta">${a.done}／${a.total} 項 · ${a.pct}%</div></div><div class="mini-progress"><div style="width:${a.pct}%"></div></div>`;b.onclick=()=>openChecklist(key);areaCards.appendChild(b)}saveState()
}
function openChecklist(key){
 activeArea=key;const t=TEMPLATES[key],r=getRecord(),a=r.areas[key];checklistTitle.textContent=t.name;areaNotes.value=a.notes||"";checklistGroups.innerHTML="";let i=0;
 for(const [gn,items] of t.groups){const g=document.createElement("section");g.className="check-group";g.innerHTML=`<h3>${gn}</h3>`;for(const item of items){const n=i++,l=document.createElement("label");l.className="check-item";l.innerHTML=`<input type="checkbox" ${a.checks[n]?"checked":""}><span>${esc(item)}</span>`;l.querySelector("input").onchange=e=>{a.checks[n]=e.target.checked;a.savedAt=null;r.completedAt=null;r.updatedAt=new Date().toISOString();saveState();updateAreaPercent()};g.appendChild(l)}checklistGroups.appendChild(g)}updateAreaPercent();showView("checklistView")
}
function updateAreaPercent(){if(activeArea)areaPercent.textContent=areaStats(activeArea).pct+"%"}
function saveArea(){const r=getRecord(),a=r.areas[activeArea];a.notes=areaNotes.value.trim();a.savedAt=new Date().toISOString();r.updatedAt=a.savedAt;r.completedAt=null;saveState();showView("dashboardView")}
function completeDay(){const r=getRecord(),s=dayStats(r);if(s.pct!==100){alert(`目前完成率 ${s.pct}%。請先完成全部項目。`);return}r.completedAt=new Date().toISOString();r.updatedAt=r.completedAt;Object.keys(TEMPLATES).forEach(k=>{if(!r.areas[k].savedAt)r.areas[k].savedAt=r.completedAt});saveState();renderDashboard();alert("今日房務紀錄已保存。")}
function resetDay(){if(!confirm(`確定清除 ${selectedDate} 的所有勾選與備註嗎？`))return;delete state.records[selectedDate];saveState();renderDashboard()}
function shiftDate(n){const d=new Date(selectedDate+"T12:00:00");d.setDate(d.getDate()+n);selectedDate=localDateString(d);renderDashboard()}
function formatDateTime(iso){return iso?new Intl.DateTimeFormat("zh-TW",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso)):""}
function renderHistory(){
 const m=historyMonth.value||selectedDate.slice(0,7);historyMonth.value=m;const dates=Object.keys(state.records).filter(d=>d.startsWith(m)).sort().reverse();
 if(!dates.length){historyList.innerHTML='<div class="empty">這個月份尚無工作紀錄。</div>';return}
 historyList.innerHTML=dates.map(date=>{const r=state.records[date],s=dayStats(r),details=Object.keys(TEMPLATES).map(k=>`${TEMPLATES[k].name} ${areaStats(k,r).pct}%`).join("　"),notes=Object.keys(TEMPLATES).map(k=>r.areas[k].notes?`${TEMPLATES[k].name}：${esc(r.areas[k].notes)}`:"").filter(Boolean).join("<br>");return `<article class="history-item"><div class="history-head"><div><strong>${date}</strong><div class="muted">${s.done}／${s.total} 項</div></div><span class="${r.completedAt?"status-ok":"status-open"}">${r.completedAt?"已完成":"進行中"} ${s.pct}%</span></div><div class="history-detail">${details}${notes?`<br><br>${notes}`:""}${r.completedAt?`<br>保存時間：${formatDateTime(r.completedAt)}`:""}</div></article>`}).join("")
}
function exportCsv(){
 const rows=[["日期","狀態","完成率","雙人房","四人房","一樓客餐廳","洗衣與布巾","完成時間","備註"]];
 Object.keys(state.records).sort().forEach(date=>{const r=state.records[date],s=dayStats(r),notes=Object.keys(TEMPLATES).map(k=>r.areas[k].notes?`${TEMPLATES[k].name}:${r.areas[k].notes}`:"").filter(Boolean).join("；");rows.push([date,r.completedAt?"已完成":"進行中",s.pct+"%",areaStats("double",r).pct+"%",areaStats("quad",r).pct+"%",areaStats("common",r).pct+"%",areaStats("laundry",r).pct+"%",r.completedAt?new Date(r.completedAt).toLocaleString("zh-TW"):"",notes])});
 const csv="\ufeff"+rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");download(csv,`民宿房務紀錄_${localDateString()}.csv`,"text/csv;charset=utf-8")
}
function renderInventory(){
 if(!state.inventory.length){inventoryList.innerHTML='<div class="empty">尚未建立備品。</div>';return}inventoryList.innerHTML="";
 state.inventory.forEach(item=>{const low=+item.qty<=+item.min,e=document.createElement("article");e.className="inventory-item"+(low?" low":"");e.innerHTML=`<div class="inventory-head"><div><strong>${esc(item.name)}</strong><div class="muted">安全量 ${item.min} ${esc(item.unit)}</div></div><span class="${low?"status-open":"status-ok"}">${low?"需要補貨":"庫存正常"}</span></div><div class="inventory-controls"><button data-a="minus">−</button><strong>${item.qty} ${esc(item.unit)}</strong><button data-a="plus">＋</button><button class="small-link" data-a="edit">編輯</button></div>`;e.querySelector('[data-a="minus"]').onclick=()=>{item.qty=Math.max(0,+item.qty-1);saveState();renderInventory()};e.querySelector('[data-a="plus"]').onclick=()=>{item.qty=+item.qty+1;saveState();renderInventory()};e.querySelector('[data-a="edit"]').onclick=()=>openInventory(item);inventoryList.appendChild(e)})
}
function openInventory(item=null){inventoryDialogTitle.textContent=item?"編輯備品":"新增備品";inventoryId.value=item?.id||"";inventoryName.value=item?.name||"";inventoryQty.value=item?.qty??0;inventoryMin.value=item?.min??0;inventoryUnit.value=item?.unit||"";inventoryDialog.showModal()}
function saveInventory(e){e.preventDefault();const id=inventoryId.value,data={id:id||crypto.randomUUID(),name:inventoryName.value.trim(),qty:+inventoryQty.value,min:+inventoryMin.value,unit:inventoryUnit.value.trim()};if(id){const i=state.inventory.findIndex(x=>x.id===id);if(i>=0)state.inventory[i]=data}else state.inventory.push(data);saveState();inventoryDialog.close();renderInventory()}
function backup(){download(JSON.stringify({app:"民宿房務管理系統",version:1,exportedAt:new Date().toISOString(),data:state},null,2),`民宿房務完整備份_${localDateString()}.json`,"application/json")}
function restore(file){const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result),d=p.data||p;if(!d.records||!d.inventory)throw 0;if(confirm("匯入會覆蓋目前資料，確定繼續嗎？")){state=d;saveState();propertyTitle.textContent=state.settings.propertyName;propertyNameInput.value=state.settings.propertyName;showView("dashboardView");alert("備份匯入完成。")}}catch{alert("無法匯入：檔案格式不正確。")}};r.readAsText(file)}
function download(content,name,type){const a=document.createElement("a"),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
workDate.onchange=e=>{selectedDate=e.target.value;renderDashboard()};prevDateBtn.onclick=()=>shiftDate(-1);nextDateBtn.onclick=()=>shiftDate(1);backBtn.onclick=()=>showView("dashboardView");finishAreaBtn.onclick=saveArea;completeDayBtn.onclick=completeDay;resetDayBtn.onclick=resetDay;historyMonth.onchange=renderHistory;exportCsvBtn.onclick=exportCsv;addInventoryBtn.onclick=()=>openInventory();cancelInventoryBtn.onclick=()=>inventoryDialog.close();inventoryForm.onsubmit=saveInventory;installHelpBtn.onclick=()=>installDialog.showModal();saveSettingsBtn.onclick=()=>{const n=propertyNameInput.value.trim()||"我的民宿";state.settings.propertyName=n;saveState();propertyTitle.textContent=n;alert("名稱已儲存。")};backupBtn.onclick=backup;restoreInput.onchange=e=>{if(e.target.files[0])restore(e.target.files[0]);e.target.value=""};document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showView(b.dataset.view));
propertyTitle.textContent=state.settings.propertyName;propertyNameInput.value=state.settings.propertyName;historyMonth.value=selectedDate.slice(0,7);renderDashboard();if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));
