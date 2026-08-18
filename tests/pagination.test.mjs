import assert from "node:assert/strict";
import test from "node:test";
import { paginateItems } from "../app/pagination.js";

test("paginateItems returns five restaurants per page", () => {
  const restaurants = Array.from({ length: 12 }, (_, index) => `restaurant-${index + 1}`);

  assert.deepEqual(paginateItems(restaurants, 1, 5), restaurants.slice(0, 5));
  assert.deepEqual(paginateItems(restaurants, 2, 5), restaurants.slice(5, 10));
  assert.deepEqual(paginateItems(restaurants, 3, 5), restaurants.slice(10, 12));
});

test("paginateItems safely handles pages outside the available range", () => {
  const restaurants = ["restaurant-1", "restaurant-2", "restaurant-3"];

  assert.deepEqual(paginateItems(restaurants, 0, 5), restaurants);
  assert.deepEqual(paginateItems(restaurants, 99, 5), []);
});
