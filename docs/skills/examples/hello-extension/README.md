# hello-extension

A minimal `harness` extension that demonstrates the two most common authoring patterns: subscribing to `session_start` to notify on load, and registering a `/hello` slash command that sends a greeting into the conversation. It is intentionally small — use it as a copy-paste starting point for your own extension.

## Install

**Option A — drop into user extensions directory:**

```
cp -r . ~/.harness/agent/extensions/hello-extension
```

Restart `harness`. You will see the startup notification immediately.

With `harness --profile <name>`, use `~/.harness/profiles/<name>/agent/extensions/hello-extension` under the default layout. `PI_CODING_AGENT_DIR` changes the default profile's agent directory, not a named profile's. Initialized XDG roots can change these locations.

**Option B — point the settings `extensions` array at it:**

```yaml
# ~/.harness/agent/config.yml
extensions:
  - /path/to/hello-extension
```

**Option C — load once via CLI flag:**

```
harness --extension ./hello-extension
```

## Usage

After loading, type `/hello` or `/hello Ada` in the harness prompt. The command sends a visible greeting custom message into the conversation and shows a "Message sent!" notification.

## What it demonstrates

- Default export factory receiving `ExtensionAPI`
- `pi.on("session_start", ...)` — session lifecycle hook
- `pi.registerCommand(...)` — slash command registration
- `ctx.ui.notify(...)` — user-facing notification
- `package.json` with `harness.extensions` manifest field
