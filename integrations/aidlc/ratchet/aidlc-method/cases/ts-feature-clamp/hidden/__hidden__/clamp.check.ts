import { expect, test } from "bun:test";
import { clamp, sum } from "../src/math.ts";

test("inside, below and above the range", () => {
  expect(clamp(5, 0, 10)).toBe(5);
  expect(clamp(-1, 0, 10)).toBe(0);
  expect(clamp(11, 0, 10)).toBe(10);
});

test("bounds are inclusive and may be equal", () => {
  expect(clamp(0, 0, 10)).toBe(0);
  expect(clamp(3, 3, 3)).toBe(3);
});

test("min above max is a RangeError", () => {
  expect(() => clamp(1, 5, 2)).toThrow(RangeError);
});

test("sum still works", () => {
  expect(sum([2, 2])).toBe(4);
});
