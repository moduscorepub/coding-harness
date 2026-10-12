// run.ts — runs the AI-DLC method eval for one variant.
//
//   bun ratchet/aidlc-method/run.ts --variant <name> --flow-dir <dir> [--reps N] [--concurrency N] [--case <id>]...
//
// The method under test is whatever the upstream working tree holds: the run
// packages it (`bun scripts/package.ts`) and freezes the Coding Harness
// distribution for the whole variant. Each (case, rep) then:
//   1. copies the frozen distribution and the case's visible project into a
//      fresh directory (git repo, own agent directory: no shared state);
//   2. runs `/aidlc --scope <scope> <request>` through `harness --mode rpc-ui`
//      and keeps answering "Continue the AI-DLC workflow." until the workflow
//      completes (every `ask` gets its first option, the recommended answer);
//   3. copies the hidden tests in and grades (grade.ts).
// Rows land in <flow-dir>/<variant>/results.jsonl as each slot finishes, infra
// failures in errors.jsonl, and train-case transcripts in traces/. A re-run
// skips every slot that already has a result row (resume-idempotent).
//
// Environment: AIDLC_HARNESS_BIN (default `harness` on PATH),
// AIDLC_RATCHET_MODEL (default anthropic/claude-sonnet-5-5), and an Anthropic
// credential in AIDLC_HARNESS_ANTHROPIC_KEY or ANTHROPIC_API_KEY.

import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { HarnessRpc } from "../../upstream/tests/harness/harness-rpc.ts";
import { type Case, grade, loadCases, materialize } from "./grade.ts";

const REPO = resolve(import.meta.dir, "..", "..");
const UPSTREAM = join(REPO, "upstream");
const BIN = process.env.AIDLC_HARNESS_BIN ?? Bun.which("harness") ?? "harness";
const MODEL = process.env.AIDLC_RATCHET_MODEL ?? "anthropic/claude-sonnet-5-5";
const KEY = process.env.AIDLC_HARNESS_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY ?? "";
const CONTINUE = "Continue the AI-DLC workflow.";
const MAX_PROMPTS = 8;
const CASE_CAP_MS = 45 * 60_000;

type Args = { variant: string; flowDir: string; reps?: number; concurrency: number; only: string[]; keep: boolean };

function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const variant = value("--variant");
  const flowDir = value("--flow-dir");
  if (!variant || !flowDir) {
    console.error("usage: bun ratchet/aidlc-method/run.ts --variant <name> --flow-dir <dir> [--reps N] [--concurrency N] [--case <id>]... [--keep]");
    process.exit(2);
  }
  return {
    variant,
    flowDir: resolve(flowDir),
    reps: value("--reps") ? Number(value("--reps")) : undefined,
    concurrency: Number(value("--concurrency") ?? 4),
    only: argv.flatMap((arg, index) => (argv[index - 1] === "--case" ? [arg] : [])),
    keep: argv.includes("--keep"),
  };
}

/** Reps and the train ids from the ratchet's state; a pilot without state runs one rep and writes no traces. */
function flowState(flowDir: string): { reps: number; train: Set<string> } {
  const file = join(flowDir, "_state.json");
  if (!existsSync(file)) return { reps: 1, train: new Set() };
  const state = JSON.parse(readFileSync(file, "utf-8")) as { reps?: number; train_ids?: string[] };
  return { reps: state.reps ?? 1, train: new Set(state.train_ids ?? []) };
}

function readJsonl(file: string): Array<Record<string, unknown>> {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/** Package the upstream tree and freeze its harness distribution for this variant. */
function freezeDistribution(): string {
  const built = spawnSync("bun", ["scripts/package.ts"], { cwd: UPSTREAM, encoding: "utf-8" });
  if (built.status !== 0) throw new Error(`packaging failed:\n${built.stderr.slice(-2000)}`);
  const frozen = mkdtempSync(join(tmpdir(), "aidlc-ratchet-dist-"));
  cpSync(join(UPSTREAM, "dist", "harness"), frozen, { recursive: true });
  return frozen;
}

type Entry = { type?: string; timestamp?: string; message?: { role?: string; model?: string; content?: unknown; usage?: Record<string, unknown> } };

function transcripts(sessionFile: string): string[] {
  const artifacts = sessionFile.replace(/\.jsonl$/, "");
  const nested = existsSync(artifacts)
    ? readdirSync(artifacts, { recursive: true })
        .map(String)
        .filter((name) => name.endsWith(".jsonl"))
        .map((name) => join(artifacts, name))
    : [];
  return [sessionFile, ...nested];
}

function entries(file: string): Entry[] {
  return readFileSync(file, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Entry);
}

/** Token usage and cost over every agent in the run (main session, subagents, advisors). */
function usageOf(sessionFile: string): { usage: Record<string, number>; cost: number; model: string } {
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let cost = 0;
  const models = new Map<string, number>();
  for (const file of transcripts(sessionFile)) {
    for (const entry of entries(file)) {
      const message = entry.message;
      if (entry.type !== "message" || message?.role !== "assistant" || !message.usage) continue;
      for (const key of Object.keys(usage) as Array<keyof typeof usage>) usage[key] += Number(message.usage[key] ?? 0);
      cost += Number((message.usage.cost as { total?: number } | undefined)?.total ?? 0);
      if (file === sessionFile && message.model) models.set(message.model, (models.get(message.model) ?? 0) + 1);
    }
  }
  const model = [...models.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? MODEL.replace(/^[^/]+\//, "");
  return { usage, cost, model };
}

/** The main session as the ratchet's trace format. */
function traceOf(sessionFile: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const entry of entries(sessionFile)) {
    const message = entry.message;
    if (entry.type !== "message" || !message?.role) continue;
    const parts = Array.isArray(message.content) ? (message.content as Array<Record<string, unknown>>) : [{ type: "text", text: String(message.content ?? "") }];
    for (const part of parts) {
      if (part.type === "text") out.push({ role: message.role === "toolResult" ? "tool_result" : message.role, content: String(part.text ?? "") });
      else if (part.type === "thinking") out.push({ role: "assistant", content: "", thinking: String(part.thinking ?? "") });
      else if (part.type === "toolCall") out.push({ role: "tool_call", name: String(part.name), content: JSON.stringify(part.arguments ?? {}) });
    }
  }
  return out;
}

function auditText(dir: string): string {
  const spaces = join(dir, "aidlc", "spaces");
  if (!existsSync(spaces)) return "";
  return readdirSync(spaces, { recursive: true })
    .map(String)
    .filter((name) => name.includes("/audit/") && name.endsWith(".md"))
    .map((name) => readFileSync(join(spaces, name), "utf-8"))
    .join("\n");
}

async function runSlot(item: Case, rep: number, dist: string, keep: boolean): Promise<{ row?: Record<string, unknown>; error?: Record<string, unknown>; trace?: Array<Record<string, unknown>> }> {
  const dir = mkdtempSync(join(tmpdir(), `aidlc-ratchet-${item.id}-`));
  const agentDir = mkdtempSync(join(tmpdir(), "aidlc-ratchet-agent-"));
  const started = Date.now();
  const prompt = `/aidlc --scope ${item.scope} ${item.request}`;
  try {
    cpSync(dist, dir, { recursive: true });
    materialize(item, dir);
    spawnSync("git", ["init", "-q"], { cwd: dir });
    spawnSync("git", ["add", "-A"], { cwd: dir });
    spawnSync("git", ["-c", "user.name=eval", "-c", "user.email=eval@example.invalid", "commit", "-qm", "fixture"], { cwd: dir });
    const rpc = new HarnessRpc({
      bin: BIN,
      cwd: dir,
      args: ["--approval-mode", "yolo", "--model", MODEL],
      env: { ANTHROPIC_API_KEY: KEY, PI_CODING_AGENT_DIR: agentDir },
    });
    const completed = () => auditText(dir).includes("**Event**: WORKFLOW_COMPLETED");
    let sessionFile = "";
    let truncated = false;
    await rpc.start();
    try {
      const remaining = () => Math.max(60_000, CASE_CAP_MS - (Date.now() - started));
      await rpc.prompt(prompt, { timeoutMs: remaining() });
      for (let turn = 1; !completed(); turn++) {
        if (turn >= MAX_PROMPTS || Date.now() - started > CASE_CAP_MS) {
          truncated = true;
          break;
        }
        await rpc.prompt(CONTINUE, { timeoutMs: remaining() });
      }
      sessionFile = String(((await rpc.command({ type: "get_state" })).data as { sessionFile?: string }).sessionFile ?? "");
    } finally {
      await rpc.close();
    }
    if (!sessionFile || !existsSync(sessionFile)) {
      return { error: { prompt_id: item.id, rep, class: "harness", message: "the session left no transcript" } };
    }
    const verdict = grade(item, dir);
    const { usage, cost, model } = usageOf(sessionFile);
    const row = {
      prompt_id: item.id,
      rep,
      prompt,
      tags: item.tags,
      grade: { pass: verdict.pass ? 1 : 0, sensor_failures: (auditText(dir).match(/\*\*Event\*\*: SENSOR_FAILED/g) ?? []).length },
      explanation: verdict.explanation,
      status: truncated ? "truncated" : "ok",
      model,
      usage,
      cost_usd: cost,
      latency_s: Math.round((Date.now() - started) / 1000),
    };
    return { row, trace: traceOf(sessionFile) };
  } catch (failure) {
    return { error: { prompt_id: item.id, rep, class: "harness", message: String((failure as Error).message ?? failure).slice(0, 2000) } };
  } finally {
    if (!keep) {
      rmSync(dir, { recursive: true, force: true });
      rmSync(agentDir, { recursive: true, force: true });
    } else {
      console.error(`kept ${item.id}#${rep}: ${dir} ${agentDir}`);
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!KEY) throw new Error("set AIDLC_HARNESS_ANTHROPIC_KEY or ANTHROPIC_API_KEY");
  const state = flowState(args.flowDir);
  const reps = args.reps ?? state.reps;
  const out = join(args.flowDir, args.variant);
  mkdirSync(join(out, "traces"), { recursive: true });
  const results = join(out, "results.jsonl");
  const errors = join(out, "errors.jsonl");
  const done = new Set(readJsonl(results).map((row) => `${row.prompt_id}#${row.rep}`));
  const slots = loadCases(args.only)
    .flatMap((item) => Array.from({ length: reps }, (_, rep) => ({ item, rep })))
    .filter(({ item, rep }) => !done.has(`${item.id}#${rep}`));
  console.log(`${args.variant}: ${slots.length} slots to run (${done.size} already scored), concurrency ${args.concurrency}`);
  if (slots.length === 0) return;
  const dist = freezeDistribution();
  try {
    let next = 0;
    const worker = async () => {
      while (next < slots.length) {
        const { item, rep } = slots[next++];
        const outcome = await runSlot(item, rep, dist, args.keep);
        if (outcome.row) {
          appendFileSync(results, `${JSON.stringify(outcome.row)}\n`);
          // Held-out isolation: transcripts only for train cases.
          if (outcome.trace && state.train.has(item.id)) {
            writeFileSync(join(out, "traces", `${item.id}_rep${rep}.json`), JSON.stringify(outcome.trace));
          }
          const grade = outcome.row.grade as { pass: number };
          console.log(`${item.id}#${rep} ${grade.pass ? "pass" : "fail"} ${outcome.row.status} ${outcome.row.latency_s}s`);
        } else if (outcome.error) {
          appendFileSync(errors, `${JSON.stringify(outcome.error)}\n`);
          console.log(`${item.id}#${rep} error ${outcome.error.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, args.concurrency) }, worker));
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
}

if (import.meta.main) await main();
