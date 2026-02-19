<div align="center">

# 🦞 ClawDesk

**Your AI assistant. On your computer. Private.**

Powered by [OpenClaw](https://github.com/openclaw/openclaw) — No terminal. No setup. Just download and talk.

[![Release](https://img.shields.io/github/v/release/clawdesk/clawdesk?style=flat-square)](https://github.com/clawdesk/clawdesk/releases)
[![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](LICENSE)

</div>

---

## Download

| Platform | Download |
|----------|----------|
| Windows  | [ClawDesk_0.1.0_x64.msi](https://github.com/clawdesk/clawdesk/releases/latest) |
| Mac      | [ClawDesk_0.1.0_universal.dmg](https://github.com/clawdesk/clawdesk/releases/latest) |
| Linux    | [ClawDesk_0.1.0_amd64.AppImage](https://github.com/clawdesk/clawdesk/releases/latest) |

## Features

- **One-click setup** — Download, enter your API key, start chatting
- **Multi-provider** — Anthropic, OpenAI, Google, Groq, DeepSeek, Moonshot
- **100% local** — Your conversations never leave your computer
- **Auto-recovery** — Gateway automatically restarts after sleep/crash
- **Zero config** — No terminal, no Node.js, no setup commands

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Architecture

Built with **Tauri v2** (Rust backend) + **React** + **TypeScript**. ClawDesk manages the full lifecycle of an OpenClaw gateway instance — from downloading Node.js and OpenClaw on first run, to health monitoring and automatic crash recovery.

## License

MIT — Not affiliated with Anthropic, OpenAI, or Google.
