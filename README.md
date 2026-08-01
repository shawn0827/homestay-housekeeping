# 民宿營運管理系統 v9.0.0

v9 是重新整理後的正式架構，針對手機、iPad 與電腦共同使用設計。

## 主要修正

- 主頁「今日入住／今日退房／住宿中／房務完成」全部為可操作按鈕。
- 訂房快速入口會帶入正確篩選條件與日期。
- 重新整理會依網址 hash 回到原頁面與原篩選。
- 手機在頁面頂端下拉超過 72px 後可重新整理目前畫面。
- 房務總覽改為響應式卡片；清單頁在電腦為左右兩欄，在手機為分類橫向捲動＋工作清單。
- 程式拆成清楚模組並加入中文註解。
- IndexedDB 保存資料；Google Drive 可另外備份。

## 程式位置

| 功能 | 檔案 |
|---|---|
| 資料庫、路由、共用 UI | `js/core.js` |
| 主頁與提醒 | `js/dashboard.js` |
| 訂房、入住、退房 | `js/bookings.js` |
| 房務與照片 | `js/housekeeping.js` |
| 備品與進度條 | `js/inventory.js` |
| 維修 | `js/maintenance.js` |
| 收支 | `js/finance.js` |
| Excel 與 JSON | `js/reports.js` |
| Google 帳號與 Drive | `js/google.js` |
| 設定與 SOP | `js/settings.js` |
| 系統啟動與下拉更新 | `js/app.js` |

## 更新 GitHub Pages

將所有檔案與 `js/`、`icons/` 資料夾完整覆蓋到 repository 根目錄。舊版多餘的 JavaScript 檔案可以刪除。

更新後：
1. 等 GitHub Actions 部署完成。
2. Safari 開啟網址並重新整理。
3. 完全關閉主畫面 App 再重開。
4. 若仍舊版，刪除該網站的 Safari 網站資料後重新加入主畫面。

## 交付前檢查

本版本已完成：
- 全部 JavaScript `node --check` 語法檢查
- HTML 引用檔案存在性檢查
- Service Worker 快取資源存在性檢查
- Manifest 與 App Icon 路徑檢查
- 主頁快速卡片、Hash 路由、房務響應式樣式及手機下拉更新的程式碼交叉檢查

由於目前執行環境的瀏覽器政策阻擋本機網址與本機檔案，無法在此環境完成真正的 Safari／iPhone／iPad 點擊測試。上傳 GitHub Pages 後，請依「測試與上傳說明」進行實機驗收；任何實機抓漏都應以完整回歸方式修正。
