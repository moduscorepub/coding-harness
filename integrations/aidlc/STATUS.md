# Status

The running record of the end-to-end build: what passed at each gate, what deviated, what was decided.

## Phase gates
| Phase | Scope | State | Evidence |
|---|---|---|---|
| G0 | Spec v2, improvements fixes, graft guide, mirror | done | aidlc-harness `8aef34a`; mirror pushed |
| P0 | Source build reproduces installed 2.10.0; build/install scripts | done | full build green (54/54 binary gates); sandbox install; `config --harness harness` + doctor 0 problems; patches reproduce the fork tree |
| P1 | Harness H1–H3, version 1.1.0 | pending | — |
| P2 | Core registration, packager, init/doctor, plugins, release scripts | in progress | C01–C08 committed; C09 and the site-decision gate pending |
| P3 | Hook contracts, adapter, deterministic tests, live S1–S14 | pending | — |
| P4 | Live parity with Claude Code, coexistence | pending | — |
| P6 | Improvements A1–A4, B1, B3, B4, B2 | pending | — |
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

## Deviations from SPEC v1
- **Source-based fork.** v1 patched installed runtime trees. v2 forks the upstream source, because it is public (MIT-0), reproduces the install exactly, and grafts with `git am`.
- **H1 grows.** The harness never emits `resources_discover`, so H1 wires the event before adding `agentPaths`.
- **Agent frontmatter key.** The harness reads `thinkingLevel` (or `thinking`), not `thinking-level`.
- **A4 changes design.** No per-request history rewriting (prompt cache); compaction at stage boundaries instead.
- **No tier pins a model on the harness.** SPEC v2 §4 C03 mapped tiers to `@slow`/`@default`/`@smol`. Model access is harness-owned, so every tier projects `model: null` and the agent inherits the session model; `balanced` projects `thinkingLevel: medium`. Cross-vendor routing comes from A1 at spawn time instead.
- **Harness plugins compose like OpenCode's.** The harness has no plugin store that runs a plugin's SessionStart hook, so plugins use the current-root inventory: `PLUGIN_ROOT=<built plugin> aidlc plugin sync`. Persona twins land in `.harness-aidlc/host/agents`.

## Decisions
| Date | Decision |
|---|---|
| 2026-10-11 | Fork code canonical in `~/projects/aidlc-harness`, mirrored to `coding-harness/integrations/aidlc/`; commit and push at every gate |
| 2026-10-11 | Real install at the end; no spend cap; stronger models allowed when they improve results |
| 2026-10-11 | Build B2 (ratchet kit) as well as A1–A4, B1, B3, B4 |
