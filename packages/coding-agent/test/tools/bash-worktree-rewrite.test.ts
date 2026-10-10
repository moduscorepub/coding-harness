import { describe, expect, it } from "bun:test";
import { rewriteGitWorktreeAdd } from "@coding-harness/coding-agent/tools/bash-worktree-rewrite";

const Harness = ["bun", "/opt/harness cli.ts"] as const;

describe("rewriteGitWorktreeAdd", () => {
	it("routes supported branch creation through harness with an option terminator", () => {
		expect(rewriteGitWorktreeAdd("git worktree add -b feat ../wt origin/main", Harness)).toBe(
			"bun '/opt/harness cli.ts' worktree add -b feat -- ../wt origin/main",
		);
	});

	it("preserves surrounding shell structure while rewriting a -C segment", () => {
		expect(rewriteGitWorktreeAdd("cd x && git -C repo worktree add ../wt && ls", Harness)).toBe(
			"cd x && bun '/opt/harness cli.ts' worktree add -C repo -- ../wt && ls",
		);
	});

	it("leaves unsupported or unsafe commands unchanged", () => {
		const commands = [
			"git worktree add --lock ../wt",
			'git worktree add "$HOME/wt"',
			"FOO=1 git worktree add ../wt",
			"git worktree list",
			"printf x | git worktree add ../wt",
			"git worktree add ../wt | cat",
		];
		for (const command of commands) expect(rewriteGitWorktreeAdd(command, Harness)).toBe(command);
	});

	it("quotes rewritten argv containing spaces", () => {
		expect(rewriteGitWorktreeAdd("git worktree add 'path with spaces'", Harness)).toBe(
			"bun '/opt/harness cli.ts' worktree add -- 'path with spaces'",
		);
	});
});
