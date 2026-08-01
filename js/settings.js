/**
 * 模組：系統設定
 * 用途：民宿資料、使用者、房間、房務區域與 SOP。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 基本資料設定 =====
function renderBasic() {
  $('propertyNameInput').value=state.settings.propertyName;
  $('userNameInput').value=state.settings.userName||'民宿主人';
  $('roomList').innerHTML=state.rooms.map(r=>`<div class="settings-list-row"><div style="flex:1"><strong>${esc(r.name)}</strong><small>${r.capacity} 人</small></div><button class="secondary-btn compact" onclick="editRoom('${r.id}')">修改</button><button class="secondary-btn compact danger-text" onclick="deleteRoom('${r.id}')">刪除</button></div>`).join('')
}

// ===== 房務區域設定 =====
function renderSettingsAreas() {
  $('settingsAreaList').innerHTML=state.templates.map(a=>`<button class="settings-list-row" onclick="openSettingsArea('${a.id}')"><span style="font-size:24px">${a.icon}</span><div style="flex:1;text-align:left"><strong>${esc(a.name)}</strong><small>${new Set(a.items.map(i=>i.group)).size} 個分類・${a.items.length} 項</small></div><b>›</b></button>`).join('')
} window.openSettingsArea=id=> {
  settingsAreaId=id;
  sessionStorage.setItem("homestay_settings_area", id);
  show('areaDetailPage')
};
function renderSettingsAreaDetail() {
  let a=state.templates.find(x=>x.id===settingsAreaId);
  if(!a)return show('areasPage');
  $('settingsAreaTitle').textContent=a.icon+' '+a.name;
  $('settingsGroupList').innerHTML=[...new Set(a.items.map(i=>i.group))].map(g=>`<button class="settings-list-row" onclick="openSettingsGroup('${esc(g)}')"><div style="flex:1;text-align:left"><strong>${esc(g)}</strong><small>${a.items.filter(i=>i.group===g).length} 項</small></div><b>›</b></button>`).join('')
} window.openSettingsGroup=g=> {
  settingsGroup=g;
  sessionStorage.setItem("homestay_settings_group", g);
  show('groupDetailPage')
};
function renderSettingsGroup() {
  let a=state.templates.find(x=>x.id===settingsAreaId);
  $('settingsGroupTitle').textContent=a.name+'｜'+settingsGroup;
  $('settingsItemList').innerHTML=a.items.filter(i=>i.group===settingsGroup).map(i=>`<div class="settings-list-row"><div style="flex:1">${esc(i.text)}</div><button class="secondary-btn compact" onclick="editSopItem('${i.id}')">修改</button><button class="secondary-btn compact danger-text" onclick="deleteSopItem('${i.id}')">刪除</button></div>`).join('')
}

function fields(title,defs,onSave) {
  $('simpleTitle').textContent=title;
  $('simpleFields').innerHTML=defs.map(d=>`<label>${d.label}${d.type==='select'?`<select id="f_${d.id}">${d.options.map(o=>`<option value="${o.value??o}">${esc(o.label??o)}</option>`).join('')}</select>`:`<input id="f_${d.id}" type="${d.type||'text'}">`}</label>`).join('');
  defs.forEach(d=> {
    $('f_'+d.id).value=d.value??''
  });
  $('simpleForm').onsubmit=async e=> {
    e.preventDefault();
    let v= {
    };
    defs.forEach(d=>v[d.id]=$('f_'+d.id).value);
    await onSave(v);
    $('simpleDialog').close()
  };
  $('simpleDialog').showModal()
} window.editInventory=id=> {
  let i=state.inventory.find(x=>x.id===id);
  inventoryForm(i)
};
function inventoryForm(i= {
}) {
  fields(i.id?'修改備品':'新增備品',[ {
    id:'name',label:'名稱',value:i.name
  }, {
    id:'qty',label:'目前數量',type:'number',value:i.qty||0
  }, {
    id:'min',label:'安全量',type:'number',value:i.min||0
  }, {
    id:'unit',label:'單位',value:i.unit
  }, {
    id:'usage',label:'累計耗用',type:'number',value:i.usage||0
  }],async v=> {
    if(i.id)Object.assign(i, {
      name:v.name,qty:+v.qty,min:+v.min,unit:v.unit,usage:Math.max(0,+v.usage||0)
    });
    else state.inventory.push( {
      id:uid('stock'),name:v.name,qty:+v.qty,min:+v.min,unit:v.unit,usage:Math.max(0,+v.usage||0)
    });
    await save();
    renderInventory();
  })
} window.deleteInventory=async id=> {
  if(confirm('刪除？')) {
    state.inventory=state.inventory.filter(x=>x.id!==id);
    await save();
    renderInventory()
  }
};
window.editMaintenance=id=>maintenanceForm(state.maintenance.find(x=>x.id===id));
function maintenanceForm(m= {
}) {
  fields(m.id?'修改維修':'新增維修',[ {
    id:'title',label:'項目',value:m.title
  }, {
    id:'roomId',label:'區域',type:'select',options:[...state.rooms.map(r=>( {
      value:r.id,label:r.name
    })), {
      value:'common',label:'公共空間'
    }],value:m.roomId
  }, {
    id:'date',label:'日期',type:'date',value:m.date||today()
  }, {
    id:'status',label:'狀態',type:'select',options:[ {
      value:'open',label:'待處理'
    }, {
      value:'done',label:'已完成'
    }],value:m.status||'open'
  }, {
    id:'notes',label:'備註',value:m.notes
  }],async v=> {
    if(m.id)Object.assign(m,v);
    else state.maintenance.push( {
      id:uid('m'),...v
    });
    await save();
    renderMaintenance();
    renderDashboard()
  })
} window.deleteMaintenance=async id=> {
  if(confirm('刪除？')) {
    state.maintenance=state.maintenance.filter(x=>x.id!==id);
    await save();
    renderMaintenance()
  }
};
window.editTransaction=id=>transactionForm(state.transactions.find(x=>x.id===id));
function transactionForm(t= {
}) {
  fields(t.id?'修改交易':'新增交易',[ {
    id:'date',label:'日期',type:'date',value:t.date||today()
  }, {
    id:'type',label:'類型',type:'select',options:[ {
      value:'income',label:'收入'
    }, {
      value:'deposit',label:'訂金'
    }, {
      value:'refund',label:'退款'
    }, {
      value:'expense',label:'支出'
    }],value:t.type||'income'
  }, {
    id:'title',label:'說明',value:t.title
  }, {
    id:'amount',label:'金額',type:'number',value:t.amount||0
  }, {
    id:'platform',label:'平台／方式',value:t.platform
  }],async v=> {
    v.amount=+v.amount;
    if(t.id)Object.assign(t,v);
    else state.transactions.push( {
      id:uid('tx'),...v
    });
    await save();
    renderFinance();
    renderDashboard()
  })
} window.deleteTransaction=async id=> {
  if(confirm('刪除？')) {
    state.transactions=state.transactions.filter(x=>x.id!==id);
    await save();
    renderFinance()
  }
};
window.editRoom=id=>roomForm(state.rooms.find(x=>x.id===id));
function roomForm(r= {
}) {
  fields(r.id?'修改房間':'新增房間',[ {
    id:'name',label:'房間名稱',value:r.name
  }, {
    id:'capacity',label:'容納人數',type:'number',value:r.capacity||2
  }],async v=> {
    if(r.id)Object.assign(r, {
      name:v.name,capacity:+v.capacity
    });
    else {
      let id=uid('room');
      state.rooms.push( {
        id,name:v.name,capacity:+v.capacity
      });
      state.templates.push( {
        id,name:v.name,icon:'🛏️',items:[]
      })
    } await save();
    renderBasic()
  })
} window.deleteRoom=async id=> {
  if(confirm('刪除房間？')) {
    state.rooms=state.rooms.filter(x=>x.id!==id);
    await save();
    renderBasic()
  }
};
function areaForm(a= {
}) {
  fields(a.id?'修改區域':'新增區域',[ {
    id:'name',label:'名稱',value:a.name
  }, {
    id:'icon',label:'圖示',value:a.icon||'🧹'
  }],async v=> {
    if(a.id)Object.assign(a,v);
    else state.templates.push( {
      id:uid('area'),name:v.name,icon:v.icon,items:[]
    });
    await save();
    renderSettingsAreas();
    if(a.id)renderSettingsAreaDetail()
  })
} window.editSopItem=id=> {
  let a=state.templates.find(x=>x.id===settingsAreaId),i=a.items.find(x=>x.id===id);
  sopForm(i)
};
function sopForm(i= {
  group:settingsGroup
}) {
  fields(i.id?'修改工作項目':'新增工作項目',[ {
    id:'group',label:'分類',value:i.group||settingsGroup
  }, {
    id:'text',label:'內容',value:i.text
  }],async v=> {
    let a=state.templates.find(x=>x.id===settingsAreaId);
    if(i.id)Object.assign(i,v);
    else a.items.push( {
      id:uid('i'),...v
    });
    settingsGroup=v.group;
    await save();
    renderSettingsGroup()
  })
} window.deleteSopItem=async id=> {
  let a=state.templates.find(x=>x.id===settingsAreaId);
  if(confirm('刪除？')) {
    a.items=a.items.filter(x=>x.id!==id);
    await save();
    renderSettingsGroup()
  }
};
