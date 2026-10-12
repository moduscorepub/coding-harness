import { expect, test } from "bun:test";
import { backoffDelay } from "../src/backoff.ts";

test("doubles per attempt below the cap", () => {
  expect(backoffDelay(0)).toBe(100);
  expect(backoffDelay(3)).toBe(800);
});

test("never exceeds the cap", () => {
  expect(backoffDelay(10)).toBe(5000);
  expect(backoffDelay(6, 100, 1000)).toBe(1000);
  expect(backoffDelay(2, 50, 1000)).toBe(200);
});
