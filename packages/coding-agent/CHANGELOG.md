# Changelog

## [1.1.0] - 2026-10-11

### Added

- `resources_discover` now fires: at session startup (`reason: "startup"`) and on every session rebuild (`reason: "reload"`). Extensions can contribute skill, prompt, theme, agent, rule and watchdog locations through `skillPaths`, `promptPaths`, `themePaths`, `agentPaths`, `rulePaths` and `watchdogPaths`. Agent directories reach task discovery and child sessions; rules feed the rulebook and TTSR; watchdog files join advisor discovery as the most specific level.
- `claude.customTools` setting: opt in to loading `~/.claude/tools/` and `.claude/tools/` modules as custom tools.

### Changed

- `.claude/tools/` files are no longer loaded as custom tools by default, because Claude Code has no such convention and those files usually belong to other tooling.
- `@` imports in context files under `<project>/.claude/` fall back to the project root when the file-relative target is missing, matching Claude Code. `@` tokens inside HTML comments are no longer expanded.

## [1.0.0] - 2026-10-10

### Added

- Initial release: LLM gateway routing, AD-group tool entitlements, knowledge-base search (`kb_search`), Devin delegation (`devin_session`), network egress allowlist and proxy, IT-locked policy overlay (`/etc/harness/policy.yml`), `/enterprise` status, deployment profiles for branding (theme, title, logo), and the panel interface.
