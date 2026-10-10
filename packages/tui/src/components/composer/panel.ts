/**
 * Panel composer: a plain squared frame, with the status bar docked below as a
 * solid strip instead of riding inside the frame.
 */
import { padding } from "../../utils";
import type { ComposerChromeContext, ComposerRowContext, ComposerStyle } from "./types";

export const panelComposerStyle: ComposerStyle = {
	id: "panel",
	sideBorders: true,
	verticalChrome: 2,
	statusAttachment: "none",
	bottomBar: "full",
	bottomBarGap: false,
	defaultPromptGutter: "› ",

	defaultPaddingX(themePaddingX: number | undefined): number {
		return Math.max(0, themePaddingX ?? 1);
	},

	sideChromeWidth(paddingX: number): number {
		return paddingX + 1;
	},

	renderTop(ctx: ComposerChromeContext): string {
		const { box, width, borderColor } = ctx;
		return borderColor(`${box.topLeft}${box.horizontal.repeat(Math.max(0, width - 2))}${box.topRight}`);
	},

	renderRow(ctx: ComposerRowContext): string[] {
		const { box, paddingX, borderColor, text, pad } = ctx;
		const leftBorder = borderColor(`${box.vertical}${padding(paddingX)}`);
		// IME preedit renders terminal-side; keep the cursor row open to its right.
		if (ctx.imeSafeCursorTail) return [leftBorder + text];
		const rightChromeCells = Math.max(1, paddingX + 1 - ctx.cursorOverflow);
		const rightGlyph = ctx.scrollbarThumb ? "█" : box.vertical;
		return [leftBorder + text + pad + borderColor(`${padding(rightChromeCells - 1)}${rightGlyph}`)];
	},

	renderBottom(ctx: ComposerChromeContext): string {
		const { box, width, borderColor } = ctx;
		return borderColor(`${box.bottomLeft}${box.horizontal.repeat(Math.max(0, width - 2))}${box.bottomRight}`);
	},
};
