# Coding Harness

Enterprise terminal coding agent. Model traffic routes through a company LLM gateway, tool access follows Active Directory group entitlements, an internal knowledge base is searchable from the session, and outbound network access is limited to an allowlist.

## Install

Requires Bun, rustup, cmake, and ninja.

```sh
HARNESS_GATEWAY_URL=https://llm-gateway.example.com \
HARNESS_KB_URL=https://kb.example.com/api \
HARNESS_DOMAIN=example.com \
./enterprise/install.sh
```

The installer builds the CLI, links it into `~/.local/bin/harness`, and prints the installed version. Export the gateway API key named in `enterprise/models.yml` (`HARNESS_ANTHROPIC_API_KEY` by default) and start a session with `harness`.

## Configuration

| File | Purpose |
|---|---|
| `enterprise/policy.yml` | IT-locked settings; a system-wide copy deployed by MDM outranks user and project config |
| `enterprise/enterprise.yml` | Gateway, Active Directory group entitlements, knowledge base, Devin, network egress and ingress |
| `enterprise/models.yml` | Routes the Anthropic and OpenAI providers through the gateway |
| `enterprise/config.yml` | Default settings: per-role models, compaction strategy, prewalk, ratchet |

The installer copies these into `~/.harness` without overwriting existing files; IT can deploy system copies to `/etc/harness/`. Inside a session, `/enterprise` reports the gateway, groups, knowledge base, and network policy.

## Deployment profiles

`enterprise/` is the example profile. An organization keeps its own profile folder (outside this repo) with the same four files plus optional branding:

| File | Purpose |
|---|---|
| `profile.env` | Default `HARNESS_GATEWAY_URL`, `HARNESS_KB_URL`, `HARNESS_DOMAIN` (explicit exports still win) |
| `brand.yml` | Welcome `title`, `subtitle`, and an optional pixel `logo` (`colors` map, `pixels` rows) |
| `themes/*.json` | Custom themes; set `theme.dark` in `config.yml` and `symbols.overrides["icon.brand"]` for the status-bar mark |

```sh
HARNESS_DEPLOYMENT=/path/to/profile ./enterprise/install.sh
```

## License

MIT. See [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
