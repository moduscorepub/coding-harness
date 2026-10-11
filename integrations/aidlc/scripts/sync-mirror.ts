#!/usr/bin/env bun
// Mirror this repo's tracked files into the coding harness monorepo at
// integrations/aidlc/ so the fork can be read and grafted from there.
//
// Usage:
//   bun scripts/sync-mirror.ts [--target <coding-harness root>] [--check]
//
// --check exits 1 and lists drift instead of writing.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const targetFlag = process.argv.indexOf("--target");
const harnessRoot = targetFlag >= 0 ? process.argv[targetFlag + 1] : join(ROOT, "..", "coding-harness");
const MIRROR = join(harnessRoot, "integrations", "aidlc");
const CHECK = process.argv.includes("--check");

function trackedFiles(): string[] {
	const result = spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf-8" });
	if (result.status !== 0) throw new Error(`git ls-files failed: ${result.stderr}`);
	return result.stdout.split("\0").filter(Boolean).sort();
}

function mirrorFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap(name => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? mirrorFiles(path) : [relative(MIRROR, path)];
	});
}

if (!existsSync(join(harnessRoot, "package.json"))) {
	console.error(`sync-mirror: ${harnessRoot} is not the coding harness monorepo`);
	process.exit(1);
}

const files = trackedFiles();
const drift: string[] = [];
for (const file of files) {
	const source = readFileSync(join(ROOT, file));
	const destination = join(MIRROR, file);
	const current = existsSync(destination) ? readFileSync(destination) : undefined;
	if (current && Buffer.compare(current, source) === 0) continue;
	drift.push(current ? `changed ${file}` : `added ${file}`);
	if (!CHECK) {
		mkdirSync(dirname(destination), { recursive: true });
		writeFileSync(destination, source);
	}
}
const keep = new Set(files);
for (const file of mirrorFiles(MIRROR)) {
	if (keep.has(file)) continue;
	drift.push(`removed ${file}`);
	if (!CHECK) rmSync(join(MIRROR, file));
}

if (CHECK) {
	if (drift.length > 0) {
		console.error(`sync-mirror: ${drift.length} differences\n${drift.join("\n")}`);
		process.exit(1);
	}
	console.log(`sync-mirror: mirror matches ${files.length} tracked files`);
} else {
	console.log(`sync-mirror: ${drift.length} changes applied to ${relative(process.cwd(), MIRROR) || MIRROR}`);
}
