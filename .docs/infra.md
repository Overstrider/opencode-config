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
| codebase-memory-mcp | project-confined process; `~/.cache/codebase-memory-mcp/` | Local MCP |
| OpenCode | `~/.local/share/opencode/` | OpenCode runtime |
| Graphify | `<project>/graphify-out/` | Per-project generated data |

## External integrations

- OpenRouter: Qwen prompt enhancement plus GPT-OSS 20B planning and
  claude-mem compression.
- GitHub/npm/uv registries: installation and updates.
- 9Router: native Claude, OpenAI Responses, and OpenAI-compatible transports.

The human-editable OpenRouter credential lives in ignored
`config/openrouter.key`; runtime copies and values are never versioned or
documented.

## Deployment and operations

- `install.*` links the configuration, restores dependencies, configures
  integrations, and validates OpenCode.
- `update.*` performs `git pull --ff-only`, restores pinned versions, and
  reruns integration setup.
- Existing unrelated global config is backed up with a timestamp.
- Worker restart is owned by the setup scripts; plugin autostart handles later
  availability loss.
- Each codebase-memory-mcp launcher resolves the current project root, sets
  `CBM_ALLOWED_ROOT`, rejects unsafe or unmarked roots before starting the
  upstream binary, and filters out-of-root indexing requests at the MCP
  protocol boundary.

## Observability

- 9Router models: `GET http://127.0.0.1:20128/v1/models`
- claude-mem health: `GET http://127.0.0.1:37778/api/health`
- Resolved config: `opencode debug config`
- OpenCode logs: `~/.local/share/opencode/log/`
- claude-mem logs: `~/.claude-mem/logs/`
