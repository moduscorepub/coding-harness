/**
 * Enterprise layer: one built-in extension that makes every session aware of the
 * organization's LLM gateway, the user's AD-group entitlements, the knowledge base,
 * Devin, and the network egress policy. Configured by `enterprise.yml` (the user config
 * root, then `/etc/<app>/`; system file wins per section); absent config leaves the
 * harness unrestricted. Organization-specific values come from the deployment profile.
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { type } from "@coding-harness/harnesstype";
import { APP_NAME, getConfigRootDir } from "@coding-harness/utils";
import { YAML } from "bun";
import type { ExtensionContext, ExtensionFactory } from "../extensibility/extensions";

interface EnterpriseConfig {
	org?: string;
	gateway?: { name?: string; url?: string; keyEnvs?: string[] };
	identity?: { groupPrefix?: string };
	/** AD group → entitlements; `default` applies when the user matches no listed group. */
	groups?: Record<string, { denyTools?: string[] }>;
	knowledgeBase?: { name?: string; url?: string; keyEnv?: string; topK?: number };
	devin?: { url?: string; keyEnv?: string };
	network?: { proxy?: string; noProxy?: string; egressAllow?: string[]; ingress?: string };
}

function loadEnterpriseConfig(): { config: EnterpriseConfig; sources: string[] } {
	let config: EnterpriseConfig = {};
	const sources: string[] = [];
	for (const file of [path.join(getConfigRootDir(), "enterprise.yml"), `/etc/${APP_NAME}/enterprise.yml`]) {
		if (!fs.existsSync(file)) continue;
		config = { ...config, ...(YAML.parse(fs.readFileSync(file, "utf8")) as EnterpriseConfig) };
		sources.push(file);
	}
	return { config, sources };
}

/** AD groups of the OS user (`HARNESS_AD_GROUPS` overrides), `DOMAIN\` stripped, filtered by prefix. */
function detectAdGroups(prefix: string | undefined): string[] {
	let raw: string[];
	if (process.env.HARNESS_AD_GROUPS !== undefined) raw = process.env.HARNESS_AD_GROUPS.split(",");
	else if (process.platform === "win32") {
		const out = Bun.spawnSync(["whoami", "/groups", "/fo", "csv", "/nh"]).stdout.toString();
		raw = out.split(/\r?\n/).map(line => line.split('","')[0]?.replace(/^"/, "") ?? "");
	} else {
		// ponytail: `id -Gn` splits AD names containing spaces; switch to an LDAP/Graph lookup if that bites.
		raw = Bun.spawnSync(["id", "-Gn"]).stdout.toString().split(/\s+/);
	}
	const groups = raw.map(g => g.trim().replace(/^.*\\/, "")).filter(Boolean);
	const upper = prefix?.toUpperCase();
	return upper ? groups.filter(g => g.toUpperCase().startsWith(upper)) : groups;
}

const URL_HOST = /\b(?:https?|wss?|ftp):\/\/(?:[^@/\s'"]*@)?([a-z0-9.-]+)/gi;
/** Tools whose input can open outbound connections; content-carrying tools (edit/write/task) are not scanned. */
const EGRESS_TOOLS = new Set(["bash", "read", "browser", "eval", "python", "fetch", "web_fetch", "ssh"]);

export function isEgressAllowed(host: string, allow: readonly string[]): boolean {
	const h = host.toLowerCase();
	if (h === "localhost" || h === "127.0.0.1") return true;
	return allow.some(pattern => {
		const p = pattern.toLowerCase();
		return p.startsWith("*.") ? h === p.slice(2) || h.endsWith(p.slice(1)) : h === p;
	});
}

const kbSearchSchema = type({
	query: type("string").describe("natural-language search over the organization knowledge base"),
	"top_k?": type("number").describe("max results (default from enterprise.yml)"),
});

const devinSchema = type({
	prompt: type("string").describe("complete task brief for the Devin agent"),
	"title?": type("string").describe("short session title"),
});

async function postJson(url: string, keyEnv: string | undefined, body: unknown, signal?: AbortSignal): Promise<any> {
	const key = keyEnv ? process.env[keyEnv] : undefined;
	const res = await fetch(url, {
		method: "POST",
		headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
		body: JSON.stringify(body),
		signal,
	});
	if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}: ${await res.text()}`);
	return res.json();
}

export const createEnterpriseExtension: ExtensionFactory = api => {
	const { config, sources } = loadEnterpriseConfig();
	const org = config.org ?? "Organization";
	const net = config.network ?? {};
	const allow = net.egressAllow;
	if (net.proxy) {
		process.env.HTTPS_PROXY ??= net.proxy;
		process.env.HTTP_PROXY ??= net.proxy;
	}
	if (net.noProxy) process.env.NO_PROXY ??= net.noProxy;

	const user = os.userInfo().username;
	const groups = detectAdGroups(config.identity?.groupPrefix);
	const matched = groups.filter(g => config.groups?.[g]);
	const denied = new Set(
		(matched.length > 0 ? matched : ["default"]).flatMap(g => config.groups?.[g]?.denyTools ?? []),
	);
	const gatewayKeys = (config.gateway?.keyEnvs ?? []).filter(name => process.env[name]);
	const kb = config.knowledgeBase;
	const devin = config.devin;

	const statusLines = (): string[] => [
		`${org} enterprise harness — user ${user}`,
		`Gateway: ${config.gateway?.name ?? "none"} ${config.gateway?.url ?? ""} (keys: ${gatewayKeys.join(", ") || "MISSING"})`,
		`AD groups: ${groups.join(", ") || "none"} (entitled via: ${matched.join(", ") || "default"})`,
		`Denied tools: ${[...denied].join(", ") || "none"}`,
		`Knowledge base: ${kb?.url ? `${kb.name ?? "kb"} ${kb.url} [${kb.keyEnv && process.env[kb.keyEnv] ? "ready" : "no key"}]` : "not configured"}`,
		`Devin: ${devin?.url ? `${devin.url} [${devin.keyEnv && process.env[devin.keyEnv] ? "ready" : "no key"}]` : "not configured"}`,
		`Egress: ${allow ? `allowlist ${allow.join(", ")}` : "open"}${net.proxy ? ` via proxy ${net.proxy}` : ""}`,
		`Ingress: ${net.ingress ?? "unspecified"}`,
		`Policy: ${sources.join(", ") || "no enterprise.yml"}`,
	];

	const promptContext = [
		`# ${org} Enterprise Context`,
		`- You operate inside ${org}'s managed coding harness for user \`${user}\`.`,
		`- AD groups: ${groups.join(", ") || "none detected"}. Tools denied by entitlement: ${[...denied].join(", ") || "none"}.`,
		config.gateway?.url
			? `- All model traffic goes through ${config.gateway.name ?? "the LLM gateway"} (${config.gateway.url}). NEVER send code or data to other AI services.`
			: "",
		kb?.url
			? `- Internal knowledge base available via \`kb_search\`; consult it first for ${org} standards, APIs, and runbooks.`
			: "",
		devin?.url ? "- Long-running autonomous work can be delegated to Devin via `devin_session`." : "",
		allow
			? `- Network egress is restricted to: ${allow.join(", ")}. Do not attempt other hosts; ask the user if one is required.`
			: "",
		net.ingress ? `- Ingress policy: ${net.ingress}.` : "",
	]
		.filter(Boolean)
		.join("\n");

	if (kb?.url) {
		const base = kb.url.replace(/\/$/, "");
		api.registerTool({
			name: "kb_search",
			label: `${org} Knowledge Base`,
			description: `Search the ${org} internal knowledge base (${kb.name ?? base}). Returns ranked passages with titles and links.`,
			parameters: kbSearchSchema,
			approval: "read",
			loadMode: "essential",
			async execute(_id, params, signal) {
				const body = await postJson(
					`${base}/search`,
					kb.keyEnv,
					{ query: params.query, top_k: params.top_k ?? kb.topK ?? 5 },
					signal,
				);
				const results: any[] = Array.isArray(body) ? body : (body.results ?? []);
				const text =
					results.length === 0
						? "No results."
						: results
								.map(
									(r, i) =>
										`${i + 1}. ${r.title ?? r.id ?? "result"}${r.url ? ` <${r.url}>` : ""}\n${r.snippet ?? r.text ?? r.content ?? ""}`,
								)
								.join("\n\n");
				return { content: [{ type: "text", text }] };
			},
		});
	}

	if (devin?.url) {
		const base = devin.url.replace(/\/$/, "");
		api.registerTool({
			name: "devin_session",
			label: "Devin",
			description:
				"Start an autonomous Devin session (Devin API v1) for a self-contained task; returns the session URL.",
			parameters: devinSchema,
			approval: "exec",
			async execute(_id, params, signal) {
				const session = await postJson(
					`${base}/v1/sessions`,
					devin.keyEnv,
					{ prompt: params.prompt, title: params.title, idempotent: true },
					signal,
				);
				return { content: [{ type: "text", text: `Devin session ${session.session_id}: ${session.url}` }] };
			},
		});
	}

	api.on("session_start", (_event, ctx: ExtensionContext) => {
		ctx.ui.setStatus("enterprise", `${matched.length || groups.length} grp · egress ${allow ? "locked" : "open"}`);
		if (config.gateway && gatewayKeys.length === 0) {
			ctx.ui.notify(`No ${org} gateway key set; export one of: ${config.gateway.keyEnvs?.join(", ")}`, "warning");
		}
	});

	api.on("before_agent_start", event => ({ systemPrompt: [...event.systemPrompt, promptContext] }));

	api.on("tool_call", event => {
		if (denied.has(event.toolName)) {
			return {
				block: true,
				reason: `${org} policy: tool \`${event.toolName}\` is not entitled for your AD groups.`,
			};
		}
		if (!allow || !EGRESS_TOOLS.has(event.toolName)) return;
		for (const [, host] of JSON.stringify(event.input).matchAll(URL_HOST)) {
			if (!isEgressAllowed(host, allow)) {
				return {
					block: true,
					reason: `${org} network policy: egress to ${host} is not on the allowlist (${allow.join(", ")}).`,
				};
			}
		}
	});

	api.registerCommand("enterprise", {
		description: `Show ${org} enterprise status: gateway, AD groups, knowledge base, network`,
		handler: async (_args, ctx) => ctx.ui.notify(statusLines().join("\n"), "info"),
	});
};
