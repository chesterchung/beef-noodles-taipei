import assert from "node:assert/strict";
import test from "node:test";
import { restaurantSeedData } from "../app/restaurants-data.js";

test("keeps 50 Taipei restaurants that meet the rating and review thresholds", () => {
  const taipeiRestaurants = restaurantSeedData.filter(({ city }) => city === "台北市");

  assert.equal(taipeiRestaurants.length, 50);
  assert.ok(taipeiRestaurants.every(({ rating }) => rating >= 3));
  assert.ok(taipeiRestaurants.every(({ reviews }) => reviews >= 500));
  assert.equal(restaurantSeedData.length, 110);
});

test("does not retain snapshot-only open-status data", () => {
  assert.ok(restaurantSeedData.every((restaurant) => !("isOpen" in restaurant)));
});
