import { expect, test } from "bun:test";
import { pageCount } from "../src/paging.ts";

test("partial and exact pages", () => {
  expect(pageCount(21, 10)).toBe(3);
  expect(pageCount(20, 10)).toBe(2);
  expect(pageCount(1, 10)).toBe(1);
});

test("zero items need zero pages", () => {
  expect(pageCount(0, 10)).toBe(0);
});

test("a non-positive page size is a RangeError", () => {
  expect(() => pageCount(5, 0)).toThrow(RangeError);
});
