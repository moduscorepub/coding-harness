import { describe, expect, it } from "bun:test";
import { authPolicyFor } from "@coding-harness/catalog/compat/auth";

describe("Moduscore OAuth callback", () => {
	it("uses a port-flexible IPv4 loopback redirect", () => {
		const login = authPolicyFor("moduscore")?.login;
		expect(login?.kind).toBe("oauth-code");
		if (login?.kind !== "oauth-code") throw new Error("missing OAuth policy for moduscore");
		expect(login.callback).toMatchObject({
			hostname: "127.0.0.1",
			port: 54547,
			path: "/callback",
			portFallback: true,
		});
	});
});
