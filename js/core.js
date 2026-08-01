/**
 * 模組：核心與資料庫
 * 用途：系統預設資料、IndexedDB、本機狀態、共用工具與頁面切換。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

const DB_NAME="homestay_ops_v7",STORE="state",VERSION="8.0.0";
let db,state,activeAreaId=null,settingsAreaId=null,settingsGroup="",googleToken="",tokenExpiry=0;
const $=id=>document.getElementById(id),today=()=>new Date().toISOString().slice(0,10),uid=p=>p+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),esc=s=>String(s??"").replace(/[&<>"']/g,m=>( {
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
} [m]));
// ===== 預設資料 =====
function defaults() {
  let item=(g,t)=>( {
    id:uid("i"),group:g,text:t
  });
  return {
    settings: {
      propertyName:"我的民宿",userName:"民宿主人",google: {
        clientId:"",folderName:"民宿營運管理系統備份",autoSync:true,folderId:"",latestId:""
      }
    },rooms:[ {
      id:"double",name:"雙人房",capacity:2
    }, {
      id:"quad",name:"四人房",capacity:4
    }],templates:[ {
      id:"double",name:"雙人房",icon:"🛏️",items:[item("進房","開窗通風並確認遺留物"),item("整理","收垃圾與布巾"),item("浴室","清潔鏡面、洗手台、馬桶、淋浴區與排水孔"),item("客房","擦拭家具、電器、門把與開關"),item("床鋪","更換床組並整理平整"),item("地板","吸塵並由內向外拖地"),item("備品","補礦泉水、衛生紙、洗髮精、沐浴乳、潤髮乳與垃圾袋"),item("驗房","確認吹風機、冷氣、電視、冰箱、Wi‑Fi、氣味與房門") ]
    }, {
      id:"quad",name:"四人房",icon:"🛏️",items:[item("進房","開窗通風並確認遺留物"),item("整理","收垃圾與全部布巾"),item("浴室","清潔鏡面、洗手台、馬桶、淋浴區與排水孔"),item("客房","擦拭家具、電器、門把與開關"),item("床鋪","更換並整理全部床組"),item("地板","吸塵並由內向外拖地"),item("備品","依四人份補齊客房備品"),item("驗房","確認設備、氣味、浴室與房門") ]
    }, {
      id:"common",name:"一樓客餐廳",icon:"🛋️",items:[item("整理","整理沙發、桌面與入口"),item("清潔","擦拭餐桌、椅子、流理台與門把"),item("地板","掃地或吸塵並拖地"),item("最後確認","倒垃圾、確認空調、燈光與氣味")]
    }, {
      id:"laundry",name:"洗衣與布巾",icon:"🧺",items:[item("分類","床單、毛巾與抹布分類"),item("清洗","檢查污漬並選擇洗程"),item("收納","完全乾燥、摺疊、收納並記錄汰換")]
    }],records: {
    },bookings:[],inventory:[ {
      id:"water",name:"礦泉水",qty:24,min:8,unit:"瓶",usage:0
    }, {
      id:"tissue",name:"衛生紙",qty:12,min:4,unit:"捲",usage:0
    }, {
      id:"shampoo",name:"洗髮精",qty:4,min:1,unit:"瓶",usage:0
    }, {
      id:"body",name:"沐浴乳",qty:4,min:1,unit:"瓶",usage:0
    }, {
      id:"conditioner",name:"潤髮乳",qty:4,min:1,unit:"瓶",usage:0
    }, {
      id:"bags",name:"垃圾袋",qty:30,min:10,unit:"個",usage:0
    }],maintenance:[],transactions:[]
  }
}

// ===== IndexedDB 資料庫 =====
function openDb() {
  return new Promise((res,rej)=> {
    let r=indexedDB.open(DB_NAME,1);
    r.onupgradeneeded=()=>r.result.createObjectStore(STORE);
    r.onsuccess=()=> {
      db=r.result;
      res()
    };
    r.onerror=()=>rej(r.error)
  })
}

function dbGet() {
  return new Promise((res,rej)=> {
    let r=db.transaction(STORE).objectStore(STORE).get("main");
    r.onsuccess=()=>res(r.result);
    r.onerror=()=>rej(r.error)
  })
}

function save() {
  return new Promise((res,rej)=> {
    let tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(state,"main");
    tx.oncomplete=res;
    tx.onerror=()=>rej(tx.error)
  })
}

// ===== 頁面切換與共用介面 =====
function show(id) {
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===id));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===id));
  ( {
    dashboardView:renderDashboard,bookingsView:renderBookings,housekeepingView:renderHousekeeping,inventoryView:renderInventory,maintenanceView:renderMaintenance,financeView:renderFinance,analyticsView:renderAnalytics,basicPage:renderBasic,areasPage:renderSettingsAreas,areaDetailPage:renderSettingsAreaDetail,groupDetailPage:renderSettingsGroup,googlePage:renderGoogle
  } [id]?.());
  scrollTo(0,0)
}

function roomName(id) {
  return state.rooms.find(r=>r.id===id)?.name||id
}

function bookingStatus(b) {
  let d=today();
  if(b.status==='cancelled')return'已取消';
  if(b.status==='completed'||b.checkOut<d)return'已退房';
  if(b.status==='checkedin'||(b.checkIn<=d&&b.checkOut>d))return'住宿中';
  return'已確認'
}
