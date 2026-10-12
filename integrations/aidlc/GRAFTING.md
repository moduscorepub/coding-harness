# Grafting the harness distribution onto another AI-DLC fork

This guide applies the patch series in `patches/` to an AI-DLC source tree on another machine, then verifies, builds and installs it. The series is built against upstream `awslabs/aidlc-workflows` at tag `v2.10.0` (commit `2a88838`).

## What you are grafting

| Part | Where | Needed on the other machine |
|---|---|---|
| AI-DLC patch series | `patches/*.patch`, indexed in `patches/README.md` | Yes: this is the fork |
| Coding Harness ≥ 1.1.0 | `coding-harness` monorepo (H1–H4, SPEC.md §7) | Yes: the adapter needs `resources_discover` with agent, rule and watchdog paths (H1–H3), and H4 lets the harness skill win over Claude Code's same-name skill in a project that carries both |
| Helper scripts | `scripts/` | Optional: build, install, mirror and inventory helpers |
| Ratchet kit | `ratchet/` | Optional: the AI-DLC method eval for the harness's `/ratchet` (not a patch; see `ratchet/aidlc-method/README.md`) |

Each patch is one logical commit. `patches/README.md` lists every patch, its subject and the number of files it touches. SPEC.md §4 describes what each commit changes and how to verify it.

## 1. Prepare your fork
```sh
cd <your-aidlc-fork>
git remote add aws https://github.com/awslabs/aidlc-workflows 2>/dev/null || true
git fetch aws --tags
git merge-base --is-ancestor v2.10.0 HEAD && echo "fork contains v2.10.0"
git checkout -b harness-distribution
```
Three cases:
- **Your fork is `v2.10.0` plus your own commits:** apply directly (step 2).
- **Your fork is ahead of `v2.10.0` upstream** (a newer upstream release merged in): apply with 3-way merge. Expect conflicts only in the hotspots below.
- **Your fork is behind `v2.10.0`:** merge or rebase onto `v2.10.0` first; the series assumes the 2.10.0 packager and manifest contract.

## 2. Apply the series
```sh
git am -3 /path/to/aidlc-harness/patches/*.patch
```
Optional patches:
- **Version.** If you version differently, stop before the last patch (`chore(release): 1.0.0`). Either run `git am --skip` when it comes up, or apply everything and then `git revert HEAD`. Your own `AIDLC_VERSION` and `CHANGELOG.md` heading then stay in charge.
- **Improvements.** The `(A1)` … `(B4)` commits come after the parity commits and can be dropped with `git am --skip`, but apply the ones you keep in order: several extend `harness/harness/host/adapter.ts` (B4's debug-first rule builds on A3's derived rules). `(B1)` is a core change: the `project-checks` sensor ships to every distribution.

### Conflict hotspots and how to resolve them
The series follows one rule: **wherever upstream branches on a distribution name, the `harness` arm sits next to the `opencode` arm and behaves like it unless SPEC.md §4 says otherwise.** Resolve conflicts the same way:

| File | Typical conflict | Resolution |
|---|---|---|
| `scripts/package.ts` | Your fork changed `writeProjectionData` or tier projection | Keep both changes. The C01 rule is: a top-level dir that only holds nested root-integration files is not a managed directory. |
| `scripts/manifest-types.ts` | `tierFlavor` union edited | Union of both sets plus `"harness"` |
| `core/tools/aidlc-tiers.ts` | New tiers added in your fork | Add a `harness` column to each new tier, mirroring that tier's claude intent (§4 C03 table) |
| `core/tools/aidlc-model-policy.ts` | New harness unions or honesty rows | Add `harness` to every union; keep the C03 honesty row |
| `core/tools/aidlc-init.ts`, `aidlc-config-diagnostics.ts`, `aidlc-utility.ts` | Branch lists changed | Re-add the `harness` arm next to `opencode`; harness model access is harness-owned (no provider prompts) |
| `core/tools/aidlc-usage.ts` | `readTranscript` changed | Keep the harness-signature check **before** the Claude `"message" in obj` sniff |
| `core/hooks/aidlc-run-sensors.ts` | Hook body changed | Keep the `AIDLC_SENSOR_FEEDBACK` branch additive: no stdout change without the variable |
| `core/aidlc-common/stages/construction/{code-generation,build-and-test}.md` | Your fork changed the `sensors:` list | Keep your list and add `project-checks` (B1) |
| `core/tools/aidlc.ts`, `core/tools/aidlc-sensor.ts` | Your fork added a sensor | Keep both; B1 adds `project-checks` to `TOOLS`, `SENSOR_WORKERS`, the `__sensor-script` map, the import map, `SENSOR_HELP_SOURCES`, `BUNDLED_SENSOR_IDS` and the code-sensor check |
| `tests/unit/gen-coverage-registry.test.ts` | `EXPECTED_NONE_TO_CLI` edited | Union of both lists; the harness entries are the `t-harness-*`, `t-rpc-harness-live`, `t-harness-coexistence-live` and `t-sensor-project-checks` files |
| `tests/unit/t243-install-mechanism.test.ts` and the distribution manifests | Root-file legacy signatures | Keep your signatures and the 2.10.0 `AGENTS.md` signatures C09 records |
| `tests/unit/t304-round18-acceptance-fixes.test.ts` (first-run detection fixture), `t93`, `t95`, `t227`, `t230`, `t239`, `README.md` tool count | Pinned inventories | Add `harness` (t304) and `project-checks` (the sensor inventories) to your lists and counts |
| `harness/claude/skills/aidlc/SKILL.md` | Your fork changed the Claude orchestrator skill | The harness skill is derived from it and checked in: run `bun harness/harness/emit.ts --write-skill` and review the diff; packaging fails until the two agree |
| `harness/harness/**` | none (new directory) | — |

After every resolved patch:
```sh
git am --continue
```

## 3. Account for new distribution-name sites in your fork
Your fork may have added code that branches on distribution names. List every such site and check that each file is classified:
```sh
bun /path/to/aidlc-harness/scripts/sites.ts --root . --out /tmp/sites.md
bun /path/to/aidlc-harness/scripts/sites.ts --root . --gate /path/to/aidlc-harness/inventory/site-decisions.json
```
The gate fails for each file not in `site-decisions.json`. Review those files: add a `harness` arm where the `opencode` arm does host-specific work, then add the file to your copy of the decisions file with the reason.

## 4. Verify
```sh
bun install --frozen-lockfile
bun scripts/package.ts && bun scripts/package.ts --check
bun tests/run-tests.ts --smoke --unit --no-llm
bun tests/run-tests.ts --integration --no-llm --filter 'harness'
```
Pass criteria:
- the determinism guard is green;
- `dist/harness/` and `dist-release/harness/` exist;
- the unit suite has no failures beyond those your fork already had (record your own baseline first);
- the harness tests pass.

Live journeys run the real harness and models (Anthropic credential required):
```sh
AIDLC_HARNESS_RPC_LIVE=1 AIDLC_HARNESS_BIN=$(command -v harness) AIDLC_HARNESS_ANTHROPIC_KEY=... \
  bun test --timeout=3700000 tests/e2e/t-rpc-harness-live.serial.test.ts
```
Each scenario can run alone with `-t 'S20'`. S17 needs a local Ollama model with tool support, S22 `python3` with `venv` and network access for `pip install debugpy`.

## 5. Build, release, install
```sh
bun scripts/build-binaries.ts --target native
bun scripts/package-release.ts --output ../out/release --binaries build/binaries
AIDLC_INSTALL_ROOT=/tmp/aidlc-try AIDLC_BIN_DIR=/tmp/aidlc-try/bin sh ../out/release/install.sh --from ../out/release   # sandbox first
sh ../out/release/install.sh --from ../out/release                                                                    # real install
```
- **Release heading.** `package-release.ts` requires a dated `## [<version>] - YYYY-MM-DD` heading in `CHANGELOG.md` for the version in `core/tools/aidlc-version.ts`.
- **Update check.** A fork whose version sorts below the newest upstream release should disable the update check so `aidlc` does not nag or self-update to upstream:
  ```sh
  aidlc system config global set update-check false
  ```
  The value lives in the machine settings file at the install root (`aidlc.settings.json`); `scripts/install.ts` in this repo sets it on every install.

## 6. Install Coding Harness ≥ 1.1.0 on that machine
The distribution's bootstrap (`.harness/extensions/aidlc.ts`) loads the adapter, and the adapter relies on the H1–H4 extension seams. Build the harness from the `coding-harness` monorepo at a commit that includes them (CHANGELOG `1.1.0`), then confirm:
```sh
harness --version   # ≥ 1.1.0
```

## 7. Use it in a project
```sh
cd <project>
aidlc init --harness harness
harness            # then: /aidlc --doctor, /aidlc <what you want to build>
```
