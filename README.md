# 玖星吉民宿營運管理系統

目前版本：**7.3.0**

這是一個可直接部署到 GitHub Pages、並可加入 iPhone／iPad 主畫面的民宿營運管理 PWA。

## 專案結構

```text
/
├── index.html
├── app.js
├── styles.css
├── sw.js
├── manifest.webmanifest
├── README.md
├── CHANGELOG.md
├── 更新方式_請先閱讀.txt
└── icons/
    ├── apple-touch-icon.png
    ├── icon-192.png
    └── icon-512.png
```

GitHub repository 首頁必須直接看到 `index.html`，不要把整個專案再包在另一層資料夾中。

## 最方便的更新方式

1. 更新前先在系統內下載 JSON 完整備份與 Excel。
2. 解壓縮新版 ZIP。
3. 進入原本 GitHub repository。
4. 點 `Add file → Upload files`。
5. 將解壓縮資料夾內的所有檔案及 `icons` 資料夾一起拖入。
6. 確認 GitHub 顯示相同檔名將被取代。
7. 點 `Commit changes`。
8. 等待 GitHub Pages 部署完成。
9. Safari 開啟網站並重新整理。
10. 完全關閉主畫面 App，再重新開啟。

## App 圖示

本版已使用玖星吉 Logo：

- iOS／iPadOS：`icons/apple-touch-icon.png`
- 其他 PWA：`icons/icon-192.png`、`icons/icon-512.png`

換圖示後，需要移除舊主畫面圖示，再用 Safari 重新「加入主畫面」，才會顯示新圖示。

## 資料保存

- IndexedDB：本機日常資料
- Google Drive：雲端 Excel 與 JSON 備份
- GitHub：只放程式碼，不放營運資料
