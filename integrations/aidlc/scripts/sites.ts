#!/usr/bin/env bun
// Inventory of distribution-name branch sites in the upstream AI-DLC source.
//
// Every line under core/ and scripts/ that names an existing distribution as a
// string literal is a candidate site where the `harness` distribution may need
// its own arm. The report groups sites by file so each patch can account for
// them. `--gate <classification.json>` fails when any site lacks a decision.
//
// Usage:
//   bun scripts/sites.ts [--root upstream] [--out inventory/sites.md]
//   bun scripts/sites.ts --gate inventory/site-decisions.json

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const DISTRIBUTIONS = ["claude", "codex", "copilot", "cursor", "kiro", "kiro-ide", "opencode"];
const SITE = new RegExp(`["'\`](${DISTRIBUTIONS.join("|")})["'\`]`);
const SCAN_DIRS = ["core/tools", "core/hooks", "scripts"];

type Site = { file: string; line: number; text: string };

function argValue(flag: string): string | undefined {
	const index = process.argv.indexOf(flag);
	return index >= 0 ? process.argv[index + 1] : undefined;
}

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir).flatMap(name => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return walk(path);
		return path.endsWith(".ts") ? [path] : [];
	});
}

function collect(root: string): Site[] {
	const sites: Site[] = [];
	for (const scan of SCAN_DIRS) {
		for (const path of walk(join(root, scan)).sort()) {
			const lines = readFileSync(path, "utf-8").split("\n");
			lines.forEach((text, index) => {
				if (SITE.test(text)) sites.push({ file: relative(root, path), line: index + 1, text: text.trim() });
			});
		}
	}
	return sites;
}

const root = argValue("--root") ?? "upstream";
const sites = collect(root);
const gate = argValue("--gate");

if (gate) {
	const decisions = JSON.parse(readFileSync(gate, "utf-8")) as Record<string, string>;
	const undecided = [...new Set(sites.map(site => site.file))].filter(file => !decisions[file]);
	if (undecided.length > 0) {
		console.error(`unclassified site files:\n${undecided.join("\n")}`);
		process.exit(1);
	}
	console.log(`all ${sites.length} sites in ${Object.keys(decisions).length} files are classified`);
	process.exit(0);
}

const byFile = new Map<string, Site[]>();
for (const site of sites) byFile.set(site.file, [...(byFile.get(site.file) ?? []), site]);
const body = [
	"# Distribution-name sites (generated)",
	"",
	`Source: \`${root}\`. ${sites.length} lines in ${byFile.size} files. Regenerate with \`bun scripts/sites.ts\`.`,
	"",
	"| File | Sites |",
	"|---|---|",
	...[...byFile].map(([file, list]) => `| \`${file}\` | ${list.length} |`),
	"",
	...[...byFile].flatMap(([file, list]) => [
		`## ${file}`,
		"",
		...list.map(site => `- L${site.line}: \`${site.text.replaceAll("`", "'").slice(0, 160)}\``),
		"",
	]),
].join("\n");
const out = argValue("--out") ?? "inventory/sites.md";
writeFileSync(out, body);
console.log(`${sites.length} sites in ${byFile.size} files -> ${out}`);
