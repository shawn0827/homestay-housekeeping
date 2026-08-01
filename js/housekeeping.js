/**
 * 模組：房務管理
 * 用途：每日房務紀錄、勾選項目、照片與完成狀態。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== 每日房務資料 =====
function getRecord(d) {
  if(!state.records[d])state.records[d]= {
    date:d,areas: {
    },completedAt:null
  };
  let r=state.records[d];
  state.templates.forEach(a=> {
    if(!r.areas[a.id])r.areas[a.id]= {
      checks: {
      },notes:'',photos:[],savedAt:null,required:true
    };
    a.items.forEach(i=> {
      if(!(i.id in r.areas[a.id].checks))r.areas[a.id].checks[i.id]=false
    })
  });
  return r
}

function areaStats(id,r=getRecord($('workDate').value||today())) {
  let a=state.templates.find(x=>x.id===id),ar=r.areas[id],done=a.items.filter(i=>ar.checks[i.id]).length;
  return {
    done,total:a.items.length,pct:a.items.length?Math.round(done/a.items.length*100):100
  }
}

function dayStats(r) {
  let done=0,total=0;
  state.templates.forEach(a=> {
    let s=areaStats(a.id,r);
    done+=s.done;
    total+=s.total
  });
  return {
    done,total,pct:total?Math.round(done/total*100):100
  }
}

// ===== 房務畫面 =====
function renderHousekeeping() {
  let d=$('workDate').value||today();
  $('workDate').value=d;
  let r=getRecord(d),s=dayStats(r);
  $('totalPercent').textContent=s.pct+'%';
  $('totalProgress').style.width=s.pct+'%';
  $('dayStatus').textContent=r.completedAt?'已保存 '+new Date(r.completedAt).toLocaleString('zh-TW'):`已完成 ${s.done}/${s.total} 項`;
  $('areaCards').innerHTML=state.templates.map(a=> {
    let x=areaStats(a.id,r);
    return`<button class="area-card ${x.pct===100?'done':''}" onclick="openChecklist('${a.id}')"><span>${a.icon}</span><strong>${esc(a.name)}</strong><small>${x.done}/${x.total} 項・${x.pct}%</small><div class="mini-progress"><div style="width:${x.pct}%"></div></div></button>`
  }).join('')
}

window.openChecklist = (id) => {
  activeAreaId = id;
  sessionStorage.setItem("homestay_active_area", id);
  show("checklistView");
};

function renderActiveChecklist() {
  if (!activeAreaId) {
    show("housekeepingView");
    return;
  }

  const area = state.templates.find((item) => item.id === activeAreaId);
  if (!area) {
    activeAreaId = null;
    sessionStorage.removeItem("homestay_active_area");
    show("housekeepingView");
    return;
  }

  const date = $("workDate").value || today();
  const record = getRecord(date);
  const areaRecord = record.areas[activeAreaId];

  $("checklistTitle").textContent = area.name;
  $("areaNotes").value = areaRecord.notes;

  const groups = [...new Set(area.items.map((item) => item.group))];
  $("checklistGroups").innerHTML = groups.map((group) => `
    <section class="check-group">
      <h3>${esc(group)}</h3>
      ${area.items
        .filter((item) => item.group === group)
        .map((item) => `
          <label class="check-item">
            <input
              type="checkbox"
              data-item="${item.id}"
              ${areaRecord.checks[item.id] ? "checked" : ""}
            >
            <span>${esc(item.text)}</span>
          </label>
        `).join("")}
    </section>
  `).join("");

  document.querySelectorAll("[data-item]").forEach((checkbox) => {
    checkbox.onchange = async () => {
      areaRecord.checks[checkbox.dataset.item] = checkbox.checked;
      record.completedAt = null;
      await save();
      updateAreaPct();
    };
  });

  renderPhotos();
  updateAreaPct();
}

function updateAreaPct() {
  $('areaPercent').textContent=areaStats(activeAreaId).pct+'%'
}

function renderPhotos() {
  let ar=getRecord($('workDate').value).areas[activeAreaId];
  $('photoPreview').innerHTML=ar.photos.map((p,i)=>`<div><img src="${p}"><button class="secondary-btn compact danger-text" onclick="removePhoto(${i})">刪除</button></div>`).join('')
} window.removePhoto=async i=> {
  getRecord($('workDate').value).areas[activeAreaId].photos.splice(i,1);
  await save();
  renderPhotos()
};
async function compress(file) {
  let img=new Image(),url=URL.createObjectURL(file);
  await new Promise((r,j)=> {
    img.onload=r;
    img.onerror=j;
    img.src=url
  });
  let max=1000,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');
  c.width=img.width*scale;
  c.height=img.height*scale;
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/jpeg',.72)
}
