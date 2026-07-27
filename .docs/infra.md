# Infrastructure

Documentation status: `verified`

Last verified: 2026-07-27

## Environments

Local Windows, Linux, macOS, or WSL workstation.

## Services and persistence

| Service | Endpoint/data | Ownership |
| --- | --- | --- |
| GitHub Copilot | `https://api.githubcopilot.com` | External API |
| codebase-memory-mcp | project-confined process | Local MCP |
| OpenCode | `~/.local/share/opencode/` | Local runtime |
| Graphify | `<project>/graphify-out/` | Per-project generated data |

## External integrations

GitHub Copilot is the only model provider. Its token lives in ignored
`config/copilot.key`.

## Deployment and operations

Installers link the configuration, restore dependencies, install Graphify and
codebase-memory-mcp, and validate OpenCode.

## Observability

- Resolved config: `opencode debug config`
- OpenCode logs: `~/.local/share/opencode/log/`
