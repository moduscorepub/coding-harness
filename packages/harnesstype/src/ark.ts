/**
 * ArkType compatibility facade — `@coding-harness/harnesstype/ark`.
 *
 * Lets code written against arktype keep its imports and names while running
 * on the harnesstype lazy-JIT runtime: swap `from "arktype"` for
 * `from "@coding-harness/harnesstype/ark"` and nothing else changes. New code should
 * import `@coding-harness/harnesstype` directly.
 *
 * Compatibility affordance: `ArkError` / `ArkErrors` alias `HarnessError` /
 * `HarnessErrors`. All schema builders, including recursive `scope()`, are
 * re-exported unchanged.
 */
import { HarnessError, HarnessErrors } from "./errors";

export * from "./index";

export const ArkError = HarnessError;
export type ArkError = HarnessError;
export const ArkErrors = HarnessErrors;
export type ArkErrors = HarnessErrors;
