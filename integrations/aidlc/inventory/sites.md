# Distribution-name sites (generated)

Source: `upstream`. 343 lines in 25 files. Regenerate with `bun scripts/sites.ts`.

| File | Sites |
|---|---|
| `core/tools/aidlc-config-diagnostics.ts` | 67 |
| `core/tools/aidlc-doctor.ts` | 2 |
| `core/tools/aidlc-init.ts` | 46 |
| `core/tools/aidlc-learnings.ts` | 5 |
| `core/tools/aidlc-lib.ts` | 7 |
| `core/tools/aidlc-model-policy.ts` | 23 |
| `core/tools/aidlc-orchestrate.ts` | 5 |
| `core/tools/aidlc-plugin-build.ts` | 1 |
| `core/tools/aidlc-plugin-emit.ts` | 14 |
| `core/tools/aidlc-plugin-test.ts` | 5 |
| `core/tools/aidlc-plugin.ts` | 31 |
| `core/tools/aidlc-runner-gen.ts` | 8 |
| `core/tools/aidlc-runtime-paths.ts` | 7 |
| `core/tools/aidlc-settings.ts` | 8 |
| `core/tools/aidlc-utility.ts` | 17 |
| `core/tools/aidlc.ts` | 9 |
| `core/hooks/aidlc-continue-workflow.ts` | 6 |
| `scripts/build-binaries.ts` | 40 |
| `scripts/ci-live-filter.ts` | 2 |
| `scripts/ci-live-sandbox.ts` | 5 |
| `scripts/ci-start-credential-broker.ts` | 4 |
| `scripts/manifest-types.ts` | 4 |
| `scripts/package.ts` | 15 |
| `scripts/plugin-hooks-template/compose.ts` | 5 |
| `scripts/verify-release.ts` | 7 |

## core/tools/aidlc-config-diagnostics.ts

- L50: `export type BedrockOrientedHarness = Exclude<ModelHarness, "kiro" | "kiro-ide">;`
- L53: `"kiro",`
- L54: `"kiro-ide",`
- L73: `case "claude":`
- L75: `case "codex":`
- L77: `case "opencode":`
- L79: `case "copilot":`
- L81: `case "cursor":`
- L485: `distribution !== "claude" &&`
- L486: `distribution !== "codex" &&`
- L487: `distribution !== "copilot" &&`
- L488: `distribution !== "cursor" &&`
- L489: `distribution !== "kiro" &&`
- L490: `distribution !== "kiro-ide" &&`
- L491: `distribution !== "opencode"`
- L808: `command: "claude",`
- L813: `command: "codex",`
- L819: `command: "copilot",`
- L825: `command: "cursor",`
- L834: `"kiro-ide": {`
- L839: `command: "opencode",`
- L1098: `if (harness === "codex") actions.push("codex-provider-configuration");`
- L1099: `if (harness === "copilot") actions.push("copilot-byok-configuration");`
- L1100: `if (harness === "cursor") actions.push("cursor-provider-configuration");`
- L1495: `if (record && harness === "claude") {`
- L1513: `if (harness === "claude") clearClaudeProvider(projectionRoot, harnessDir);`
- L1514: `else if (harness === "codex") clearCodexProvider(projectionRoot, harnessDir, previousProvider);`
- L1515: `else if (harness === "opencode") {`
- L1521: `if (harness === "claude") clearClaudeProvider(projectionRoot, harnessDir);`
- L1522: `else if (harness === "codex") clearCodexProvider(projectionRoot, harnessDir, previousProvider);`
- L1523: `else if (harness === "opencode") {`
- L1529: `harness === "opencode" && provider.provider === "amazon-bedrock" &&`
- L1536: `if (harness === "claude") {`
- L1538: `} else if (harness === "opencode") {`
- L1559: `if (harness === "claude") {`
- L1564: `} else if (harness === "codex") {`
- L1569: `} else if (harness === "opencode") {`
- L1581: `if (harness === "claude") {`
- L1592: `} else if (harness === "opencode" && record.opencodeDefault) {`
- L1692: `if (record?.defaultScope && harness === "claude") {`
- L1737: `if (record.defaultScope && harness === "claude") {`
- L1861: `setting: surface.kind === "claude"`
- L1871: `kind: "claude" | "always" | "none";`
- L1880: `if (harness === "claude") {`
- L1881: `return { kind: "claude", path: join(projectDir, ".mcp.json") };`
- L1883: `if (harness === "kiro") {`
- L1889: `if (harness === "cursor") {`
- L1963: `surface.kind === "claude" &&`
- L1995: `if (harness === "claude") {`
- L2036: `} else if (harness === "codex") {`
- L2075: `} else if (harness === "opencode" && record.provider === "other") {`
- L2090: `if (harness === "codex") {`
- L2096: `} else if (harness === "claude") {`
- L2144: `} else if (harness === "opencode" && record.opencodeDefault) {`
- L2262: `if (harness === "codex") {`
- L2269: `if (harness === "opencode" || harness === "copilot") {`
- L2295: `if (harness === "claude") files.push(join(projectDir, harnessDir, "settings.json"));`
- L2296: `if (harness === "codex") {`
- L2304: `if (harness === "kiro" || harness === "kiro-ide") {`
- L2324: `if (harness === "kiro-ide") {`
- L2327: `if (harness === "cursor") {`
- L2333: `if (harness === "copilot") files.push(join(projectDir, ".github", "hooks", "aidlc.json"));`
- L2334: `if (harness === "opencode") files.push(join(projectDir, "opencode.json"));`
- L2345: `if (harness === "codex") {`
- L2348: `if (harness === "kiro-ide") {`
- L2481: `let onboardingPath = harness === "claude" ? '${harnessDir}/CLAUDE.md' : undefined;`
- L2512: `const instructionPaths = harness === "claude" ? [] : ["AGENTS.md"];`

## core/tools/aidlc-doctor.ts

- L210: `"kiro-ide": "Kiro IDE",`
- L211: `opencode: "opencode",`

## core/tools/aidlc-init.ts

- L535: `value === "claude" ||`
- L536: `value === "codex" ||`
- L537: `value === "copilot" ||`
- L538: `value === "cursor" ||`
- L539: `value === "kiro" ||`
- L540: `value === "kiro-ide" ||`
- L541: `value === "opencode"`
- L1653: `if (selected.harness !== "opencode") {`
- L1681: `selected.harness === "opencode" &&`
- L1709: `if (harness === "claude" || harness === "codex" || harness === "opencode") {`
- L1716: `if (harness === "claude" || harness === "codex" || harness === "opencode") {`
- L1819: `if (selected.harness === "opencode") {`
- L1827: `selected.harness === "codex" ||`
- L1828: `selected.harness === "copilot" ||`
- L1829: `selected.harness === "cursor"`
- L1832: `selected.harness === "codex"`
- L1834: `: selected.harness === "copilot"`
- L1845: `const action = selected.harness === "codex"`
- L1847: `: selected.harness === "copilot"`
- L4049: `if (harness === "claude") {`
- L4059: `} else if (harness === "codex") {`
- L4061: `} else if (harness === "opencode") {`
- L4074: `if (harness === "claude") {`
- L4087: `if (harness === "codex") {`
- L4113: `if (!projectProjection && entries && descriptor.distribution === "claude") {`
- L4120: `} else if (!projectProjection && entries && descriptor.distribution === "codex") {`
- L4133: `const currentConfiguration = descriptor.distribution === "claude"`
- L4135: `: descriptor.distribution === "codex"`
- L4319: `if (modelHarness(distribution) === "claude") {`
- L4323: `} else if (modelHarness(distribution) === "codex") {`
- L4335: `if (modelHarness(distribution) === "kiro") {`
- L4518: `if (modelHarness(distribution) === "claude") {`
- L4520: `} else if (modelHarness(distribution) === "codex") {`
- L5184: `if (distribution === "codex") {`
- L5187: `if (distribution === "kiro") {`
- L5190: `if (distribution === "opencode") {`
- L5193: `if (distribution === "cursor") {`
- L5196: `if (distribution === "kiro-ide") {`
- L5199: `if (distribution === "copilot") {`
- L5283: `if (choices.candidate.stamp.distribution === "opencode") {`
- L5529: `mcp: initial.stamp.distribution === "claude" ? "defaults" : "none",`
- L5550: `choices.mcp = choices.candidate.stamp.distribution === "claude"`
- L5593: `if (choices.candidate.stamp.distribution === "opencode") {`
- L5784: `candidate.stamp.distribution === "claude" ? "MCP servers on, " : ""`
- L5820: `mcp: candidate.stamp.distribution === "claude" ? "defaults" : "none",`
- L6769: `const harness = requestedHarness ? modelHarness(requestedHarness) : "claude";`

## core/tools/aidlc-learnings.ts

- L1057: `path.includes(join("dist", "claude", ".claude", "sensors")) ||`
- L1058: `path.includes(join("dist", "kiro", ".kiro", "sensors")) ||`
- L1059: `path.includes(join("dist", "codex", ".codex", "sensors")) ||`
- L1060: `path.includes(join("dist", "opencode", ".aidlc", "sensors")) ||`
- L1061: `path.includes(join("dist", "cursor", ".cursor", "sensors"))`

## core/tools/aidlc-lib.ts

- L7569: `return installedHarnessNameForTarget(target) === "copilot" && marker?.version === 2 &&`
- L7570: `(marker.cursor_harness === undefined || marker.cursor_harness === "copilot") &&`
- L7587: `if (dir === ".aidlc") return "opencode";`
- L7588: `if (dir === ".kiro") return "kiro";`
- L8135: `installedHarnessNameForTarget(target) === "copilot" &&`
- L20738: `return harnessName === "claude" ? HOOK_EXECUTION_RECOVERY_CLAUDE : HOOK_EXECUTION_RECOVERY_OTHER;`
- L31418: `'${runtimeHarnessName() === "claude" ? JSON.stringify({ systemMessage: line }) : line}\n',`

## core/tools/aidlc-model-policy.ts

- L43: `| "claude"`
- L44: `| "codex"`
- L45: `| "copilot"`
- L46: `| "cursor"`
- L47: `| "kiro"`
- L48: `| "kiro-ide"`
- L49: `| "opencode";`
- L142: `"kiro-ide": Object.freeze({`
- L351: `return harness === "kiro-ide" ? "kiro" : harness;`
- L364: `if (harness === "codex" && effort === "max") {`
- L367: `if (harness === "opencode" && effort === "xhigh") {`
- L408: `const kiroHasModel = harness === "kiro" && model !== undefined;`
- L411: `(harness !== "kiro" || kiroHasModel);`
- L601: `if (harness === "claude") {`
- L607: `} else if (harness === "codex") {`
- L613: `} else if (harness === "opencode") {`
- L630: `} else if (harness === "kiro") {`
- L703: `const kiroCollapsed = harness === "kiro"`
- L718: `const surfaceExpected = harness === "kiro" && expected.model && kiroCollapsed[expected.model]`
- L726: `if (harness === "claude") {`
- L729: `} else if (harness === "codex") {`
- L732: `} else if (harness === "opencode") {`
- L735: `} else if (harness === "kiro") {`

## core/tools/aidlc-orchestrate.ts

- L641: `installedHarnessName(projectDir) !== "kiro-ide"`
- L975: `return explicit === "kiro" || explicit === "kiro-ide";`
- L985: `return parsed.name === "kiro" || parsed.name === "kiro-ide";`
- L989: `return explicit === "kiro" || explicit === "kiro-ide";`
- L4268: `installedHarnessName(projectDir) === "kiro-ide" &&`

## core/tools/aidlc-plugin-build.ts

- L36: `"claude",`

## core/tools/aidlc-plugin-emit.ts

- L43: `export type PluginTargetKind = "store" | "kiro" | "kiro-ide" | "cursor";`
- L163: `value.kind !== "kiro" &&`
- L164: `value.kind !== "kiro-ide" &&`
- L165: `value.kind !== "cursor")`
- L315: `target.kind !== "cursor" &&`
- L316: `target.kind !== "kiro-ide"`
- L330: `target.harnessName === "claude"`
- L333: `if (target.kind === "cursor") {`
- L336: `if (target.kind === "kiro-ide") {`
- L371: `if (target.kind === "kiro") return;`
- L372: `if (target.kind === "kiro-ide") {`
- L395: `if (target.kind === "cursor") {`
- L444: `target.kind === "cursor" && dir === "agents"`
- L462: `if (target.kind === "cursor") {`

## core/tools/aidlc-plugin-test.ts

- L214: `options.harness === "claude" ||`
- L215: `options.harness === "codex" ||`
- L216: `options.harness === "kiro" ||`
- L217: `options.harness === "kiro-ide"`
- L232: `if (options.harness === "cursor") {`

## core/tools/aidlc-plugin.ts

- L68: `harness: "claude" | "codex" | "kiro" | "cursor" | "copilot" | "opencode";`
- L188: `if (harness === "claude") return ".claude-plugin";`
- L189: `if (harness === "codex") return ".codex-plugin";`
- L190: `if (harness === "kiro") return ".kiro-plugin";`
- L191: `if (harness === "cursor") return ".cursor-plugin";`
- L192: `if (harness === "copilot") return ".plugin";`
- L256: `declared === "claude" ||`
- L257: `declared === "codex" ||`
- L258: `declared === "kiro" ||`
- L259: `declared === "kiro-ide" ||`
- L260: `declared === "cursor" ||`
- L261: `declared === "copilot" ||`
- L262: `declared === "opencode"`
- L264: `return declared === "kiro-ide" ? "kiro" : declared;`
- L266: `if (harnessDir === ".codex") return "codex";`
- L267: `if (harnessDir === ".kiro") return "kiro";`
- L268: `if (harnessDir === ".cursor") return "cursor";`
- L269: `return "claude";`
- L352: `if (!existsSync(registryPath)) return currentRootInventory("claude");`
- L365: `harness: "claude",`
- L377: `return currentRootInventory("claude");`
- L380: `return currentRootInventory("claude");`
- L385: `return currentRootInventory("claude");`
- L422: `const normalized = invalidFromRoot(root, "claude", enabledPlugins[id] !== false, version);`
- L431: `harness: "claude",`
- L441: `if (!existsSync(configPath)) return currentRootInventory("codex");`
- L448: `harness: "codex",`
- L510: `"codex",`
- L520: `harness: "codex",`
- L529: `if (harness === "claude") return claudeInventory();`
- L530: `if (harness === "codex") return codexInventory();`

## core/tools/aidlc-runner-gen.ts

- L601: `if (harnessName === "claude") return "use '/clear' (or restart Claude Code)";`
- L602: `if (harnessName === "codex") return "exit or restart Codex CLI and start a new session";`
- L603: `if (harnessName === "kiro") return "exit or restart Kiro CLI and start a new session";`
- L604: `if (harnessName === "kiro-ide") return "open a new Kiro IDE chat";`
- L605: `if (harnessName === "opencode") return "exit or restart OpenCode and start a new session";`
- L606: `if (harnessName === "cursor") {`
- L609: `if (harnessName === "copilot") {`
- L612: `if (harnessName === "cursor") return "start a new Cursor chat session";`

## core/tools/aidlc-runtime-paths.ts

- L256: `if (harnessDir === ".aidlc") return "opencode";`
- L257: `if (harnessDir === ".codex") return "codex";`
- L258: `if (harnessDir === ".kiro") return "kiro";`
- L259: `if (harnessDir === ".cursor") return "cursor";`
- L260: `return "claude";`
- L358: `if (distribution === "copilot") {`
- L361: `if (distribution === "codex" && !existsSync(harnessSkills)) {`

## core/tools/aidlc-settings.ts

- L108: `"claude",`
- L109: `"codex",`
- L110: `"copilot",`
- L111: `"cursor",`
- L112: `"kiro",`
- L113: `"kiro-ide",`
- L114: `"opencode",`
- L707: `["claude", "codex", "copilot", "cursor", "kiro", "kiro-ide", "opencode"]`

## core/tools/aidlc-utility.ts

- L2846: `if (currentHarnessName === "copilot") {`
- L2926: `} else if (currentHarnessName === "copilot") {`
- L2930: `} else if (currentHarnessName === "opencode") {`
- L3084: `const isCopilot = harnessName === "copilot";`
- L3151: `fix: projectedFileRepair("claude", ".claude/settings.json"),`
- L3159: `fix: projectedFileRepair("claude", ".claude/settings.json"),`
- L3235: `if (harnessName === "claude") {`
- L3355: `"copilot",`
- L3365: `"opencode",`
- L3384: `fix: '${projectedFileRepair("kiro", ".kiro/agents/aidlc.json")} (Kiro CLI) or ${projectedFileRepair("kiro-ide", ".kiro/agents/aidlc.md")} (Kiro IDE)',`
- L3391: `fix: '${projectedFileRepair("kiro", ".kiro/settings/cli.json")} (or use \'kiro-cli chat --agent aidlc\')',`
- L3403: `fix: projectedFileRepair("codex", '.codex/${file}'),`
- L3425: `fix: projectedFileRepair("copilot", file),`
- L3500: `fix: projectedFileRepair("cursor", '.cursor/${file}'),`
- L3512: `fix: projectedFileRepair("opencode", "opencode.json"),`
- L3517: `fix: projectedFileRepair("opencode", ".opencode/command/aidlc.md"),`
- L3524: `fix: projectedFileRepair("claude", ".claude/settings.json"),`

## core/tools/aidlc.ts

- L1188: `type AdapterHarness = "codex" | "copilot" | "cursor" | "kiro" | "kiro-ide";`
- L1195: `"kiro-ide": ".kiro",`
- L1203: `if (harness === "codex") return "aidlc-codex-adapter.ts";`
- L1204: `if (harness === "copilot") return "aidlc-copilot-adapter.ts";`
- L1205: `if (harness === "cursor") return "aidlc-cursor-adapter.ts";`
- L1651: `const harness: AdapterHarness = name === "cursor-adapter" ? "cursor" : "copilot";`
- L1901: `process.env.AIDLC_HARNESS_NAME === "copilot" &&`
- L2242: `if (action.harness !== "kiro-ide") {`
- L2998: `(route?.routeOnly === "adapter" && withoutProjectDirFlag(argv)[2] !== "kiro-ide")`

## core/hooks/aidlc-continue-workflow.ts

- L792: `function transcriptIsConversational(transcriptPath: string, format: "claude" | "codex", projectDir: string): boolean {`
- L850: `if (format === "claude") {`
- L1067: `format: "claude" | "codex",`
- L1351: `let transcriptFormat: "claude" | "codex" = "claude";`
- L1363: `if (/[/\\]rollout-[^/\\]*\.jsonl$/.test(transcriptPath)) transcriptFormat = "codex";`
- L1415: `if (transcriptPath && transcriptFormat === "claude") {`

## scripts/build-binaries.ts

- L93: `"claude",`
- L99: `const RUNTIME_ASSET_ROOT = join(REPO_ROOT, "dist-release", "claude", ".claude");`
- L316: `cpSync(join(REPO_ROOT, "dist-release", "claude"), project, { recursive: true });`
- L376: `"claude",`
- L548: `cpSync(join(REPO_ROOT, "dist", "kiro"), project, { recursive: true });`
- L675: `"claude",`
- L1024: `const pluginRoot = join(REPO_ROOT, "dist", "plugins", "test-pro", "claude");`
- L1027: `cpSync(join(REPO_ROOT, "dist-release", "claude", "aidlc"), join(project, "aidlc"), {`
- L1165: `"claude",`
- L1335: `harness: "codex" | "kiro",`
- L1340: `join(REPO_ROOT, "dist", harness, harness === "codex" ? ".codex" : ".kiro"),`
- L1341: `join(project, harness === "codex" ? ".codex" : ".kiro"),`
- L1345: `const input = harness === "codex"`
- L1429: `cpSync(join(REPO_ROOT, "dist-release", "codex", ".codex"), join(project, ".codex"), {`
- L1437: `const result = run(artifact, ["engine", "adapter", "codex", "validate-state"], {`
- L1473: `cpSync(join(REPO_ROOT, "dist", "cursor", ".cursor"), join(project, ".cursor"), {`
- L1482: `const result = run(artifact, ["engine", "adapter", "cursor", "validate-state"], {`
- L1518: `cpSync(join(REPO_ROOT, "dist-release", "copilot", ".aidlc"), join(project, ".aidlc"), {`
- L1526: `const result = run(artifact, ["engine", "adapter", "copilot", "validate-state"], {`
- L1567: `cpSync(join(REPO_ROOT, "dist-release", "copilot", ".aidlc"), join(project, ".aidlc"), {`
- L1617: `join(REPO_ROOT, "dist-release", "codex", ".codex"),`
- L1702: `["engine", "adapter", "codex", "validate-state", "--project-dir", targetProject],`
- L1765: `cpSync(join(REPO_ROOT, "dist-release", "codex", ".codex"), join(codexProject, ".codex"), {`
- L1768: `cpSync(join(REPO_ROOT, "dist-release", "kiro", ".kiro"), join(kiroProject, ".kiro"), {`
- L1771: `cpSync(join(REPO_ROOT, "dist-release", "kiro-ide", ".kiro"), join(kiroIdeProject, ".kiro"), {`
- L1805: `args: ["engine", "adapter", "codex", "validate-state"],`
- L1815: `args: ["engine", "adapter", "kiro", "session-start"],`
- L1825: `args: ["engine", "adapter", "kiro-ide", "mint"],`
- L2083: `"claude",`
- L2286: `result.gates.push(harnessRuntimeGate(actual.artifact, "codex", ".codex"));`
- L2287: `result.gates.push(harnessRuntimeGate(actual.artifact, "cursor", ".cursor"));`
- L2288: `result.gates.push(harnessRuntimeGate(actual.artifact, "kiro", ".kiro"));`
- L2289: `result.gates.push(harnessRuntimeGate(actual.artifact, "kiro-ide", ".kiro"));`
- L2290: `result.gates.push(harnessRuntimeGate(actual.artifact, "copilot", ".aidlc"));`
- L2291: `result.gates.push(harnessRuntimeGate(actual.artifact, "opencode", ".aidlc"));`
- L2294: `"kiro",`
- L2299: `"copilot",`
- L2304: `"opencode",`
- L2349: `result.gates.push(planApprovalAdapterGate(actual.artifact, "codex"));`
- L2350: `result.gates.push(planApprovalAdapterGate(actual.artifact, "kiro"));`

## scripts/ci-live-filter.ts

- L18: `"kiro-ide": { env: { AIDLC_KIRO_IDE_LIVE: "1" }, platforms: [], hosting: "excluded", requireCoverage: true, reason: "needs a dedicated isolated Windows desktop `
- L30: `export const VERIFICATION_FAMILIES = ["all", "claude-sdk", "claude-tui", "codex", "opencode"] as const;`

## scripts/ci-live-sandbox.ts

- L24: `if (family === "codex" && source.AIDLC_CODEX_BIN !== undefined) {`
- L49: `} else if (family === "opencode") {`
- L61: `if (extra.length || !["claude-sdk", "claude-tui", "codex", "opencode", "release-contract"].includes(family) || !["linux", "darwin", "win32"].includes(platform))`
- L69: `if (family === "codex" || family === "opencode") {`
- L71: `writeFileSync(join(home, ".aws/config"), '[profile ${family === "codex" ? "codex" : "broker"}]\nregion = ${family === "codex" ? "us-east-2" : "us-east-1"}\naws_`

## scripts/ci-start-credential-broker.ts

- L62: `if (!["claude-sdk", "claude-tui", "codex", "opencode"].includes(family)) throw new Error("Unsupported broker family");`
- L66: `const region = family === "codex" ? "us-east-2" : "us-east-1";`
- L90: `const profile = family === "codex" ? "codex" : "broker";`
- L93: `if (family === "opencode") exported.OPENCODE_CONFIG_CONTENT = JSON.stringify({`

## scripts/manifest-types.ts

- L137: `tierFlavor: "claude" | "codex" | "kiro" | "opencode" | "copilot" | "cursor";`
- L207: `* "kiro" and relies on the explicit composer, while Kiro IDE sets kind`
- L208: `* "kiro-ide" for its v2 SessionStart registration. Cursor sets kind "cursor"`
- L215: `kind: "store" | "kiro" | "kiro-ide" | "cursor";`

## scripts/package.ts

- L119: `const IS_TRUST_MODE = process.argv[2] === "codex" && process.argv[3] === "trust";`
- L278: `harness === "kiro" &&`
- L286: `if (harness === "kiro") {`
- L305: `effortKey: harness === "opencode" ? "variant" : "effort",`
- L331: `"kiro",`
- L379: `(harness === "cursor" || harness === "opencode" || harness === "copilot") &&`
- L782: `// knows (Kiro CLI and Kiro IDE share the "kiro" flavor - identical model`
- L850: `if (harnessKind === "kiro") {`
- L982: `if (m.tierFlavor !== "kiro") return;`
- L1019: `if (m.tierFlavor !== "claude") return;`
- L1037: `if (m.tierFlavor !== "cursor") return;`
- L1237: `if (m.tierFlavor === "codex") {`
- L1478: `if (argv[0] === "codex" && argv[1] === "trust") {`
- L1517: `const { trustEntries } = require(join(HARNESS_ROOT, "codex", "emit.ts")) as {`
- L1532: `"codex",`

## scripts/plugin-hooks-template/compose.ts

- L63: `? "copilot"`
- L64: `: "opencode";`
- L68: `const IS_COPILOT = HARNESS_NAME === "copilot";`
- L69: `const IS_OPENCODE = HARNESS_NAME === "opencode";`
- L1256: `const isKiroIde = HARNESS_NAME === "kiro-ide";`

## scripts/verify-release.ts

- L20: `"claude",`
- L21: `"codex",`
- L22: `"copilot",`
- L23: `"cursor",`
- L24: `"kiro",`
- L25: `"kiro-ide",`
- L26: `"opencode",`
