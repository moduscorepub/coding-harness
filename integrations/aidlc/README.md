# AI-DLC for Coding Harness

This repo adds a `harness` distribution to AI-DLC so that the full AI-DLC workflow runs inside the Coding Harness. It has the same fidelity as the Claude Code distribution, plus capabilities only the harness offers: reviewers on another model family, a continuous advisor on the developer, AI-DLC contracts as stream-time rules, compaction from the workflow record, the project's own checkers as a sensor, prewalk on the developer and the debugger in a bugfix (IMPROVEMENTS.md, STATUS.md).

It is a fork of [`awslabs/aidlc-workflows`](https://github.com/awslabs/aidlc-workflows) (MIT-0) at tag `v2.10.0`, kept as a numbered patch series.

| File | What it is |
|---|---|
| [SPEC.md](SPEC.md) | Implementation spec: decisions, verified facts, patch series, adapter, harness changes, improvements, tests, phases |
| [IMPROVEMENTS.md](IMPROVEMENTS.md) | What the harness offers AI-DLC that Claude Code does not, with evidence |
| [GRAFTING.md](GRAFTING.md) | How to apply this work to another AI-DLC fork |
| [STATUS.md](STATUS.md) | Phase gates, evidence and deviations |
| `patches/` | The fork as `git format-patch` output against `v2.10.0`, indexed in `patches/README.md` |
| `scripts/` | Bootstrap, patch export, build, install, mirror and site inventory |
| `inventory/` | Generated distribution-name sites and the per-file decisions |
| `ratchet/` | An eval of the AI-DLC method for the harness's `/ratchet` hillclimb (`ratchet/aidlc-method/README.md`) and a driver that runs it without a terminal |

## Quick start
```sh
scripts/bootstrap.sh                  # clone upstream at v2.10.0 into upstream/ and apply patches/
bun scripts/build.ts                  # package, determinism check, native binary, release assets in out/release
bun scripts/build.ts --upstream <dir> --output <out>   # the same from another checkout or worktree of the fork
bun scripts/install.ts --sandbox out/sandbox/try   # install into a throwaway root
bun scripts/install.ts --sandbox out/sandbox/try --rollback   # rehearse the rollback there
bun scripts/install.ts --real         # make the fork the active aidlc (2.10.0 kept for rollback)
bun scripts/install.ts --rollback     # restore the previous active version
```

**Existing upstream projects.** The fork's version is `1.0.0`. A project that still has an upstream `2.x` runtime (for example its `.claude/` tree) fails the engine's major-version check, so every `aidlc engine` call refuses to run. Refresh that tree with `aidlc config --harness claude --yes`. If a workflow is active, `aidlc config` refuses to refresh, so pin the project instead: `aidlc config --pin 1.0.0 --yes` writes `.aidlc-version`. Until the active workflow completes and the tree is refreshed, `aidlc doctor` still reports the `2.x` stamp of the older tree.

## Requirements

**Host.** Coding Harness ≥ 1.1.0. That version carries the extension seams this distribution needs (H1–H4, SPEC.md §7). Bun ≥ 1.3.14 and git are required.

**Mirror.** This repo is canonical, and `coding-harness/integrations/aidlc/` is a mirror of it. `bun scripts/sync-mirror.ts` updates the mirror, and `--check` reports drift.
