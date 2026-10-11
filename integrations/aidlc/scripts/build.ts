#!/usr/bin/env bun
// Build the fork into installable release assets with upstream's own pipeline:
// package → determinism check → native binary → release assets in out/release.
//
// Usage:
//   bun scripts/build.ts [--skip-binaries] [--bun <path>] [--output <dir>]
//
// --bun selects the Bun used to compile the binary. Default: Bun 1.4.2 (the
// toolchain of the official 2.10.0 build) through bunx, falling back to the
// running Bun with a warning when 1.4.2 cannot be fetched.
//
// Official releases carry a GitHub build-provenance bundle signed by the upstream
// release workflow. A local build cannot be attested, so the bundle slot holds an
// explicit unsigned-local-build marker and scripts/install.ts installs with
// attestation verification off; the release's SHA-256 checksums still gate every asset.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = join(import.meta.dir, "..");
const UPSTREAM = join(ROOT, "upstream");
const RELEASE_BUN = "1.4.2";

function flag(name: string): string | undefined {
	const index = process.argv.indexOf(name);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(command: string, args: string[], label: string): string {
	console.log(`build: ${label}`);
	const result = spawnSync(command, args, { cwd: UPSTREAM, encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] });
	if (result.status !== 0) {
		process.stderr.write(result.stdout.slice(-4000));
		process.stderr.write(result.stderr.slice(-4000));
		throw new Error(`${label} failed (exit ${result.status})`);
	}
	return result.stdout;
}

function releaseBun(): string {
	const explicit = flag("--bun");
	if (explicit) return resolve(explicit);
	const probe = spawnSync("bunx", [`bun@${RELEASE_BUN}`, "-e", "console.log(process.execPath)"], {
		encoding: "utf-8",
	});
	const path = probe.stdout.trim().split("\n").at(-1) ?? "";
	if (probe.status === 0 && existsSync(path)) return path;
	console.warn(`build: Bun ${RELEASE_BUN} unavailable; compiling with ${Bun.version}`);
	return process.execPath;
}

if (!existsSync(join(UPSTREAM, "package.json"))) {
	console.error("build: upstream/ is missing; run scripts/bootstrap.sh first");
	process.exit(1);
}

const output = resolve(flag("--output") ?? join(ROOT, "out", "release"));
try {
	run("bun", ["install", "--frozen-lockfile"], "install dependencies");
	run("bun", ["scripts/package.ts"], "package distributions");
	run("bun", ["scripts/package.ts", "--check"], "determinism check");
	if (!process.argv.includes("--skip-binaries")) {
		const bun = releaseBun();
		const version = spawnSync(bun, ["--version"], { encoding: "utf-8" }).stdout.trim();
		run(bun, ["scripts/build-binaries.ts", "--target", "native"], `native binary (Bun ${version})`);
	}
	run("bun", ["scripts/package-release.ts", "--output", output, "--binaries", "build/binaries"], "release assets");
} catch (error) {
	console.error(`build: ${error instanceof Error ? error.message : String(error)}`);
	process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(output, "version.json"), "utf-8")) as {
	version: string;
	sourceDigest: string;
	distributions: Array<{ name: string }>;
	assets: Array<{ name: string; sha256: string; kind: string }>;
};
const bundle = join(output, "aidlc-release.intoto.jsonl");
if (!existsSync(bundle)) {
	writeFileSync(
		bundle,
		`${JSON.stringify({ localBuild: true, attested: false, version: manifest.version, sourceDigest: manifest.sourceDigest })}\n`,
	);
}
console.log(`build: version ${manifest.version} from ${manifest.sourceDigest.slice(0, 12)}`);
console.log(`build: distributions ${manifest.distributions.map(d => d.name).join(", ")}`);
for (const asset of manifest.assets) console.log(`build: ${asset.kind.padEnd(9)} ${asset.name} ${asset.sha256.slice(0, 16)}`);
