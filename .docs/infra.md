# Infrastructure

Documentation status: `verified`

Last verified: 2026-07-28

## Environments

This is a local workstation configuration. Windows is the primary automated
environment. Linux, macOS, and WSL use the Bash scripts but require separate
9Router startup and shell-variable persistence.

## Services and persistence

| Service | Endpoint/data | Ownership |
| --- | --- | --- |
| Merlin 9Router | `https://merlin.loldinis.com` | Remote model gateway |
| claude-mem worker | `127.0.0.1:37778`, `~/.claude-mem/` | Local integration |
| codebase-memory-mcp | project-confined process; `~/.cache/codebase-memory-mcp/` | Local MCP |
| OpenCode | `~/.local/share/opencode/` | OpenCode runtime |
| Graphify | `<project>/graphify-out/` | Per-project generated data |

## External integrations

- Merlin 9Router: all OpenCode model traffic, including GPT Sol High planning
  and Qwen 3.7 Flash.
- GitHub/npm/uv registries: installation and updates.
- Provider upstreams remain behind Merlin 9Router.

The human-editable OpenRouter credential lives in ignored
`config/openrouter.key`; runtime copies and values are never versioned or
documented.

## Deployment and operations

- `bootstrap.sh` clones or updates the configuration and securely captures the
  OpenRouter key before delegating to installation.
- `install.*` links the configuration, restores dependencies, installs and
  starts 9Router, configures integrations, and validates OpenCode.
- `update.*` performs `git pull --ff-only`, restores pinned versions, and
  reruns integration setup.
- Existing unrelated global config is backed up with a timestamp.
- Worker restart is owned by the setup scripts.
- Each codebase-memory-mcp launcher resolves the current project root, sets
  `CBM_ALLOWED_ROOT`, rejects unsafe or unmarked roots before starting the
  upstream binary, and filters out-of-root indexing requests at the MCP
  protocol boundary.

## Observability

- 9Router models: `GET https://merlin.loldinis.com/v1/models`
- claude-mem health: `GET http://127.0.0.1:37778/api/health`
- Resolved config: `opencode debug config`
- OpenCode logs: `~/.local/share/opencode/log/`
- claude-mem logs: `~/.claude-mem/logs/`
