/**
 * Shared renderer for a horizontal row of selectable "segments" (model kinds,
 * role tabs, plan-mode tiers): plain muted labels with the active one drawn as
 * the accent chip, matching the overlay tab bars.
 *
 * Used by the plan-mode model-tier slider ({@link HookSelectorComponent}) and
 * the ctrl+p role-cycle status so both surfaces read identically.
 */
import { accentChip } from "./shared";
import { type ThemeColor, theme } from "../theme/index";
import type { NativeNode } from "../native/node";
import { node, row } from "../native/describe";
export interface TrackSegment {
	label: string;
}

/** Vivid theme colors for position-based segment coloring, in preference
 *  order. Themes alias many of these to the same value (titanium maps most of
 *  the syntax set onto its accent), so {@link resolveSegmentPalette} dedupes
 *  by resolved escape and hands position i the i-th distinct color. */
const SEGMENT_COLOR_CANDIDATES: ThemeColor[] = [
	"accent",
	"success",
	"warning",
	"error",
	"mdCode",
	"mdLink",
	"syntaxString",
	"syntaxKeyword",
	"syntaxFunction",
	"syntaxNumber",
	"syntaxOperator",
	"syntaxVariable",
];

/**
 * Resolve up to `count` theme colors that render distinctly under the active
 * theme, in candidate preference order. May return fewer than `count` when the
 * theme has fewer distinct hues (e.g. monochrome themes) — callers wrap with
 * modulo. Never returns an empty array: `accent` always resolves.
 */
export function resolveSegmentPalette(count: number): ThemeColor[] {
	const palette: ThemeColor[] = [];
	const seen = new Set<string>();
	for (const color of SEGMENT_COLOR_CANDIDATES) {
		const ansi = theme.getFgAnsi(color);
		if (seen.has(ansi)) continue;
		seen.add(ansi);
		palette.push(color);
		if (palette.length >= count) break;
	}
	return palette;
}

/**
 * Native {@link renderSegmentTrack}: a row of position-colored labels, the
 * active one roled `harness.track.active` so the terminal fills it as a chip in
 * its own color. No caps or separators travel; the terminal draws them.
 */
export function describeSegmentTrack(segments: readonly TrackSegment[], activeIndex: number): NativeNode {
	const palette = resolveSegmentPalette(segments.length);
	return row(
		segments.map((segment, index) =>
			node(
				"text",
				{
					spans: [{ t: segment.label, s: palette[index % palette.length] }],
					wrap: "none",
					role: index === activeIndex ? "harness.track.active" : "harness.track.item",
				},
				undefined,
				`${index}`,
			),
		),
		{ gap: "sm", align: "center", role: "harness.track" },
	);
}

/**
 * Render `segments` as a chip track with `activeIndex` filled. Returns a single
 * line of styled text with no surrounding caption or arrows — callers frame it
 * as they need.
 */
export function renderSegmentTrack(segments: TrackSegment[], activeIndex: number): string {
	return segments
		.map((segment, i) =>
			i === activeIndex ? accentChip(` ${segment.label} `) : theme.fg("muted", ` ${segment.label} `),
		)
		.join(" ");
}
