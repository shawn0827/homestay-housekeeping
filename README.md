# 民宿營運管理系統 v10.1.0

v10.1 延續 CSS 與 JavaScript 模組化，並將民宿基本資料、Google 帳號與 Drive 設定整合成單一頁面。

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
├─ assets/icons/
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
5. 確認 `assets/icons/` 與 `css/` 都已上傳。
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
