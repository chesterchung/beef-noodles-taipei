import assert from "node:assert/strict";
import test from "node:test";
import { isLateNightHours } from "../app/late-night-hours.js";

test("does not mark stores that close before midnight as late night", () => {
  assert.equal(isLateNightHours(20), false);
  assert.equal(isLateNightHours(23.5), false);
});

test("marks stores that remain open after midnight as late night", () => {
  assert.equal(isLateNightHours(0.5), true);
  assert.equal(isLateNightHours(2), true);
  assert.equal(isLateNightHours(3.5), true);
});

test("does not mark a store that closes exactly at midnight", () => {
  assert.equal(isLateNightHours(0), false);
});
