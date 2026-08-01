/**
 * 模組：Google Drive
 * 用途：OAuth 登入、雲端同步、Excel 上傳與資料還原。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== Google OAuth 與 Drive API =====
const SCOPE='https://www.googleapis.com/auth/drive.file';
function renderGoogle() {
  let g=state.settings.google;
  $('googleClientIdInput').value=g.clientId;
  $('googleFolderNameInput').value=g.folderName;
  $('googleAutoSyncInput').checked=g.autoSync;
  $('googleStatus').textContent=googleToken?'Google Drive 已連接':'尚未連接 Google Drive'
}

function requestToken() {
  return new Promise((res,rej)=> {
    let g=state.settings.google;
    if(!g.clientId)return rej(Error('請先輸入 Client ID'));
    google.accounts.oauth2.initTokenClient( {
      client_id:g.clientId,scope:SCOPE,callback:r=> {
        if(r.error)return rej(Error(r.error));
        googleToken=r.access_token;
        tokenExpiry=Date.now()+(r.expires_in-60)*1000;
        res()
      }
    }).requestAccessToken( {
      prompt:''
    })
  })
}

async function gfetch(url,opt= {
}) {
  if(!googleToken||Date.now()>tokenExpiry)await requestToken();
  opt.headers= {
    ...(opt.headers|| {
    }),Authorization:'Bearer '+googleToken
  };
  let r=await fetch(url,opt);
  if(!r.ok)throw Error((await r.text())||'Google API 錯誤');
  return r
}

async function ensureFolder() {
  let g=state.settings.google;
  if(g.folderId)return g.folderId;
  let q=encodeURIComponent(`name='${g.folderName.replaceAll("'","\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`),d=await(await gfetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`)).json();
  if(d.files[0])g.folderId=d.files[0].id;
  else g.folderId=(await(await gfetch('https://www.googleapis.com/drive/v3/files?fields=id', {
    method:'POST',headers: {
      'Content-Type':'application/json'
    },body:JSON.stringify( {
      name:g.folderName,mimeType:'application/vnd.google-apps.folder'
    })
  })).json()).id;
  await save();
  return g.folderId
}

async function upload(name,blob,mime) {
  let folder=await ensureFolder(),q=encodeURIComponent(`name='${name.replaceAll("'","\\'")}' and '${folder}' in parents and trashed=false`),found=await(await gfetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`)).json(),meta=found.files[0]? {
  }: {
    name,parents:[folder]
  },boundary='----ops'+Math.random().toString(36).slice(2),body=new Blob([`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(meta)}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,blob,`\r\n--${boundary}--`]),url=found.files[0]?`https://www.googleapis.com/upload/drive/v3/files/${found.files[0].id}?uploadType=multipart`:'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  await gfetch(url, {
    method:found.files[0]?'PATCH':'POST',headers: {
      'Content-Type':`multipart/related; boundary=${boundary}`
    },body
  })
}

async function syncGoogle() {
  try {
    $('googleStatus').textContent='同步中…';
    await upload('民宿營運_完整紀錄.xlsx',new Blob([workbook()]),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await upload('民宿營運_系統還原備份.json',new Blob([JSON.stringify( {
      version:'8.0.0',data:state
    },null,2)]),'application/json');
    $('googleStatus').textContent='同步完成 '+new Date().toLocaleString('zh-TW')
  } catch(e) {
    $('googleStatus').textContent='同步失敗：'+e.message;
    alert(e.message)
  }
}

async function restoreCloud() {
  try {
    let folder=await ensureFolder(),q=encodeURIComponent(`name='民宿營運_系統還原備份.json' and '${folder}' in parents and trashed=false`),f=await(await gfetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`)).json();
    if(!f.files[0])throw Error('找不到備份');
    let p=await(await gfetch(`https://www.googleapis.com/drive/v3/files/${f.files[0].id}?alt=media`)).json();
    if(confirm('確定覆蓋本機資料？')) {
      state=p.data;
      await save();
      location.reload()
    }
  } catch(e) {
    alert(e.message)
  }
}
