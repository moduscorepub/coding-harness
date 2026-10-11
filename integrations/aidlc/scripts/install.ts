#!/usr/bin/env bun
// Install the built release (out/release) into a sandbox or as the real active
// aidlc, and roll back to the previously active version.
//
// Usage:
//   bun scripts/install.ts --sandbox <dir>   install root <dir>/root, launcher in <dir>/bin
//   bun scripts/install.ts --real            default install root and bin dir
//   bun scripts/install.ts --rollback        make the recorded previous version active again
//   --from <dir>                             release assets to install (default out/release)
//
// Every install sets the machine `update-check` to false: the fork's version can
// sort below upstream releases, and an update would replace it.
//
// Local builds carry no upstream-signed provenance (see scripts/build.ts), so the
// installer runs with AIDLC_GH_BIN pointing at a binary without `gh attestation`
// support: attestation is skipped and the SHA-256 checksums verify every asset.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = join(import.meta.dir, "..");
const STATE = join(ROOT, "out", "install-state.json");

type InstallState = { previousVersion: string | null; installedVersion: string; binDir: string; installRoot: string };

function flag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

const RELEASE = resolve(flag("--from") ?? join(ROOT, "out", "release"));

function run(command: string, args: string[], env: Record<string, string>, label: string): string {
	const result = spawnSync(command, args, { env: { ...process.env, ...env }, encoding: "utf-8" });
	if (result.status !== 0) {
		throw new Error(`${label} failed (exit ${result.status}): ${(result.stderr || result.stdout).trim().slice(-2000)}`);
	}
	return result.stdout.trim();
}

function activeVersion(aidlc: string, env: Record<string, string>): string | null {
	if (!existsSync(aidlc)) return null;
	const result = spawnSync(aidlc, ["--version"], { env: { ...process.env, ...env }, encoding: "utf-8" });
	return /aidlc (\S+)/.exec(result.stdout)?.[1] ?? null;
}

function install(installRoot: string, binDir: string, sandbox: boolean): void {
	if (!existsSync(join(RELEASE, "version.json"))) throw new Error(`${RELEASE} has no version.json; run bun scripts/build.ts`);
	const version = (JSON.parse(readFileSync(join(RELEASE, "version.json"), "utf-8")) as { version: string }).version;
	const env = { AIDLC_INSTALL_ROOT: installRoot, AIDLC_BIN_DIR: binDir, AIDLC_GH_BIN: "/usr/bin/false" };
	const aidlc = join(binDir, "aidlc");
	const previousVersion = activeVersion(aidlc, env);
	mkdirSync(binDir, { recursive: true });
	run("sh", [join(RELEASE, "install.sh"), "--from", RELEASE, "--quiet"], env, "install.sh");
	run(aidlc, ["system", "config", "global", "set", "update-check", "false"], env, "disable update check");
	const reported = activeVersion(aidlc, env);
	if (reported !== version) throw new Error(`installed launcher reports ${reported}, expected ${version}`);
	if (!sandbox) {
		const state: InstallState = { previousVersion, installedVersion: version, binDir, installRoot };
		mkdirSync(join(ROOT, "out"), { recursive: true });
		writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`);
	}
	console.log(`install: aidlc ${version} active in ${installRoot} (previous: ${previousVersion ?? "none"})`);
}

function rollback(): void {
	if (!existsSync(STATE)) throw new Error("no recorded real install to roll back");
	const state = JSON.parse(readFileSync(STATE, "utf-8")) as InstallState;
	if (!state.previousVersion) throw new Error("the recorded install had no previous version");
	const env = { AIDLC_INSTALL_ROOT: state.installRoot, AIDLC_BIN_DIR: state.binDir };
	const aidlc = join(state.binDir, "aidlc");
	run(aidlc, ["use", state.previousVersion], env, `aidlc use ${state.previousVersion}`);
	const reported = activeVersion(aidlc, env);
	if (reported !== state.previousVersion) throw new Error(`rollback left ${reported} active`);
	console.log(`install: rolled back to aidlc ${reported}`);
}

try {
	const sandbox = flag("--sandbox");
	if (sandbox) {
		const dir = resolve(sandbox);
		install(join(dir, "root"), join(dir, "bin"), true);
	} else if (process.argv.includes("--real")) {
		const installRoot = process.env.AIDLC_INSTALL_ROOT ?? join(process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"), "aidlc");
		install(installRoot, process.env.AIDLC_BIN_DIR ?? join(homedir(), ".local", "bin"), false);
	} else if (process.argv.includes("--rollback")) {
		rollback();
	} else {
		console.error("usage: bun scripts/install.ts --sandbox <dir> | --real | --rollback");
		process.exit(2);
	}
} catch (error) {
	console.error(`install: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
}
