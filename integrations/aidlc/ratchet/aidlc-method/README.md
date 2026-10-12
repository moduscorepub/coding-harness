# AI-DLC method eval (ratchet kit)

An eval for the AI-DLC method as the Coding Harness distribution runs it, built
for the harness's `/ratchet` hillclimb. Each case is a small project with one
defect to fix or one feature to add. A run drives the real workflow
(`/aidlc --scope <scope> <request>` through `harness --mode rpc-ui`, every
question answered with its first option) and then grades the project with tests
the model never saw.

## Layout

| Path | What it holds |
|---|---|
| `cases/<id>/case.json` | `id`, `tags` (`[bugfix\|feature, ts\|py]`; the first tag is the split stratum), `scope`, `request`, `hidden` (the argv that runs the hidden tests) |
| `cases/<id>/project/` | the visible project the workflow starts from |
| `cases/<id>/hidden/` | tests copied in only after the run |
| `cases/<id>/oracle/` | a reference fix laid over the project, for the grader's preflight |
| `grade.ts` | grading (hidden tests pass) and `--preflight` |
| `run.ts` | the runner the ratchet calls |

Fifteen cases: six TypeScript and five Python bugfixes (`bugfix` scope), two
TypeScript and two Python features (`express` scope).

## Grader preflight

```sh
bun ratchet/aidlc-method/grade.ts --preflight
```

Every oracle must pass and every untouched project (the null answer) must fail.

## Running a variant by hand

```sh
AIDLC_HARNESS_ANTHROPIC_KEY=... bun ratchet/aidlc-method/run.ts --variant pilot --flow-dir /tmp/pilot --case ts-page-count --keep
```

The runner packages `upstream/` (`bun scripts/package.ts`), freezes
`upstream/dist/harness` for the variant, and runs each (case, rep) in a fresh
directory with its own agent directory. It writes `results.jsonl` rows
(`prompt_id`, `rep`, `prompt`, `tags`, `grade: {pass, sensor_failures}`,
`status`, `model`, `usage`, `cost_usd`, `latency_s`), `errors.jsonl` for runs
that produced nothing to grade, and `traces/<id>_rep<k>.json` for train cases
only (read from the flow's `_state.json`). A re-run skips every slot that
already has a result. Options: `--reps N` (default: the flow's plan, else 1),
`--concurrency N` (default 4), `--case <id>` (repeatable), `--keep` (leave the
run directories for inspection). Environment: `AIDLC_HARNESS_BIN`,
`AIDLC_RATCHET_MODEL` (default `anthropic/claude-sonnet-5-5`).

## Hillclimbing with `/ratchet`

In a Coding Harness session at the repository root:

```text
/ratchet aidlc-method
```

with this contract for the flow:

| | Paths |
|---|---|
| cases | `ratchet/aidlc-method/cases` |
| harness | `ratchet/aidlc-method/run.ts`, `ratchet/aidlc-method/grade.ts` |
| change | `upstream/core/agents/aidlc-developer-agent.md`, `upstream/harness/harness/host/rules`, `upstream/harness/harness/host/watchdog/WATCHDOG.md` |
| off-limits | `upstream/core/tools`, `upstream/core/hooks`, `upstream/tests` |

Runner command: `bun ratchet/aidlc-method/run.ts --variant {variant} --flow-dir {flow_dir}`.
Goal: `grade.pass` higher, holding `cost_usd`.

The harness orchestrator skill is not a change path: it is derived from the
Claude Code skill and a drift guard fails packaging when it is edited by hand.
