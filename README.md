# 民宿營運管理系統 v8.1.0

本版本將程式重新排版並加入中文註解，功能與 v8 相同。

## 修改對照

| 功能 | 檔案 |
|---|---|
| 主頁與提醒 | `js/dashboard.js` |
| 訂房、入住、退房 | `js/bookings.js` |
| 房務與照片 | `js/housekeeping.js` |
| 備品與耗用 | `js/inventory.js` |
| 維修 | `js/maintenance.js` |
| 收入、訂金、退款、支出 | `js/finance.js` |
| 統計 | `js/analytics.js` |
| 民宿、使用者、房間、SOP | `js/settings.js` |
| Excel 與 JSON | `js/reports.js` |
| Google Drive | `js/google.js` |
| 資料庫與預設值 | `js/core.js` |
| 按鈕事件與啟動 | `js/app.js` |
| 畫面 | `index.html` |
| 顏色與外觀 | `styles.css` |

## 如何快速找功能

每個 JS 檔案最上方都有用途說明，重要區段使用：

```javascript
// ===== 功能名稱 =====
```

在 GitHub 或瀏覽器按 `Ctrl+F` 搜尋 `=====` 即可跳到主要區段。

## 發布新版

修改後請開啟 `sw.js`，更改 CACHE 名稱，例如：

```javascript
const CACHE = "homestay-operation-v8-1-1";
```

然後 Commit 到 GitHub，Safari 重新整理並重開主畫面 App。
