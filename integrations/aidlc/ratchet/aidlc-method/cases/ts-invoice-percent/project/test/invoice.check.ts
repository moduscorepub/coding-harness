import { expect, test } from "bun:test";
import { total } from "../src/invoice.ts";

test("total applies a percentage discount", () => {
  expect(total([{ priceCents: 1500, qty: 2 }], 10)).toBe(2700);
});
