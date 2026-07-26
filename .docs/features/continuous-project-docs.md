# Continuous Project Docs

Status: `active`

Last verified: 2026-07-26

## Summary

Every opened project receives a standard `.docs/` scaffold and an asynchronous
post-response documentation audit.

## Behavior

Only missing scaffold files are created. Root-session completion schedules one
GPT audit and one Sonnet fallback on eligible failures.

## Requirements and invariants

Agents may write only `.docs/**`. Current source wins. Secrets and raw runtime
data are prohibited.

## Architecture and data flow

OpenCode lifecycle hook -> scaffold -> completed root response -> background
audit agent -> verified project documents.

## Interfaces and data

Managed files live under each project's `.docs/`; `AGENTS.md` receives a
managed documentation map.

## Failures and edge cases

Audits are non-blocking and single-writer. Child sessions do not recursively
trigger audits.

## Verification

Run `tests/project-docs.test.mjs` and verify scaffold links/status consistency.

## Source map

`config/plugins/project-docs-hook.mjs`,
`config/skills/project-docs/`, `config/agents/project-docs-*.md`.

## Related documentation

[Project](../project.md), [Rules](../rules.md).
