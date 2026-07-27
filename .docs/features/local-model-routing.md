# Direct Copilot Routing

Status: `active`

Last verified: 2026-07-27

## Summary

All OpenCode agents call GitHub Copilot directly.

## Behavior

The `copilot` provider uses the OpenAI-compatible adapter, reads the ignored
`config/copilot.key`, and targets `https://api.githubcopilot.com`.

## Requirements and invariants

The token never enters Git. No local gateway is required.

## Architecture and data flow

OpenCode -> Copilot provider -> GitHub Copilot API.

## Interfaces and data

The allow-list currently exposes `copilot/gpt-5.4`.

## Failures and edge cases

Missing, expired, or incompatible tokens cause authentication failure.

## Verification

Run `opencode debug config` and send a small request.

## Source map

`config/opencode.json`, `config/copilot.key.example`.

## Related documentation

[Infrastructure](../infra.md), [README](../../README.md).
