# Remote Model Routing

Status: `active`

Last verified: 2026-07-27

## Summary

OpenCode routes GPT, Kimi, Sakana, and Qwen through
`https://merlin.loldinis.com/v1`.

## Behavior

GPT uses OpenAI Responses, while Kimi, Sakana, and Qwen use compatible remote
transports. Plan uses GPT Sol High through Merlin; Qwen 3.7 Flash is default.

## Requirements and invariants

The remote gateway must answer at `merlin.loldinis.com` and authenticate with
ignored `config/9router-merlin.key`. Native effort and thinking settings remain
provider-specific. No enabled OpenCode provider may use localhost or direct
OpenRouter.

## Architecture and data flow

OpenCode provider -> native SDK adapter -> Merlin 9Router -> upstream account.

## Interfaces and data

`enabled_providers` and each provider's `models` map in `config/opencode.json`
are the OpenCode-facing allow-list.

## Failures and edge cases

The running OpenCode process retains startup configuration; restart it after
gateway or provider changes.

## Verification

Run configuration tests, inspect the remote `/v1/models`, and send one bounded
request per provider family.

## Source map

`config/opencode.json`, `config/9router-merlin.key`,
`config/plugins/prompt-enhancer-hook.mjs`.

## Related documentation

[Infrastructure](../infra.md), [README](../../README.md).
