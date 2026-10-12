# aidlc-method

| round | variant | change | decision | train cost_usd | test cost_usd | train pass | test pass | train cost_usd | test cost_usd |
|---|---|---|---|---|---|---|---|---|---|
| 0 | baseline ★ | baseline | baseline | 8.5921 ±1.4471 | 8.1124 ±2.0811 | 1.000 ±0.000 | 1.000 ±0.000 | 8.5921 ±1.4471 | 8.1124 ±2.0811 |
| 1 | v1 | Developer agent: narrow knowledge preflight, skip debugger/re-derivation when brief has diagnosis | revert | 9.0359 ±1.5572 | 7.9074 ±2.0952 | 1.000 ±0.000 | 1.000 ±0.000 | 9.0359 ±1.5572 | 7.9074 ±2.0952 |

## Recommended change
None. Tuned files are at baseline (v1 reverted). [TUNE] v1 (narrow delegated knowledge preflight + skip debugger relaunch when the brief carries a diagnosis) was the only candidate.

## Versus baseline
- pass: 1.000 on train (9) and test (6) in both rounds; delta 0 +/- 0. Baseline is at ceiling, so pass cannot move. The goal was switched to cost_usd lower, holding pass (re-approved).
- cost_usd/slot: train +$0.44 (+/-1.38), test -$0.21 (+/-1.62). Both within noise: no effect. Do not merge.

## Why trust this
Preflight: 15/15 oracles pass, 15/15 nulls fail. Hidden tests are grader-only. Single rep, 6 test cases: cost noise is about +/-$1.6 on a ~$8 slot; per-slot cost varies $5-10 by case.

## What else was tried
Nothing; the stop rule was baseline + one round (I set the gate's `rounds` to 2, so it reports done=False; stopped per your rule).

## Untried levers
Watchdog (WATCHDOG.md) limits on repeated verification; trimming rules/*.md; conductor-side dispatch (the analyzer found one dispatch ran as the generic task agent, a change in core/tools or hooks territory, off-limits). Harder cases would be needed for pass to move.
