# Specifications

Documentation status: `verified`

Last verified: 2026-07-28

## Configuration contract

- `config/` must remain the linked source for `~/.config/opencode`.
- Tool and integration versions must remain pinned in tracked files.
- The resolved OpenCode configuration must parse successfully after install
  and update.

## Security contract

- Never commit API keys, tokens, auth files, `.env` contents, memory data, or
  generated project indexes.
- OpenCode's remote 9Router credential comes from ignored
  `config/9router-merlin.key`.

## Runtime contract

- Every enabled OpenCode model provider uses `merlin.loldinis.com`.
- The built-in Plan agent uses GPT Sol with the `high` variant through Merlin.
- A child session inheriting `max` is downgraded to its model's lowest
  configured variant before dispatch.
- claude-mem uses `127.0.0.1:37778`.
- codebase-memory-mcp sets `CBM_ALLOWED_ROOT` to the detected project root and
  independently filters MCP indexing calls outside it. It refuses home,
  AppData, temporary, cache, filesystem-root, and unmarked roots.
- Project Docs audits only completed root sessions and restricts writes to
  `.docs/**`.

## Platform constraints

- Node.js/npm are mandatory.
- Graphify needs uv and a Python runtime; full headless semantic extraction
  additionally needs a supported LLM backend.
- Unix installers do not persist BYPASS/Caveman/Ponytail environment variables.

## Acceptance criteria

- `node --test tests/*.test.mjs` passes.
- `git diff --check` reports no whitespace errors.
- `opencode debug config` succeeds.
- No tracked file contains a real credential.
