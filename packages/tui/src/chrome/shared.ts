import type { TabBarTheme } from "../components/tab-bar";
import { sanitizeDisplaySingleLine } from "../overlays/extensions/display-text";
import { theme } from "../theme/index";
// ═══════════════════════════════════════════════════════════════════════════
// Text Sanitization
// ═══════════════════════════════════════════════════════════════════════════

/** Compact single-line display text for statuses; unlike titles, collapse padding and trim. */
export function sanitizeStatusText(text: string): string {
	return sanitizeDisplaySingleLine(text).replace(/ +/g, " ").trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Bar Theme
// ═══════════════════════════════════════════════════════════════════════════

/** Accent chip: bold bar-colored text on an accent fill, for the active tab or track segment. */
export function accentChip(text: string): string {
	const fill = theme.getFgAnsi("accent").replace("\x1b[38;", "\x1b[48;");
	const ink = theme.getBgAnsi("statusLineBg").replace("\x1b[48;", "\x1b[38;");
	return `${fill}${ink}\x1b[1m${text}\x1b[0m`;
}

/** Shared tab bar theme used by fullscreen overlays (settings, agent hub): the active tab is an accent chip. */
export function getTabBarTheme(): TabBarTheme {
	return {
		label: (text: string) => theme.bold(theme.fg("accent", text)),
		activeTab: accentChip,
		inactiveTab: (text: string) => theme.fg("muted", text),
		mutedTab: (text: string) => theme.fg("dim", text),
		hoverTab: (text: string) => theme.bg("selectedBg", theme.fg("text", text)),
		hint: (text: string) => theme.fg("dim", text),
	};
}
