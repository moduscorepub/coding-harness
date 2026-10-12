import { expect, test } from "bun:test";
import { fullName } from "../src/names.ts";

test("fullName joins trimmed parts", () => {
  expect(fullName(" Ada ", "Lovelace ")).toBe("Ada Lovelace");
});
