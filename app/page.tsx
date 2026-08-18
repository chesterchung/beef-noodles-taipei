"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { restaurantArticleData } from "./article-data.js";
import { loadGoogleMaps } from "./google-maps-loader.js";
import { isLateNightHours } from "./late-night-hours.js";
import { paginateItems } from "./pagination.js";
import { restaurantSeedData } from "./restaurants-data.js";

type City = "全部" | "台北市" | "新北市" | "桃園市";
type MapMode = "preview" | "loading" | "google";

type Restaurant = {
  id: string;
  name: string;
  city: Exclude<City, "全部">;
  address: string;
  hours: string;
  closingHour: number;
  rating: number;
  reviews: number;
  price: string;
  lat: number;
  lng: number;
  isOpen: boolean;
  googleMapsUri?: string;
  articles?: {
    "食尚玩家"?: Article;
    "窩客島"?: Article;
  };
};

type Article = {
  title: string;
  publishedAt: string;
  excerpt: string;
  url: string;
};

type MapInstance = {
  panTo: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};

type MarkerInstance = {
  map: MapInstance | null;
  addListener: (eventName: string, callback: () => void) => void;
};

type GoogleMapsGlobal = {
  maps: {
    importLibrary: (libraryName: string) => Promise<Record<string, unknown>>;
  };
};

type GooglePlace = {
  id?: string;
  displayName?: string;
  formattedAddress?: string;
  location?: { lat: () => number; lng: () => number };
  rating?: number;
  userRatingCount?: number;
  googleMapsURI?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    periods?: Array<{ close?: { hour: number; minute: number } }>;
  };
};

type WindowWithMaps = Window & {
  GOOGLE_MAPS_API_KEY?: string;
  google?: GoogleMapsGlobal;
};

const cityCenters: Record<Exclude<City, "全部">, { lat: number; lng: number }> = {
  台北市: { lat: 25.0418, lng: 121.535 },
  新北市: { lat: 25.012, lng: 121.465 },
  桃園市: { lat: 24.9937, lng: 121.301 },
};

const RESTAURANTS_PER_PAGE = 5;

function formatReviews(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

function makeRestaurantFromPlace(place: GooglePlace, city: Exclude<City, "全部">, index: number): Restaurant {
  const periods = place.regularOpeningHours?.periods ?? [];
  const closingHour = Math.max(0, ...periods.map((period) => {
    const close = period.close;
    return close ? close.hour + close.minute / 60 : 0;
  }));
  const hours = place.regularOpeningHours?.weekdayDescriptions?.[0] ?? "營業時間請見 Google Maps";
  return {
    id: place.id ?? `${city}-${index}`,
    name: place.displayName ?? "未命名店家",
    city,
    address: place.formattedAddress ?? "地址請見 Google Maps",
    hours,
    closingHour,
    rating: place.rating ?? 0,
    reviews: place.userRatingCount ?? 0,
    price: "$$",
    lat: place.location?.lat() ?? cityCenters[city].lat,
    lng: place.location?.lng() ?? cityCenters[city].lng,
    isOpen: false,
    googleMapsUri: place.googleMapsURI,
  };
}

function getApiKey() {
  const runtimeWindow = window as WindowWithMaps;
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || runtimeWindow.GOOGLE_MAPS_API_KEY?.trim() || "";
}

export default function Home() {
  const mapHostRef = useRef<HTMLDivElement>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const markerConstructorRef = useRef<((new (options: { map: MapInstance; position: { lat: number; lng: number }; title: string }) => MarkerInstance) | null)>(null);
  const markersRef = useRef<MarkerInstance[]>([]);
  const seededRestaurants = useMemo(() => restaurantSeedData.map((restaurant) => ({
    ...restaurant,
    articles: restaurantArticleData[restaurant.name as keyof typeof restaurantArticleData],
  })), []);
  const [restaurants, setRestaurants] = useState<Restaurant[]>(seededRestaurants);
  const [activeCity, setActiveCity] = useState<City>("全部");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [lateOnly, setLateOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(seededRestaurants[0].id);
  const [mapMode, setMapMode] = useState<MapMode>("preview");
  const [mapMessage, setMapMessage] = useState("示範資料");
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const visibleRestaurants = useMemo(() => {
    const normalizedQuery = submittedQuery.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesCity = activeCity === "全部" || restaurant.city === activeCity;
      const matchesLate = !lateOnly || isLateNightHours(restaurant.closingHour);
      const matchesQuery = !normalizedQuery || `${restaurant.name}${restaurant.address}`.toLowerCase().includes(normalizedQuery);
      return matchesCity && matchesLate && matchesQuery;
    });
  }, [activeCity, lateOnly, restaurants, submittedQuery]);

  const pageCount = Math.max(1, Math.ceil(visibleRestaurants.length / RESTAURANTS_PER_PAGE));
  const paginatedRestaurants = paginateItems(visibleRestaurants, currentPage, RESTAURANTS_PER_PAGE);

  const lateCount = restaurants.filter((restaurant) => isLateNightHours(restaurant.closingHour)).length;

  useEffect(() => {
    const apiKey = getApiKey();
    if (!apiKey || !mapHostRef.current) return;
    setMapMode("loading");
    setMapMessage("連線 Google Maps…");

    let cancelled = false;
    void loadGoogleMaps(apiKey).then(async () => {
      const runtimeWindow = window as WindowWithMaps;
      const mapsLibrary = await runtimeWindow.google!.maps.importLibrary("maps");
      const markerLibrary = await runtimeWindow.google!.maps.importLibrary("marker");
      if (cancelled || !mapHostRef.current) return;

      const MapConstructor = mapsLibrary.Map as unknown as new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
      mapInstanceRef.current = new MapConstructor(mapHostRef.current, { center: cityCenters.台北市, zoom: 11, mapTypeControl: false, streetViewControl: false, fullscreenControl: false, mapId: "DEMO_MAP_ID" });
      markerConstructorRef.current = markerLibrary.AdvancedMarkerElement as unknown as typeof markerConstructorRef.current;
      setMapMode("google");
      setMapMessage("Google Maps + Places");
    }).catch(() => {
      if (!cancelled) {
        setMapMode("preview");
        setMapMessage("示範資料（請檢查 API key）");
      }
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const MarkerConstructor = markerConstructorRef.current;
    if (!map || !MarkerConstructor) return;

    markersRef.current.forEach((marker) => { marker.map = null; });
    markersRef.current = visibleRestaurants.map((restaurant) => {
      const marker = new MarkerConstructor({ map, position: { lat: restaurant.lat, lng: restaurant.lng }, title: restaurant.name });
      marker.addListener("gmp-click", () => setSelectedId(restaurant.id));
      return marker;
    });

    if (visibleRestaurants[0]) {
      map.panTo({ lat: visibleRestaurants[0].lat, lng: visibleRestaurants[0].lng });
      map.setZoom(activeCity === "全部" ? 11 : 13);
    }
  }, [activeCity, visibleRestaurants]);

  useEffect(() => {
    const selected = restaurants.find((restaurant) => restaurant.id === selectedId);
    if (selected && mapInstanceRef.current && mapMode === "google") mapInstanceRef.current.panTo({ lat: selected.lat, lng: selected.lng });
  }, [mapMode, restaurants, selectedId]);

  function handleCityChange(city: City) {
    setActiveCity(city);
    setCurrentPage(1);
    const center = city === "全部" ? cityCenters.台北市 : cityCenters[city];
    mapInstanceRef.current?.panTo(center);
  }

  function focusRestaurant(restaurant: Restaurant) {
    setSelectedId(restaurant.id);
    mapInstanceRef.current?.panTo({ lat: restaurant.lat, lng: restaurant.lng });
    mapInstanceRef.current?.setZoom(15);
  }

  function changePage(page: number) {
    setCurrentPage(Math.min(pageCount, Math.max(1, page)));
    listScrollRef.current?.scrollTo({ top: 0 });
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    setSubmittedQuery(nextQuery);
    setCurrentPage(1);
    if (mapMode !== "google" || !nextQuery) return;

    const apiKey = getApiKey();
    if (!apiKey) return;
    setIsSearching(true);
    try {
      const runtimeWindow = window as WindowWithMaps;
      const placesLibrary = await runtimeWindow.google!.maps.importLibrary("places");
      const Place = placesLibrary.Place as unknown as { searchByText: (request: Record<string, unknown>) => Promise<{ places: GooglePlace[] }> };
      const city = activeCity === "全部" ? "台北市" : activeCity;
      const { places } = await Place.searchByText({ textQuery: `${nextQuery} 牛肉麵 ${city}`, fields: ["displayName", "formattedAddress", "location", "rating", "userRatingCount", "regularOpeningHours", "googleMapsURI"], locationBias: cityCenters[city], language: "zh-TW", region: "tw", maxResultCount: 20 });
      const liveRestaurants = places.map((place, index) => makeRestaurantFromPlace(place, city, index));
      if (liveRestaurants.length) {
        setRestaurants(liveRestaurants);
        setSelectedId(liveRestaurants[0].id);
        setMapMessage(`Google Places · ${liveRestaurants.length} 筆`);
      } else {
        setMapMessage("Google Places 沒有找到符合結果");
      }
    } catch {
      setMapMessage("Google Places 搜尋失敗，已保留目前資料");
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark" aria-hidden="true">湯</span><div><p className="eyebrow">TAIPEI · NEW TAIPEI · TAOYUAN</p><h1>深夜牛肉麵地圖</h1></div></div>
        <div className="topbar-note"><span className="live-dot" /> 即時營業資訊</div>
      </header>

      <section className="hero-copy"><div><p className="section-kicker">A WARM BOWL, ANY HOUR</p><h2>今晚，從哪一碗開始？</h2><p className="hero-description">整理台北、新北、桃園的牛肉麵店，<br />把還亮著燈的那幾家先留給你。</p></div><div className="hero-stats" aria-label="店家統計"><div><strong>{restaurants.length}</strong><span>收錄店家</span></div><div><strong>{lateCount}</strong><span>凌晨 00:00 後</span></div></div></section>

      <section className="workspace" aria-label="牛肉麵地圖與店家列表">
        <div className="map-panel">
          <div className="map-toolbar"><div className="map-status"><span className="map-status-dot" /> {mapMessage}</div><button className="map-control" type="button" onClick={() => mapInstanceRef.current?.setZoom(11)} aria-label="重設地圖縮放">⌖ 重設視野</button></div>
          <div ref={mapHostRef} className={`map-canvas ${mapMode === "google" ? "is-google" : ""}`} aria-label="Google 地圖顯示區">
            {mapMode !== "google" && <div className="preview-map" aria-hidden="true"><div className="map-grid map-grid-one" /><div className="map-grid map-grid-two" /><div className="river" /><span className="region-label label-taipei">台北市</span><span className="region-label label-newtaipei">新北市</span><span className="region-label label-taoyuan">桃園市</span>{visibleRestaurants.map((restaurant, index) => <button key={restaurant.id} className={`map-pin pin-${index % 6} ${isLateNightHours(restaurant.closingHour) ? "late" : ""} ${restaurant.id === selectedId ? "selected" : ""}`} type="button" onClick={() => setSelectedId(restaurant.id)} aria-label={`選擇 ${restaurant.name}`}><span>{index + 1}</span></button>)}<div className="preview-map-caption"><span className="mini-pin late" /> 凌晨仍營業 <span className="mini-pin" /> 一般營業</div></div>}
            {mapMode === "loading" && <div className="map-loading">正在載入地圖…</div>}
          </div>
          <div className="map-footer"><span>點選地圖標記查看店家</span><span className="google-wordmark">Google Maps</span></div>
        </div>

        <aside className="list-panel">
          <div className="list-heading"><div><p className="section-kicker">CURATED PICKS</p><h2>附近的好味道</h2></div><span className="result-count">{visibleRestaurants.length} 間</span></div>
          <form className="search-form" onSubmit={handleSearch}><label className="sr-only" htmlFor="restaurant-search">搜尋店家或地址</label><span className="search-icon" aria-hidden="true">⌕</span><input id="restaurant-search" type="search" placeholder="搜尋店家、地址…" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="submit" aria-label="搜尋" disabled={isSearching}>{isSearching ? "…" : "搜尋"}</button></form>
          <div className="filter-row" role="group" aria-label="城市篩選">{(["全部", "台北市", "新北市", "桃園市"] as City[]).map((city) => <button key={city} className={`city-chip ${activeCity === city ? "active" : ""}`} type="button" onClick={() => handleCityChange(city)}>{city}</button>)}</div>
          <button className={`late-toggle ${lateOnly ? "active" : ""}`} type="button" onClick={() => { setLateOnly((value) => !value); setCurrentPage(1); }}><span className="toggle-icon">☾</span><span><strong>只看凌晨還開著</strong><small>營業時間超過 00:00 的店家</small></span><span className="toggle-switch" aria-hidden="true"><i /></span></button>

          <div ref={listScrollRef} className="list-scroll" role="list" aria-live="polite">
            {visibleRestaurants.length ? paginatedRestaurants.map((restaurant, index) => <article key={restaurant.id} className={`restaurant-card ${restaurant.id === selectedId ? "selected" : ""} ${isLateNightHours(restaurant.closingHour) ? "is-late" : ""}`} role="listitem"><button className="card-main" type="button" onClick={() => focusRestaurant(restaurant)} aria-label={`在地圖上定位 ${restaurant.name}`}><span className="card-number">{String((currentPage - 1) * RESTAURANTS_PER_PAGE + index + 1).padStart(2, "0")}</span><span className="card-content"><span className="card-topline"><span className="city-label">{restaurant.city}</span>{isLateNightHours(restaurant.closingHour) && <span className="late-badge">凌晨特選</span>}</span><strong>{restaurant.name}</strong><span className="card-address">{restaurant.address}</span><span className="card-meta"><span className="rating">★ {restaurant.rating.toFixed(1)}</span><span>{formatReviews(restaurant.reviews)} 則評論</span><span>{restaurant.price}</span></span></span><span className="card-arrow" aria-hidden="true">↗</span></button><div className="card-hours"><span className={`open-dot ${restaurant.isOpen ? "open" : "closed"}`} /> {restaurant.isOpen ? "營業中" : "今日已打烊"}<span className={isLateNightHours(restaurant.closingHour) ? "closing late-text" : "closing"}> · {restaurant.hours}</span>{restaurant.googleMapsUri && <a href={restaurant.googleMapsUri} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>在 Google Maps 開啟 ↗</a>}</div>{restaurant.articles && <div className="article-list" aria-label={`${restaurant.name} 的文章介紹`}>{Object.entries(restaurant.articles).map(([source, article]) => article && <a key={source} className="article-card" href={article.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}><span className="article-source">{source}<small>{article.publishedAt}</small></span><strong>{article.title}</strong><p>{article.excerpt}</p><span className="article-read">閱讀原文 ↗</span></a>)}</div>}{restaurant.id === selectedId && <div className="selected-line" />}</article>) : <div className="empty-state"><span>⌕</span><strong>找不到符合的牛肉麵店</strong><p>換個關鍵字，或先清除凌晨篩選試試。</p></div>}
          </div>
          {visibleRestaurants.length > 0 && <nav className="pagination" aria-label="店家列表分頁"><button type="button" onClick={() => changePage(currentPage - 1)} disabled={currentPage === 1} aria-label="上一頁">← 上一頁</button><span aria-live="polite">第 {currentPage} / {pageCount} 頁</span><button type="button" onClick={() => changePage(currentPage + 1)} disabled={currentPage === pageCount} aria-label="下一頁">下一頁 →</button></nav>}
          <p className="data-note">店家資料由 Google Maps Places 提供；文章僅顯示以店名明確對上的食尚玩家／窩客島內容。營業時間請以店家最新公告為準。</p>
        </aside>
      </section>
      <footer className="site-footer"><span>一碗熱湯，剛好接住晚回家的人。</span><span>© 2026 深夜牛肉麵地圖</span></footer>
    </main>
  );
}
