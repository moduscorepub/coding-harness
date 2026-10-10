import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { logger } from "@coding-harness/utils";
import { APP_NAME, getConfigRootDir } from "@coding-harness/utils/dirs";
import { YAML } from "bun";
import type { TspSpan } from "@coding-harness/wire";
import { formatDoubleTap, formatKeyHint, formatKeyHints, type KeyName } from "../app-keybindings";
import { editorKey } from "../chrome/keybinding-hints";
import { getKeybindings, type Keybinding } from "../keybindings";
import { card, col, keyed, node, row, span, text } from "../native/describe";
import type { DescribeContext, NativeChild, NativeNode } from "../native/node";
import { compactText, plainText } from "../native/spans";
import { isNativeRendering } from "../native/state";
import { isHyperlinkEnabled, urlHyperlink, urlLinkSpan } from "../render/hyperlink";
import { TERMINAL } from "../terminal-capabilities";
import { theme } from "../theme/theme";
import type { Component } from "../tui";
import { padding, replaceTabs, truncateToWidth, visibleWidth, wrapTextWithAnsi } from "../utils";
import tipsText from "./tips.txt" with { type: "text" };

/** Leading marker for a tip that pitches Tern: shown only while no TSP surface
 *  is live, since a live one means the user is already in Tern. */
const NO_TERN_TIP_MARKER = /^\[NO-TERN\]\s*/;

/** tips.txt lines embedded at build time; blanks dropped. Key placeholders
 *  (see {@link expandTipKeys}) stay raw until render time. */
const TIP_LINES: readonly string[] = tipsText
	.split("\n")
	.map(line => line.trim())
	.filter(line => line.length > 0);

/** Tips for the classic renderer: every tip, {@link NO_TERN_TIP_MARKER} stripped. */
const TIPS: readonly string[] = TIP_LINES.map(line => line.replace(NO_TERN_TIP_MARKER, ""));

/** Tips for a live TSP surface: those marked {@link NO_TERN_TIP_MARKER} dropped. */
const TSP_TIPS: readonly string[] = TIP_LINES.filter(line => !NO_TERN_TIP_MARKER.test(line));

/** Trailing marker that flags a tip as a "what's new" callout. Stripped before
 *  wrapping (with any preceding whitespace) and replaced by {@link NEW_TAG_TEXT}
 *  painted as a shimmering rainbow. Non-global so `.test` stays stateless. */
const NEW_TIP_MARKER = /\s*\[NEW\]\s*$/;

/** Visible text rendered in place of {@link NEW_TIP_MARKER}. */
const NEW_TAG_TEXT = "NEW!";

/** Selection weight for "[NEW]" tips; ordinary tips weigh 1, so a freshly added
 *  affordance surfaces this many times as often. */
const NEW_TIP_WEIGHT = 4;

/** Pick a tip from `tips`, biased toward "[NEW]" tips by {@link NEW_TIP_WEIGHT};
 *  `r` is a uniform sample in [0, 1). Returns "" when `tips` is empty.
 *  Exported for tests. */
export function pickWeightedTip(tips: readonly string[], r: number): string {
	if (tips.length === 0) return "";
	const weights = tips.map(tip => (NEW_TIP_MARKER.test(tip) ? NEW_TIP_WEIGHT : 1));
	const total = weights.reduce((sum, weight) => sum + weight, 0);
	let acc = r * total;
	for (let i = 0; i < tips.length; i++) {
		acc -= weights[i] ?? 1;
		if (acc < 0) return tips[i] ?? "";
	}
	return tips[tips.length - 1] ?? "";
}

type ColorEncoding = "ansi-16m" | "ansi-256";

/** Paint each glyph of {@link NEW_TAG_TEXT} on a moving HSL rainbow. `phase`
 *  rotates the hue offset cyclically; successive renders with increasing phase
 *  shimmer, while a fixed phase yields a still rainbow. */
function renderNewTag(phase: number, encoding: ColorEncoding): string {
	const bold = "\x1b[1m";
	const reset = "\x1b[0m";
	const wrapped = ((phase % 1) + 1) % 1;
	const chars = [...NEW_TAG_TEXT];
	let out = bold;
	let prev = "";
	for (let i = 0; i < chars.length; i++) {
		const hue = Math.round(((i / chars.length + wrapped) % 1) * 360);
		const color = Bun.color(`hsl(${hue}, 95%, 60%)`, encoding) ?? "";
		if (color !== prev) {
			out += color;
			prev = color;
		}
		out += chars[i];
	}
	return out + reset;
}

/** Key placeholders in tips.txt: `{key:shift+tab}`, `{keys:up,down}`, `{tap:left}`, `{action:tui.editor.undo}`. */
const TIP_KEY_PLACEHOLDER = /\{(key|keys|tap|action):([^}]+)\}/g;

const MODIFIER_NAMES: Record<string, true | undefined> = {
	ctrl: true,
	shift: true,
	alt: true,
	super: true,
};

/** A `+`-joined chord whose leading parts are modifiers (`ctrl+o`, `shift`, `left`). */
function isKeyName(key: string): key is KeyName {
	const parts = key.split("+");
	return parts.every((part, i) => part.length > 0 && (i === parts.length - 1 || MODIFIER_NAMES[part] === true));
}

function isKeybinding(action: string): action is Keybinding {
	return action in getKeybindings().getResolvedBindings();
}

/** Expand tip key placeholders through the key formatter; malformed ones stay verbatim. */
function expandTipKeys(tip: string): string {
	return tip.replace(TIP_KEY_PLACEHOLDER, (placeholder, kind: string, value: string) => {
		if (kind === "action") return isKeybinding(value) ? editorKey(value) : placeholder;
		const keys = value.split(",");
		if (!keys.every(isKeyName)) return placeholder;
		if (kind === "keys") return formatKeyHints(keys);
		const [key] = keys;
		if (key === undefined) return placeholder;
		return kind === "tap" ? formatDoubleTap(key) : formatKeyHint(key);
	});
}

/** Markdown-style links in tips.txt: `[Tern](https://coding-harness.invalid/tern)` shows the label, linked to the URL. */
const TIP_LINK = /\[([^\]]+)\]\(([^\s)]+)\)/g;

/** Tip links as underlined OSC 8 labels, or `label (url)` where the terminal cannot link. */
function linkTipText(tip: string): string {
	const linkable = isHyperlinkEnabled();
	return tip.replace(TIP_LINK, (_link, label: string, url: string) =>
		linkable ? urlHyperlink(url, theme.underline(label)) : `${label} (${url})`,
	);
}

/** The tip as native text: escapes dropped, links as `href` spans. */
function tipSpans(tip: string): TspSpan[] {
	const spans: TspSpan[] = [];
	let cursor = 0;
	for (const match of tip.matchAll(TIP_LINK)) {
		const [link, label, url] = match;
		if (match.index > cursor) spans.push(span(plainText(tip.slice(cursor, match.index))));
		spans.push(urlLinkSpan(url, label));
		cursor = match.index + link.length;
	}
	if (cursor < tip.length) spans.push(span(plainText(tip.slice(cursor))));
	return spans;
}

/**
 * The welcome tip as lines of at most `width` columns: `Tip:` and the body
 * wrapped together, with no indent, so the banner can center each line.
 * `[]` when `width` leaves no room for a useful line.
 */
export function renderWelcomeTip(tip: string, width: number, phase = 0): string[] {
	const label = "Tip: ";
	if (width - visibleWidth(label) < 8) return [];

	const isNew = NEW_TIP_MARKER.test(tip);
	const body = linkTipText(expandTipKeys(isNew ? tip.replace(NEW_TIP_MARKER, "") : tip));

	// Trailing spaces left by the wrap would count toward the width the banner centers.
	const wrapped = wrapTextWithAnsi(replaceTabs(`${label}${body}`), width).map(line => line.trimEnd());
	if (wrapped.length === 0) return [];

	// Pull both colors from the active theme so the line stays readable on light
	// themes; the previous hardcoded `#b48cff` / `#9ccfff` pastels (plus a manual
	// `\x1b[2m` dim on the body) dropped to ~1.5:1 contrast on a white background.
	const styledLabel = theme.fg("customMessageLabel", label);
	const lines = wrapped.map((line, index) =>
		theme.italic(
			index === 0 && line.startsWith(label)
				? `${styledLabel}${theme.fg("muted", line.slice(label.length))}`
				: theme.fg("muted", line),
		),
	);

	if (isNew) {
		// Append the rainbow tag to the final line when it fits; otherwise give it
		// a line of its own so the styled glyphs never overflow the width.
		const encoding: ColorEncoding = TERMINAL.trueColor ? "ansi-16m" : "ansi-256";
		const tag = renderNewTag(phase, encoding);
		const tagWidth = 1 + visibleWidth(NEW_TAG_TEXT); // 1 = space separator
		const lastLine = lines[lines.length - 1];
		if (lastLine !== undefined && visibleWidth(lastLine) + tagWidth <= width) {
			lines[lines.length - 1] = `${lastLine} ${tag}`;
		} else {
			lines.push(tag);
		}
	}

	return lines;
}

/**
 * The session's welcome banner. In a terminal: the gradient logo beside the
 * `harness` wordmark with the version under it (the logo alone when the lockup does
 * not fit) and the tip of the session (dropped below {@link TIP_MIN_COLUMNS}
 * columns). Natively: a card with the same logo, wordmark, version and tip
 * ({@link WelcomeComponent.describe}).
 */
export class WelcomeComponent implements Component {
	#animStart: number | null = null;
	#animTimer: Timer | null = null;
	#requestRender: (() => void) | null = null;
	// Tip randomness is latched once so the tip is stable across renders, but
	// the nerdfont-nag gate re-reads the live preset and the pool re-reads the
	// live TSP state: the startup prepaint can run under the default "unicode"
	// preset before settings resolve the real one, and an optimistic Tern start
	// falls back to the classic renderer when `hello` never confirms.
	#nagRoll: number | undefined;
	#tipRoll: number | undefined;
	// Render cache: the welcome box is the first transcript-area component, so
	// returning a stable array reference keeps the whole frame prefix stable.
	// Bypassed while the intro animation runs (every frame differs).
	#cachedWidth = -1;
	#cachedLines: string[] | undefined;
	#native: { tip: string | undefined; node: NativeNode } | undefined;

	constructor(private version: string) {}
	get tip(): string | undefined {
		this.#nagRoll ??= Math.random();
		this.#tipRoll ??= Math.random();
		if (theme.getSymbolPreset() === "unicode" && this.#nagRoll < 0.1) {
			return "Please use nerdfont 😭.";
		}
		return pickWeightedTip(isNativeRendering() ? TSP_TIPS : TIPS, this.#tipRoll) || undefined;
	}

	invalidate(): void {
		this.#cachedWidth = -1;
		this.#cachedLines = undefined;
		this.#native = undefined;
	}

	/**
	 * A `card` (`harness.welcome`) mirroring the terminal banner: the lockup
	 * (`harness.welcome.lockup`: the terminal's builtin `harness` mark, which it animates,
	 * beside the wordmark with the version under it) and the tip of the session.
	 * Roles carry the look (gradient logo, type scale); a "[NEW]" tip
	 * carries a terminal-clocked shimmering tag.
	 */
	describe(_cx: DescribeContext): NativeNode {
		const tip = this.tip;
		if (this.#native && this.#native.tip === tip) return this.#native.node;
		// Brand lines are short and fixed; never wrap or truncate them.
		const art = (spans: readonly TspSpan[], role: string): NativeNode =>
			keyed(text(spans, { wrap: "none", role }), role);
		const lockupRow = keyed(
			row(
				[
					node(
						"image",
						{
							builtin: "harness",
							alt: APP_NAME,
							w: 128,
							role: "harness.welcome.logo",
						},
						undefined,
						"logo",
					),
					keyed(
						col(
							[
								art([span(APP_NAME, "strong")], "harness.welcome.wordmark"),
								art([span(`v${this.version}`, "dim mono")], "harness.welcome.version"),
							],
							{ role: "harness.welcome.mark" },
						),
						"mark",
					),
				],
				{ align: "center", gap: "md", role: "harness.welcome.lockup" },
			),
			"lockup",
		);
		const body: NativeChild[] = [lockupRow];
		if (tip) {
			const isNew = NEW_TIP_MARKER.test(tip);
			const tipText = compactText(tipSpans(expandTipKeys(isNew ? tip.replace(NEW_TIP_MARKER, "") : tip)));
			const tipRow: NativeChild[] = [
				node("icon", { name: "lightbulb", role: "harness.welcome.tip-icon" }),
				text(tipText, { wrap: "word", role: "harness.welcome.tip-text" }),
			];
			if (isNew) tipRow.push(node("shimmer", { text: "New", role: "harness.welcome.new" }));
			body.push(node("row", { gap: "sm", align: "start", role: "harness.welcome.tip" }, tipRow, "tip"));
		}
		// No head row or chevron: the card is the hero; the version sits under the wordmark.
		const described = card({ role: "harness.welcome" }, body);
		this.#native = { tip, node: described };
		return described;
	}

	/** The intro keeps the welcome block mutable; settling lets it retire to history. */
	isTranscriptBlockFinalized(): boolean {
		return this.#animTimer == null;
	}

	/**
	 * Play a one-shot intro that sweeps the gradient through every phase
	 * before settling on the resting frame. Safe to call multiple times —
	 * subsequent calls reset and replay.
	 */
	playIntro(requestRender: () => void): void {
		this.#stopAnimation();
		// The intro is a repaint-only gradient sweep; a TSP terminal shows the
		// settled card right away.
		if (isNativeRendering()) {
			requestRender();
			return;
		}
		this.#requestRender = requestRender;
		this.#animStart = performance.now();
		this.#requestRender();
		this.#animTimer = setInterval(() => {
			const elapsed = performance.now() - (this.#animStart ?? 0);
			const requestRender = this.#requestRender;
			if (elapsed >= INTRO_MS) {
				this.#stopAnimation();
			}
			// Stopping clears the callback, but the settled frame must still paint
			// so an oversized startup header can retire into native scrollback.
			requestRender?.();
		}, INTRO_TICK_MS);
	}

	#stopAnimation(): void {
		if (this.#animTimer != null) {
			clearInterval(this.#animTimer);
			this.#animTimer = null;
		}
		this.#animStart = null;
		this.#requestRender = null;
		// The settled (resting) frame differs from the last intro frame.
		this.invalidate();
	}

	/**
	 * Redirect a running intro's render callback to a new target when a host
	 * remounts this component mid-animation.
	 * Returns true while the intro is still animating; false = no-op (settled).
	 */
	retargetIntro(requestRender: () => void): boolean {
		if (this.#animTimer == null) return false;
		this.#requestRender = requestRender;
		return true;
	}

	/** Stop the intro immediately and settle on the resting frame. Safe when idle. */
	stopIntro(): void {
		this.#stopAnimation();
	}

	/** Update the version embedded in the welcome border title. */
	setVersion(version: string): void {
		this.version = version;
		this.invalidate();
	}

	render(termWidth: number): readonly string[] {
		const animating = this.#animStart != null;
		if (!animating && this.#cachedLines && this.#cachedWidth === termWidth) {
			return this.#cachedLines;
		}
		const lines = this.#renderLines(termWidth);
		if (animating) {
			this.#cachedLines = undefined;
			this.#cachedWidth = -1;
		} else {
			this.#cachedLines = lines;
			this.#cachedWidth = termWidth;
		}
		return lines;
	}

	#renderLines(termWidth: number): string[] {
		const room = termWidth - WELCOME_MARGIN * 2;
		if (room < 4) return [];
		const indent = padding(WELCOME_MARGIN);
		const brand = welcomeBrand();
		const info = this.#infoLines(Math.min(room, INFO_WIDTH), brand);
		let lines: readonly string[] = info;
		if (brand.logoWidth > 0 && room >= brand.logoWidth + LOCKUP_GAP + INFO_WIDTH) lines = lockup(brand.logo, info);
		else if (brand.logoWidth > 0 && room >= brand.logoWidth) lines = [...brand.logo, "", ...info];
		return lines.map(line => indent + line);
	}

	/** The console column: title, session facts, and the get-started commands. */
	#infoLines(width: number, brand: WelcomeBrand): string[] {
		const fit = (line: string) => truncateToWidth(line, width);
		const fact = (label: string, value: string) => fit(theme.fg("muted", label.padEnd(12)) + theme.fg("text", value));
		const home = os.homedir();
		const cwd = process.cwd();
		return [
			fit(`${theme.bold(theme.fg("text", brand.title))}  ${theme.fg("dim", `v${this.version}`)}`),
			fit(theme.fg("muted", brand.subtitle)),
			theme.fg("borderMuted", "─".repeat(width)),
			fact("Workspace", cwd.startsWith(home) ? `~${cwd.slice(home.length)}` : cwd),
			fact("User", os.userInfo().username),
			"",
			theme.bold(theme.fg("accent", "GET STARTED")),
			...GET_STARTED.map(([command, summary]) =>
				fit(theme.fg("accent", command.padEnd(12)) + theme.fg("muted", summary)),
			),
		];
	}
}

/** Block-grid brand mark (H monogram) for the monochrome setup surfaces. */
export const PI_LOGO = ["██        ██", "██        ██", "████████████", "██        ██", "██        ██"];

/** Welcome branding: neutral by default, overridden by the deployment profile's `brand.yml`. */
interface WelcomeBrand {
	title: string;
	subtitle: string;
	/** Pre-rendered logo lines, each `logoWidth` cells; empty when the profile ships no logo. */
	logo: readonly string[];
	logoWidth: number;
}

/** Shape of `<config root>/brand.yml`. */
interface BrandFile {
	title?: string;
	subtitle?: string;
	logo?: { pixels?: string; colors?: Record<string, string> };
}

let cachedBrand: WelcomeBrand | undefined;

/**
 * Branding from `<config root>/brand.yml`, read once. `logo.pixels` holds one character
 * per pixel (two rows per terminal line, unmapped characters transparent), colored by
 * the `logo.colors` map of character to hex color.
 */
function welcomeBrand(): WelcomeBrand {
	if (cachedBrand) return cachedBrand;
	let file: BrandFile = {};
	const brandPath = path.join(getConfigRootDir(), "brand.yml");
	try {
		if (fs.existsSync(brandPath)) file = (YAML.parse(fs.readFileSync(brandPath, "utf8")) as BrandFile | null) ?? {};
	} catch (error) {
		logger.warn("Ignoring unreadable brand.yml", { path: brandPath, error: String(error) });
	}
	const pixels = (file.logo?.pixels ?? "")
		.split("\n")
		.map(row => row.trimEnd())
		.filter(Boolean);
	const logoWidth = pixels.reduce((max, row) => Math.max(max, row.length), 0);
	cachedBrand = {
		title: file.title ?? "Coding Harness",
		subtitle: file.subtitle ?? "Enterprise coding assistant",
		logo: renderPixelLogo(pixels, file.logo?.colors ?? {}, logoWidth),
		logoWidth,
	};
	return cachedBrand;
}

/** Half-block lines for a pixel grid, `width` cells each: upper pixel as foreground, lower as background. */
function renderPixelLogo(pixels: readonly string[], colors: Readonly<Record<string, string>>, width: number): string[] {
	const encoding = TERMINAL.trueColor ? "ansi-16m" : "ansi-256";
	const sgr = (code: string | undefined, layer: 38 | 48): string | undefined => {
		const hex = code === undefined ? undefined : colors[code];
		const fg = hex ? Bun.color(hex, encoding) : null;
		if (!fg) return undefined;
		return layer === 38 ? fg : fg.replace("\x1b[38;", "\x1b[48;");
	};
	const lines: string[] = [];
	for (let y = 0; y < pixels.length; y += 2) {
		const top = pixels[y] ?? "";
		const bottom = pixels[y + 1] ?? "";
		let line = "";
		for (let x = 0; x < width; x++) {
			const t = sgr(top[x], 38);
			const b = sgr(bottom[x], 38);
			if (!t && !b) line += " ";
			else if (!b) line += `${t}▀\x1b[0m`;
			else if (!t) line += `${b}▄\x1b[0m`;
			else if (top[x] === bottom[x]) line += `${t}█\x1b[0m`;
			else line += `${t}${sgr(bottom[x], 48)}▀\x1b[0m`;
		}
		lines.push(line);
	}
	return lines;
}

/** Columns between the logo and the console column. */
const LOCKUP_GAP = 4;

/** Left margin of the welcome console. */
const WELCOME_MARGIN = 2;

/** Widest the console column grows. */
const INFO_WIDTH = 44;

/** Commands listed under GET STARTED. */
const GET_STARTED: ReadonlyArray<readonly [string, string]> = [
	["/enterprise", "Enterprise status and policy"],
	["/plan", "Plan before you execute"],
	["/btw", "Ask a side question"],
	["/settings", "Appearance, models, tools"],
];

/** `logo` with the `beside` lines vertically centered to its right. */
function lockup(logo: readonly string[], beside: readonly string[]): string[] {
	const offset = Math.max(0, Math.floor((logo.length - beside.length) / 2));
	return logo.map((row, index) => `${row}${padding(LOCKUP_GAP)}${beside[index - offset] ?? ""}`);
}

/** The block-grid brand mark as accent lines; `shimmer` declares the terminal-clocked shine sweep. */
export function logoNode(lines: readonly string[], shimmer: boolean): NativeNode {
	return col(
		lines.map(line =>
			text([span(line, "accent", shimmer ? { fx: "shimmer" } : undefined)], {
				wrap: "none",
			}),
		),
		{ align: "center", role: "harness.setup.logo" },
	);
}

/** Multi-stop palette for the setup splash gradient: teal → sky → steel. */
const GRADIENT_STOPS: ReadonlyArray<readonly [number, number, number]> = [
	[45, 212, 191],
	[56, 189, 248],
	[139, 152, 168],
];

/** 256-color ramp fallback when truecolor isn't available. */
const GRADIENT_RAMP_256 = [37, 38, 44, 45, 81, 110, 146];

/** Half-width of the shine highlight band, expressed in gradient-t units. */
const SHINE_HALF_WIDTH = 0.18;

export interface ShineConfig {
	/** Overall opacity of the shine overlay, in [0, 1]. */
	strength: number;
	/** Center of the shine band along the diagonal, in [0, 1]. */
	pos: number;
}

/**
 * Resolve the gradient SGR foreground escape for a normalized position `t`
 * (0..1) along the diagonal, compositing the optional sliding shine highlight.
 * Shared by {@link gradientLogo} and the setup splash so both stay
 * color-identical (truecolor when available, 256-color ramp otherwise).
 */
export function gradientEscape(t: number, shine?: ShineConfig): string {
	const shineStrength = shine && shine.strength > 0 ? shine.strength : 0;
	const shinePos = shine ? shine.pos : 0;
	if (TERMINAL.trueColor) {
		// 5-stop palette widens the visible color range and avoids the
		// deep-blue valley a naive HSL lerp falls into.
		const stops = GRADIENT_STOPS;
		const seg = t * (stops.length - 1);
		const i = Math.min(stops.length - 2, Math.floor(seg));
		const f = seg - i;
		const a = stops[i];
		const b = stops[i + 1];
		let r = a[0] + (b[0] - a[0]) * f;
		let g = a[1] + (b[1] - a[1]) * f;
		let bl = a[2] + (b[2] - a[2]) * f;
		if (shineStrength > 0) {
			const dist = Math.abs(t - shinePos);
			const intensity = Math.max(0, 1 - dist / SHINE_HALF_WIDTH) * shineStrength;
			if (intensity > 0) {
				r += (255 - r) * intensity;
				g += (255 - g) * intensity;
				bl += (255 - bl) * intensity;
			}
		}
		return `\x1b[38;2;${Math.round(r)};${Math.round(g)};${Math.round(bl)}m`;
	}
	const ramp = GRADIENT_RAMP_256;
	let idx = Math.min(ramp.length - 1, Math.max(0, Math.floor(t * (ramp.length - 1) + 0.5)));
	if (shineStrength > 0) {
		const dist = Math.abs(t - shinePos);
		const intensity = Math.max(0, 1 - dist / SHINE_HALF_WIDTH) * shineStrength;
		// Promote to the brightest ramp slot when the shine band peaks here.
		if (intensity > 0.5) idx = ramp.length - 1;
	}
	return `\x1b[38;5;${ramp[idx]}m`;
}

/**
 * Apply a multi-stop diagonal gradient (top-left → bottom-right) plus an
 * optional sliding shine band across multi-line art. `phase` (0..1) shifts the
 * gradient along the diagonal, wrapping at 1. When `shine` is provided, a soft
 * white highlight is composited on top, centered at `shine.pos`.
 */
export function gradientLogo(lines: readonly string[], phase = 0, shine?: ShineConfig): string[] {
	const reset = "\x1b[0m";
	const rows = lines.length;
	const cols = Math.max(...lines.map(l => l.length));
	const xSpan = Math.max(1, cols - 1);
	const ySpan = Math.max(1, rows - 1);
	const normalizedPhase = ((phase % 1) + 1) % 1;
	return lines.map((line, y) => {
		let result = "";
		for (let x = 0; x < line.length; x++) {
			const char = line[x];
			if (char === " ") {
				result += char;
				continue;
			}
			// SVG's (0,0) → (1,1) gradient projects both normalized axes
			// equally: top-right and bottom-left land on the purple midpoint.
			const base = (x / xSpan + y / ySpan) / 2;
			const t = normalizedPhase === 0 ? base : (base + normalizedPhase) % 1;
			result += gradientEscape(t, shine) + char + reset;
		}
		return result;
	});
}

/** Total length of the intro animation. */
const INTRO_MS = 3000;
/** Render cadence during the intro (~30fps). */
const INTRO_TICK_MS = 33;
