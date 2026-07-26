# Memory and Code Intelligence

Status: `active`

Last verified: 2026-07-26

## Summary

claude-mem supplies historical context, Graphify supplies broad graphs, and
codebase-memory-mcp supplies fast structural queries.

## Behavior

The claude-mem worker autostarts and injects recent project context. Graphify
is query-first when a graph exists. The MCP automatically indexes and watches
projects. Its launcher detects the current session's project root and confines
the MCP process to it with `CBM_ALLOWED_ROOT`; its protocol proxy independently
rejects `index_repository` requests outside that exact root. Memory compression
uses `openai/gpt-oss-20b` through OpenRouter. Qwen is reserved for Prompt
Enhancer and is not a claude-mem model.

## Requirements and invariants

Historical memory and generated indexes never override current source.
Runtime data stays outside Git. Graphify requires uv/Python. The MCP must
refuse user-home, AppData, temporary, cache, filesystem-root, and unmarked
directories as project roots.

## Architecture and data flow

OpenCode events -> claude-mem worker/database. Project files -> Graphify
per-project graph and MCP per-user structural cache.

## Interfaces and data

claude-mem uses port 37778. Graphify writes `graphify-out/`.
codebase-memory-mcp writes under the user cache.

## Failures and edge cases

Stale worker ports or BOM-prefixed settings can cause connection errors;
wrappers normalize settings. Setup removes legacy model overrides from the
claude-mem `.env` so settings cannot be silently replaced. A session opened
outside a recognized safe project intentionally leaves codebase-memory-mcp
unavailable instead of indexing the surrounding machine. Full headless
Graphify extraction of documents needs a semantic backend.

## Verification

Check claude-mem health, run Graphify version/query commands, and run
codebase-memory-mcp coverage/status checks.

## Source map

`config/plugins/claude-mem-*.mjs`, `config/vendor/claude-mem.js`,
`config/plugins/graphify.js`, `config/skills/graphify/`,
`config/lib/codebase-memory-launcher.mjs`, `config/opencode.json`.

## Related documentation

[Infrastructure](../infra.md), [README](../../README.md).
