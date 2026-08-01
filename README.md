# 民宿營運管理系統 v10.4.0

v10.2 將所有 PWA 與介面圖示統一放在根目錄 `icons/`。

## 重要：既有資料不會被清空

v10 仍使用 v9 的 IndexedDB 名稱：

```text
homestay_operation_v9
```

這是刻意保留，避免升級後原本的訂房、房務、備品與收支資料消失。

## 專案結構

```text
/
├─ index.html
├─ manifest.webmanifest
├─ sw.js
├─ icons/
├─ css/
│  ├─ 00-tokens.css
│  ├─ 01-base.css
│  ├─ 02-layout.css
│  ├─ 03-components.css
│  ├─ 04-dashboard.css
│  ├─ 05-forms-lists.css
│  ├─ 06-housekeeping.css
│  ├─ 07-inventory.css
│  ├─ 08-settings.css
│  └─ 09-responsive.css
├─ icons/
└─ js/
```

## CSS 修改位置

| 想修改的內容 | 檔案 |
|---|---|
| 品牌色、背景色、圓角 | `css/00-tokens.css` |
| 全域文字與表單基本設定 | `css/01-base.css` |
| Header、頁面寬度、底部導覽 | `css/02-layout.css` |
| 按鈕、卡片、狀態、彈窗 | `css/03-components.css` |
| 主頁 KPI、提醒與營運概況 | `css/04-dashboard.css` |
| 訂房、收支、維修等表單與清單 | `css/05-forms-lists.css` |
| 房務管理 | `css/06-housekeeping.css` |
| 備品管理 | `css/07-inventory.css` |
| 設定與帳號 | `css/08-settings.css` |
| 手機、平板、電腦響應式規則 | `css/09-responsive.css` |

## 圖示

請閱讀：

```text
圖示更換指南.md
```

底部導覽圖示已固定為 24 × 24px，替換圖檔後不會再因原圖尺寸而變得巨大。

## 上傳 GitHub

1. 先在舊版下載 JSON 備份。
2. 將 v10 壓縮檔解壓縮。
3. 完整覆蓋 GitHub 根目錄。
4. 刪除舊的 `styles.css`，v10 已改用 `css/` 資料夾。
5. 確認 `icons/` 與 `css/` 都已上傳。
6. 等待 GitHub Pages 部署完成。
7. 關閉主畫面 App 後重新開啟。

## 快取提醒

自行替換圖示或 CSS 後，修改 `sw.js`：

```javascript
const CACHE_VERSION = 'homestay-v10-1-1';
```

每次發布增加最後一碼，避免手機繼續使用舊檔。


## v10.1 設定入口

系統設定中的以下三項已合併：

- 民宿基本資料
- 使用者帳號
- Google Drive

新的入口名稱為：

```text
民宿基本資料與帳號
```

對應程式位置：

```text
js/settings.js
```

右上角使用者名稱或頭像也會直接開啟這個整合頁。


## v10.2 統一圖示資料夾

所有圖示都放在根目錄：

```text
icons/
```

包含：

- `icon-192.png`、`icon-512.png`、`apple-touch-icon.png`
- `nav-*.svg`
- `settings-*.svg`
- `alert-*.svg`
- `brand.svg`
- `account.svg`

程式內的引用格式：

```html
<img src="./icons/nav-home.svg" alt="">
```


## v10.3 備份內容核對

### Google Drive

每次按「立即同步 Excel＋JSON」，或房務完成後自動同步，會建立／更新：

```text
民宿營運管理系統備份/
├─ 民宿營運_完整紀錄.xlsx
└─ 民宿營運_系統還原備份.json
```

同步後程式會向 Google Drive 重新讀取檔案資料，驗證：

- 檔名正確
- MIME 格式正確
- 檔案大小大於 0
- Excel 與 JSON 都成功存在

### Excel 工作表

- 營運總覽
- 訂房紀錄
- 房務明細
- 房務照片索引
- 備品
- 維修
- 收支
- SOP設定

### JSON 完整還原內容

JSON 保存整個 IndexedDB 狀態，包括：

- 民宿與帳號設定
- 房務 SOP
- 訂房資料
- 房務勾選、備註與照片
- 備品
- 維修
- 收支
- Google 同步設定

「民宿基本資料與帳號」頁可直接從 Google Drive 還原 JSON。


## v10.4 Google 無感續接

重新整理或重新開啟 App 後：

1. IndexedDB 立即恢復 Google 姓名、Email 與頭像。
2. 系統在背景呼叫 Google Token Model，使用 `prompt: ''` 嘗試取得新的 Drive token。
3. 成功時不會跳出登入畫面，可直接同步。
4. 若 Safari 或 Google 要求使用者互動，背景續接會安靜失敗。
5. 只有按「立即同步 Excel＋JSON」或「從雲端還原」時，才會顯示 Google 授權畫面。
6. 按「登出並斷開連接」會清除帳號資料、撤銷目前 token，並停止自動續接。

注意：純 GitHub Pages 不保存 refresh token，因此 Google 或 Safari 仍可能在權限過期後要求一次互動授權。
