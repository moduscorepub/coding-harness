import { expect, test } from "bun:test";
import { sum } from "../src/math.ts";

test("sum adds the numbers", () => {
  expect(sum([1, 2, 3])).toBe(6);
  expect(sum([])).toBe(0);
});
