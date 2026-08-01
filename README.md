# 民宿營運管理系統 7.0.0（Phase 3 完整版）

## 功能
- 今日營運儀表板
- 入住／退房／訂房管理
- 退房後房務流程與照片紀錄
- 房務 SOP 分層設定
- 備品庫存、低庫存提醒與耗用統計
- 維修紀錄與待辦提醒
- 營收、訂金、退款與支出管理
- 入住率、房間晚數、平台營收與備品耗用分析
- IndexedDB 本機自動保存
- Google Drive Excel＋JSON 備份
- 完整營運 Excel 匯出

## 更新 GitHub Pages
1. 先從舊版下載 JSON 備份與 Excel。
2. 解壓縮本版本。
3. 將所有檔案與 icons 資料夾上傳到 repository 根目錄並覆蓋。
4. Commit changes。
5. Safari 開啟網站重新整理，完全關閉主畫面 App 後重開。

## 注意
這是一套單一裝置優先的 PWA。資料保存在該裝置的 IndexedDB；Google Drive 用於備份。純 GitHub Pages 無法在 App 關閉時背景同步。照片會壓縮後保存在本機備份中，長期大量拍照仍建議定期匯出後清理。
