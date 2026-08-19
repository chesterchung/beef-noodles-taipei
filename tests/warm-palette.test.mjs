import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("uses the warm braised-beef palette for the site foundation", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(styles, /--paper: #fff7ec;/i);
  assert.match(styles, /--ink: #3d241a;/i);
  assert.match(styles, /--green: #a9462e;/i);
  assert.match(styles, /--tomato: #c9743d;/i);
});
