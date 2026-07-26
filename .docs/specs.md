# Specifications

Documentation status: `verified`

Last verified: 2026-07-26

## Configuration contract

- `config/` must remain the linked source for `~/.config/opencode`.
- Tool and integration versions must remain pinned in tracked files.
- The resolved OpenCode configuration must parse successfully after install
  and update.

## Security contract

- Never commit API keys, tokens, auth files, `.env` contents, memory data, or
  generated project indexes.
- OpenRouter credentials come from ignored `config/openrouter.key`, with
  `OPENROUTER_API_KEY` as fallback, and are copied only to the machine-local
  claude-mem `.env`.
- The local `sk_9router` string is a non-secret adapter placeholder.

## Runtime contract

- Primary providers use 9Router at `127.0.0.1:20128`.
- The built-in Plan agent uses `openai/gpt-oss-20b` through the isolated
  OpenRouter provider.
- claude-mem uses `127.0.0.1:37778`.
- codebase-memory-mcp sets `CBM_ALLOWED_ROOT` to the detected project root and
  independently filters MCP indexing calls outside it. It refuses home,
  AppData, temporary, cache, filesystem-root, and unmarked roots.
- Prompt enhancement has a five-second network ceiling and fails open.
- Claude model availability checks fail open when 9Router health state cannot
  be read.
- Project Docs audits only completed root sessions and restricts writes to
  `.docs/**`.

## Platform constraints

- Node.js/npm are mandatory.
- Graphify needs uv and a Python runtime; full headless semantic extraction
  additionally needs a supported LLM backend.
- 9Router autostart currently targets a machine-specific Windows path.
- Unix installers do not persist BYPASS/Caveman/Ponytail environment variables.

## Acceptance criteria

- `node --test tests/*.test.mjs` passes.
- `git diff --check` reports no whitespace errors.
- `opencode debug config` succeeds.
- No tracked file contains a real credential.
