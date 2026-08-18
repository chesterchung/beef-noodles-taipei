import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { restaurantArticleData } from "../app/article-data.js";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the 90-store map and verified article introductions", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const readableHtml = html.replaceAll("<!-- -->", "");
  assert.match(html, /深夜牛肉麵地圖/);
  assert.match(html, />90<!-- --> 間/);
  assert.match(html, /半島牛肉麵/);
  assert.match(html, /食尚玩家/);
  assert.match(html, /窩客島/);
  assert.match(html, /文章僅顯示以店名明確對上/);
  assert.match(html, /class="article-card"/);
  assert.match(readableHtml, /第 1 \/ 18 頁/);
  assert.equal((html.match(/class="restaurant-card/g) ?? []).length, 5);
});

test("article data skips stores without a verified match", async () => {
  const seed = await readFile(new URL("../app/restaurants-data.js", import.meta.url), "utf8");
  const articleCount = Object.values(restaurantArticleData).reduce((sum, articles) => sum + Object.keys(articles).length, 0);

  assert.match(seed, /政武牛肉麵/);
  assert.equal(Object.keys(restaurantArticleData).length, 17);
  assert.equal(articleCount, 23);
  assert.equal(restaurantArticleData["政武牛肉麵"], undefined);
});
