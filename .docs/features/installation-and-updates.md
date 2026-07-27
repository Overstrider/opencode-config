# Installation and Updates

Status: `partial`

Last verified: 2026-07-26

## Summary

Platform scripts link the tracked configuration, restore pinned tools, prepare
integrations, and validate OpenCode.

## Behavior

Installers back up an existing unrelated config, create the global link, set
policy variables, install packages, install and start the pinned 9Router, run
integration setup, and validate the resolved config. `bootstrap.sh` clones or
fast-forwards this repository, captures the OpenRouter key without echoing it,
and delegates to `install.sh`. Update scripts use fast-forward-only Git pulls.

## Requirements and invariants

Node/npm and OpenRouter access are mandatory. The human stores the OpenRouter
key as the only line in ignored `config/openrouter.key`; environment input is
the fallback. Graphify needs uv/Python. 9Router requires Node.js 20+ and is
installed from the pinned official npm package. Provider OAuth and API-key
enrollment remain interactive and local to its dashboard. A development
checkout belongs in ignored `config/9router.local.json` or
`OPENCODE_9ROUTER_DIR`, never in tracked source.

## Architecture and data flow

`bootstrap.sh` -> clone/update -> `install.sh` -> dependency restore ->
`setup-9router.*` -> `setup-integrations.*` -> config link ->
`opencode debug config`.

## Interfaces and data

Entrypoints: `bootstrap.sh`, `install.ps1`, `install.sh`, `update.ps1`,
`update.sh`, `setup-9router.ps1`, `setup-9router.sh`,
`setup-integrations.ps1`, `setup-integrations.sh`.

## Failures and edge cases

An npm-global 9Router missing from `PATH` prevents automatic startup; a
configured development checkout remains the fallback. Unix scripts do not
persist policy variables across shells. Missing or placeholder OpenRouter
credentials stop setup.
Already-correct global tool versions are not reinstalled over running
executables.

## Verification

Run the installer on a prepared machine, then run `opencode debug config` and
the health checks documented in README.

## Source map

`bootstrap.sh`, `install.*`, `update.*`, `setup-9router.*`,
`setup-integrations.*`, `mise.toml`, version files.

## Related documentation

[Project](../project.md), [Infrastructure](../infra.md), [README](../../README.md).
