import { expect, test } from "bun:test";
import { parseCsvLine } from "../src/csv.ts";

test("a quoted field keeps its comma", () => {
  expect(parseCsvLine('a,"b,c",d')).toEqual(["a", "b,c", "d"]);
});
