import { expect, test } from "bun:test";
import { parseCsvLine } from "../src/csv.ts";

test("quoted fields keep commas and lose their quotes", () => {
  expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
});

test("a doubled quote inside quotes is one literal quote", () => {
  expect(parseCsvLine('x,"say ""hi""",y')).toEqual(["x", 'say "hi"', "y"]);
});

test("plain, empty and quoted-empty fields", () => {
  expect(parseCsvLine("plain")).toEqual(["plain"]);
  expect(parseCsvLine("a,,b")).toEqual(["a", "", "b"]);
  expect(parseCsvLine('"",z')).toEqual(["", "z"]);
});
