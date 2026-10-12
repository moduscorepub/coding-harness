// drive.ts — runs `/ratchet <flow>` in a Coding Harness RPC session without a
// terminal and answers its dialogs the way an approving human would: the grill
// takes each question's first option (the agent puts its recommendation first)
// and the three approval dialogs (inputs, grader, plan) are approved.
//
//   bun ratchet/drive.ts --flow aidlc-method --request ratchet/aidlc-method/ratchet-request.md [--rounds 1]
//
// The session stays open until the flow has gated the baseline and `--rounds`
// rounds after it (read from .harness/ratchet/<flow>/_state.json). When the
// agent settles with nothing pending before that, it is asked to carry on.
//
// Environment: AIDLC_HARNESS_BIN, AIDLC_RATCHET_DRIVER_MODEL (default
// anthropic/claude-sonnet-5-5) and an Anthropic credential in
// AIDLC_HARNESS_ANTHROPIC_KEY or ANTHROPIC_API_KEY, which the runner inherits.

import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { answerBy, HarnessRpc } from "../upstream/tests/harness/harness-rpc.ts";

const REPO = resolve(import.meta.dir, "..");
const BIN = process.env.AIDLC_HARNESS_BIN ?? Bun.which("harness") ?? "harness";
const MODEL = process.env.AIDLC_RATCHET_DRIVER_MODEL ?? "anthropic/claude-sonnet-5-5";
const KEY = process.env.AIDLC_HARNESS_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY ?? "";
const POLL_MS = 60_000;
const SESSION_CAP_MS = 12 * 60 * 60_000;

function arg(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

type FlowState = { rounds?: Array<{ variant: string; decision: string }>; approvals?: Record<string, unknown> };

function flowState(flow: string): FlowState | null {
  const file = join(REPO, ".harness", "ratchet", flow, "_state.json");
  return existsSync(file) ? (JSON.parse(readFileSync(file, "utf-8")) as FlowState) : null;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const flow = arg(argv, "--flow");
  const requestFile = arg(argv, "--request");
  const rounds = Number(arg(argv, "--rounds") ?? 1);
  if (!flow || !requestFile) {
    console.error("usage: bun ratchet/drive.ts --flow <name> --request <file> [--rounds N]");
    process.exit(2);
  }
  if (!KEY) throw new Error("set AIDLC_HARNESS_ANTHROPIC_KEY or ANTHROPIC_API_KEY");
  const request = readFileSync(resolve(REPO, requestFile), "utf-8").trim();
  const gated = () => (flowState(flow)?.rounds ?? []).filter((round) => round.decision !== "rerun").length;
  const done = () => gated() >= 1 + rounds;

  const rpc = new HarnessRpc({
    bin: BIN,
    cwd: REPO,
    args: ["--approval-mode", "yolo", "--model", MODEL],
    env: { ANTHROPIC_API_KEY: KEY, AIDLC_HARNESS_BIN: BIN, PI_CODING_AGENT_DIR: mkdtempSync(join(tmpdir(), "ratchet-driver-agent-")) },
    ask: answerBy([{ when: /approv/i, pick: /^Approve$/ }]),
  });
  const started = Date.now();
  await rpc.start();
  try {
    await rpc.prompt(`/ratchet ${flow}\n\n${request}`, { timeoutMs: SESSION_CAP_MS });
    while (!done() && Date.now() - started < SESSION_CAP_MS) {
      const state = (await rpc.command({ type: "get_state" })).data as { isSettled?: boolean; hasPendingAsyncWork?: boolean };
      if (state.isSettled && !state.hasPendingAsyncWork) {
        console.log(`${new Date().toISOString()} settled with ${gated()} gated; asking the agent to carry on`);
        await rpc.prompt(
          `Carry on with the ${flow} ratchet: finish any running variant, gate it, and continue until the baseline and ${rounds} round(s) after it are gated.`,
          { timeoutMs: SESSION_CAP_MS },
        );
      } else {
        await Bun.sleep(POLL_MS);
      }
    }
  } finally {
    await rpc.close();
  }
  const state = flowState(flow);
  console.log(JSON.stringify({ gated: gated(), rounds: state?.rounds ?? [], approvals: Object.keys(state?.approvals ?? {}) }, null, 2));
  process.exit(done() ? 0 : 1);
}

if (import.meta.main) await main();
