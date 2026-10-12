import { expect, test } from "bun:test";
import { bookingDays } from "../src/dates.ts";

test("both the first and the last day count", () => {
  expect(bookingDays("2024-03-01", "2024-03-03")).toBe(3);
});
