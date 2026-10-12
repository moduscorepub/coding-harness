/**
 * Loads the resources extensions contribute through `resources_discover`.
 *
 * The session emits the event once its extensions are loaded (and again on
 * session rebuilds), then merges the result into its own discovery: skills and
 * prompt templates join the session lists, rule files join the rulebook and
 * TTSR buckets, agent directories join task discovery, watchdog files join
 * advisor discovery, and theme directories join theme lookup.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { logger } from "@coding-harness/utils";
import { isForeignUserProvider } from "../../capability";
import type { Rule } from "../../capability/rule";
import { loadTemplatesFromDir, type PromptTemplate } from "../../config/prompt-templates";
import { loadRulesFromDir } from "../../discovery/builtin";
import { loadSkillsFromDir, type Skill, type SkillWarning } from "../skills";
import type { ExtensionRunner } from "./runner";
import type { ExtensionResourcePaths, ResourcesDiscoverEvent } from "./types";

/** Source tag for skills loaded from extension-contributed directories. */
export const EXTENSION_SKILL_SOURCE = "extension:project";

export interface ExtensionResources {
	skills: Skill[];
	skillWarnings: SkillWarning[];
	promptTemplates: PromptTemplate[];
	rules: Rule[];
	agentDirs: string[];
	themeDirs: string[];
	watchdogFiles: string[];
}

export function emptyExtensionResources(): ExtensionResources {
	return {
		skills: [],
		skillWarnings: [],
		promptTemplates: [],
		rules: [],
		agentDirs: [],
		themeDirs: [],
		watchdogFiles: [],
	};
}

/** Resolve contributed paths against `cwd`, keep the existing ones of the wanted kind, and drop duplicates. */
function existingPaths(
	entries: ExtensionResourcePaths[keyof ExtensionResourcePaths],
	cwd: string,
	kind: "directory" | "file",
): string[] {
	const resolved: string[] = [];
	for (const { path: contributed, extensionPath } of entries) {
		const absolute = path.resolve(cwd, contributed);
		let stat: fs.Stats | undefined;
		try {
			stat = fs.statSync(absolute);
		} catch {
			stat = undefined;
		}
		const matches = kind === "directory" ? stat?.isDirectory() : stat?.isFile();
		if (!matches) {
			logger.debug("Skipping missing extension resource path", { path: absolute, kind, extensionPath });
			continue;
		}
		if (!resolved.includes(absolute)) resolved.push(absolute);
	}
	return resolved;
}

/**
 * Emit `resources_discover` and load what the handlers point at. Returns empty
 * resources when no extension handles the event.
 */
export async function discoverExtensionResources(
	runner: ExtensionRunner,
	cwd: string,
	reason: ResourcesDiscoverEvent["reason"],
): Promise<ExtensionResources> {
	const resources = emptyExtensionResources();
	if (!runner.hasHandlers("resources_discover")) return resources;

	const paths = await runner.emitResourcesDiscover(cwd, reason);

	for (const dir of existingPaths(paths.skillPaths, cwd, "directory")) {
		const loaded = await loadSkillsFromDir({ dir, source: EXTENSION_SKILL_SOURCE });
		resources.skills.push(...loaded.skills);
		resources.skillWarnings.push(...loaded.warnings);
	}
	for (const dir of existingPaths(paths.promptPaths, cwd, "directory")) {
		resources.promptTemplates.push(...(await loadTemplatesFromDir(dir, "project")));
	}
	for (const dir of existingPaths(paths.rulePaths, cwd, "directory")) {
		const loaded = await loadRulesFromDir(dir, cwd);
		resources.rules.push(...loaded.items);
		for (const warning of loaded.warnings ?? []) logger.warn("Extension rule warning", { dir, warning });
	}
	resources.agentDirs = existingPaths(paths.agentPaths, cwd, "directory");
	resources.themeDirs = existingPaths(paths.themePaths, cwd, "directory");
	resources.watchdogFiles = existingPaths(paths.watchdogPaths, cwd, "file");
	return resources;
}

/** Append `extra` items whose name `base` does not already define; `base` wins on conflicts. */
export function mergeByName<T extends { name: string }>(base: readonly T[], extra: readonly T[]): T[] {
	const names = new Set(base.map(item => item.name));
	const merged = [...base];
	for (const item of extra) {
		if (names.has(item.name)) continue;
		names.add(item.name);
		merged.push(item);
	}
	return merged;
}

/**
 * Merge extension-contributed skills into the discovered skills. The harness's
 * own skill sources win a name conflict, but a skill read from another tool's
 * config directory (`.claude/skills`, `.codex/skills`, …) yields to the
 * extension: a project that carries one workflow for several tools runs the
 * copy installed for this harness.
 */
export function mergeExtensionSkills(base: readonly Skill[], extra: readonly Skill[]): Skill[] {
	const contributed = new Map<string, Skill>();
	for (const skill of extra) if (!contributed.has(skill.name)) contributed.set(skill.name, skill);
	const merged = base.map(skill => {
		const replacement = contributed.get(skill.name);
		if (!replacement) return skill;
		contributed.delete(skill.name);
		return isForeignUserProvider(skill.source.split(":")[0]) ? replacement : skill;
	});
	return [...merged, ...contributed.values()];
}
