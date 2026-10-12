# Status

The running record of the end-to-end build: what passed at each gate, what deviated, what was decided.

## Phase gates
| Phase | Scope | State | Evidence |
|---|---|---|---|
| G0 | Spec v2, improvements fixes, graft guide, mirror | done | aidlc-harness `8aef34a`; mirror pushed |
| P0 | Source build reproduces installed 2.10.0; build/install scripts | done | full build green (54/54 binary gates); sandbox install; `config --harness harness` + doctor 0 problems; patches reproduce the fork tree |
| P1 | Harness H1–H3, version 1.1.0 | done | coding-harness `f6cd9e7` pushed; no test regressions (below); 1.1.0 binary built to a separate path |
| P2 | Core registration, packager, init/doctor, plugins, release scripts | done | C01–C09; fork suite equals the baseline; site gate 342 sites / 25 files |
| P3 | Hook contracts, adapter, deterministic tests, live S1–S14 | done | C10: S3/S4/S5/S12/S13/S14 deterministic contracts; live S1–S3, S6–S12, S14 green (8 scenarios, 243 s) |
| P4 | Live parity with Claude Code, coexistence | done | S15/T4 parity green (811 s), S16 coexistence green (258 s); harness H4; fork suite better than baseline (below) |
| P6 | Improvements A1–A4, B1, B3, B4, B2 | done | A1–A4, B1, B3, B4 committed with live S9/S9b and S17–S22 green (below); B2 `/ratchet aidlc-method` baseline plus one gated round, reverted as within noise (below) |
| P5 | Version 1.0.0, real install, dogfood | pending | — |

## Verified so far
- **Source reproduces the install.** Upstream source at `v2.10.0` (commit `2a88838`, the installed build's `sourceDigest`) packages into `dist-release/` trees byte-identical to the installed 2.10.0 runtime for all 7 distributions and the plugins (`diff -rq` → 0 lines each).
- **Upstream baseline suite** (`bun tests/run-tests.ts --smoke --unit --no-llm`, local Bun 1.3.14, macOS arm64, upstream `v2.10.0`): 362 files, 357 pass, 5 fail. These five are the pre-existing baseline; a fork run is compared against this set.

  | File | Failing case | Cause |
  |---|---|---|
  | `t-tui-tmux-compat` | tmux backend on a private socket | environmental: no `tmux` on this machine |
  | `t243-install-mechanism` | local release acquisition requires an authenticated provenance bundle | needs a signed release provenance bundle |
  | `t293-config-models` | Kiro reports unsupported group effort and applies model-bound exceptions | fails on pristine upstream |
  | `t296-config-setup-walk` | 4 first-run walk cases | fails on pristine upstream |
  | `t318-session-binding-helpers` | GC keeps a live entry it cannot verify | fails on pristine upstream |

  Run single files through the runner (`--filter`), not bare `bun test`: the runner's budgets and environment differ, and `t27` cases 67–68 fail under bare `bun test` in both trees while passing under the runner.
- **Fork build.** `bun scripts/build.ts` at fork commit `ab004b3` (C01–C07, C08 in the working tree): packages 8 distributions, `package --check` deterministic, native binary compiled with Bun 1.4.2, 54/54 smoke gates pass including `runtime-harness` and `harness-probe-harness`, release assets written. The 7 existing distributions differ from the installed 2.10.0 only in the core sources C02–C06 change, their content hashes, the settings schema's `harness` key, the plugin target table and the compose template.
- **Sandbox install.** `bun scripts/install.ts --sandbox out/sandbox/p0 --from out/release-p0` installs and activates the build in an isolated root and disables the update check (`aidlc system config global set update-check false`, stored in `<installRoot>/aidlc.settings.json`). `aidlc config --project-dir <p> --harness harness --mcp none --quiet` projects `.harness/extensions/aidlc.ts`, `.harness-aidlc/`, `aidlc/`, `AGENTS.md` and `.gitignore`; `aidlc doctor --verbose` reports 0 problems, every harness wiring row ok. Its plugin warning (`host:inventory-unavailable`) is identical on an OpenCode project.
- **Local builds are unsigned.** Official releases carry a provenance bundle signed by the upstream release workflow; a local build cannot. The build writes an explicit `{"localBuild":true,"attested":false}` marker in that slot and the install runs with attestation off (`AIDLC_GH_BIN=/usr/bin/false`); the release's SHA-256 checksums still verify every asset.
- **Patch series reproduces the fork.** `git am -3 patches/*.patch` on a fresh `v2.10.0` clone yields a tree identical to `harness-distribution` HEAD.
- **Harness 1.1.0 has no regressions.** Coding-agent tests that fail with H1–H3 were each re-run with and without the change (`git stash`): the singleton bucket (3 failures) and the 40 other failing files (98 failures) fail identically either way, and `packages/tui` has the same 16 failures before and after. These are pre-existing on this machine. H1–H3's own tests (`sdk-resources-discover`, `discovery/at-imports`, `discovery/claude-tools`) pass, and `check:types` is clean for coding-agent and tui.
- **Fork suite beats the baseline.** `bun tests/run-tests.ts --smoke --unit --no-llm` on the fork: 372 files; the only failures are three pristine-upstream ones (`t-tui-tmux-compat`: no tmux; `t293`; `t296`). `t243` and `t318` pass. Every upstream test that enumerates distributions covers `harness` (test matrix entry, root files, method include, reviewer-scope registration, onboarding, documentation roster, release inventory, plugin build, first-run detection fixture). Failures are compared per case, not per file: a per-file comparison let a new `t243` case regress unnoticed while the file was already red.
- **C10 deterministic coverage.** `t-harness-emit` (persona projection, include list, entrypoint boundary, skill drift guard), `t-harness-adapter-map` (event-to-hook mapping through the adapter's `runCore` seam), `t-harness-hook-contracts` (the shipped adapter driving the real hooks through the production dispatcher), `t-harness-usage-reader` (harness session usage, attribution, incremental fold), `t-harness-config-doctor` (S12, S13, S14). The hook contracts include S3 (a stage dispatch rewrites every `task` assignment with the stage's rule bundle and keeps the shared context), S4 (a reviewer subagent's `read` of a sibling unit is blocked; its own unit is readable) and S5 (after a READY review and `gate-start`, an edit to the reviewed artifact is refused and audited as `REVIEW_FREEZE_BLOCKED`). S13: a missing or gitignored `.harness/extensions/aidlc.ts` fails `aidlc doctor`. S12: `config models --preset minimal` rewrites the persona twins' `thinkingLevel` and writes no `model`. S14: `engine space switch` repoints `includes.json` and the personas, and the constitution the adapter injects carries the new space's memory.
- **Live journeys on Coding Harness 1.1.0** (`AIDLC_HARNESS_RPC_LIVE=1`, RPC mode, `anthropic/claude-sonnet-5-5`, scripted `ask` answers; 8/8 pass in 243 s):

  | Scenario | What the run proves |
  |---|---|
  | S1, S10, S11 | `/aidlc bugfix …` composes a plan, passes the plan gate, creates the intent, runs the first stage with subagents and asks inside the workflow; the audit records `WORKFLOW_STARTED`, `STAGE_STARTED`, `HUMAN_TURN`, `SESSION_ENDED`; the usage ledger attributes subagent spend by agent type |
  | S3 | a subagent transcript of that journey carries `Active AI-DLC Rule Bundle` |
  | S2 | a write before plan approval is refused with the guard's reason |
  | S6 | a traceability write fires its sensor and the verdict reaches the model |
  | S7 | `engine state approve` through bash is refused |
  | S8 | ending the turn mid-workflow is answered with `The AIDLC workflow has a pending step` |
  | S9 | RPC `compact` runs validate-state, which writes `<record>/.aidlc-engine/recovery.md` |
  | S12 | `config models --agent architect --effort low` makes a spawned architect session record `thinking_level_change` → `low` |
  | S14 | after `engine space switch team-b`, the model answers a codename only present in team-b's memory, with no tool call |

- **S15/T4 parity** (`t-harness-bugfix-parity`): the same `/aidlc --scope bugfix …` request on the same fixture (a Bun library whose discount arithmetic is wrong, with a failing test), driven to completion under Claude Code 2.1.293 (Agent SDK, `claude-sonnet-5-5`) and Coding Harness 1.1.0 (RPC, `anthropic/claude-sonnet-5-5`), every structured question answered with its first option. Both workflows complete, both fixture test suites pass, and the two runs agree on stage progress, on the per-stage events the engine enforces (stage, phase and workflow transitions, workspace setup, plan approval, summary confirmation, reviews and gates), and on the intent record's artifact file set. 1/1 pass in 811 s. Three earlier runs shaped the comparison: run 1 found the Plan Approval defect below (the harness stopped at code generation); runs 2 and 3 completed and differed only in what the model chose (learnings proposed, a retried command, the conductor's own logging of non-gate questions), which the comparison now excludes; it still fails on run 1.
- **S16 coexistence** (`t-harness-coexistence-live`): a project configured for Claude Code and then Coding Harness. In the harness session `/aidlc` runs the harness skill and no framework command touches `.claude/`; Claude Code's `/aidlc --doctor` then passes on the workflow the harness started and names the Claude distribution. Each tree's doctor names its own distribution (deterministic, `t-harness-config-doctor`). 1/1 pass in 258 s, with the fork's native `aidlc` on PATH.
- **P6 improvements on Coding Harness 1.1.0** (live: RPC, `anthropic/claude-sonnet-5-5`; each scenario green on its own run):

  | Item | Commit | Scenario | What the run proves |
  |---|---|---|---|
  | A1 cross-vendor review | `cbdc0fc0c` | S17 | a reviewer subagent spawned in a workflow runs on a model family other than the builder's (`ollama/qwen2.5-coder:0.5b` against Anthropic) |
  | A2 continuous advisor | `ea0e6fb20` | S18 | the developer's advisor reviews a write against the human-approved `scope.md` and cites it |
  | A3 stream-time rules | `b13477a0f` | S19a, S19 | the four shipped rules trigger on what they guard and nothing else (harness rule tester); a `not implemented` write is interrupted before it reaches disk and the session records a `ttsr_injection` |
  | A4 state-anchored compaction | `7574323b0` | S9, S9b | RPC `compact` returns a summary built from the record (stage, gate, directive in flight, `details.source = aidlc`); the conductor's first engine call afterwards is `orchestrate next`; a turn that crosses a stage boundary compacts and the resumed run finishes what the human asked |
  | B1 project checkers | `1a1c69723` | S20 | `/aidlc-checkers` records the fixture's lint (`generic`, `{file}`) and test (`exit-code`) commands; a write that breaks the lint fails `project-checks` and the finding reaches the model |
  | B3 prewalk | `4c4a4ddbe` | S21 | the dispatched developer plans and makes its first write on Sonnet, then continues on the `smol` model (Haiku) |
  | B4 debugger | `310c6109c` | S22 | in a Python bugfix the debugger (`xd://debug`, debugpy from the project `.venv`) runs before the first edit of the faulty file, and the diagnosis cites `subtotal = 5000`, `discount = 6000` at the breakpoint |
  | B2 ratchet kit | `ratchet/` (this repo) | `/ratchet aidlc-method`, 1 round | baseline 15/15 cases pass at $8.40 a case; the proposed developer-agent change (narrower knowledge preflight, no debugger relaunch when the plan carries the diagnosis) also passes 15/15 but costs $9.04 against $8.59 a train case, and the gate reverts it as "no change outside noise" |

  B1 is a core change: `project-checks` ships to every distribution (deterministic `t-sensor-project-checks`, including a real dispatcher fire). The sensor inventory tests (`t93`, `t95`, `t227`, `t230`, `t239`) and the sensor documentation follow it.

  B2 ran through `ratchet/drive.ts` (harness RPC, `/ratchet` with `--rounds 1`): seed `1812014203`, 9 train and 6 test cases, 1 rep, concurrency 4. The goal started as `pass` up with `cost_usd` held; the baseline sat at the pass ceiling, so the plan was re-approved as `cost_usd` down with `pass` held. Spend $258.96: baseline $126.00, round 1 $128.77, proposer and driver $4.19. `.harness/ratchet/aidlc-method/` holds the status table, the narrative and `v1/change.patch` (the reverted change); `upstream/` is unchanged. A baseline at the pass ceiling leaves cost as the only measurable gain, so the next useful rounds need harder cases.
- **P5 release 1.0.0.** C12 (`f52c4d21a`, `chore(release): 1.0.0`) sets `AIDLC_VERSION`, the CHANGELOG entry and the README badge. Fork suite on it (`--smoke --unit --no-llm`): 372 files, 11,123 cases, 3 failed files. These are the known environment failures `t-tui-tmux-compat`, `t293` and `t296` (6 cases); no version pin failed. `bun scripts/build.ts --upstream <worktree> --output out/release-1.0.0` built the native `aidlc-darwin-arm64`, `aidlc-runtime-1.0.0.tar.gz` and all 8 distributions.
- **P5 install.** Sandbox rehearsal: install 2.10.0, install 1.0.0, `--sandbox <dir> --rollback` (2.10.0 active again), `aidlc use 1.0.0`. Real install: `install.ts --real` made 1.0.0 active with 2.10.0 kept; `install.ts --rollback` restored 2.10.0; `aidlc use 1.0.0` made 1.0.0 active again. `update-check` is off; both versions stay installed.
- **P5 dogfood on a real project.** A copy of a private multi-language monorepo with a live AI-DLC workspace (two intents, one active) and a 2.10.0 Claude Code tree. `aidlc config --harness harness` added the harness tree; its doctor reports 0 problems. Journeys ran over RPC on `anthropic/claude-sonnet-5-5`, with every question answered by its first option.

  | Journey | Request | Result |
  |---|---|---|
  | Bugfix | An injected defect (a JSON loader accepted a repeated field when both values were equal) and a failing regression test; `/aidlc --new-intent --scope bugfix …` | `WORKFLOW_COMPLETED` in 5 prompts, 36 min, $22.56 (conductor $13.16, the cross-family advisor $3.40, reviewers, scans and developer $6.00). The fix reverts the defect and adds a regression test for the second loader; 4/4 tests pass. The developer and the conductor ran `debugpy` through `xd://debug` before the edit (B4). `project-checks` fired 4 times and reported `tool-unavailable`, as the project has no checker config (B1). The engine refused five actions (a stale code-KB snapshot, a missing plan-approval session, source changed under review twice, the review budget) and the conductor recovered from each. |

  Two adoption findings, both documented in README.md and the harness docs: the fork's major version differs from the project's 2.10.0 Claude tree, so every engine call is refused until that tree is refreshed (`aidlc config --harness claude --yes`) or, while a workflow is active and the refresh is refused, the project is pinned (`aidlc config --pin 1.0.0 --yes`); and `/aidlc --scope <s>` on a project with an active workflow changes that workflow's scope, so new work uses `--new-intent`.


## Deviations from SPEC v1
- **Source-based fork.** v1 patched installed runtime trees. v2 forks the upstream source, because it is public (MIT-0), reproduces the install exactly, and grafts with `git am`.
- **H1 grows.** The harness never emits `resources_discover`, so H1 wires the event before adding `agentPaths`.
- **Agent frontmatter key.** The harness reads `thinkingLevel` (or `thinking`), not `thinking-level`.
- **A4 changes design.** No per-request history rewriting (prompt cache); compaction at stage boundaries instead.
- **No tier pins a model on the harness.** SPEC v2 §4 C03 mapped tiers to `@slow`/`@default`/`@smol`. Model access is harness-owned, so every tier projects `model: null` and the agent inherits the session model; `balanced` projects `thinkingLevel: medium`. Cross-vendor routing comes from A1 at spawn time instead.
- **Harness plugins compose like OpenCode's.** The harness has no plugin store that runs a plugin's SessionStart hook, so plugins use the current-root inventory: `PLUGIN_ROOT=<built plugin> aidlc plugin sync`. Persona twins land in `.harness-aidlc/host/agents`.
- **The orchestrator skill is checked in.** SPEC v2 derived `SKILL.md` at emit time. Upstream tests read every distribution's authored skill, so the derivation is now checked in as `harness/harness/skills/aidlc/SKILL.md`; the build fails when it drifts from the Claude skill (`bun harness/harness/emit.ts --write-skill` regenerates it).
- **Code-execution tools are guarded.** Live runs showed the conductor driving the engine from `eval` (a Python subprocess), which no Bash-parsing guard sees. The adapter refuses `eval`, `debug`, `ssh`, `recipe` and `vibe_spawn`/`vibe_send` input that invokes the engine, and routes the rest through `plan-approval-guard` as opaque tools.
- **Sensor feedback is a context message.** The harness delivers `tool_result` `additionalContext` as a context message after the tool batch, not inside the tool result.
- **Asks open neutral.** A live probe showed the conductor marking `recommended: 0` on gate questions despite the annex rule; on the harness that pre-selects and badges the option and makes it the `ask.timeout` default. The adapter's `tool_call` now drops `recommended` from every `ask`. A live control run (strip disabled in a scratch copy) showed the model's `recommended: 0` reaching the dialog; with the strip it does not, and S1 asserts no in-workflow question carries it.
- **Plan Approval through `ask`.** Live parity run 1 stalled at code generation: `aidlc-log answer --checkpoint plan-approval` refused the human's `ask` pick because the adapter sent `record-human-turn` neither the question nor the answer. The adapter now maps a harness `ask` result to Claude's AskUserQuestion fields (`tool_input.questions`, `tool_response.answers` per question; a typed "Other" counts as the answer). A hook contract drives the real decision → ask → answer path and fails without the mapping.
- **Coexistence needs four changes.** With the Claude distribution in the same project: (1) harness H4 — an extension-contributed skill replaces another tool's same-name skill, or Claude's `/aidlc` shadowed the harness one; (2) the adapter exports `AIDLC_HARNESS_DIR=.harness-aidlc` at session start so the native `aidlc` resolves this tree instead of the first discovered (`.claude`); (3) the adapter refuses `bun <other tool's dir>/tools/aidlc*.ts`; (4) the doctor's Project heading names the tree that ran it. The harness still prefers `.claude/CLAUDE.md` over `AGENTS.md` as project context; the method arrives through the adapter either way (documented).
- **2.10.0 root-file signatures.** C09 changes the shared root `AGENTS.md`, so each distribution's manifest now records its 2.10.0 variant (and copilot's copy-channel variant) as a legacy whole-file signature; an upgraded 2.10.0 project still adopts its unmarked file.
- **Harness onboarding prerequisites.** The copy channel runs `bun .harness-aidlc/tools/aidlc.ts`; the onboarding now says so (the release projection rewrites it to the native Runtime contract, as for every other distribution). The former "aidlc on PATH … AIDLC_BIN" line was wrong for both channels.
- **P6 improvements differ from SPEC v2 §9 in detail.** SPEC.md "As built" lists each difference and its reason: the `harness` settings section (A1), artifacts inlined into the advisor brief (A2), the narrowed state-files rule and the derived rules (A3), the summary contents and the turn-end trigger (A4), the `checkers.json` contract and the prompt-template discovery (B1), the harness's own prewalk switches (B3), the debug-first rule (B4), and the ratchet's change paths and RPC driver (B2). Two live findings drove changes: S9b showed a record-only summary lost the human's request, so the summary carries the human's last messages; S22 showed guidance text alone did not get the debugger used, so a bugfix holds the first source edit.

## Decisions
| Date | Decision |
|---|---|
| 2026-10-11 | Fork code canonical in `~/projects/aidlc-harness`, mirrored to `coding-harness/integrations/aidlc/`; commit and push at every gate |
| 2026-10-11 | Real install at the end; no spend cap; stronger models allowed when they improve results |
| 2026-10-11 | Build B2 (ratchet kit) as well as A1–A4, B1, B3, B4 |
