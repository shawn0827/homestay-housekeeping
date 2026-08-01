# 民宿營運管理系統 v9.1.0

## 本版修正

1. 維修管理、收支管理、報表與 Google Drive 頁面都有「返回設定」。
2. Google 帳號身分保存在 IndexedDB，重新開啟後仍顯示登入帳號。
3. 使用者帳號頁新增「登出 Google 帳號」按鈕。
4. 手機主頁的「＋新增訂房」固定在「今日營運」標題右側。
5. 備品管理改為一項一列，單列顯示目前庫存、安全量、目標、累計耗用與進度。
6. 備品修改視窗不再顯示「誤按可修改」提示。

## Google 帳號與 Drive 權限

- 姓名、Email 與頭像會保存在本機 IndexedDB，因此重新開啟後仍顯示登入。
- Google Drive access token 不會永久寫入瀏覽器。
- token 到期後，在同步時可能需要由 Google 續接授權。
- 點「登出 Google 帳號」會清除本機身分、停用自動選取並撤銷目前 token。

## 修改底部導覽 icon

打開根目錄的 `index.html`，搜尋：

```html
<nav class="bottom-nav"
```

修改每個按鈕內的 `<span>`：

```html
<button data-route="home"><span>⌂</span>主頁</button>
```

例如改成：

```html
<button data-route="home"><span>🏠</span>主頁</button>
```

可修改的位置：

```text
⌂  主頁
▣  訂房
✓  房務
□  備品
⚙  設定
```

## 上傳

請完整覆蓋 `index.html`、`styles.css`、`sw.js` 與整個 `js/` 資料夾。

## 測試

本版已完成 JavaScript 語法檢查，以及 Chromium 手機／電腦尺寸的路由與版面整合測試。詳細結果請看 `測試報告.txt`。
