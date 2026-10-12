import { expect, test } from "bun:test";
import { subtotal, total } from "../src/invoice.ts";

test("percentage of the subtotal", () => {
  expect(total([{ priceCents: 1500, qty: 2 }], 10)).toBe(2700);
});

test("the discount amount rounds down to the cent", () => {
  expect(total([{ priceCents: 1999, qty: 1 }], 15)).toBe(1700);
});

test("no discount and a full discount", () => {
  expect(total([{ priceCents: 250, qty: 4 }])).toBe(1000);
  expect(total([{ priceCents: 250, qty: 4 }], 100)).toBe(0);
});

test("subtotal is unchanged", () => {
  expect(subtotal([{ priceCents: 100, qty: 3 }, { priceCents: 5, qty: 2 }])).toBe(310);
});
