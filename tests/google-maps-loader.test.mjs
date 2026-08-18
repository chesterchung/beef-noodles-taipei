import assert from "node:assert/strict";
import test from "node:test";

test("waits for the Google Maps callback before reporting the API as ready", async () => {
  const scripts = [];
  const runtimeWindow = {};
  const runtimeDocument = {
    createElement() {
      return { dataset: {} };
    },
    head: {
      appendChild(script) {
        scripts.push(script);
      },
    },
  };

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = runtimeWindow;
  globalThis.document = runtimeDocument;

  try {
    const { loadGoogleMaps } = await import(
      `../app/google-maps-loader.js?test=${Date.now()}`
    );
    let settled = false;
    const loading = loadGoogleMaps("test-key").then(() => {
      settled = true;
    });

    assert.equal(scripts.length, 1);
    const scriptUrl = new URL(scripts[0].src);
    const callbackName = scriptUrl.searchParams.get("callback");
    assert.equal(scriptUrl.searchParams.get("loading"), "async");
    assert.ok(callbackName);

    await Promise.resolve();
    assert.equal(settled, false);

    runtimeWindow[callbackName]();
    await loading;
    assert.equal(settled, true);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
