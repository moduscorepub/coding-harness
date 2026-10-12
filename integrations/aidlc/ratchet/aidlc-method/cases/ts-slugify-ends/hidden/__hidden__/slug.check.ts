import { expect, test } from "bun:test";
import { slugify } from "../src/slug.ts";

test("no hyphen at either end", () => {
  expect(slugify("  Hello, World! ")).toBe("hello-world");
  expect(slugify("--A--B--")).toBe("a-b");
});

test("inner runs collapse and clean slugs pass through", () => {
  expect(slugify("Rock & Roll 2")).toBe("rock-roll-2");
  expect(slugify("already-a-slug")).toBe("already-a-slug");
});

test("nothing sluggable gives an empty slug", () => {
  expect(slugify("!!!")).toBe("");
});
