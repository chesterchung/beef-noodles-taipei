import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

test("shows the weekday opening-hours text without a live open status", () => {
  assert.match(pageSource, /<div className="card-hours">\{restaurant\.hours\}/);
  assert.doesNotMatch(pageSource, /今日已打烊|營業中|open-dot/);
});

test("starts with no selected restaurant and requests the user's location for Google Maps", () => {
  assert.match(pageSource, /useState<string \| null>\(null\)/);
  assert.match(pageSource, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(pageSource, /map\.panTo\(\{ lat: position\.coords\.latitude, lng: position\.coords\.longitude \}\)/);
});
