# Installation and Updates

Status: `partial`

Last verified: 2026-07-26

## Summary

Platform scripts link the tracked configuration, restore pinned tools, prepare
integrations, and validate OpenCode.

## Behavior

Installers back up an existing unrelated config, create the global link, set
policy variables, install packages, run integration setup, and validate the
resolved config. Update scripts use fast-forward-only Git pulls.

## Requirements and invariants

Node/npm and OpenRouter access are mandatory. The human stores the OpenRouter
key as the only line in ignored `config/openrouter.key`; environment input is
the fallback. Graphify needs uv/Python. 9Router installation and authentication
remain external.

## Architecture and data flow

`install.*` -> dependency restore -> `setup-integrations.*` -> config link ->
`opencode debug config`.

## Interfaces and data

Entrypoints: `install.ps1`, `install.sh`, `update.ps1`, `update.sh`,
`setup-integrations.ps1`, `setup-integrations.sh`.

## Failures and edge cases

The Windows 9Router path is machine-specific. Unix scripts do not persist
policy variables across shells. Missing or placeholder OpenRouter credentials
stop setup. Already-correct global tool versions are not reinstalled over
running executables.

## Verification

Run the installer on a prepared machine, then run `opencode debug config` and
the health checks documented in README.

## Source map

`install.*`, `update.*`, `setup-integrations.*`, `mise.toml`, version files.

## Related documentation

[Project](../project.md), [Infrastructure](../infra.md), [README](../../README.md).
