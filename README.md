# CCL 知識小測驗

研發部 CCL 技術分享（2026/10/8）開場用的分組測驗。10 題、每題 10 分、滿分 100；四組，小組成績＝組員平均。

## 三個畫面

| 網址 | 給誰 | 內容 |
|---|---|---|
| `/` | 與會者手機／電腦 | 輸入姓名、選組 → 作答 → 每題看對錯與解說 → 個人成績與等級 |
| `/board` | 大螢幕 | 第一頁 QR Code＋各組加入名單 → 題目與倒數 → 答案分布＋解說＋小組平均 → 最終頒獎台、個人前 10 名、分數分布 |
| `/host` | 主持人（PIN 保護） | 開始／公布答案／下一題／小組排行／最終成績；即時作答名單；個人成績表、CSV 匯出；各題答對率 |

## 流程

1. 大螢幕開 `/board`，主持人手機開 `/host`（預設 PIN：`1008`）
2. 大家掃 QR Code 加入並選組
3. 主持人按「開始第 1 題」→ 20 秒倒數 → 「公布答案」→（可選）「小組排行」→「下一題」
4. 第 10 題公布後按「公布最終成績」
5. 「個人成績」分頁可匯出 CSV

計分：答對 10 分。同分時以答對題目的總作答時間較短者排前（小組同分則比平均作答時間）。

## 部署（Vercel）

Framework 選 Vite，不需額外設定即可運作（沿用既有 ai-quiz 的 Firebase 專案，資料存在獨立路徑 `ccl-quiz-20261008`，不影響舊測驗）。

可選的環境變數（見 `.env.example`）：

- `VITE_HOST_PIN`：主持人 PIN
- `VITE_QUIZ_ROOT`：資料路徑；換一個值就是一場全新的測驗
- `VITE_FIREBASE_*`：改用其他 Firebase 專案

> Firebase Realtime Database 規則需允許讀寫 `ccl-quiz-20261008` 路徑。若 ai-quiz 專案當初是「測試模式」，規則可能已過期，請到 Firebase Console → Realtime Database → 規則確認。

## 預覽假資料

網址加 `?demo=waiting|question|reveal|leaderboard|final`（玩家頁另有 `join`）即可看各階段畫面，不會連線寫入。

## 修改題目

`src/data/questions.js`
