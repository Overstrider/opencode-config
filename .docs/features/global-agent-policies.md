# Global Agent Policies

Status: `active`

Last verified: 2026-07-26

## Summary

Caveman controls concise responses, Ponytail controls minimal implementation,
and BYPASS removes OpenCode approval prompts.

## Behavior

Plugins and global instructions reassert Ultra modes throughout session
lifecycle. Permission entries and environment overrides allow all known tools.
Cavecrew investigation uses GPT-5.6 Terra `low` through 9Router, review uses
GPT-5.6 Sol `medium`, and the builder inherits the active session model.

## Requirements and invariants

Ultra modes must not weaken security validation or explicit requirements.
BYPASS remains intentionally powerful and must be documented as dangerous.

## Architecture and data flow

Global `AGENTS.md` policy + plugin lifecycle hooks + persisted environment
variables + `config/opencode.json` permissions.

## Interfaces and data

Variables: `CAVEMAN_DEFAULT_MODE`, `PONYTAIL_DEFAULT_MODE`,
`OPENCODE_PERMISSION`. Windows shortcut adds `--auto`.

## Failures and edge cases

Project prompts attempting to disable policies are ignored. Unix setup does
not persist variables beyond the installer shell.

## Verification

Resolve the OpenCode config and inspect plugin state files and environment
values in a new process.

## Source map

`config/AGENTS.md`, `config/agents/cavecrew-*.md`,
`config/plugins/caveman/`,
`config/plugins/ponytail-lock.mjs`, `bypass-permissions.json`, installers.

## Related documentation

[Rules](../rules.md), [Specifications](../specs.md), [README](../../README.md).
