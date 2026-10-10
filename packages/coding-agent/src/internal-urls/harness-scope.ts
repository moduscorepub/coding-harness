/**
 * Shared grammar for `harness://` docs scopes: which doc a URL names, and the
 * whole embedded corpus for the docs root (the handler's `enumerate`).
 */
import * as path from "node:path";
import { getDocFilenames, getEmbeddedDoc } from "./docs-index";
import type { InternalUrl, ResolveContext } from "./types";

/** Host + path of an `harness://` URL, exactly as the handler reads it; `""` when the URL names the docs root. */
export function harnessDocFilename(url: InternalUrl): string {
	const host = url.rawHost || url.hostname;
	const pathname = url.rawPathname ?? url.pathname;
	return host ? (pathname && pathname !== "/" ? host + pathname : host) : "";
}

/**
 * Canonical doc path relative to `docs/` for an `harness://` URL, or `""` for the
 * docs root (`harness://`, `harness:///`, `harness://docs`, `harness://docs/`). Throws on
 * absolute paths and `..` traversal — the rejections the handler reports.
 */
export function harnessDocRel(url: InternalUrl): string {
	const filename = harnessDocFilename(url);
	if (filename.length === 0) return "";
	if (path.isAbsolute(filename)) throw new Error("Absolute paths are not allowed in harness:// URLs");
	const normalized = path.posix.normalize(filename.replaceAll("\\", "/"));
	if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
		throw new Error("Path traversal (..) is not allowed in harness:// URLs");
	}
	if (normalized === "." || normalized === "docs") return "";
	return normalized.startsWith("docs/") ? normalized.slice("docs/".length) : normalized;
}

/** One embedded doc of a `harness://` root scope. */
interface HarnessDocEntry {
	/** Canonical `harness://<rel>` URL. */
	url: string;
	/** Doc text. */
	content: string;
}

/**
 * Every embedded doc for a root scope, in docs-index (sorted) order. Empty
 * when no docs corpus is reachable.
 */
export async function harnessDocsScopeEntries(context?: ResolveContext): Promise<HarnessDocEntry[]> {
	const entries: HarnessDocEntry[] = [];
	for (const rel of getDocFilenames()) {
		context?.signal?.throwIfAborted();
		const content = await getEmbeddedDoc(rel);
		if (content === undefined) continue;
		entries.push({ url: `harness://${rel}`, content });
	}
	return entries;
}
