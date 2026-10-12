import { expect, test } from "bun:test";
import { slugify } from "../src/slug.ts";

test("slugify trims hyphens at the ends", () => {
  expect(slugify("  Hello, World! ")).toBe("hello-world");
});
