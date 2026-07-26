# Prompt Enhancement

Status: `active`

Last verified: 2026-07-26

## Summary

Human root prompts receive a faithful English model-facing copy before the
main model call.

## Behavior

Visible history stays original. Protected literals round-trip exactly.
`!raw ` bypasses enhancement. Failures send the original prompt.

## Requirements and invariants

Use only the current prompt and attachment manifest. Call
`qwen/qwen3.6-35b-a3b:nitro` directly through OpenRouter. Never create a child
session or try another model.

## Architecture and data flow

`chat.message` -> direct OpenRouter request -> local validation -> metadata
`modelText` -> model-facing message transform.

## Interfaces and data

Credential: `OPENROUTER_API_KEY`. Metadata key: `promptEnhancer`.

## Failures and edge cases

Five-second timeout and circuit breaker cover network, rate, quota, billing,
and authorization failures. Child and synthetic messages are skipped.

## Verification

Run `tests/prompt-enhancer.test.mjs` and
`tests/openrouter-enhancer-config.test.mjs`.

## Source map

`config/plugins/prompt-enhancer-hook.mjs`,
`config/lib/openrouter-prompt-enhancer.mjs`,
`config/skills/prompt-enhancer/`.

## Related documentation

[Specifications](../specs.md), [README](../../README.md).
