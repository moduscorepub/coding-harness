# AI-DLC × Coding Harness — Implementation Spec (v2, source-based)

**Status:** implementation spec for the end-to-end build.
**Supersedes:** v1, which patched installed runtime trees. v2 forks the upstream AI-DLC **source** at the exact commit the installed 2.10.0 was built from, adds a `harness` distribution the upstream-native way, and folds in every improvement from `IMPROVEMENTS.md`.

Every requirement has an ID and an acceptance check. Paths are relative to:
- the upstream fork (`upstream/…`),
- the coding harness monorepo (`coding-harness/…`), or
- this repo.

Progress, deviations and evidence live in `STATUS.md`. Grafting onto another AI-DLC fork is described in `GRAFTING.md`.

---

## 0. Decisions

| ID | Decision | Rationale |
|---|---|---|
| D-SRC | The fork is upstream `awslabs/aidlc-workflows` at tag `v2.10.0` (commit `2a88838`), branch `harness-distribution`. Every change is a commit; the patch series is `git format-patch v2.10.0..harness-distribution`. | The installed 2.10.0 records `sourceDigest` = `2a88838`. A source build at that commit reproduces the installed runtime byte for byte (F2). Patches against source graft onto any fork with `git am -3`. |
| D-NAME | Distribution `harness`, product name `Coding Harness`, engine dir `.harness-aidlc`. | `harness/harness/` follows upstream's one-directory-per-distribution layout. The engine dir must not start with `.aidlc`, which is AI-DLC's workspace folder and the subject of prefix checks. |
| D-VER | Fork release id `1.0.0`. It is the last commit of the series, and a graft may drop it. | `1.00.0` violates the engine's `VERSION_ID` grammar (`(?:0\|[1-9]\d*)` per segment). |
| D-FID | Full fidelity with the Claude distribution, plus sensor feedback (D-SNS). The project footprint is `.harness-aidlc/`, `aidlc/`, root blocks in `.gitignore` and `AGENTS.md`, and one file `.harness/extensions/aidlc.ts`. | Minimal intrusion into the user's `.harness/` config folder. |
| D-SNS | Sensor verdicts reach the model as additional context. Audit rows and state are byte-identical with feedback on or off. | Pure parity plus model-visible feedback. |
| D-HOST | Requires harness ≥ `1.1.0`, which carries H1–H3 (§7). | The harness `resources_discover` event is currently never emitted (F14). |
| D-REL | Release source deferred: fork installs set machine `update-check: false`, and `DEFAULT_RELEASE_REPOSITORY` is untouched. | The user decides later. |
| D-MIRROR | `~/projects/aidlc-harness` is canonical. Its tracked files are mirrored into `coding-harness/integrations/aidlc/`. Commit and push both at every phase gate. | The user reads and grafts from the public monorepo. |
| D-CACHE | No per-request history rewriting. Context shaping happens only through compaction. | Rewriting earlier messages invalidates the provider prompt cache on every request (F27). |

## 1. Verified facts

| # | Fact | Evidence |
|---|---|---|
| F1 | Upstream layout: `core/` (harness-neutral engine: `tools/`, `hooks/`, `agents/`, `skills/`, `sensors/`, `aidlc-common/`, `memory/`, `templates/`, `scopes/`, `knowledge/`); `harness/<name>/` per distribution; `scripts/` (packager, binaries, release, installer); `tests/{smoke,unit,integration,e2e,harness}`; `plugins/test-pro`. License MIT-0. | `ls`, `LICENSE` |
| F2 | `bun scripts/package.ts` writes `dist/<name>/` (Bun copy channel) and `dist-release/<name>/` (native projection). `dist-release/*` and `dist/plugins` are **byte-identical** to the installed `versions/2.10.0/{runtime,plugins}` for all 7 distributions. | `diff -rq` → 0 lines for each tree and for plugins |
| F3 | `discoverHarnessNames()` enumerates `harness/*` dirs. A new distribution is a directory with `manifest.ts` (data: `HarnessManifest`) plus an optional `emit()` plugin. | `scripts/package.ts:186`, `scripts/manifest-types.ts` |
| F4 | `HarnessManifest.tierFlavor` is a closed union (`claude\|codex\|kiro\|opencode\|copilot\|cursor`) selecting a `TIER_PROJECTIONS` column in `core/tools/aidlc-tiers.ts`. | `manifest-types.ts`, `aidlc-tiers.ts:87–126` |
| F5 | `writeProjectionData` classifies every top-level dist entry that is not itself a root-integration path as a managed directory. A nested root integration (`.harness/extensions/aidlc.ts`) would make `.harness` a managed directory. Kiro-ide avoids this only because `.vscode/settings.json` is a native-only integration appended afterwards. | `package.ts:602–677`, `:1083–1112` |
| F6 | Release: `scripts/package-release.ts` regenerates, runs the `--check` determinism guard, tars `dist-release` as the runtime asset, copies binaries from `build/binaries`, and writes `version.json`/`checksums.txt`/`install.sh`. It needs a dated `## [<version>] - YYYY-MM-DD` heading in `CHANGELOG.md`. | `package-release.ts:260–454` |
| F7 | Binaries: `scripts/build-binaries.ts --target native` compiles the `dist-release/claude` dispatcher and smoke-gates the artifact. | header of `build-binaries.ts` |
| F8 | Install: `install.sh --from <dir>` (offline) verifies checksums, then runs `aidlc system lifecycle install-apply --from <tmp> --version <v>`. Honors `AIDLC_INSTALL_ROOT` and `AIDLC_BIN_DIR`. | `install.sh:429–470` |
| F9 | Distribution-name branch sites: 343 lines in 25 files (`inventory/sites.md`). | `scripts/sites.ts` |
| F10 | Hook-command adapter hosts (`codex\|copilot\|cursor\|kiro\|kiro-ide`) route through the binary. Opencode, like `harness`, runs an in-host plugin that spawns `aidlc engine hook <name>`. | `core/tools/aidlc.ts:1188–1205` |
| F11 | Opencode `emit.ts` pattern: persona `.md` → native subagent via `resolveModelPolicy` + `writeMarkdownAgentSurface`; authored command and adapter copied with token substitution; shipped-entrypoint list embedded at a marker; the shell dir is clean-swept. | `harness/opencode/emit.ts` |
| F12 | The sensor dispatcher prints one `FireVerdict` JSON line per fire. `hooks/aidlc-run-sensors.ts` discards it. | `core/tools/aidlc-sensor.ts` |
| F13 | Upstream live tests answer gates with scripted `AskUserQuestion` answers through the Claude SDK driver (`tests/harness/sdk-drive.ts`). | source |
| F14 | Harness `resources_discover` is typed and `ExtensionRunner.emitResourcesDiscover` exists, but **nothing calls it**. `docs/extensions.md:541–542` states this. Its `skillPaths`/`promptPaths`/`themePaths` have no effect today. | grep across `packages/` |
| F15 | Harness agent frontmatter: `name`, `description`, `tools`, `spawns`, `model` (list), `thinkingLevel`/`thinking`, `output`, `blocking`, `autoloadSkills`, `readSummarize`, `prewalk` (bool or pattern), `advisor` (bool or pattern). | `discovery/helpers.ts:312–400` |
| F16 | Task agents come from project/user `.harness/agents`, extension-package roots, plugin roots and bundled agents (`task/discovery.ts:86–177`). There is no extension-supplied directory. | source |
| F17 | Session creation discovers skills (`sdk.ts:1838`), rules and TTSR (`:2109–2134`), and watchdog/advisor configs (`:1819–1822`) **before** extensions load (`:2672`) and before the runner exists (`:3292`). The system prompt is built later by `rebuildSystemPrompt` (`:3746`). Session rebuilds re-discover rules with `bucketRules(…, {replaceTtsrRules:true})` (`:3772–3795`). | source |
| F18 | RPC mode serves `ask` to the client as `extension_ui_request` (`select`, or the `ask` dialog after `set_ask_dialog`). | `docs/rpc.md:86,149,680` |
| F19 | Print-mode advisors: `harness -p --advisor`. Notes steer the running prompt; after the final prompt the process waits up to 10 minutes for final reviews. | `docs/advisor-watchdog.md:84–93` |
| F20 | `WATCHDOG.yml` roster fields: `advisors[].{name,enabled,model,tools,reviewMode,reviewInterval,syncBacklog,instructions}`. Discovery: `<agentDir>/WATCHDOG.yml` and `WATCHDOG.yml`/`.harness/WATCHDOG.yml` from cwd up to repo root. Subagents rerun discovery. Per-agent `advisor:` frontmatter enables advisors for that subagent. | `docs/advisor-watchdog.md:316–388` |
| F21 | TTSR rules support `condition` (regex), `astCondition`, `question` (judged), `scope`, `globs`, `agents`, `interruptMode`. Rules load only from `.harness/rules/`, `RULES.md` and extension-package `rules/`. | `docs/ttsr-injection-lifecycle.md`, `discovery/builtin.ts:394–416` |
| F22 | `session_before_compact` may return `{compaction: CompactionResult}` (`summary`, `shortSummary?`, `firstKeptEntryId`, `tokensBefore`, `details?`, `preserveData?`), which the harness honors (`session/session-maintenance.ts:1256–1271`). `ctx.compact(instructions)` triggers compaction. | `agent/src/compaction/compaction.ts:145` |
| F23 | `/ratchet` arms the eval-kernel `ratchet(flow)` hill climb: `init`, `plan`, `split`, `approve(inputs\|grader\|plan)` host dialogs, `check`, `gate`, `train`, `status`; runner writes `results.jsonl`, `errors.jsonl`, and train-only `traces/`. | `prompts/tools/ratchet.md`, `ratchet/ratchet.ts` |
| F24 | Per-agent `prewalk:` frontmatter hands an agent off to the prewalk target after planning. | F15, `docs/prewalk.md` |
| F25 | DAP debug tool: read-only inspection is read-tier, launch/step/evaluate is exec-tier. Adapters on this machine: `node` and `python3` yes; `debugpy`, `js-debug`, `lldb-dap` no. | `tools/debug.ts`, `src/dap/defaults.json`, `command -v` |
| F26 | Authenticated harness providers here: `anthropic` (28 models), `openai` (60), `ollama` (5 local). | `harness models` |
| F27 | Changing earlier prompt content invalidates the provider prompt cache from that point. | Claude Code prompt-caching docs; Anthropic and OpenAI prefix caching |
| F28 | AI-DLC's existing `linter` sensor wraps eslint for TS/JS only; multi-language detection is deferred upstream. | `core/sensors/aidlc-linter.md` |

## 2. Repositories and layout

### 2.1 `~/projects/aidlc-harness` (canonical, git)
```text
README.md            entry point: what this is, how to build, test, install, graft
SPEC.md              this file
IMPROVEMENTS.md      rationale and the Claude Code comparison
STATUS.md            phase gates, evidence, deviations, decisions (updated at every gate)
GRAFTING.md          step-by-step graft onto another AI-DLC fork
patches/             git format-patch v2.10.0..harness-distribution (numbered, one per commit)
inventory/
  sites.md           generated distribution-name sites (F9)
  site-decisions.json  per-file decision: "patched in <commit>" | "not applicable: <why>"
scripts/
  bootstrap.sh       clone upstream at v2.10.0 into upstream/, create branch, git am patches/
  export-patches.sh  regenerate patches/ from upstream/ (clean format-patch, stable names)
  build.ts           package → --check → binaries (native) → package-release → out/release
  install.ts         sandbox | real | rollback, plus machine update-check:false
  sync-mirror.ts     mirror tracked files into coding-harness/integrations/aidlc/
  sites.ts           inventory generator and gate
fixtures/            sample projects for live journeys and ratchet cases
ratchet/aidlc-method/  B2 kit (cases, grader, runner)
upstream/            working clone (gitignored; reproducible via bootstrap.sh)
out/                 build outputs (gitignored)
```

### 2.2 Mirror in the coding harness monorepo
`coding-harness/integrations/aidlc/` holds the same tracked files as §2.1 minus `upstream/` and `out/`. `README.md` there links to `GRAFTING.md`. The harness's own changes (H1–H3) live in `packages/coding-agent` with their docs (`docs/extensions.md`, `docs/advisor-watchdog.md`, `docs/rulebook-matching-pipeline.md`) and the package CHANGELOG.

**Acceptance:** `scripts/sync-mirror.ts --check` reports no drift. The coding harness lint and typecheck ignore `integrations/` (or pass on it).

## 3. Build, release and install pipeline

| Step | Command (cwd `upstream/` unless noted) | Acceptance |
|---|---|---|
| R1 bootstrap | `scripts/bootstrap.sh` (repo root) | `git -C upstream log v2.10.0..HEAD --oneline` equals the patch list |
| R2 deps | `bun install --frozen-lockfile` | exit 0 |
| R3 package | `bun scripts/package.ts` then `bun scripts/package.ts --check` | 8 dist trees + plugins; determinism guard green |
| R4 binaries | `bun scripts/build-binaries.ts --target native` | `build/binaries/…/aidlc --version` → `aidlc 1.0.0 (runtime 1.0.0)`; built-in smoke gates pass for every distribution, harness included |
| R5 release | `bun scripts/package-release.ts --output ../out/release --binaries build/binaries` | `version.json` lists 8 distributions incl. `{name:"harness", productName:"Coding Harness"}`; `checksums.txt` verifies |
| R6 install (sandbox) | `bun scripts/install.ts --sandbox out/sandbox/<name>` (repo root): runs `out/release/install.sh --from out/release` with `AIDLC_INSTALL_ROOT`/`AIDLC_BIN_DIR` in the sandbox | `aidlc --version` in sandbox → 1.0.0; install-inspect complete |
| R7 install (real) | `bun scripts/install.ts --real` | active → 1.0.0, 2.10.0 retained as rollback; `update-check: false`; `--rollback` restores 2.10.0 |

**Toolchain.** The official 2.10.0 build used Bun 1.4.2; local Bun is 1.3.14.
- R4 tries `bunx bun@1.4.2`. On failure it falls back to local Bun and records the deviation in STATUS.md.
- `build-binaries` itself enforces any minimum, and its smoke gates are the arbiter.

## 4. Fork patch series (`upstream`, branch `harness-distribution`)

Commits are ordered so each one builds and passes the deterministic suite (`bun tests/run-tests.ts --smoke --unit` plus non-live integration). Commit messages are neutral (`feat(harness): …`, `fix(packager): …`). For the sites in each file, the rule is: **add a `harness` arm equivalent to the opencode arm unless this section states otherwise.** `inventory/site-decisions.json` records the decision per file. `bun scripts/sites.ts --gate inventory/site-decisions.json` must pass.

### C01 — `fix(packager): nested root integrations do not create managed directories`
- `scripts/package.ts` `writeProjectionData`: a top-level entry is a managed directory only if it is not an ancestor of any root-integration path, **or** it contains files outside the root-integration paths. Ancestors that hold only integration files are classified as integration parents. `allowedTopLevel` is unchanged.
- `core/tools/aidlc-distribution.ts` `validateProjectionDescriptor`/`projectionFiles`: accept integration-parent top-level entries. Unclassified entries still fail.
- Test `tests/unit/t-packager-nested-root-integration.test.ts`:
  - a temporary manifest with root integration `.host/ext/x.ts` yields `managedDirectories` without `.host`;
  - a stray file in `.host/` fails as unclassified.
- **Acceptance:** all 7 existing projections are unchanged (R3 `--check` and the F2 diff stay at 0).

### C02 — `feat(core): register the harness distribution`
Files and changes:

| File | Change |
|---|---|
| `core/tools/aidlc-runtime-paths.ts` | `runtimeHarnessName()`: `.harness-aidlc` → `harness` (`:256–260`). `HARNESS_PRECEDENCE` and `discoverProjectHarnesses` include `.harness-aidlc`. The `:358–361` skill-location arms need no harness arm, because skills sit at `<harnessDir>/skills` like claude. |
| `core/tools/aidlc-lib.ts` | `:7587` dir→name adds `.harness-aidlc`. The known-harness-dirs list and rules-subdir map add `.harness-aidlc` → `rules`. Source-scan exclusions add `.harness-aidlc` next to `.aidlc` (every list that enumerates host engine dirs). |
| `core/tools/aidlc-settings.ts` | Distribution enum (`:114`, `:707`) plus the generated settings schema add `harness`. |
| `core/tools/aidlc-doctor.ts` | Product name `harness: "Coding Harness"` (`:211`). |
| `core/tools/aidlc.ts` | `resolveHookPath` leaf list includes `.harness-aidlc`. No `AdapterHarness` entry (F10). |
| `scripts/manifest-types.ts` | `tierFlavor` union adds `"harness"`. Doc comments list `.harness-aidlc`. |

- Every other file with `.aidlc`/`.claude` engine-dir enumerations gets `.harness-aidlc`, classified per site in `site-decisions.json`.
- **Acceptance:** unit tests for `runtimeHarnessName(".harness-aidlc") === "harness"` and project discovery on a fixture tree.

### C03 — `feat(core): tiers and model policy for harness agents`
- **`core/tools/aidlc-tiers.ts`:**
  - `TierProjection` gains `harness: { model: string[] | null; thinkingLevel: HarnessThinking | null }`, where `HarnessThinking = "off"|"minimal"|"low"|"medium"|"high"|"xhigh"|"max"`;
  - every `TIER_PROJECTIONS` row gets a harness column whose defaults are role aliases resolvable by the harness:

    | Tier | `model` | `thinkingLevel` |
    |---|---|---|
    | inherit | null | null |
    | deciding | `["@slow"]` | `high` |
    | reviewing | `["@default"]` | `medium` |
    | writing-up | `["@smol"]` | `low` |

  - plus any other tiers present, mirroring their claude column's intent.
- **`core/tools/aidlc-model-policy.ts`:**
  - `ModelHarness` adds `harness`;
  - `HARNESS_HONESTY.harness = { model: true, effort: true, groupEffort: true, message: "Coding Harness expresses model lists and thinking level on agent frontmatter; every effort level is native." }`;
  - no effort clamp;
  - writer surface `.harness-aidlc/host/agents/<stem>.md` with keys `model` (YAML list, preserved) and `thinkingLevel`;
  - `markdownSurfaceValues()` reads both keys.
- **`scripts/package.ts`:** `projectTierFrontmatter` handles flavor `harness` (`effortKey` `thinkingLevel`; model rendered as a YAML list).
- **Acceptance:** unit test that `resolveModelPolicy(null, <agent>, <tier>, "harness", null)` round-trips through `writeMarkdownAgentSurface` and `markdownSurfaceValues`.

### C04 — `feat(core): init, config and doctor for harness`

| File | Change |
|---|---|
| `core/tools/aidlc-init.ts` | Accept `--harness harness` (`:541` list); `modelHarness()` union; help text. The `:1653–1850` provider/config branches treat harness like opencode except that **model access is harness-owned** (no provider prompts). Multi-harness detection accepts `.claude` + `.harness-aidlc`. Root-integration application creates parent dirs for nested paths (verify; patch if missing). |
| `core/tools/aidlc-config-diagnostics.ts` | `HARNESS_OWNED_MODEL_ACCESS` includes `harness`. CLI probe table adds `harness: {command:"harness", versionArgs:["--version"], minimum:"1.1.0", install:"Install Coding Harness ≥1.1.0 and ensure `harness --version` works."}`. Instruction-file list adds `.harness-aidlc/host/includes.json` and `.harness/extensions/aidlc.ts`. Bedrock/region menus: not applicable to harness. |
| `core/tools/aidlc-utility.ts` | Doctor wiring arm for harness (`:3503–3520` pattern): bootstrap present and baseline-matching; adapter, host agents, prompt and includes present; bootstrap not gitignored; `harness --version` ≥ 1.1.0; adapter self-test (`aidlc engine hook session-start` with a harness-shaped payload). `projectedFileRepair("harness", …)` for each. |

- **Acceptance:**
  - `aidlc init --harness harness` in a sandbox fixture produces exactly the §5 projection;
  - a re-run is a no-op;
  - a hand-edited bootstrap is reported as a conflict, and `--force` restores it;
  - doctor is green.

### C05 — `feat(core): hook contracts for in-host harness adapter`
- **`core/hooks/aidlc-run-sensors.ts`:** with `AIDLC_SENSOR_FEEDBACK=1`, collect each dispatcher's `FireVerdict` line and print one stdout line `{"sensor_feedback":[…]}` before exit 0. Without the variable, stdout is byte-identical to today.
- **`core/hooks/aidlc-continue-workflow.ts`:**
  - transcript-format detection adds `harness` (line 1 `{"type":"title"…}` and line 2 `{"type":"session","version":<n>,"cwd":…}`);
  - `transcriptIsConversational()` harness branch: the latest assistant `message` since the last user `message` has no `toolCall` content blocks.
- **`core/tools/aidlc-usage.ts`:** `readTranscript()` checks for the harness signature before the Claude sniff (`:556`). `readHarnessSession(main)` reads main plus `<main without .jsonl>/*.jsonl`. Per assistant `message`, it builds a `UsageRow`:

  | `UsageRow` field | Source |
  |---|---|
  | `uuid` | `id` |
  | `msgId` | `message.responseId ?? ""` |
  | `timestamp` | `timestamp` |
  | `model` | `message.model` |
  | `isSidechain` | file ≠ main |
  | `sourceKey` | `main` or `agent-<TaskName>` |
  | `agentId` | `<TaskName>` |
  | `counts.input` | `usage.input` |
  | `counts.output` | `usage.output` |
  | `counts.cacheRead` | `usage.cacheRead` |
  | `counts.cacheCreate1h` | `usage.cttl?.ephemeral1h ?? 0` |
  | `counts.cacheCreate5m` | `usage.cacheWrite - cacheCreate1h` |
  | `usd` | `computeCost()` when the model has rates, else `usage.cost.total` |

  Agent attribution maps `<TaskName>` → agent from the parent's `task` tool calls.
- **`core/tools/aidlc-fold-usage`** (the hook) accepts harness transcripts.
- **`core/tools/aidlc-includes.ts`:**
  - `repointHarnessIncludes` handles `.harness-aidlc/host/includes.json` (rewrites `memory`);
  - `resolveHookPath`/integrity: protected paths add `.harness-aidlc/host/**` and `.harness/extensions/aidlc.ts`.
- **Other arms:**
  - `core/tools/aidlc-runner-gen.ts` `:605` restart text for harness: "start a fresh harness session (`/new`, or exit and restart `harness`)";
  - `core/tools/aidlc-orchestrate.ts` (5 sites) and `core/tools/aidlc-learnings.ts` `:1060` (`dist/harness/.harness-aidlc/sensors`): harness arms.
- **Acceptance:**
  - golden unit tests: the sensor-feedback line, harness transcript detection, a harness usage fixture totals within ±0.5% of `usage.cost.total`, include repoint;
  - all 7 existing distributions' hook outputs are unchanged.

### C06 — `feat(core): harness plugin target`
- `core/tools/aidlc-plugin.ts` (31), `aidlc-plugin-emit.ts` (14), `aidlc-plugin-build.ts` (1), `aidlc-plugin-test.ts` (5) and `scripts/plugin-hooks-template/compose.ts` (5) add the `harness` target. Plugin agents emit to `.harness-aidlc/host/agents/` with the C03 projection; skills go to `.harness-aidlc/skills/`; sensors, tools and contributions are projected as for store targets.
- `HarnessManifest.plugin` for harness: `{ manifestDir: ".harness-aidlc-plugin", kind: "store", installRoots: [".harness"] }`.
- **Acceptance:** `plugins/test-pro` emits `dist/plugins/test-pro/harness/`, its plugin test passes, and it installs on a harness project with sensors firing.

### C07 — `feat(harness): Coding Harness distribution`
Adds `harness/harness/` (§5) and the adapter (§6). **Acceptance:** R3 produces `dist/harness` and `dist-release/harness`; the §5 projection matches.

### C08 — `feat(release): ship the harness distribution`
- `scripts/verify-release.ts` distribution list adds `harness`.
- `scripts/build-binaries.ts` smoke gates add a harness-tree smoke (dispatcher from `dist-release/harness/.harness-aidlc/tools`, `aidlc engine hook session-start` against a temporary harness projection). The other 40 sites are classified per file.
- `scripts/ci-live-filter.ts`, `ci-live-sandbox.ts` and `ci-start-credential-broker.ts` add harness live-job wiring where they enumerate hosts.
- **Acceptance:** R4 and R5 green.

### C09 — `feat(core): shared content lists Coding Harness`
- `core/templates/onboarding*.md` and the `AGENTS.md` root block list `Coding Harness: .harness-aidlc/onboarding.md` (regenerated identically in every distribution that ships the block).
- `core/aidlc-common/**/workspace-detection.md` excluded host dirs add `.harness-aidlc`.
- **Acceptance:** the `identical` AGENTS.md block is byte-identical across distributions (packager guard).

### C10 — `test(harness): deterministic and live coverage`

| Level | Test | Covers |
|---|---|---|
| smoke | `t-smoke-harness-projection.test.ts` | §5 file set and descriptor |
| unit | `t-harness-emit.test.ts` | agent projection (frontmatter keys, tier mapping, body tokens), prompt, includes, adapter entrypoint embedding |
| unit | `t-harness-adapter-map.test.ts` | §6.4 tool mapping and payload builders, exercised by importing the adapter module with a fake `ExtensionAPI` |
| unit | `t-harness-usage-reader.test.ts`, `t-harness-transcript.test.ts`, `t-run-sensors-feedback.test.ts` | C05 |
| integration | `t-harness-init-doctor.test.ts` | init → doctor → drift → repair in a sandbox |
| integration | `t-harness-hook-contracts.test.ts` | for every core hook, adapter-built payload vs the Claude-format golden: same exit code, stdout and audit rows (ids and timestamps normalized) |
| e2e (live) | `tests/harness/harness-rpc-drive.ts` + `t-rpc-harness-*.serial.test.ts` | scripted `harness --mode rpc` journeys with scripted `ask` answers (F18), scenarios S1–S16 (§8) |

### C11 — improvements (one commit each, §9)
`feat(harness): cross-vendor review routing (A1)`, `… continuous advisors (A2)`, `… stream rules (A3)`, `… state-anchored compaction (A4)`, `… project checkers sensor (B1)`, `… prewalk after plan approval (B3)`, `… debugger guidance for bugfix (B4)`, `… ratchet kit (B2)`.

### C12 — `chore(release): 1.0.0` (last; droppable on graft)
- `core/tools/aidlc-version.ts` `AIDLC_VERSION = "1.0.0"`.
- `CHANGELOG.md` `## [1.0.0] - <date>` with a summary of the series.

## 5. The `harness` distribution (`harness/harness/`)

### 5.1 Files
```text
harness/harness/
  manifest.ts            HarnessManifest (below)
  emit.ts                host shell emission (§5.3)
  onboarding.fills.ts    harness slot/invoke fills
  dot-gitignore          root .gitignore block
  bootstrap.ts           → .harness/extensions/aidlc.ts (whole-file root integration)
  skills/aidlc/SKILL.md, skills/aidlc/question-rendering.md
  host/adapter.ts        in-host extension adapter (§6)
  host/prompts/aidlc.md  /aidlc prompt template
  host/rules/*.md        TTSR rule set (A3)
  host/watchdog/WATCHDOG.md  advisor baseline (A2)
```

### 5.2 Manifest
```ts
{
  name: "harness",
  productName: "Coding Harness",
  configNextStep: "run `harness` in this project, then `/aidlc --doctor`",
  harnessDir: ".harness-aidlc",
  orchestratorSkillPath: ".harness-aidlc/skills/aidlc/SKILL.md",
  tierFlavor: "harness",
  rootIntegrations: [
    { path: ".gitignore", policy: "managed-block", marker: "gitignore", shared: "union" },
    { path: "AGENTS.md", policy: "managed-block", marker: "agents", shared: "identical" },
    { path: ".harness/extensions/aidlc.ts", policy: "whole-file" },
  ],
  coreDirs: /* same rows as opencode */,
  harnessFiles: [
    { src: "skills/aidlc/SKILL.md", dst: "skills/aidlc/SKILL.md" },
    { src: "skills/aidlc/question-rendering.md", dst: "skills/aidlc/question-rendering.md" },
    { src: "bootstrap.ts", dst: ".harness/extensions/aidlc.ts", projectRoot: true },
    { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
  ],
  onboarding: { dst: "AGENTS.md", projectRoot: true, harnessDst: "onboarding.md", fills },
  rulesRename: null,
  emit,
  plugin: { manifestDir: ".harness-aidlc-plugin", kind: "store", installRoots: [".harness"] },
}
```
- **Engine (core) dirs.** `.harness-aidlc/{tools,hooks,agents,aidlc-common,knowledge,sensors,scopes,skills,…}`, the same as opencode's `.aidlc/`.
- **Method include.** Opencode uses an `instructions` glob in `opencode.json`. Harness has no equivalent project config, so the adapter injects the method tree (§6.7) from `host/includes.json`.

### 5.3 Emit (`emit.ts`)
It writes `.harness-aidlc/host/` and clean-sweeps it first.
- **`host/agents/<name>.md`**, one per `core/agents/*.md`. Built through `absorbReviewerKnowledge` → `injectDelegatedKnowledgePreflight` → `resolveModelPolicy(…, "harness", tierCap)` → `writeMarkdownAgentSurface` with the flavor-harness keys.
  - **Frontmatter:** `name`, `description`, `model: [..]` (when the tier projects one), `thinkingLevel`, `spawns: []` when core says `disallowedTools: Task`, `advisor:` (A2 policy), and `prewalk:` (B3 policy). `maxTurns` is dropped (the harness has no per-agent step cap) and the body keeps its turn-budget prose.
  - **Body:** token-substituted to `.harness-aidlc`, with active-memory references projected as opencode does.
  - Unknown `disallowedTools` values fail the build.
- **`host/prompts/aidlc.md`**: same body as opencode's `command/aidlc.md`, with `$ARGUMENTS`.
- **`host/includes.json`**: `{schemaVersion:1, memory:"aidlc/spaces/default/memory", files:[…]}`. The file list is derived from the claude `rules-aidlc.md` include stub so both hosts load the same method files in the same order.
- **`host/adapter.ts`**: copied with token substitution and the shipped-entrypoint list embedded at `/* @aidlc-shipped-entrypoints@ */ []`.
- **`host/rules/`** and **`host/watchdog/`**: copied verbatim.

### 5.4 Bootstrap (`.harness/extensions/aidlc.ts`)
```ts
// AI-DLC bootstrap for Coding Harness. Managed by AI-DLC (whole-file): change it through `aidlc config`.
export { default } from "../../.harness-aidlc/host/adapter.ts";
```
The `.gitignore` block must not ignore the bootstrap or `.harness-aidlc/host/`, because harness discovery respects gitignore.

### 5.5 Skills and question rendering
- `skills/aidlc/SKILL.md`: the claude skill with harness wording (`/aidlc`, `ask`).
- `question-rendering.md` maps the question spec onto `ask`:

  | Question spec | `ask` field |
  |---|---|
  | id | `questions[0].id` = kebab-case header or `q1` |
  | `prompt` | `question` |
  | `header` | `header` |
  | `multiSelect` | `multi` |
  | `options[].label` / `options[].description` | `options[].label` / `options[].description` |
  | recommended option | `recommended` (0-based) |

  The UI adds "Other". Approval gates are always `ask` calls.
- Restart wording in scope skills (runner-gen C05): `/new`.

### 5.6 Onboarding
`onboarding.fills.ts` fills the neutral template; native setup lands at `.harness-aidlc/onboarding.md`:
- start with `/aidlc`; `/aidlc --doctor`;
- keep the bootstrap and engine dir committed;
- start `harness` from the project root;
- gates render through `ask`;
- restart with `/new`.

## 6. Adapter (`.harness-aidlc/host/adapter.ts`)

### 6.1 Shape
- Default export `(pi: ExtensionAPI) => void` with no top-level side effects. Pure helpers are exported for unit tests.
- Debug: `AIDLC_HARNESS_DEBUG=1` appends `{ts, event, hook, code, ms}` to `${XDG_STATE_HOME:-~/.local/state}/aidlc-harness/<sha1(cwd)[0..12]>.log`, never inside the project.

### 6.2 Core invocation `runCore(hook, input, opts)`
- **Command and argv:** binary from `AIDLC_BIN`, else `aidlc` on PATH; argv `[bin, "engine", "hook", hook, "--project-dir", cwd]`.
- **Env:**

  | Variable | Value |
  |---|---|
  | `AIDLC_PROJECT_DIR` | cwd |
  | `CLAUDE_PROJECT_DIR` | cwd |
  | `AIDLC_HARNESS_DIR` | `.harness-aidlc` |
  | `AIDLC_HARNESS_NAME` | `harness` |
  | `AIDLC_SENSOR_FEEDBACK` | `1`, for `run-sensors` only |

- **Stdin:** JSON. Timeout 25 s for blocking hooks, 120 s for queued post-tool hooks.
- **Results:** exit 2 → `{blocked:true, reason: stderr || default}`; exit 0 → parse stdout JSON when non-empty; any other outcome → fail open and log (opencode semantics).

### 6.3 Identity
- `main = ctx.agent.kind === "main"`; in subagents `agent_type = ctx.agent.name`.
- **Main only:** session-start, record-human-turn, continue-workflow, session-end, statusline, compaction (A4).
- **Main and subagents:** tool guards and producers, constitution injection, `resources_discover`.

### 6.4 Tool mapping (harness → Claude name)
| Harness tool | Claude name | Targets |
|---|---|---|
| `read` | `Read` | `path` (selectors stripped; internal URLs skipped) |
| `grep` | `Grep` | each `;`-separated `path` |
| `glob` | `Glob` | `path` |
| `ast_grep` | `Grep` | `paths`/`path` |
| `lsp` | `Read` | `file` when a real path |
| `bash` | `Bash` | `command` |
| `write` | `Write` | `path` |
| `edit` | `Edit` | edit target paths (normalized; hashline section headers and patch envelopes included) |
| `ast_edit` | `Edit` | pre: `paths`; post: changed files from result details |
| `task` | `Task` | per item `{subagent_type: agent, prompt: assignment, description: name}` |
| `todo` | `TaskUpdate` | — |
| `ask` | `AskUserQuestion` | — |

Unmapped tools get `fold-usage` only.

### 6.5 Event bindings
| Harness event | Condition | Core hooks (order) | Result |
|---|---|---|---|
| `session_start` | main | `session-start` | stash `additionalContext` for the first `before_agent_start` |
| `resources_discover` | all | — | `{skillPaths:[".harness-aidlc/skills", …plugin skill dirs], promptPaths:[".harness-aidlc/host/prompts"], agentPaths:[".harness-aidlc/host/agents", …plugin agent dirs], rulePaths:[".harness-aidlc/host/rules", <state rules dir>], watchdogPaths:[".harness-aidlc/host/watchdog/WATCHDOG.md", <state watchdog context>]}` |
| `before_agent_start` | all | — | `systemPrompt: [...event.systemPrompt, constitutionBlock, stashedSessionContext?]` |
| `input` | main, interactive/rpc | `record-human-turn` (UserPromptSubmit) | — |
| first `before_agent_start` in print mode | main, no prior `input` | `record-human-turn` | — |
| `tool_call` | all | `fold-usage` | — |
| `tool_call` `task` | all | per item `deliver-stage-rules`, then `plan-approval-guard` for `aidlc-developer-agent` | `updatedInput.prompt` → item assignment; exit 2 → block |
| `tool_call` file and bash tools | all | `state-transition-guard` (Bash), `reviewer-scope` (subagent), `review-freeze`, `plan-approval-guard` (Edit/Write/Bash) | first block wins |
| `tool_call` `bash` | all | adapter boundary rule (opencode `aidlcBashBoundaryViolation` port; entrypoints under `.harness-aidlc/{tools,hooks}`) | block on violation |
| `tool_result` write/edit/ast_edit (ok) | all | queued `write-audit-log`, then `run-sensors` per path | sensor feedback → `additionalContext` (§6.8) |
| `tool_result` `bash` | all | queued `rebuild-stage-graph` | — |
| `tool_result` `todo` | all | queued `sync-workflow-state` when an item is `in_progress` | — |
| `tool_result` `ask` | main | `record-human-turn` | — |
| `tool_result` `task` | all | queued `log-subagent` per item (SubagentStop) | — |
| `tool_result` any | all | queued `fold-usage` | — |
| `session_stop` | main | flush queue, `fold-usage`, `continue-workflow` | pass `{decision, reason}` through |
| `session_before_compact` | main | `validate-state`; A4 summary | A4 |
| `session_shutdown` | main | flush queue, `session-end` | — |
| `turn_end`/`agent_end`/`session_start` | main | `statusline` (debounced 1 s) | `ctx.ui.setStatus("aidlc", …)` |

### 6.6 Ordering
- Pre-tool hooks run synchronously.
- Post-tool hooks run on a serial per-session FIFO queue.
- The queue is flushed before `session_stop`, `session_before_compact`, `session_shutdown` and any `task` call.
- The `tool_result` handler awaits that path's `run-sensors` for up to 20 s. Late verdicts are delivered on the next turn through `pi.sendMessage` (hidden, `deliverAs: "nextTurn"`).

### 6.7 Constitution block
- Reads `.harness-aidlc/onboarding.md`, then the `includes.json` files under `memory`, in order.
- Format: `# AI-DLC method (imported)`, then `## <path>` and the content for each file.
- Cached by mtimes; capped at 60 KB, with overflow replaced by `read <path>` pointers.
- The text is stable across turns unless files change, so the prompt cache holds.

### 6.8 Sensor feedback
- Format: `AI-DLC sensors on <output_path> (stage <stage>):`, then one line per sensor: `- <sensor_id>: FAILED — <first 30 lines of the detail file, ≤2,000 chars>` or `- <sensor_id>: passed`.
- Total cap 6,000 chars. Failures come first; more than 3 passes collapse to one line.
- `AIDLC_HARNESS_SENSOR_FEEDBACK=0` disables it.

## 7. Harness changes (`coding-harness`, version 1.1.0)

### H1 — wire `resources_discover` and add `agentPaths`
- **`extensibility/extensions/types.ts`:** `ResourcesDiscoverResult` gains `agentPaths?`, `rulePaths?`, `watchdogPaths?` (the last two are H3).
- **`extensibility/extensions/runner.ts`:** `emitResourcesDiscover` aggregates every field with `extensionPath`. Relative paths resolve against the event `cwd`; missing paths are ignored with a debug log.
- **`sdk.ts`:** immediately after the extension runner is created, and before the first `rebuildSystemPrompt`, call `emitResourcesDiscover(cwd, "startup")` when any extension has a `resources_discover` handler. Then:
  - **skills:** load each `skillPaths` dir with the existing skill loader (source `extension`) and append to `skills`, deduplicated by name; earlier discovered skills win;
  - **prompts:** load `promptPaths` with the prompt-template loader and merge before `toolSession.promptTemplates` is assigned;
  - **themes:** register `themePaths` with the theme registry when interactive;
  - **agents:** store `agentPaths` on the tool session (`toolSession.extensionAgentDirs`);
  - **rules:** H3;
  - **watchdog:** H3;
  - **reload:** on session rebuilds (`/new`, `/clear`, reload), re-emit with `"reload"` and recompute.
- **`task/discovery.ts`:** `discoverAgents(cwd, home, extensionRoots, extraDirs?)`. Extra dirs load with source `project`, after project/user `.harness/agents` and before package roots. `disabledAgents` applies.
- **Callers:** the task tool, `modes/agents-hub-deps.ts` and `structured-subagent` pass `toolSession.extensionAgentDirs`. Subagent sessions inherit the parent's dirs and also run their own `resources_discover` (extensions are rebound in subagents).
- **Docs:** `docs/extensions.md` replaces the "no callsites" note with the contract; CHANGELOG entry.
- **Tests (bun, `packages/coding-agent/test`):**
  - an extension returning `skillPaths`/`promptPaths`/`agentPaths` makes the skill visible, `/<prompt>` expand, and the agent spawnable from `task` in main and nested sessions;
  - reload picks up a new path.
- **Acceptance:** tests green; `bun run check` for the package green.

### H2 — Claude-distribution coexistence
- `discovery/claude.ts`: `.claude/tools/*.ts` are not loaded as custom tools unless setting `claude.customTools: true`. The default is false; register the setting in the schema with docs.
- `discovery/at-imports.ts`:
  - a context file under `<project>/.claude/` whose file-relative `@` import misses retries relative to the project root;
  - `@` tokens inside HTML comments are ignored.
- **Tests:** a Claude AI-DLC fixture loads the full include chain with no custom-tool load errors.

### H3 — `rulePaths` and `watchdogPaths`
- **Rules:** rule files under `rulePaths` load through the rule capability loader (`buildRuleFromMarkdown`, source `project`). They are appended to the discovered rule items before `bucketRules` at startup (re-bucket with `replaceTtsrRules: true` after `resources_discover`) and on every rebuild. TTSR and rulebook both see them, and `rule://<name>` resolves them.
- **Watchdog:** `watchdogPaths` entries (`WATCHDOG.md` or `WATCHDOG.yml` files) join advisor discovery with project-leaf specificity. Subagent advisor discovery includes the paths that the subagent's own `resources_discover` returns.
- **Docs:** `docs/rulebook-matching-pipeline.md` and `docs/advisor-watchdog.md` describe the extension source.
- **Tests:**
  - an extension rule with `condition` triggers a TTSR interrupt in a scripted session (mock provider);
  - an extension `WATCHDOG.md` reaches an advisor system prompt.

**Version.** `packages/coding-agent` → `1.1.0`, with the local binary rebuilt. `~/.local/bin/harness` is repointed only after the package tests pass.

## 8. Live scenarios (C10 e2e, RPC driver, real models)
| # | Scenario | Pass criteria |
|---|---|---|
| S1 | `/aidlc` bugfix start | `SESSION_STARTED` and intent rows; harness wording |
| S2 | Edit before plan approval | blocked with the `plan-approval-guard` reason |
| S3 | Dispatch `aidlc-developer-agent` | stage rules in the subagent assignment |
| S4 | Reviewer reads out of scope | `reviewer-scope` refusal |
| S5 | Write after a READY review | `review-freeze` refusal |
| S6 | Write that fires a sensor | `SENSOR_FIRED` + terminal row; feedback in model context; with feedback off the audit log is identical |
| S7 | Direct state-tool invocation through bash | `state-transition-guard` refusal |
| S8 | Stop with pending work | continuation turn with the hook's reason |
| S9 | Compaction | `validate-state` ran; A4 summary carries stage, directive and gate |
| S10 | Session end | `SESSION_ENDED` |
| S11 | Usage | ledger rows for main and subagents with agent attribution |
| S12 | `aidlc config models` | frontmatter rewritten; spawned agent uses that model and thinking level |
| S13 | Break each doctor precondition | the specific check fails with its fix |
| S14 | Space switch | `includes.json` re-pointed; next turn injects the new memory |
| S15 | Full bugfix journey on the fixture | all gates answered by script; tests pass at the end; artifact set equals the Claude journey's (T4 parity) |
| S16 | Coexistence | Claude + harness distributions in one project; doctor green; both hosts work |

**T4 parity.** The same scripted bugfix journey runs under `claude -p` (Claude distribution, upstream SDK driver) and under the harness RPC driver. Normalized audit event sequences per stage and `aidlc-state.md` transitions are equal; only usage numbers and model ids may differ.

## 9. Improvements (granular)

### A1 — cross-vendor review routing
- **AI-DLC setting** (`core/tools/aidlc-settings.ts` schema; harness-only effect): `models.reviewDiversity: "auto" | "off"` (default `auto`).
- **Adapter, `before_subagent_spawn`:**
  - when the spawned agent is a reviewer (the agent's core tier is `reviewing`, or its name matches `*-reviewer-agent` or `aidlc-compliance-agent`) and diversity is `auto`, reorder `patterns` so the first candidate's provider differs from the parent session's current model provider;
  - the candidates come from the agent's `model:` list plus a configured `models.reviewDiversityPool` (default: the harness `@default` role's candidates and the authenticated providers' flagship models resolved through `harness models`);
  - the adapter returns `{model}`;
  - when no different-provider model resolves, nothing changes and debug-logs `no-alternate-vendor`.
- **Data residency:** documented use of path-scoped `disabledProviders`. Doctor reports when the configured pool is fully disabled for the cwd.
- **Acceptance:**
  - unit test of the pattern reordering;
  - S17: in a live journey with an anthropic builder, the reviewer subagent transcript's `message.model` provider is `openai`.

### A2 — continuous advisors on construction agents
- **Emit:** `advisor: true` on `aidlc-developer-agent` when the AI-DLC setting `harness.advisor` is `auto` (the default) or `true`; `"<pattern>"` passes through.
- **Static baseline (`host/watchdog/WATCHDOG.md`):**
  - "Review against the human-approved AI-DLC artifacts listed in the context file";
  - "flag deviations from approved design, NFRs and test strategy";
  - "silence unless evidence".
- **Dynamic context:**
  - the adapter writes `<engine state dir of the active intent>/harness/watchdog-context.md`, listing the paths of approved artifacts for the active intent (from `aidlc engine orchestrate` status output) with an `@` import of each;
  - `watchdogPaths` returns that file;
  - it is refreshed at each `session_start` and at subagent spawn (subagents rerun `resources_discover`).
- **Advisor model:** the advisor role, preferring a different provider than the advised agent (A1 helper).
- **Acceptance:**
  - S18: a live construction dispatch produces an advisor transcript (`__advisor.<slug>.jsonl`) for the developer subagent;
  - advice notes reference approved-artifact paths.

### A3 — AI-DLC contracts as stream-time rules
Static rule set in `host/rules/` (verbatim from `harness/harness/host/rules/`):

| Rule | Scope | Condition | Interrupt |
|---|---|---|---|
| `aidlc-no-stubs` | `tool:edit,tool:write`, globs excluding docs | regex `throw new Error\(["']not implemented`, `TODO: implement`, `NotImplementedError` | `tool-only` |
| `aidlc-state-files` | `tool:edit(aidlc/**),tool:write(aidlc/**)` | catch-all | `always` (state changes go through the engine) |
| `aidlc-reviewer-readonly` | agents `[aidlc-*-reviewer-agent]`, `tool:edit,tool:write` | catch-all | `always` |
| `aidlc-evidence` | `text`; agents `[main, aidlc-developer-agent]` | judged `question`: "Does the text claim tests or checks passed without a tool result in this turn showing that run?" | `prose-only` |

Plus a dynamic rule dir `<engine state>/harness/rules/`, written at `session_start` from the approved test strategy:
- when it forbids mocks: `aidlc-no-mocks` (`astCondition` `jest.mock($$$)`, `vi.mock($$$)`, `mock.module($$$)`, `unittest.mock.patch($$$)` on test globs);
- when it requires a coverage floor: an advisory rule only (`never` interrupt).

Rule bodies cite the AI-DLC contract they enforce.

**Acceptance:**
- unit tests that rule files parse (`buildRuleFromMarkdown`);
- S19: a scripted stub write is interrupted before execution (no file on disk; a `ttsr_injection` entry exists).

### A4 — state-anchored compaction
- **Adapter `session_before_compact` (main):**
  - runs `validate-state`;
  - builds `summary` deterministically from the AI-DLC state: `aidlc engine orchestrate status` output (current phase, stage and directive), `aidlc-state.md` workflow position, the approved-artifact index with paths, open questions, the pending gate, and the last 3 human decisions from the audit log;
  - plus a short harness-session digest: files changed since the last compaction, from the session's tool results;
  - returns `{compaction: {summary, shortSummary, firstKeptEntryId: preparation.firstKeptEntryId, tokensBefore: preparation.tokensBefore, details: {source: "aidlc"}}}`;
  - falls back to the default compaction when the AI-DLC state cannot be read.
- **Stage-boundary compaction:**
  - when a `tool_result` shows a stage transition (state-transition engine call succeeded and the `aidlc-state.md` stage changed), the adapter calls `ctx.compact()` once the turn ends, if context usage is above `harness.compactAtStageBoundary` (default 40%);
  - no per-request `context` rewriting (D-CACHE).
- **Acceptance:**
  - unit test of summary construction on a fixture state;
  - S9 asserts the summary contains stage, directive and gate;
  - after compaction the next directive is executed without `continue-workflow` corrections.

### B1 — project checkers sensor
- **Core sensor `core/sensors/aidlc-project-checks.md`** (all distributions):
  - `kind: deterministic`, `command: {{INVOKE}} engine sensor-project-checks`, `fire_on: write`, `matches: "**/*"`;
  - reads the project checker config `aidlc/spaces/<space>/checkers.json` (`[{id, command, matches, timeoutSeconds, parser: "eslint-json"|"tsc"|"ruff-json"|"generic-exit"}]`);
  - runs the matching checkers on the written file and reports findings in the standard detail format;
  - with no config it does nothing.
- **Tool `core/tools/aidlc-sensor-project-checks.ts`** plus the dispatcher route; stage-graph registration under construction stages.
- **Harness discovery:**
  - the adapter registers command `/aidlc-checkers`, which runs a side session (`ctx.runEphemeralTurn`) using the cleanse checker-discovery contract (`src/cleanse/agent.ts`) and writes `checkers.json`;
  - other hosts can author `checkers.json` by hand.
- **Acceptance:**
  - unit test on a fixture config;
  - S20: discovery on the fixture finds its lint and test commands, and a bad write fires `project-checks` with feedback.

### B3 — prewalk after plan approval
- **Emit:** `prewalk: true` (default target `@smol`) on `aidlc-developer-agent` when the AI-DLC setting `harness.prewalk` is `auto` or `true`. A pattern passes through.
- **Main session:** after `plan-approval-guard` sees an approved plan, the adapter calls `pi.setModel` for the conductor only when `harness.prewalkConductor` is set (default off).
- **Acceptance:** S21: the developer subagent's transcript shows the model switch after its planning turns.

### B4 — debugger in the bugfix scope
- **Harness host text** (C07 skill overlay for the bugfix root-cause stage): when a runtime defect reproduces and a debug adapter exists for the language, use the `debug` tool to set breakpoints at the suspected fault before editing, and record the observed state in the root-cause artifact.
- **Fixture prerequisite:** `debugpy` in a fixture venv.
- **Acceptance:** S22: on a Python bugfix fixture the transcript contains `debug` tool calls before the first edit, and the root-cause artifact cites observed values.

### B2 — ratchet kit for the AI-DLC method
`ratchet/aidlc-method/` in this repo:
- **`cases/`:** ≥15 small bugfix and feature tasks over `fixtures/`, each with hidden tests in `cases/<id>/hidden/` that the model cannot read. Tags: `bugfix`/`feature` × language.
- **`run.ts`:**
  - per (case, rep), copy the fixture to a temp dir and `aidlc init --harness harness`;
  - run the scope through the RPC driver with scripted approvals;
  - after it finishes, copy the hidden tests in and run them;
  - write `results.jsonl` rows `{prompt_id, rep, prompt, tags, grade:{pass, sensor_failures, cost_usd}, status, model, usage}` and train-only traces;
  - resume-idempotent; per-case wall-clock cap.
- **`grade.ts`:** hidden-test pass (programmatic). Oracle and null pre-flight cases included.
- **Change paths:** `upstream/harness/harness/skills/**`, `upstream/core/agents/aidlc-developer-agent.md`, `upstream/harness/harness/host/rules/**`. Off-limits: the engine code and the tests.
- **Driver:** `harness` interactive session `/ratchet aidlc-method` with the three approvals answered in the TUI.
- **Acceptance:** baseline gated and at least one round gated (keep or revert) with `status.md` produced.

## 10. Phases and gates (commit and push both repos at each gate)
| Phase | Work | Gate |
|---|---|---|
| G0 | SPEC v2, IMPROVEMENTS fixes, GRAFTING, README, STATUS, mirror | docs committed and pushed |
| P0 | bootstrap/export/build/install scripts; source build of v2.10.0 | R3 diff = 0 vs installed; R4 binary reports 2.10.0; baseline suite recorded |
| P1 | H1–H3 in the harness, version 1.1.0 | harness package tests green; local binary rebuilt |
| P2 | C01–C04, C06, C08, C09 + `harness/harness` without the adapter | deterministic suite green; sites gate green; R3–R6 green |
| P3 | C05, C07 adapter, C10 deterministic tests | hook-contract tests green; S1–S14 live green |
| P4 | C10 live parity and coexistence | S15, S16, T4 green |
| P6 | C11: A1, A2, A3, A4, B1, B3, B4, then B2 | S17–S22 green; B2 rounds gated |
| P5 | C12, R7 real install, dogfood (full bugfix and feature journeys on a copy of a real AI-DLC project) | real install active, rollback verified, journeys complete |

## 11. Open items
- D-REL release source.
- Windows and Linux binary targets: build only on request (R4 native only).
