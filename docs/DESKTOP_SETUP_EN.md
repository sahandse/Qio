# Qio Desktop Setup (Windows / macOS)

Qio is a Tauri 2 desktop companion. Agent hooks are opt-in and record limited event metadata locally; they do not provide access to full conversations, source files, or internal models.

## Install and run from source

Requirements: Node.js 22, Rust, and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
git clone https://github.com/sahandse/Qio.git
cd Qio
npm install
npm test
npm run tauri dev
```

## Connect Cursor

From the Qio repository root, run:

```bash
npm run setup:cursor
```

The installer merges Qio hook entries into `~/.cursor/hooks.json`, keeps existing entries, and creates a timestamped backup before writing. Cursor hook events are normalized into Qio's local `~/.qio/events.jsonl` file. Only the agent name, event type, tool name (when available), and timestamp are recorded. Prompt text, shell command contents, file paths, and file contents are not written.

If events do not appear, verify Cursor's Settings → Hooks page and perform a low-risk task. Remove entries containing `--agent=Cursor` from `~/.cursor/hooks.json` to disconnect Qio.

Official documentation: https://cursor.com/docs/hooks

## Connect Qoder

Run `npm run setup:qoder` from the Qio repository root, then restart Qoder. Qio backs up `~/.qoder/settings.json` and records supported event metadata. This is event integration, not direct access to Qoder's model inside Qio chat.

Official documentation: https://docs.qoder.com/extensions/hooks

## Connect Claude Code

Run `npm run setup:claude` and restart Claude Code. The installer preserves existing settings and creates a backup. Permission requests are never automatically approved; review each request in Qio before making a decision.

## Cursor, Claude, ChatGPT, and Qio's direct API chat are different

Installing Cursor, Claude Desktop, or ChatGPT does not connect those applications as a model backend inside Qio. Direct model chat in Qio uses a supported provider API and a valid model ID. API billing and consumer app subscriptions are separate. See [AI provider setup](AI_PROVIDERS_FA.md).

## Test evidence

`npm run test:code` records the exit code of the command it actually runs. A successful run does not prove that every file or every external integration was tested, and Qio labels evidence as not verified against the latest source revision.

## Privacy and troubleshooting

- Never commit API keys or paste them into issues or screenshots.
- Hook events and test evidence are stored locally under `~/.qio`.
- Qio must be running to show its dashboard; a hook event does not prove an Agent is currently online.
- For build failures, include the operating system, Qio version, the failing workflow link, and the relevant error text. Redact secrets and personal file paths.
