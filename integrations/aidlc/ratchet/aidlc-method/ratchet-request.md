Flow `aidlc-method`: the AI-DLC method as the Coding Harness distribution runs it. Reuse the existing eval in `ratchet/aidlc-method` (read its README.md first); do not write new cases, a new grader or a new runner.

- cases: `ratchet/aidlc-method/cases`
- harness: `ratchet/aidlc-method/run.ts`, `ratchet/aidlc-method/grade.ts`
- change: `upstream/core/agents/aidlc-developer-agent.md`, `upstream/harness/harness/host/rules`, `upstream/harness/harness/host/watchdog/WATCHDOG.md`
- off-limits: `upstream/core/tools`, `upstream/core/hooks`, `upstream/tests`
- runner command: `bun ratchet/aidlc-method/run.ts --variant {variant} --flow-dir {flow_dir}`
- grader preflight: `bun ratchet/aidlc-method/grade.ts --preflight` (every oracle passes, every null fails)
- goal: the `pass` grade key, higher; hold `cost_usd` (every row carries `cost_usd`)
- reps 1: each slot is a full AI-DLC workflow of about 15 minutes, and a variant about an hour
- split stratified by the first tag, test fraction 0.4
- stop after one round past the baseline

Run the baseline and the round command with `bash` in the background and wait for it to finish.
