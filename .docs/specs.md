# Specifications

Documentation status: `verified`

Last verified: 2026-07-27

## Model contract

- `copilot/gpt-5.4` is the only exposed model.
- Credentials come only from ignored `config/copilot.key`.
- No local model gateway is installed or started.

## Intelligence contract

- Graphify provides generated project graphs.
- codebase-memory-mcp is confined to the active safe project root.
- No persistent conversational-memory worker is present.

## Acceptance

Tests pass, `opencode debug config` resolves, and tracked files contain no
credentials or machine-local paths.
