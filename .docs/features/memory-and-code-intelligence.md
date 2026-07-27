# Memory and Code Intelligence

Status: `active`

Last verified: 2026-07-27

## Summary

Graphify and codebase-memory-mcp provide project-local code intelligence.

## Behavior

Graphify builds the navigable code graph. codebase-memory-mcp indexes and
watches only the current marked project root.

## Requirements and invariants

No persistent conversational memory service is installed. Machine-wide roots
remain forbidden.

## Architecture and data flow

OpenCode project -> safe-root launcher -> codebase-memory-mcp. Project files ->
Graphify -> ignored `graphify-out/`.

## Interfaces and data

MCP tools plus `graphify query`, `graphify path`, and `graphify explain`.

## Failures and edge cases

Unsafe or unmarked roots are rejected.

## Verification

Run launcher tests and a code-only Graphify update.

## Source map

`config/lib/codebase-memory-launcher.mjs`, `config/opencode.json`,
`setup-integrations.*`.

## Related documentation

[Infrastructure](../infra.md), [README](../../README.md).
