# Local Model Routing

Status: `partial`

Last verified: 2026-07-26

## Summary

OpenCode routes Claude, GPT, and Kimi models through local 9Router transports.

## Behavior

Claude uses the Anthropic adapter, GPT uses OpenAI Responses, and Kimi uses
OpenAI-compatible chat completions. A guard avoids known-unavailable Claude
routes by selecting GPT Luna Low.

## Requirements and invariants

9Router must answer on `127.0.0.1:20128`. Native effort and thinking settings
must remain provider-specific.

## Architecture and data flow

OpenCode provider -> native SDK adapter -> 9Router -> upstream account.
Availability guard reads the authenticated local availability endpoint.

## Interfaces and data

Models and variants are declared in `config/opencode.json`.

## Failures and edge cases

Autostart uses a machine-specific Windows checkout path. Availability lookup
fails open if 9Router state cannot be read.

## Verification

Run the availability tests, inspect `/v1/models`, and send one request per
provider family.

## Source map

`config/opencode.json`, `config/plugins/9router-*.mjs`, `config/lib/9router-*.mjs`.

## Related documentation

[Infrastructure](../infra.md), [README](../../README.md).
