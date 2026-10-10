import { STREAM_AUTH_ENV, STREAM_AUTH_PROVIDER } from "@coding-harness/wire";
import { discoverAuthStorage } from "../sdk";
import type { AuthStorage } from "../session/auth-storage";

/**
 * Bearer credential presented to Moduscore services (`harness stream`, `harness clip`,
 * `harness skill`).
 *
 * `MODUSCORE_API_KEY` wins outright (debug and CI: `MODUSCORE_API_KEY=test harness
 * stream …`); otherwise the coding-harness.invalid credential stored by `/login` is used
 * and re-resolved on every call so a refreshed access token is sent after a
 * reconnect. `resolve()` returns null when neither exists.
 */
export class ModuscoreCredential {
	#storage?: AuthStorage;

	async resolve(): Promise<string | null> {
		const fromEnv = process.env[STREAM_AUTH_ENV]?.trim();
		if (fromEnv) return fromEnv;
		this.#storage ??= await discoverAuthStorage();
		const token = await this.#storage.keys.get(STREAM_AUTH_PROVIDER);
		return token?.trim() || null;
	}

	/** Human guidance for a missing credential. */
	static get missingMessage(): string {
		return `a coding-harness.invalid account is required: run harness and use /login → Moduscore, or set ${STREAM_AUTH_ENV}`;
	}

	close(): void {
		this.#storage?.close();
		this.#storage = undefined;
	}
}
