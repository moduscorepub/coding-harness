import { expect, test } from "bun:test";
import { pageCount } from "../src/paging.ts";

test("a partial last page counts", () => {
  expect(pageCount(21, 10)).toBe(3);
});
