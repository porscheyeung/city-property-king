# 城市置業王

原創純前端置業棋盤遊戲，GitHub `porscheyeung/city-property-king`，正式網址 https://porscheyeung.github.io/city-property-king/ 。先讀 README.md 與 docs/TEST-RESULTS.md。

保留 main 根目錄 GitHub Pages、相對資源路徑、本機存檔鍵 `city-property-king.v1`、至少一名真人、2–4 人及快速／經典模式。不得加入後端或改動其他網站。存檔格式變更須提供遷移或明確版本提示。

規則運算集中 engine.js，資料在 data.js，UI 在 app.js；所有遊戲資金及所有權改動透過 dispatch。動畫只呈現已存檔結果。改規則後跑 npm test，介面變更補瀏覽器驗證。經典模式無時間上限，不宣稱必定在固定回合完局或已通過真實 Safari／iPad 測試。

棋盤 3D 模型由 board3d.js 以透明 WebGL 畫布疊在棋盤上：app.js 仍輸出 `.token[data-player]`、`.building-art[data-level]` 空槽，board3d.js 依其位置用正交鏡頭投影到地面；改棋盤排版後要檢查模型對位。pieceArt／buildingArt 在 3D 可用時輸出縮圖，否則保留 SVG 後備，不可移除。vendor/three.min.js 由 tools/three-entry.js 打包。棋子顏色與玩家卡及持有人標記對應；桌面回合操作覆於棋盤中央，760px 以下移至棋盤下方。保留動畫重繪 turn-panel 的流程及減少動態效果支援。

761px 以上棋盤邊長由 style.css 末段 `--board`（100dvh 減頂部列與圖例）決定，令整個棋盤留在一屏內；761–1100px 直向為上下排列。改頂部列或圖例高度須同步 `--hdr`／`--legend`。全螢幕按鈕在 header()，click 處理放在 busy 檢查之前，F 鍵切換。
