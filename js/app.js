/**
 * 模組：系統啟動與事件
 * 用途：集中綁定按鈕事件並啟動應用程式。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 按鈕與表單事件 =====
function bind() {
  document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.onclick=()=>show(b.dataset.view));
  $('homeTitleBtn').onclick=()=>show('dashboardView');
  $('moreNavBtn').onclick=()=>$('moreDialog').showModal();
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=> {
    $('moreDialog').close();
    show(b.dataset.open)
  });
  document.querySelectorAll('.closeDialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>show(b.dataset.page));
  document.querySelectorAll('.settingsBack').forEach(b=>b.onclick=()=>show('settingsView'));
  $('quickBookingBtn').onclick=$('addBookingBtn').onclick=()=>openBooking();
  $('checkInDate').onchange=()=> {
    const next=plusDays($('checkInDate').value,1);
    $('checkOutDate').min=next;
    if(!$('bookingId').value||$('checkOutDate').value<next)$('checkOutDate').value=next
  };
  $('headerUserBtn').onclick=()=>show('accountPage');
  $('connectAccountBtn').onclick = async () => {
    try {
      await connectGoogleAccount();
      alert('Google 帳號已連接');
    } catch (error) {
      alert(error.message);
    }
  };

  $('disconnectAccountBtn').onclick = async () => {
    if (confirm('確定登出並清除已保存的帳號名稱與電子郵件？')) {
      await disconnectGoogleAccount();
    }
  };

  $('bookingForm').onsubmit=async e=> {
    e.preventDefault();
    let id=$('bookingId').value,b=id?state.bookings.find(x=>x.id===id): {
      id:uid('b')
    };
    if($('checkOutDate').value<=$('checkInDate').value)return alert('退房日期必須晚於入住日期。');
    Object.assign(b, {
      guest:$('guestName').value,phone:$('guestPhone').value,roomId:$('bookingRoom').value,checkIn:$('checkInDate').value,checkOut:$('checkOutDate').value,checkInTime:$('checkInTime').value||'15:00',guests:+$('guestCount').value,platform:$('bookingPlatform').value,amount:+$('bookingAmount').value,deposit:+$('bookingDeposit').value,status:$('bookingStatus').value,notes:$('bookingNotes').value
    });
    if(!id)state.bookings.push(b);
    if(b.deposit>0&&!state.transactions.some(t=>t.bookingId===b.id&&t.type==='deposit'))state.transactions.push( {
      id:uid('tx'),bookingId:b.id,date:b.checkIn,type:'deposit',title:`${b.guest} 訂金`,amount:b.deposit,platform:b.platform
    });
    await save();
    $('bookingDialog').close();
    renderBookings();
    renderDashboard()
  };
  $('bookingMonth').onchange=$('bookingFilter').onchange=renderBookings;
  $('workDate').value=today();
  $('workDate').onchange=()=>{sessionStorage.setItem('homestay_work_date',$('workDate').value);renderHousekeeping()};
  $('backChecklistBtn').onclick=()=>show('housekeepingView');
  $('finishAreaBtn').onclick=async()=> {
    let r=getRecord($('workDate').value),ar=r.areas[activeAreaId];
    ar.notes=$('areaNotes').value;
    ar.savedAt=new Date().toISOString();
    await save();
    show('housekeepingView')
  };
  $('areaPhotoInput').onchange=async e=> {
    let ar=getRecord($('workDate').value).areas[activeAreaId];
    for(let f of e.target.files)ar.photos.push(await compress(f));
    await save();
    renderPhotos();
    e.target.value=''
  };
  $('completeDayBtn').onclick=async()=> {
    let r=getRecord($('workDate').value),s=dayStats(r);
    if(s.pct<100)return alert('請先完成全部項目');
    r.completedAt=new Date().toISOString();
    await save();
    renderHousekeeping();
    if(state.settings.google.autoSync&&googleToken)syncGoogle()
  };
  $('resetDayBtn').onclick=async()=> {
    if(confirm('清除本日紀錄？')) {
      delete state.records[$('workDate').value];
      await save();
      renderHousekeeping()
    }
  };
  $('addInventoryBtn').onclick=()=>inventoryForm();
  $('addMaintenanceBtn').onclick=()=>maintenanceForm();
  $('addTransactionBtn').onclick=()=>transactionForm();
  $('financeMonth').onchange=$('financeFilter').onchange=renderFinance;
  $('analyticsMonth').onchange=renderAnalytics;
  $('savePropertyBtn').onclick=async()=> {
    state.settings.propertyName=$('propertyNameInput').value||'我的民宿';
    state.settings.userName=$('userNameInput').value||'民宿主人';
    $('propertyTitle').textContent=state.settings.propertyName;
    refreshHeaderUser();
    await save();
    alert('已儲存')
  };
  $('addRoomBtn').onclick=()=>roomForm();
  $('addAreaBtn').onclick=()=>areaForm();
  $('backAreasBtn').onclick=()=>show('areasPage');
  $('backAreaDetailBtn').onclick=()=>show('areaDetailPage');
  $('editAreaBtn').onclick=()=>areaForm(state.templates.find(x=>x.id===settingsAreaId));
  $('deleteAreaBtn').onclick=async()=> {
    if(confirm('刪除此區域？')) {
      state.templates=state.templates.filter(x=>x.id!==settingsAreaId);
      await save();
      show('areasPage')
    }
  };
  $('addSopItemBtn').onclick=()=>sopForm();
  $('exportExcelBtn').onclick=()=>download(workbook(),`民宿營運完整紀錄_${today()}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  $('backupJsonBtn').onclick=()=>download(JSON.stringify( {
    version:'8.2.0',data:state
  },null,2),`民宿營運備份_${today()}.json`,'application/json');
  $('restoreJsonInput').onchange=e=> {
    let fr=new FileReader();
    fr.onload=async()=> {
      let p=JSON.parse(fr.result);
      if(confirm('覆蓋本機資料？')) {
        state=p.data||p;
        await save();
        location.reload()
      }
    };
    fr.readAsText(e.target.files[0])
  };
  $('saveGoogleBtn').onclick=async()=> {
    Object.assign(state.settings.google, {
      clientId:$('googleClientIdInput').value,folderName:$('googleFolderNameInput').value||'民宿營運管理系統備份',autoSync:$('googleAutoSyncInput').checked
    });
    await save();
    alert('已儲存')
  };
  $('connectGoogleBtn').onclick=async()=> {
    try {
      await connectGoogleAccount();
      renderGoogle()
    } catch(e) {
      alert(e.message)
    }
  };
  $('syncGoogleBtn').onclick=syncGoogle;
  $('restoreGoogleBtn').onclick=restoreCloud;
  $('disconnectGoogleBtn').onclick=()=> {
    googleToken='';
    tokenExpiry=0;
    renderGoogle();
    renderAccount()
  }
}

// ===== 系統啟動 =====
async function start() {
  await openDb();
  state = await dbGet() || defaults();

  state.bookings ??= [];
  state.maintenance ??= [];
  state.transactions ??= [];
  state.rooms ??= defaults().rooms;
  state.settings.google ??= defaults().settings.google;
  state.settings.account ??= defaults().settings.account;
  state.settings.userName ??= "民宿主人";
  state.bookings.forEach((booking) => {
    booking.checkInTime ??= "15:00";
  });

  activeAreaId = sessionStorage.getItem("homestay_active_area") || null;
  settingsAreaId = sessionStorage.getItem("homestay_settings_area") || null;
  settingsGroup = sessionStorage.getItem("homestay_settings_group") || "";

  await save();

  $("propertyTitle").textContent = state.settings.propertyName;
  refreshHeaderUser();

  const savedMonth = sessionStorage.getItem("homestay_booking_month") || today().slice(0, 7);
  const savedFilter = sessionStorage.getItem("homestay_booking_filter") || "all";
  const savedWorkDate = sessionStorage.getItem("homestay_work_date") || today();

  $("bookingMonth").value = savedMonth;
  $("bookingFilter").value = savedFilter;
  $("financeMonth").value = today().slice(0, 7);
  $("analyticsMonth").value = today().slice(0, 7);
  $("workDate").value = savedWorkDate;

  bind();

  const hashView = location.hash.replace("#", "");
  const savedView = hashView || sessionStorage.getItem(VIEW_STORAGE_KEY) || "dashboardView";

  // 若缺少必要的上下文，回到對應的上層頁面。
  let initialView = savedView;
  if (savedView === "checklistView" && !activeAreaId) initialView = "housekeepingView";
  if (["areaDetailPage", "groupDetailPage"].includes(savedView) && !settingsAreaId) {
    initialView = "areasPage";
  }

  show(initialView);
}

start().catch((error) => {
  alert(`系統啟動失敗：${error.message}`);
});
