# Status

The running record of the end-to-end build: what passed at each gate, what deviated, what was decided.

## Phase gates
| Phase | Scope | State | Evidence |
|---|---|---|---|
| G0 | Spec v2, improvements fixes, graft guide, mirror | in progress | — |
| P0 | Source build reproduces installed 2.10.0; build/install scripts | pending | — |
| P1 | Harness H1–H3, version 1.1.0 | pending | — |
| P2 | Core registration, packager, init/doctor, plugins, release scripts | pending | — |
| P3 | Hook contracts, adapter, deterministic tests, live S1–S14 | pending | — |
| P4 | Live parity with Claude Code, coexistence | pending | — |
| P6 | Improvements A1–A4, B1, B3, B4, B2 | pending | — |
| P5 | Version 1.0.0, real install, dogfood | pending | — |

## Verified so far
- **Source reproduces the install.** Upstream source at `v2.10.0` (commit `2a88838`, the installed build's `sourceDigest`) packages into `dist-release/` trees byte-identical to the installed 2.10.0 runtime for all 7 distributions and the plugins (`diff -rq` → 0 lines each).
- **Upstream baseline suite** (`bun tests/run-tests.ts --smoke --unit --no-llm`, local Bun 1.3.14, macOS arm64): run in progress, with 1 failure so far. `t-tui-tmux-compat.test.ts` fails and is environmental: it needs `tmux`, which this machine lacks. Final counts are recorded at P0.

## Deviations from SPEC v1
- **Source-based fork.** v1 patched installed runtime trees. v2 forks the upstream source, because it is public (MIT-0), reproduces the install exactly, and grafts with `git am`.
- **H1 grows.** The harness never emits `resources_discover`, so H1 wires the event before adding `agentPaths`.
- **Agent frontmatter key.** The harness reads `thinkingLevel` (or `thinking`), not `thinking-level`.
- **A4 changes design.** No per-request history rewriting (prompt cache); compaction at stage boundaries instead.

## Decisions
| Date | Decision |
|---|---|
| 2026-10-11 | Fork code canonical in `~/projects/aidlc-harness`, mirrored to `coding-harness/integrations/aidlc/`; commit and push at every gate |
| 2026-10-11 | Real install at the end; no spend cap; stronger models allowed when they improve results |
| 2026-10-11 | Build B2 (ratchet kit) as well as A1–A4, B1, B3, B4 |
