// grade.ts — the AI-DLC method eval's grader.
//
// A case passes when its hidden tests pass on the project the workflow left
// behind. Hidden tests live in cases/<id>/hidden/ and are copied into the
// project only after the run, so the model under test never sees them.
//
//   bun ratchet/aidlc-method/grade.ts --preflight [--case <id>]
//
// checks the grader itself: every oracle (cases/<id>/oracle/ laid over the
// project) must pass and every untouched project (the null answer) must fail.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const KIT = import.meta.dir;
export const CASES_DIR = join(KIT, "cases");
const HIDDEN_TIMEOUT_MS = 120_000;

export type Case = {
  id: string;
  /** tags[0] is the split stratum: bugfix or feature; tags[1] the language. */
  tags: string[];
  scope: string;
  request: string;
  /** argv run from the project root once the hidden tree is copied in. */
  hidden: string[];
};

export function loadCases(only?: string[]): Case[] {
  const ids = readdirSync(CASES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const cases = ids.map((id) => {
    const parsed = JSON.parse(readFileSync(join(CASES_DIR, id, "case.json"), "utf-8")) as Case;
    if (parsed.id !== id) throw new Error(`cases/${id}/case.json names id ${parsed.id}`);
    return parsed;
  });
  if (!only || only.length === 0) return cases;
  const missing = only.filter((id) => !ids.includes(id));
  if (missing.length > 0) throw new Error(`unknown case ids: ${missing.join(", ")}`);
  return cases.filter((item) => only.includes(item.id));
}

/** Copy a case's visible project into `dest`, with the oracle laid over it when asked. */
export function materialize(item: Case, dest: string, options: { oracle?: boolean } = {}): void {
  cpSync(join(CASES_DIR, item.id, "project"), dest, { recursive: true });
  if (options.oracle) cpSync(join(CASES_DIR, item.id, "oracle"), dest, { recursive: true });
}

export type Grade = { pass: boolean; explanation: string };

/** Copy the hidden tests into `projectDir` and run them; the exit status decides. */
export function grade(item: Case, projectDir: string): Grade {
  cpSync(join(CASES_DIR, item.id, "hidden"), projectDir, { recursive: true });
  const [bin, ...args] = item.hidden;
  const result = spawnSync(bin, args, { cwd: projectDir, encoding: "utf-8", timeout: HIDDEN_TIMEOUT_MS });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().split("\n").slice(-12).join("\n");
  if (result.error) return { pass: false, explanation: `hidden tests could not run: ${result.error.message}` };
  return { pass: result.status === 0, explanation: output };
}

function preflight(only?: string[]): number {
  let bad = 0;
  for (const item of loadCases(only)) {
    const verdicts: string[] = [];
    for (const oracle of [true, false]) {
      const dir = mkdtempSync(join(tmpdir(), `aidlc-grade-${item.id}-`));
      try {
        materialize(item, dir, { oracle });
        const { pass, explanation } = grade(item, dir);
        const expected = oracle;
        if (pass !== expected) {
          bad++;
          verdicts.push(`${oracle ? "oracle" : "null"} ${pass ? "PASSED" : "FAILED"} (expected ${expected ? "pass" : "fail"})\n${explanation}`);
        } else {
          verdicts.push(`${oracle ? "oracle" : "null"} ok`);
        }
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
    console.log(`${item.id.padEnd(24)} ${verdicts.join("; ")}`);
  }
  console.log(bad === 0 ? "preflight: every oracle passes and every null fails" : `preflight: ${bad} unexpected verdicts`);
  return bad === 0 ? 0 : 1;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  if (!argv.includes("--preflight")) {
    console.error("usage: bun ratchet/aidlc-method/grade.ts --preflight [--case <id>]...");
    process.exit(2);
  }
  const only = argv.flatMap((arg, index) => (argv[index - 1] === "--case" ? [arg] : []));
  if (!existsSync(CASES_DIR)) throw new Error(`no cases at ${CASES_DIR}`);
  process.exit(preflight(only));
}
