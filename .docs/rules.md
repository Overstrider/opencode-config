# Project Rules

Documentation status: `verified`

Last verified: 2026-07-28

## Decisions and invariants

- Current source overrides stale documentation or memory.
- Graphify is the broad codebase navigation layer.
- codebase-memory-mcp is the fast structural query layer.
- Every codebase-memory-mcp process is confined to its OpenCode session's
  detected safe project root; machine-wide roots are rejected.
- claude-mem is historical evidence, not current truth.
- OpenCode model traffic must use `merlin.loldinis.com`; local 9Router and
  direct OpenRouter providers are not enabled.
- Subagents inheriting `max` use the selected model's lowest configured variant;
  root sessions and non-`max` selections remain unchanged.
- Caveman Ultra and Ponytail Ultra are mandatory global policies.
- BYPASS permissions are deliberate and security-sensitive.

## Development conventions

- Preserve pinned versions and lockfiles.
- Reuse shared helpers under `config/lib/`.
- Keep plugins small and fail open when an auxiliary service is unavailable.
- Preserve unrelated user changes.
- Keep README and `.docs/` aligned with runtime behavior.

## Safety and security

- Never stage `.env`, auth, runtime databases, logs, generated graphs, or keys.
- Never track `config/openrouter.key` or embed an OpenRouter credential in
  configuration or documentation.
- Treat BYPASS mode as capable of destructive, unrestricted operations.
- Validate exact filesystem targets before destructive installer maintenance.

## Verification

- Run focused Node tests for changed components.
- Run the complete test suite before publishing.
- Run `opencode debug config`.
- Run `git diff --check`.
- Update an existing Graphify index after code changes.
