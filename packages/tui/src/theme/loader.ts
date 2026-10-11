import * as fs from "node:fs";
import * as path from "node:path";
import { adjustHsv } from "@coding-harness/utils/color";
import { getCustomThemesDir } from "@coding-harness/utils/dirs";
import { isEnoent } from "@coding-harness/utils/fs-error";
import { detectColorMode, resolveThemeColors } from "./color";
import darkThemeJson from "./dark.json" with { type: "json" };
import { defaultThemes } from "./defaults";
import lightThemeJson from "./light.json" with { type: "json" };
import type { ColorMode, ThemeBg, ThemeColor, ThemeJson } from "./schema";
import { normalizeSpinnerFramesOverride, type SymbolPreset } from "./symbols";
import { Theme } from "./theme-class";

// ============================================================================
// Theme Loading
// ============================================================================

const BUILTIN_THEMES: Record<string, ThemeJson> = {
	dark: darkThemeJson as ThemeJson,
	light: lightThemeJson as ThemeJson,
	...(defaultThemes as Record<string, ThemeJson>),
};

export function getBuiltinThemes(): Record<string, ThemeJson> {
	return BUILTIN_THEMES;
}

let extensionThemeDirs: readonly string[] = [];

/**
 * Register theme directories contributed by extensions (`resources_discover`
 * `themePaths`). They are searched after the user's custom themes directory,
 * so a user theme with the same name wins.
 */
export function setExtensionThemeDirs(dirs: readonly string[]): void {
	extensionThemeDirs = [...new Set(dirs)];
}

function themeSearchDirs(): string[] {
	return [getCustomThemesDir(), ...extensionThemeDirs];
}

function readThemeFileNames(dir: string): string[] {
	try {
		return fs.readdirSync(dir).filter(file => file.endsWith(".json"));
	} catch {
		// Directory doesn't exist or isn't readable
		return [];
	}
}

export async function getAvailableThemes(): Promise<string[]> {
	const themes = new Set<string>(Object.keys(getBuiltinThemes()));
	for (const dir of themeSearchDirs()) {
		for (const file of readThemeFileNames(dir)) themes.add(file.slice(0, -5));
	}
	return Array.from(themes).sort();
}

export interface ThemeInfo {
	name: string;
	path: string | undefined;
}

export async function getAvailableThemesWithPaths(): Promise<ThemeInfo[]> {
	const result: ThemeInfo[] = [];

	// Built-in themes (embedded, no file path)
	for (const name of Object.keys(getBuiltinThemes())) {
		result.push({ name, path: undefined });
	}

	// Custom themes, then extension-contributed themes; the first definition of a name wins.
	for (const dir of themeSearchDirs()) {
		for (const file of readThemeFileNames(dir)) {
			const name = file.slice(0, -5);
			if (!result.some(themeInfo => themeInfo.name === name)) {
				result.push({ name, path: path.join(dir, file) });
			}
		}
	}

	return result.sort((a, b) => a.name.localeCompare(b.name));
}

function findThemeFile(name: string): string | undefined {
	for (const dir of themeSearchDirs()) {
		const candidate = path.join(dir, `${name}.json`);
		if (fs.existsSync(candidate)) return candidate;
	}
	return undefined;
}

function parseThemeJson(name: string, content: string): ThemeJson {
	let json: unknown;
	try {
		json = JSON.parse(content);
	} catch (error) {
		throw new Error(`Failed to parse theme ${name}: ${error}`);
	}
	let parsed: ThemeJson;
	try {
		// Custom-theme-only boundary: built-in first-frame themes do not need to
		// load or construct the harnesstype validation graph.
		const { validateThemeJson } = require("./schema-validation");
		parsed = validateThemeJson(json);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		// Extract color key information if available
		const missingColorMatch = errorMessage.match(/missing keys: (.+)/i);
		const missingColors: string[] = missingColorMatch ? missingColorMatch[1].split(",").map(s => s.trim()) : [];

		let fullErrorMessage = `Invalid theme "${name}":\n`;
		if (missingColors.length > 0) {
			fullErrorMessage += `\nMissing required color tokens:\n`;
			fullErrorMessage += missingColors.map(c => `  - ${c}`).join("\n");
			fullErrorMessage += `\n\nPlease add these colors to your theme's "colors" object.`;
			fullErrorMessage += `\nSee the built-in themes (dark.json, light.json) for reference values.`;
		}
		fullErrorMessage += `\n\nValidation error:\n  - ${errorMessage}`;

		throw new Error(fullErrorMessage);
	}
	return parsed;
}

export async function loadThemeJson(name: string): Promise<ThemeJson> {
	const builtinThemes = getBuiltinThemes();
	if (name in builtinThemes) {
		return builtinThemes[name];
	}
	const themePath = findThemeFile(name);
	if (!themePath) throw new Error(`Theme not found: ${name}`);
	try {
		return parseThemeJson(name, await Bun.file(themePath).text());
	} catch (error) {
		if (isEnoent(error)) throw new Error(`Theme not found: ${name}`);
		throw error;
	}
}

/** Load a theme definition synchronously for the first terminal frame. */
export function loadThemeJsonSync(name: string): ThemeJson {
	const builtinThemes = getBuiltinThemes();
	if (name in builtinThemes) {
		return builtinThemes[name];
	}
	const themePath = findThemeFile(name);
	if (!themePath) throw new Error(`Theme not found: ${name}`);
	try {
		return parseThemeJson(name, fs.readFileSync(themePath, "utf8"));
	} catch (error) {
		if (isEnoent(error)) throw new Error(`Theme not found: ${name}`);
		throw error;
	}
}

export interface CreateThemeOptions {
	mode?: ColorMode;
	symbolPresetOverride?: SymbolPreset;
	colorBlindMode?: boolean;
}

/** HSV adjustment to shift green toward blue for colorblind mode (red-green colorblindness) */
const COLORBLIND_ADJUSTMENT = { h: 60, s: 0.71 };

export function createTheme(themeJson: ThemeJson, options: CreateThemeOptions = {}): Theme {
	const { mode, symbolPresetOverride, colorBlindMode } = options;
	const colorMode = mode ?? detectColorMode();
	const resolvedColors = resolveThemeColors(themeJson.colors, themeJson.vars);

	if (colorBlindMode) {
		const added = resolvedColors.toolDiffAdded;
		if (typeof added === "string" && added.startsWith("#")) {
			resolvedColors.toolDiffAdded = adjustHsv(added, COLORBLIND_ADJUSTMENT);
		}
	}

	const fgColors: Record<ThemeColor, string | number> = {} as Record<ThemeColor, string | number>;
	const bgColors: Record<ThemeBg, string | number> = {} as Record<ThemeBg, string | number>;
	const bgColorKeys: Set<string> = new Set([
		"selectedBg",
		"userMessageBg",
		"customMessageBg",
		"toolPendingBg",
		"toolSuccessBg",
		"toolErrorBg",
		"statusLineBg",
	]);
	for (const [key, value] of Object.entries(resolvedColors)) {
		if (bgColorKeys.has(key)) {
			bgColors[key as ThemeBg] = value;
		} else {
			fgColors[key as ThemeColor] = value;
		}
	}
	// Extract symbol configuration - settings override takes precedence over theme
	const symbolPreset: SymbolPreset = symbolPresetOverride ?? themeJson.symbols?.preset ?? "unicode";
	const symbolOverrides = themeJson.symbols?.overrides ?? {};
	const spinnerFramesOverrides = normalizeSpinnerFramesOverride(themeJson.symbols?.spinnerFrames);
	return new Theme(fgColors, bgColors, colorMode, symbolPreset, symbolOverrides, spinnerFramesOverrides);
}

export async function loadTheme(name: string, options: CreateThemeOptions = {}): Promise<Theme> {
	const themeJson = await loadThemeJson(name);
	return createTheme(themeJson, options);
}

/** Load and construct a theme synchronously for latency-sensitive first paint. */
export function loadThemeSync(name: string, options: CreateThemeOptions = {}): Theme {
	return createTheme(loadThemeJsonSync(name), options);
}
export async function getThemeByName(name: string): Promise<Theme | undefined> {
	try {
		return await loadTheme(name);
	} catch {
		return undefined;
	}
}
