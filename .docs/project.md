# Project

Documentation status: `verified`

Last verified: 2026-07-26

## Purpose

Maintain a reproducible, user-global OpenCode configuration with pinned
versions, local model routing, prompt enhancement, persistent memory,
codebase navigation, documentation audits, implementation policies, and
permission defaults.

## Architecture

- `config/` is the source of truth linked to `~/.config/opencode`.
- `config/opencode.json` registers providers, models, permissions, MCPs, and
  plugins.
- Local 9Router serves primary models through `127.0.0.1:20128`.
- OpenRouter serves GPT-OSS planning/memory compression and Qwen prompt
  enhancement.
- User-level plugins enforce policy and coordinate external services.
- Runtime data and secrets remain under user data directories outside Git.

## Technology

- OpenCode 1.18.5
- Node.js 24.9.0, Bun 1.3.13, uv 0.11.6
- JavaScript/ES modules, PowerShell, Bash, Python
- Graphify 0.9.26, claude-mem 13.12.4,
  codebase-memory-mcp 0.9.0

## Entrypoints and commands

- Install: `install.ps1` or `install.sh`
- Update: `update.ps1` or `update.sh`
- Integration repair: `setup-integrations.ps1` or `setup-integrations.sh`
- Validate config: `opencode debug config`
- Test: `node --test tests/*.test.mjs`
- Graph navigation: `graphify query`, `graphify path`, `graphify explain`

## Repository map

- `config/agents/`: internal documentation agents
- `config/commands/`: Caveman commands
- `config/lib/`: shared runtime helpers
- `config/plugins/`: OpenCode lifecycle hooks
- `config/skills/`: global skills and their references/scripts
- `config/vendor/`: pinned upstream runtime bundles
- `scripts/`: setup helpers that keep secrets outside Git
- `tests/`: Node test suite for plugins and configuration
- `.docs/`: verified living project documentation
