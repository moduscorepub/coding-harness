# Code-quality hooks

Five example extensions that steer a coding session toward changes a maintainer would merge. Each hook is one file loaded with `--extension` (`-e`); they share helpers in `shared.ts`.

| Hook                   | Acts on                                         | What the agent gets                                                                                                                                          |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `gate/gate.ts`         | First edit to a definition, or to a new file    | The edit is blocked once, with the callers, same-named implementations, tests, or package index it has not read yet                                          |
| `checkers/checkers.ts` | Every edit, and the end of the turn             | New findings from the project's own ruff, mypy or basedpyright, tsc, and oxlint, appended to the edit result; one continuation if new findings remain at the end |
| `approach/approach.ts` | First edit to a source file                     | Blocked until it proposes 2–3 approaches with `choose_approach`; a cheaper model reads the repository and picks one                                          |
| `history/history.ts`   | First read of a source file                     | Files usually changed together with it, and past commits similar to the task, from git                                                                       |
| `grain/grain.ts`       | Every edit                                      | The closest existing sibling of each new definition, missing package exports, missing docs where the package documents its code, libraries sibling modules use |

## Usage

```bash
harness -e packages/coding-agent/examples/extensions/code-quality/gate/gate.ts \
        -e packages/coding-agent/examples/extensions/code-quality/history/history.ts
```

Requirements: git for every hook; python3 for `gate` on Python code; for `checkers`, the project's own tools (`.venv/bin/ruff`, `.venv/bin/mypy` or `basedpyright` on `PATH`, `node_modules/.bin/tsc`, `node_modules/.bin/oxlint` when the lint script uses it). Hooks that find nothing to say stay silent.

Environment:

- `HOOK_LOG_DIR`: when set, each hook appends one JSON record per decision to `$HOOK_LOG_DIR/<hook>.jsonl`.
- `APPROACH_PICKER_MODEL`: model that picks the approach (default `anthropic/claude-haiku-5-5`).
- `APPROACH_PICKER_BIN`: binary run for the picker's read-only session (default: the running executable).

## What they showed in evaluation

In a 720-run evaluation (30 tasks from three repositories, Sonnet as the agent, two independent model reviews per change plus hidden tests), none of these hooks measurably lowered review cost against the same agent without hooks; `checkers` was slightly worse, mostly because its findings were transient errors in half-finished edits. `approach` helped only when the proposed options differed on the decision that mattered. Treat them as working examples of blocking a tool call (`tool_call`), adding context to a result (`tool_result`), continuing a turn (`session_stop`), and registering a tool, and as starting points rather than recommended defaults.
