# Local Model Routing

Status: `partial`

Last verified: 2026-07-26

## Summary

OpenCode routes Claude, GPT, and Kimi models through local 9Router transports.
The built-in Plan agent uses GPT-OSS 20B through OpenRouter.

## Behavior

Claude uses the Anthropic adapter, GPT uses OpenAI Responses, and Kimi uses
OpenAI-compatible chat completions. A guard avoids known-unavailable Claude
routes by selecting GPT Luna Low. Plan uses the isolated
`openrouter-oss/openai/gpt-oss-20b` provider with temperature zero.

## Requirements and invariants

9Router must answer on `127.0.0.1:20128`. Installers restore its pinned official
npm package; provider enrollment and model/combination selection remain in the
local dashboard. Plan additionally requires ignored `config/openrouter.key` or
the `OPENROUTER_API_KEY` fallback. Native effort and thinking settings must
remain provider-specific.

## Architecture and data flow

Primary OpenCode provider -> native SDK adapter -> 9Router -> upstream
account. Plan -> OpenAI-compatible adapter -> OpenRouter -> GPT-OSS 20B.
Availability guard reads the authenticated local 9Router endpoint.

## Interfaces and data

Provider connections, enabled upstream models, and fallback combos are managed
by the 9Router dashboard. `enabled_providers` and each provider's `models` map
in `config/opencode.json` are the OpenCode-facing allow-list.

## Failures and edge cases

Autostart prefers an explicitly configured development checkout and otherwise
resolves the npm-global executable from `PATH`. Availability lookup fails open
if 9Router state cannot be read.

## Verification

Run the availability tests, inspect `/v1/models`, and send one request per
provider family.

## Source map

`.9router-version`, `setup-9router.*`, `config/opencode.json`,
`config/plugins/9router-*.mjs`, `config/lib/9router-*.mjs`.

## Related documentation

[Infrastructure](../infra.md), [README](../../README.md).
