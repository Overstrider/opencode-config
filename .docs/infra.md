# Infrastructure

Documentation status: `verified`

Last verified: 2026-07-26

## Environments

This is a local workstation configuration. Windows is the primary automated
environment. Linux, macOS, and WSL use the Bash scripts but require separate
9Router startup and shell-variable persistence.

## Services and persistence

| Service | Endpoint/data | Ownership |
| --- | --- | --- |
| 9Router | `127.0.0.1:20128` | External MerlinRouter checkout |
| claude-mem worker | `127.0.0.1:37778`, `~/.claude-mem/` | Local integration |
| codebase-memory-mcp | `~/.cache/codebase-memory-mcp/` | Local MCP |
| OpenCode | `~/.local/share/opencode/` | OpenCode runtime |
| Graphify | `<project>/graphify-out/` | Per-project generated data |

## External integrations

- OpenRouter: prompt enhancement and claude-mem Qwen compression.
- GitHub/npm/uv registries: installation and updates.
- 9Router: native Claude, OpenAI Responses, and OpenAI-compatible transports.

Credentials are environment- or runtime-owned and never documented by value.

## Deployment and operations

- `install.*` links the configuration, restores dependencies, configures
  integrations, and validates OpenCode.
- `update.*` performs `git pull --ff-only`, restores pinned versions, and
  reruns integration setup.
- Existing unrelated global config is backed up with a timestamp.
- Worker restart is owned by the setup scripts; plugin autostart handles later
  availability loss.

## Observability

- 9Router models: `GET http://127.0.0.1:20128/v1/models`
- claude-mem health: `GET http://127.0.0.1:37778/api/health`
- Resolved config: `opencode debug config`
- OpenCode logs: `~/.local/share/opencode/log/`
- claude-mem logs: `~/.claude-mem/logs/`
