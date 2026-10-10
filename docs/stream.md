# Stream: Livestream Your Terminal

`harness stream` broadcasts your harness sessions to `live.coding-harness.invalid/<username>` — a Twitch-style page with the live terminal and a chat column. Viewers see exactly what your terminal shows (minus secrets); they cannot type into the session.

Stream is independent from [Collab](collab.md). Collab replicates the session itself (entries, events, prompts) to guests who can drive the agent; Stream sends only rendered screen rows, one way, to an audience.

## Quick start

Streaming needs a coding-harness.invalid account. Sign in once from any harness session with `/login` → **Moduscore (invite only)**; the credential is stored with your other logins and refreshed automatically. For scripts and local development, `MODUSCORE_API_KEY=<token>` overrides the stored credential; `MODUSCORE_AUTH_URL` re-bases the sign-in (`auth.coding-harness.invalid`) and `MODUSCORE_BASE_URL` the Moduscore API (`api.coding-harness.invalid`) at a local server.

Your Moduscore username is the channel. The server derives it from the bearer token, so `harness stream` takes no channel argument.

In the directory you work in:

```
harness stream --title "Refactoring the parser"
```

prints

```
● live.coding-harness.invalid/your_username  "Refactoring the parser"
  waiting for sessions in /work/proj …
```

Then start interactive harness in the same directory from another terminal (as many times as you like). Each interactive session started while `harness stream` runs attaches automatically and shows `● LIVE 3` in its footer (`3` = current viewers). The viewer page shows each session as its own pane; a pane disappears when its session exits. Ctrl-C in the streamer ends the broadcast and every attached session drops its badge.

Sessions that were already running before `harness stream` started are not attached — restart them.

Only one `harness stream` process can listen for a given directory, and the server rejects a second live host for the same channel. If the remote connection drops, the streamer reconnects and replays each pane's current viewport and bounded history; it does not replay missed chat.

### Streamer console

On a terminal, `harness stream` is a full-screen chat console: header with the live badge, channel, title, your coding-harness.invalid handle, viewer URL, viewer count and attached panes; a log of chat and events; and an input line at the bottom.

| Input            | Effect                                                  |
| ---------------- | ------------------------------------------------------- |
| `<text>` + Enter | Send a chat message as the channel owner                |
| `/title <text>`  | Change the stream title                                 |
| `/quit`, Ctrl-C  | Stop streaming (sessions detach, channel goes offline)  |
| Up / Down        | Recall previous messages                                |

`--no-tui` (or a non-TTY stdout/stdin) falls back to a line log where stdin lines are chat (`/title` is still recognized; `/quit` is TUI-only). Ctrl-C stops either console.

### Options and settings

| Flag / setting            | Meaning                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| Channel                   | Your Moduscore username, derived by the server from the bearer token               |
| `--title <text>`          | Stream title (default: directory name; maximum 120 characters)                   |
| `--server <url>`          | Stream server base (default: `stream.serverUrl`)                                 |
| `--no-tui`                | Line-log console instead of the full-screen chat                                 |
| `MODUSCORE_API_KEY`         | Bearer token override; otherwise the `/login` Moduscore credential is used         |
| `stream.serverUrl`        | Default server, `https://live.coding-harness.invalid`                                            |
| `stream.redactPatterns`   | Extra regular expressions masked from every streamed row                         |

## What leaves the machine

The screen feed contains terminal rows and pane metadata (title and dimensions), not session entries. Chat is a separate message channel. The session process:

1. Takes the rows the TUI just painted (scrollback commits and the live viewport).
2. Strips every escape except text styling (SGR) and hyperlinks (OSC 8); inline images become `[image]`.
3. **Redacts** the row (below).
4. Diffs against the last sent viewport and sends row patches — never session entries, prompts, tool arguments, or file contents as data.

Rows cross a private local Unix socket (`0600`, under the per-directory harness runtime dir; a named pipe on Windows) to the `harness stream` process, which multiplexes sessions into panes and forwards JSON screen frames to the server over WSS by default. Custom `http`/`ws` servers use unencrypted WS. The server keeps each pane's viewport and the last 2000 history rows in memory so late viewers get a snapshot; nothing is persisted.

### Redaction

Redaction is irreversible and intentionally over-matches. Any match replaces the run with `••••••`; a row with a match is sent unstyled. Sources:

- Values of environment variables whose names look secret (`*_KEY`, `*_TOKEN`, `*_SECRET`, `*PASSWORD*`, …) and every value loaded from a `.env` file for the directory, regardless of name (8+ chars).
- `.harness/secrets.yml` and `~/.harness/agent/secrets.yml` entries.
- Credential shapes (GitHub/GitLab/OpenAI/Anthropic/AWS/Slack/Stripe/npm/HF tokens, JWTs, PEM blocks, `Bearer …`). Vendor prefixes are matched **without** a length gate so a token is masked while it is still being typed or streamed character by character.
- `NAME=value`, `NAME: value`, `"NAME": "value"` where `NAME` looks secret — the value is masked (covers `read .env` and config files on screen).
- Passwords in connection URLs (`scheme://user:password@host`).
- `stream.redactPatterns`.

Known plain values are also matched by prefix (6+ characters) so a partially typed secret is masked before it is complete.

Redaction cannot know about secrets it has never seen: a token pasted from elsewhere that matches no shape and no configured value is shown. Use `stream.redactPatterns` or `secrets.yml` for anything unusual. Editing `stream.redactPatterns` during a live session reloads the redactor and repaints its viewport; it cannot retract previously sent rows. Chat messages are sent separately and are not passed through terminal-row redaction.

## Recording

`/record` in any interactive session captures that one session's screen through the same pipeline — normalized, redacted rows, viewport patches, scrollback commits — into a local file instead of a socket. No account or streamer is needed, and it works alongside a live stream. The footer shows `● REC` while recording; `/record` again stops it and prints the path.

Recordings are written to `<tmpdir>/harness-recordings/<utc-time>-<session>.harnesscast`, a JSON Lines file similar to asciicast: a header line `{"harnesscast":1,"cols":…,"rows":…,"title":…,"createdAt":…}`, then one `[ms, frame]` line per screen frame (`reset`, `history`, `resize`, `viewport`, `patch`).

```
harness play                      # newest recording
harness play <file> -s 2 -i 1     # 2× speed, pauses capped at 1s
```

Playback requires an interactive terminal and runs on the normal screen: the recorded viewport occupies the bottom of the terminal and recorded scrollback scrolls into your terminal's scrollback, so the output stays after playback ends. Space pauses/resumes; `q`, Esc, or Ctrl-C quits.

### Clips

```
harness clip                                          # newest recording
harness clip <file> -t "Streaming the lexer" -d "…"   # title and description
```

`harness clip` uploads a recording to `live.coding-harness.invalid` with the same Moduscore credential as `harness stream` and prints its page, `live.coding-harness.invalid/c/<id>`. `--server <url>` overrides `stream.serverUrl`; titles are limited to 120 characters and descriptions to 5000. The page plays the clip in the live viewer's terminal pane, with the title, description, and a comment thread underneath; signing in with Moduscore lets viewers comment and the owner edit the title and description. Rows were already redacted when recorded; nothing is re-read from your machine at upload time.

## Server

`live.coding-harness.invalid` is a small Go service (moduscore `apps/live`): channel directory (`GET /api/channels`, `GET /api/channels/<name>`), homepage previews (`GET /api/channels/<name>/preview` — the first pane's viewport, never counted as a viewer), an identity-derived host socket (`/ws/host`), viewer sockets (`/ws/watch/<name>`), chat with per-viewer rate limiting, and the web UI (terminal rows render in the full Berkeley Mono Nerd Font served from `/fonts/`). Wire shapes live in `@coding-harness/wire/stream`.

Hosts authenticate with the coding-harness.invalid bearer (`Authorization: Bearer …` on the host socket); the server verifies it against the issuer's JWKS (`LIVE_ISSUER`, `LIVE_TOKEN_AUDIENCE`) or, for local development, a static `LIVE_DEBUG_TOKENS` list paired with `MODUSCORE_API_KEY`. It derives each host channel directly from the authenticated Moduscore username, so viewers always find an account at `live.coding-harness.invalid/<username>`. Viewers stay anonymous.
