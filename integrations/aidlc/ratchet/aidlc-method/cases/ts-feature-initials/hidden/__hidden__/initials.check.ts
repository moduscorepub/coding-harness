import { expect, test } from "bun:test";
import { fullName, initials } from "../src/names.ts";

test("first letters, uppercased", () => {
  expect(initials("ada lovelace")).toBe("AL");
  expect(initials("  Grace  Brewster Hopper ")).toBe("GBH");
  expect(initials("Turing")).toBe("T");
});

test("blank names give no initials", () => {
  expect(initials("")).toBe("");
  expect(initials("   ")).toBe("");
});

test("fullName still works", () => {
  expect(fullName("Alan", "Turing")).toBe("Alan Turing");
});
