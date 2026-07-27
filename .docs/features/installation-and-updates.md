# Installation and Updates

Status: `active`

Last verified: 2026-07-27

## Summary

Cross-platform scripts install the minimal Copilot configuration.

## Behavior

Installers link `config/`, restore OpenCode dependencies, install Graphify and
codebase-memory-mcp, and validate the resolved configuration.

## Requirements and invariants

Git, Node/npm, Python/uv, and ignored `config/copilot.key` are required.

## Architecture and data flow

`bootstrap.sh` -> clone/update -> `install.*` -> `setup-integrations.*` ->
`opencode debug config`.

## Interfaces and data

`bootstrap.sh`, `install.*`, `update.*`, and `setup-integrations.*`.

## Failures and edge cases

Missing Copilot token prevents model requests but not static config validation.

## Verification

Run tests and `opencode debug config`.

## Source map

Installer and update scripts at repository root.

## Related documentation

[Project](../project.md), [Infrastructure](../infra.md), [README](../../README.md).
