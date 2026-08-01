/**
 * 模組：Google Drive
 * 用途：OAuth 登入、雲端同步、Excel 上傳與資料還原。
 *
 * 修改提醒：修改前先備份；修改後更新 sw.js 快取版本並測試。
 */

// ===== Google OAuth 與 Drive API =====
const SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.file';
function renderGoogle() {
  const googleSettings = state.settings.google;
  $("googleClientIdInput").value = googleSettings.clientId;
  $("googleFolderNameInput").value = googleSettings.folderName;
  $("googleAutoSyncInput").checked = googleSettings.autoSync;

  const account = state.settings.account || {};
  const identity = account.email ? `（${account.email}）` : "";
  $("googleStatus").textContent = googleToken
    ? `Google Drive 已連接 ${identity}`
    : account.email
      ? `帳號已記錄 ${identity}，請重新連接以使用雲端功能`
      : "尚未連接 Google Drive";
}

function renderAccount() {
  const account = state.settings.account || {};
  const connectedInThisSession = Boolean(googleToken);

  $("accountDisplayName").textContent = account.name || "尚未連接帳號";
  $("accountEmail").textContent = account.email || "連接 Google 後會顯示姓名與電子郵件";

  const avatar = document.querySelector("#accountProfile .account-avatar");
  avatar.innerHTML = account.picture
    ? `<img src="${esc(account.picture)}" alt="Google 帳號頭像">`
    : "👤";

  $("accountStatus").textContent = connectedInThisSession
    ? "Google 帳號已連接，本次可使用雲端同步。"
    : account.email
      ? "帳號資料已保存，但本次授權尚未連接。"
      : "帳號尚未連接。請先在 Google Drive 頁面設定 OAuth Client ID。";
}

function requestToken(prompt = "") {
  return new Promise((resolve, reject) => {
    const googleSettings = state.settings.google;

    if (!googleSettings.clientId) {
      reject(new Error("請先到 Google Drive 設定輸入 OAuth Client ID"));
      return;
    }

    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google 登入程式尚未載入，請確認網路連線"));
      return;
    }

    google.accounts.oauth2.initTokenClient({
      client_id: googleSettings.clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        googleToken = response.access_token;
        tokenExpiry = Date.now() + ((response.expires_in || 3600) - 60) * 1000;
        resolve();
      },
    }).requestAccessToken({ prompt });
  });
}

async function fetchGoogleProfile() {
  const response = await gfetch("https://openidconnect.googleapis.com/v1/userinfo");
  return response.json();
}

async function connectGoogleAccount() {
  await requestToken("consent");
  const profile = await fetchGoogleProfile();

  state.settings.account = {
    provider: "google",
    name: profile.name || profile.given_name || state.settings.userName || "Google 使用者",
    email: profile.email || "",
    picture: profile.picture || "",
    connectedAt: new Date().toISOString(),
  };

  await save();
  refreshHeaderUser();
  renderAccount();
  renderGoogle();
}

async function disconnectGoogleAccount() {
  if (googleToken && window.google?.accounts?.oauth2) {
    try {
      google.accounts.oauth2.revoke(googleToken, () => {});
    } catch (error) {
      console.warn("Google 權杖撤銷失敗", error);
    }
  }

  googleToken = "";
  tokenExpiry = 0;
  state.settings.account = {
    provider: "",
    name: "",
    email: "",
    picture: "",
    connectedAt: "",
  };

  await save();
  refreshHeaderUser();
  renderAccount();
  renderGoogle();
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
      version:'8.2.0',data:state
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
