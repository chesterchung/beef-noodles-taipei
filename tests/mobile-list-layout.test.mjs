import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("lets the mobile restaurant list grow with the page instead of scrolling internally", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const mobileStyles = styles.match(/@media \(max-width: 560px\) \{([^}]+(?:\}[^}]*)*)\}/)?.[1] ?? "";

  assert.match(mobileStyles, /\.list-panel \{ min-height: 0; \}/);
  assert.match(mobileStyles, /\.list-scroll \{ flex: none; min-height: auto; max-height: none; overflow: visible; \}/);
});
