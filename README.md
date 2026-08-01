# 民宿營運管理系統 v11.0.0

v11 支援個人 Gmail 主帳與多個副帳共同使用。

## 核心功能

- 每位使用者以自己的 Google 帳號登入
- admin／editor／viewer 權限
- Cloudflare D1 保存所有人共用資料
- 主帳 refresh token 只存在 Cloudflare Secrets
- 所有 Excel／JSON 固定寫入主帳 Google Drive
- App Session 可保存 30 天，重新整理不需重新登入
- 樂觀鎖定避免多人同時修改時靜默覆蓋
- 保留 IndexedDB 離線本機資料

## 專案結構

```text
/
├─ index.html
├─ css/
├─ icons/
├─ js/
├─ backend/
│  ├─ src/worker.js
│  ├─ schema.sql
│  ├─ package.json
│  └─ wrangler.toml
└─ 多人共用主帳設定教學.md
```

請先閱讀 `多人共用主帳設定教學.md`。
