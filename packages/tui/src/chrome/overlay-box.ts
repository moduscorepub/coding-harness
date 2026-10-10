/**
 * Shared chrome for overlays — string helpers for fullscreen surfaces (the
 * `/copy` picker, settings, model hub, …) and the {@link OverlayPanel}
 * container for inline overlays. The Harness frame is open-sided: a solid header
 * bar in the status-bar blue carrying `Harness › title`, inset content rows, muted
 * rules between sections, and a thin blue footer rule. Column geometry matches
 * a bordered box (borders become blank insets), so hit-testing math holds.
 */
import type { DescribeContext, NativeChild, NativeNode } from "../native/node";
import { node } from "../native/describe";
import { overlayCard } from "../native/overlay";
import { type Component, visibleWidth } from "../tui";
import { Ellipsis, truncateToWidth } from "../utils";
import { padToWidth } from "../render/utils";
import { type ThemeColor, theme } from "../theme/index";

/** Background SGR of the header bar (the status bar's fill). */
function barBg(): string {
	return theme.getBgAnsi("statusLineBg");
}

/** Header-bar title row: `<brand> › title` on the solid bar. `color` recolors the title. */
export function topBorder(width: number, title: string, color?: ThemeColor): string {
	const brand = theme.bold(theme.fg("accent", theme.icon.brand));
	const heading = title
		? `${theme.fg("statusLinePath", "  ›  ")}${theme.bold(theme.fg(color ?? "statusLinePath", title))}`
		: "";
	const content = truncateToWidth(` ${brand}${heading} `, Math.max(0, width));
	return `${barBg()}${content}${" ".repeat(Math.max(0, width - visibleWidth(content)))}\x1b[0m`;
}

/** A muted horizontal rule splitting overlay sections, inset one column per side. */
export function divider(width: number): string {
	return width < 2 ? "" : ` ${theme.fg("borderMuted", "─".repeat(width - 2))} `;
}

/** Thin footer rule in the header-bar blue (`color` overrides). */
export function bottomBorder(width: number, color?: ThemeColor): string {
	const rule = "▀".repeat(Math.max(0, width));
	return color ? theme.fg(color, rule) : `${barBg().replace("\x1b[48;", "\x1b[38;")}${rule}\x1b[0m`;
}

/** Inset pre-styled content by two columns on each side (where a box would draw `│ `). */
export function row(content: string, width: number, _color?: ThemeColor): string {
	return `  ${width > 4 ? padToWidth(content, width - 4) : ""}  `;
}

/** Body content width for a two-column overlay of total `width` (`  sidebar │ body  `). */
export function splitBodyWidth(width: number, sidebarWidth: number): number {
	return Math.max(0, width - sidebarWidth - 7);
}

/** Header bar for a two-column overlay; the split shows only in the body rows. */
export function topBorderSplit(width: number, title: string, _sidebarWidth: number): string {
	return topBorder(width, title);
}

/** Section rule under a two-column overlay. */
export function dividerSplit(width: number, _sidebarWidth: number): string {
	return divider(width);
}

/** A two-column content row: `  sidebar │ body  `, the column rule muted. */
export function splitRow(sidebar: string, body: string, width: number, sidebarWidth: number): string {
	const bodyWidth = splitBodyWidth(width, sidebarWidth);
	const rule = theme.fg("borderMuted", theme.boxRound.vertical);
	return `  ${sidebarWidth > 0 ? padToWidth(sidebar, sidebarWidth) : ""} ${rule} ${bodyWidth > 0 ? padToWidth(body, bodyWidth) : ""}  `;
}

const NO_LINES: readonly string[] = [];

interface PanelRowsMemo {
	width: number;
	height: number | undefined;
	lines: readonly string[];
	result: readonly string[];
}

/**
 * Mutable row region for composing an {@link OverlayPanel}. Callers provide
 * already-styled logical rows and may pin the region to an exact height; extra
 * rows are clipped and missing rows are filled. This keeps dialog body budgets
 * in the layout component instead of duplicating border and padding math in
 * every overlay.
 */
export class PanelRows implements Component {
	#lines: readonly string[] = NO_LINES;
	#height: number | undefined;
	#memo: PanelRowsMemo | undefined;

	/** Replace the region rows. Byte-identical rows retain the previous render identity. */
	setLines(lines: readonly string[]): void {
		if (
			lines === this.#lines ||
			(lines.length === this.#lines.length && lines.every((line, index) => line === this.#lines[index]))
		) {
			return;
		}
		this.#lines = lines;
		this.#memo = undefined;
	}

	/** Pin the region to exactly `height` rows, or pass `undefined` for its natural height. */
	setHeight(height: number | undefined): void {
		const next = height === undefined ? undefined : Number.isFinite(height) ? Math.max(0, Math.trunc(height)) : 0;
		if (next === this.#height) return;
		this.#height = next;
		this.#memo = undefined;
	}

	invalidate(): void {
		this.#memo = undefined;
	}

	render(width: number): readonly string[] {
		const safeWidth = Number.isFinite(width) ? Math.max(0, Math.trunc(width)) : 0;
		const memo = this.#memo;
		if (
			memo !== undefined &&
			memo.width === safeWidth &&
			memo.height === this.#height &&
			memo.lines === this.#lines
		) {
			return memo.result;
		}

		const rowCount = this.#height ?? this.#lines.length;
		const result: string[] = [];
		for (let index = 0; index < rowCount; index++) {
			const line = this.#lines[index] ?? "";
			result.push(visibleWidth(line) > safeWidth ? truncateToWidth(line, safeWidth) : line);
		}
		this.#memo = { width: safeWidth, height: this.#height, lines: this.#lines, result };
		return result;
	}
}

const RULE_NODE: NativeNode = node("rule");

/** Sentinel child rendered by {@link OverlayPanel} as a `├───┤` section rule (a `rule` natively). */
export class PanelDivider implements Component {
	render(): readonly string[] {
		return NO_LINES;
	}

	describe(): NativeNode {
		return RULE_NODE;
	}
}

interface OverlayPanelNativeMemo {
	title: string;
	children: readonly Component[];
	node: NativeNode;
}

interface OverlayPanelMemo {
	width: number;
	title: string;
	children: Component[];
	childLines: (readonly string[])[];
	result: string[];
}

/** Titles inset into a single border row must never carry line breaks. */
function collapseTitle(title: string): string {
	return title.replace(/\s+/g, " ").trim();
}

/**
 * Rounded-box container for inline overlays (selectors, run panels). Children
 * render inside `│ … │` rows between a titled top border and a bottom border,
 * so inline overlays share the chrome of fullscreen overlays. The top border
 * is exactly one row — `routeMouse` offsets written for a one-line top rule
 * stay valid — and content is inset two columns on each side.
 *
 * Natively the panel is a root `card` (`head` = title, `role` =
 * `harness.overlay.<name>`) over its children; the frame is the terminal's.
 * Subclasses whose body is not a plain child list override `describe`.
 */
export class OverlayPanel implements Component {
	children: Component[] = [];
	#title: string;
	readonly #role: string;
	#memo: OverlayPanelMemo | undefined;
	#nativeMemo: OverlayPanelNativeMemo | undefined;

	constructor(title = "", role = "harness.overlay") {
		this.#title = collapseTitle(title);
		this.#role = role;
	}

	/** The `role` of the panel's native root card. */
	get nativeRole(): string {
		return this.#role;
	}

	get title(): string {
		return this.#title;
	}

	set title(value: string) {
		const next = collapseTitle(value);
		if (next === this.#title) return;
		this.#title = next;
		this.#memo = undefined;
	}

	addChild(component: Component): void {
		this.children.push(component);
		this.#memo = undefined;
	}

	removeChild(component: Component): void {
		const index = this.children.indexOf(component);
		if (index === -1) return;
		this.children.splice(index, 1);
		this.#memo = undefined;
	}

	clear(): void {
		this.children = [];
		this.#memo = undefined;
	}

	invalidate(): void {
		this.#memo = undefined;
		for (const child of this.children) child.invalidate?.();
	}

	dispose(): void {
		for (const child of this.children) child.dispose?.();
	}

	setIgnoreTight(ignore: boolean): this {
		for (const child of this.children) child.setIgnoreTight?.(ignore);
		return this;
	}

	/**
	 * Body rows at the given content width, without border chrome —
	 * {@link render} draws exactly these (4 columns narrower) inside `│ … │`
	 * rows. Lets callers and tests assert on component-content coordinates
	 * instead of reverse-parsing box glyphs. `PanelDivider` children contribute
	 * no rows here (their rule is border chrome).
	 */
	renderContent(width: number): string[] {
		const result: string[] = [];
		for (const child of this.children) {
			if (child instanceof PanelDivider) continue;
			result.push(...child.render(width));
		}
		return result;
	}

	describe(_cx: DescribeContext): NativeNode | null {
		const memo = this.#nativeMemo;
		if (
			memo !== undefined &&
			memo.title === this.#title &&
			memo.children.length === this.children.length &&
			this.children.every((child, i) => memo.children[i] === child)
		) {
			return memo.node;
		}
		const children: NativeChild[] = [...this.children];
		const result = overlayCard(this.#role, this.#title, children);
		this.#nativeMemo = { title: this.#title, children: [...this.children], node: result };
		return result;
	}

	render(width: number): readonly string[] {
		width = Number.isFinite(width) ? Math.max(0, Math.trunc(width)) : 0;
		const innerWidth = Math.max(1, width - 4);
		// Children render every frame (renders may carry side effects); the memo
		// only skips re-wrapping unchanged rows in border chrome.
		const childLines = this.children.map(child =>
			child instanceof PanelDivider ? NO_LINES : child.render(innerWidth),
		);
		const memo = this.#memo;
		if (
			memo !== undefined &&
			memo.width === width &&
			memo.title === this.#title &&
			memo.children.length === this.children.length &&
			this.children.every((child, i) => memo.children[i] === child && memo.childLines[i] === childLines[i])
		) {
			return memo.result;
		}
		const result: string[] = [topBorder(width, this.#title)];
		for (let i = 0; i < this.children.length; i++) {
			if (this.children[i] instanceof PanelDivider) {
				result.push(divider(width));
				continue;
			}
			for (const line of childLines[i] ?? NO_LINES) result.push(row(line, width));
		}
		result.push(bottomBorder(width));
		if (width < 4) {
			for (let index = 0; index < result.length; index++) {
				result[index] = truncateToWidth(result[index]!, width, Ellipsis.Omit);
			}
		}
		this.#memo = { width, title: this.#title, children: [...this.children], childLines, result };
		return result;
	}
}
