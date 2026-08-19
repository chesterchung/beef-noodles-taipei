# 深夜牛肉麵地圖

台北、新北與桃園的牛肉麵探索網站。提供店家清單、城市與深夜營業篩選、分頁、Google Maps / Places 搜尋，以及食尚玩家與窩客島的已核對文章連結。

沒有設定 Google Maps API key 時，網站仍會顯示內建預覽地圖與種子店家資料。

## 功能

- 收錄 110 間台北、新北、桃園店家，顯示地址、評分、評論數、價格與含星期的營業時間。
- 依城市、關鍵字及「凌晨仍營業」篩選店家。
- 點選店家或地圖標記可將地圖定位至該店。
- 初始未選店家時，Google 地圖載入後會要求瀏覽器定位權限；成功時以使用者位置為中心，拒絕、逾時或失敗時維持台北預設視野。
- 設定 API key 後，可使用 Google Maps 與 Places Text Search 搜尋即時店家資料。
- 僅呈現已依店名與地點核對的食尚玩家／窩客島文章；沒有明確對應文章的店家不會顯示文章連結。

## 技術

- React 19、TypeScript、Vinext / Vite
- Google Maps JavaScript API、Places API (New)
- Cloudflare Worker 相容執行環境
- Docker Compose 與 GitHub Pages 靜態部署

## 需求

- Node.js `>=22.13.0`
- npm
- （選用）Docker Desktop
- （選用）Google Cloud 專案與瀏覽器用 Maps API key

## 快速開始

```bash
npm install
cp .env.example .env
npm run dev
```

開啟開發伺服器輸出的本機網址。未填入 Maps key 時，可直接使用預覽地圖與範例資料。

## Google Maps 設定

在 `.env` 設定：

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-browser-api-key
```

此變數會被編譯進瀏覽器 bundle，不能視為祕密。請在 Google Cloud：

1. 啟用 **Maps JavaScript API** 與 **Places API (New)**。
2. 以 HTTP referrer 限制 key，只允許本機開發網址與正式網站網域。
3. 為避免不必要費用，僅啟用本專案需要的 API。

定位資料只在瀏覽器端用於設定初始地圖視野，並不會寫入資料庫或送到本專案後端。使用者已選擇店家後，稍晚回傳的定位結果不會覆蓋該選擇。

## 指令

| 指令 | 說明 |
| --- | --- |
| `npm run dev` | 啟動本機開發伺服器 |
| `npm run build` | 建立 Vinext production build |
| `npm run lint` | 執行 ESLint |
| `npm test` | 建置後執行 Node test suite |
| `npm run build:pages` | 建置並整理 GitHub Pages artifact |
| `npm run db:generate` | 在日後新增資料表後產生 Drizzle migration |

## 驗證

```bash
npm run lint
npm test
```

`npm test` 會先完成 production build，接著驗證店家清單與文章資料、深夜時段判斷、分頁、Google Maps 載入與 DOM host 分離、GitHub Pages artifact，以及營業時間／初始定位行為。

## Docker

```bash
cp .env.example .env
# 若需即時 Google 地圖與搜尋，在 .env 填入 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
docker compose up --build
```

服務提供於 [http://localhost:3000](http://localhost:3000)。停止前景服務可按 `Ctrl+C`；若以背景模式啟動，使用：

```bash
docker compose down
```

Docker image 在建置階段讀取 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`，因為該 key 必須存在於用戶端 bundle 才能載入 Maps SDK。

## GitHub Pages

`.github/workflows/pages.yml` 會在推送至 `main` 或手動觸發時：

1. 安裝依賴並執行 lint 與測試。
2. 設定 `NEXT_PUBLIC_BASE_PATH` 為 repository 名稱。
3. 建置 `dist/client` artifact 並部署至 GitHub Pages。

初次部署前，請在 repository 的 **Settings → Pages** 將來源設為 **GitHub Actions**。若需啟用即時地圖，將 `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 新增為 GitHub Actions secret，並把 key 的 referrer 限制為該 Pages 網址。

可在本機驗證 Pages artifact：

```bash
NEXT_PUBLIC_BASE_PATH=/beef-noodles-taipei npm run build:pages
test -f dist/client/index.html
```

## 專案結構

```text
app/
  page.tsx                 主要介面、篩選、Google Maps 與 Places 整合
  restaurants-data.js      種子店家資料
  article-data.js          已核對的文章資料
  google-maps-loader.js    Maps SDK 的非同步載入器
  late-night-hours.js      深夜營業判斷
  pagination.js            清單分頁
  globals.css              全站樣式
tests/                     Node test suite
scripts/prepare-github-pages.mjs
                            調整靜態輸出為 Pages artifact
worker/index.ts            Vinext Worker 進入點
```

## 維護注意事項

- Google Maps SDK 會自行管理地圖容器內的 DOM；請讓它只掛載在 `google-map-host`，React 的載入與預覽 UI 則放在外層 `map-canvas`，以避免雙方同時管理子節點造成白畫面。
- `restaurantSeedData` 的 `hours` 是展示用的星期營業時間；「凌晨仍營業」篩選依 `closingHour` 判斷。更新資料時請同步維護兩者。
- Google Places 即時搜尋結果會取代目前列表；其營業時間與評分仍應以 Google Maps 最新資料為準。
- 請勿提交 `.env` 或未受限制的 Maps key。

## 授權

尚未指定授權條款。
