import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { buildModel } from "@coding-harness/catalog/build";
import { discoverAdvisorConfigs } from "@coding-harness/coding-agent/advisor/config";
import { discoverWatchdogFiles } from "@coding-harness/coding-agent/advisor/watchdog";
import { clearCache } from "@coding-harness/coding-agent/capability/fs";
import { getActiveRules } from "@coding-harness/coding-agent/capability/rule";
import { ModelRegistry } from "@coding-harness/coding-agent/config/model-registry";
import { Settings } from "@coding-harness/coding-agent/config/settings";
import { createAgentSession } from "@coding-harness/coding-agent/sdk";
import { AuthStorage } from "@coding-harness/coding-agent/session/auth-storage";
import { SessionManager } from "@coding-harness/coding-agent/session/session-manager";
import { discoverAgents } from "@coding-harness/coding-agent/task/discovery";
import { setAgentDir, TempDir } from "@coding-harness/utils";

function buildLocalModel() {
	return buildModel({
		id: "resources-discover-model",
		name: "Resources Discover Model",
		api: "openai-completions",
		provider: "managed-primary",
		baseUrl: "http://127.0.0.1:8080/v1",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 4096,
		maxTokens: 1024,
	});
}

async function writeFile(filePath: string, content: string): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, content);
}

let tempDir: TempDir;

beforeEach(() => {
	tempDir = TempDir.createSync("@pi-resources-discover-");
	setAgentDir(tempDir.join("agent"));
	clearCache();
});

afterEach(() => {
	tempDir.removeSync();
});

/** Project with an extension whose `resources_discover` points at a resource tree inside the project. */
async function createProject(): Promise<{ cwd: string; extensionPath: string }> {
	const cwd = tempDir.join("project");
	const resources = path.join(cwd, "managed");
	await writeFile(
		path.join(resources, "skills", "ext-skill", "SKILL.md"),
		"---\nname: ext-skill\ndescription: Skill contributed by an extension\n---\nbody\n",
	);
	await writeFile(
		path.join(resources, "prompts", "ext-prompt.md"),
		"---\ndescription: Extension prompt\n---\nDo $ARGUMENTS\n",
	);
	await writeFile(
		path.join(resources, "agents", "ext-agent.md"),
		"---\nname: ext-agent\ndescription: Agent contributed by an extension\nthinkingLevel: low\n---\nYou are the extension agent.\n",
	);
	await writeFile(
		path.join(resources, "rules", "ext-rule.md"),
		"---\ndescription: Extension rulebook rule\n---\nPrefer extension conventions.\n",
	);
	await writeFile(
		path.join(resources, "rules", "ext-stream-rule.md"),
		"---\ndescription: Extension stream rule\ncondition: forbidden-extension-token\n---\nNever write that token.\n",
	);
	const extensionPath = path.join(cwd, "extension.ts");
	await writeFile(
		extensionPath,
		`export default function extension(pi) {
	pi.on("resources_discover", () => ({
		skillPaths: ["managed/skills"],
		promptPaths: ["managed/prompts"],
		agentPaths: ["managed/agents", "managed/missing-agents"],
		rulePaths: ["managed/rules"],
	}));
}
`,
	);
	return { cwd, extensionPath };
}

async function createSession(cwd: string, extensionPath: string) {
	const authStorage = await AuthStorage.create(tempDir.join("auth.db"));
	authStorage.keys.setRuntime("managed-primary", "test-key");
	const { session } = await createAgentSession({
		cwd,
		agentDir: tempDir.join("agent"),
		sessionManager: SessionManager.inMemory(cwd),
		authStorage,
		modelRegistry: new ModelRegistry(authStorage, tempDir.join("models.yml")),
		settings: Settings.isolated({ "compaction.enabled": false, "skills.enabled": true }),
		model: buildLocalModel(),
		disableExtensionDiscovery: true,
		additionalExtensionPaths: [extensionPath],
		contextFiles: [],
		slashCommands: [],
		enableMCP: false,
		enableLsp: false,
		skipPythonPreflight: true,
	});
	return session;
}

describe("resources_discover", () => {
	it("merges extension skills, prompts, agents and rules into the session", async () => {
		const { cwd, extensionPath } = await createProject();
		const session = await createSession(cwd, extensionPath);
		try {
			expect(session.skills.map(skill => skill.name)).toContain("ext-skill");
			expect(session.promptTemplates.map(template => template.name)).toContain("ext-prompt");

			const roots = session.effectiveExtensionRoots;
			expect(roots.extensionAgentDirs).toEqual([path.join(cwd, "managed", "agents")]);
			const { agents } = await discoverAgents(cwd, tempDir.join("home"), roots);
			const agent = agents.find(candidate => candidate.name === "ext-agent");
			expect(agent?.source).toBe("project");
			expect(agent?.thinkingLevel as string | undefined).toBe("low");

			expect(getActiveRules().map(rule => rule.name)).toEqual(
				expect.arrayContaining(["ext-rule", "ext-stream-rule"]),
			);
			expect(session.ttsrManager?.getRules().map(rule => rule.name)).toContain("ext-stream-rule");
		} finally {
			await session.dispose();
		}
	});

	it("leaves discovery unchanged when no extension handles the event", async () => {
		const cwd = tempDir.join("plain");
		const extensionPath = path.join(cwd, "extension.ts");
		await writeFile(extensionPath, "export default function extension() {}\n");
		const session = await createSession(cwd, extensionPath);
		try {
			expect(session.effectiveExtensionRoots.extensionAgentDirs).toBeUndefined();
			expect(session.skills.map(skill => skill.name)).not.toContain("ext-skill");
		} finally {
			await session.dispose();
		}
	});
});

describe("extension watchdog files", () => {
	it("join advisor discovery as the most specific level", async () => {
		const cwd = tempDir.join("watch");
		await writeFile(path.join(cwd, "WATCHDOG.yml"), "advisors:\n  - name: Reviewer\n    model: project/model\n");
		const extraMd = path.join(cwd, "managed", "WATCHDOG.md");
		const extraYml = path.join(cwd, "managed", "WATCHDOG.yml");
		await writeFile(extraMd, "Check the approved design.\n");
		await writeFile(extraYml, "advisors:\n  - name: Reviewer\n    model: extension/model\n");

		const blocks = await discoverWatchdogFiles(cwd, tempDir.join("agent"), [extraMd, extraYml]);
		expect(blocks.at(-1)).toContain("Check the approved design.");
		expect(blocks).toHaveLength(1);

		const { advisors } = await discoverAdvisorConfigs(cwd, tempDir.join("agent"), [extraMd, extraYml]);
		expect(advisors.find((advisor: { name: string }) => advisor.name === "Reviewer")?.model).toBe("extension/model");
	});
});
