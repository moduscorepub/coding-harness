import { expect, test } from "bun:test";
import { backoffDelay } from "../src/backoff.ts";

test("the delay is capped", () => {
  expect(backoffDelay(10)).toBe(5000);
});
