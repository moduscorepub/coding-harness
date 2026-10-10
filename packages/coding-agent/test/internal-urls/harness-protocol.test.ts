import { describe, expect, it } from "bun:test";
import { InternalUrlRouter } from "@coding-harness/coding-agent/internal-urls";

describe("HarnessProtocolHandler", () => {
	it("treats harness://docs as the documentation root", async () => {
		const resource = await InternalUrlRouter.instance().resolve("harness://docs");

		expect(resource.content).toContain("# Documentation");
		expect(resource.content).toContain("tools/read.md");
	});

	it("resolves docs-prefixed documentation paths", async () => {
		const router = InternalUrlRouter.instance();
		const direct = await router.resolve("harness://tools/read.md");
		const prefixed = await router.resolve("harness://docs/tools/read.md");

		expect(prefixed.content).toBe(direct.content);
		expect(prefixed.content).toContain("# read");
	});
});
