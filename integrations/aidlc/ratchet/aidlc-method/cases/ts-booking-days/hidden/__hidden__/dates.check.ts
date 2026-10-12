import { expect, test } from "bun:test";
import { bookingDays } from "../src/dates.ts";

test("inclusive day counts", () => {
  expect(bookingDays("2024-03-01", "2024-03-03")).toBe(3);
  expect(bookingDays("2024-03-01", "2024-03-01")).toBe(1);
  expect(bookingDays("2024-02-28", "2024-03-01")).toBe(3);
});

test("a booking that ends before it starts is a RangeError", () => {
  expect(() => bookingDays("2024-03-03", "2024-03-01")).toThrow(RangeError);
});
