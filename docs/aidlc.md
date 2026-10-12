# AI-DLC on Coding Harness

[AI-DLC](https://github.com/awslabs/aidlc-workflows) is a structured software
lifecycle (inception, construction, operation) driven by an engine, a set of
persona agents and human approval gates. A fork of it adds a `harness`
distribution that runs the whole workflow inside Coding Harness with the same
fidelity as its Claude Code distribution. The fork lives in
[`integrations/aidlc/`](../integrations/aidlc/README.md): a patch series against
upstream `v2.10.0`, a graft guide and the build record.

## Use it

```sh
aidlc config --harness harness   # in the project; writes .harness/extensions/aidlc.ts and .harness-aidlc/
harness                          # then /aidlc <what to build>, or /aidlc --doctor
```

Coding Harness 1.1.0 or newer is required.

Work beside an active workflow starts its own intent with
`/aidlc --new-intent --scope <scope> "<description>"`. A plain `--scope`
changes the scope of the active workflow.

The distribution's version is `1.0.0`. A project that still has an upstream
`2.x` tree (for example `.claude/`) fails the engine's major-version check.
Refresh it with `aidlc config --harness claude --yes`. While a workflow is
active, `aidlc config` refuses to refresh, so pin the project instead with
`aidlc config --pin 1.0.0 --yes`.

## What the distribution uses from the harness

| Harness surface                                                                                | Use                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Project extension `.harness/extensions/aidlc.ts`                                               | Loads the AI-DLC adapter, which maps harness events onto the engine's hooks                            |
| `resources_discover` (`skillPaths`, `promptPaths`, `agentPaths`, `rulePaths`, `watchdogPaths`) | The `/aidlc` skill and prompts, the persona task agents, the AI-DLC stream rules and the advisor brief |
| Extension skill precedence                                                                     | The harness `/aidlc` wins over Claude Code's when a project carries both                               |
| `ask`                                                                                          | Every AI-DLC question and approval gate                                                                |
| `before_subagent_spawn`                                                                        | Reviewers on another model family than the builder's                                                   |
| `session_before_compact`, `ctx.compact()`                                                      | Compaction summaries built from the workflow record, and compaction at stage boundaries                |

## Harness features the workflow turns on

| Feature           | What AI-DLC does with it                                                                                                                                                                   | Your switch                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Advisor           | The developer agent carries `advisor: true`; its brief inlines the human-approved artifacts                                                                                                | `advisor.enabled`, `task.agentAdvisor`, `modelRoles.advisor`                      |
| Stream-time rules | Stubs, hand edits of engine state, reviewer writes and unsupported "done" claims are caught while the call streams; rules derived from the project's method and the active scope join them | the rule files under `.harness-aidlc/host/rules/`                                 |
| Prewalk           | The developer agent hands off to the `smol` role at its first edit                                                                                                                         | `modelRoles.smol`, `task.agentPrewalk`                                            |
| Debugger          | In a bugfix the defect is observed under the `debug` tool before the first source edit                                                                                                     | a debug adapter for the language (for Python, `debugpy` in the project's `.venv`) |
| Ratchet           | `integrations/aidlc/ratchet/aidlc-method` is an eval of the AI-DLC method for `/ratchet`                                                                                                   | —                                                                                 |

The AI-DLC side of these (settings, the `project-checks` sensor and
`/aidlc-checkers`, compaction thresholds) is documented in the distribution's
own guide, `docs/guide/harnesses/coding-harness.md` in the fork.
