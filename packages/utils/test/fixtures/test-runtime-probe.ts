import { isBunTestRuntime } from "@coding-harness/utils/env";

process.stdout.write(JSON.stringify(isBunTestRuntime()));
