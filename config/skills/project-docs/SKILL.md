---
name: project-docs
description: Maintain verified, living project documentation under .docs. Use for every OpenCode project session, documentation bootstrap or repair, feature inventory, architecture/product/specification updates, and post-change documentation audits.
---

# Project Docs

Keep `.docs` aligned with current source, explicit product decisions, and
observable runtime behavior. Treat current code and configuration as stronger
evidence than stale documentation.

## Start every audit

1. Ensure the standard tree exists. The user-level plugin normally runs
   `scripts/scaffold.mjs`; create only missing paths if repair is needed.
2. Read `.docs/project.md` and `.docs/rules.md`.
3. Read `.docs/features.md`, then only feature pages relevant to the task.
4. Read `product.md`, `specs.md`, or `infra.md` when their domains are affected.
5. Inspect current source before changing factual claims.

## Own each document

- `project.md`: purpose, architecture, stack, entrypoints, commands, and
  repository layout.
- `product.md`: audience, problems, outcomes, workflows, non-goals, and success
  signals.
- `specs.md`: cross-cutting requirements, contracts, constraints, and
  acceptance criteria.
- `infra.md`: environments, services, persistence, integrations, deployment,
  operations, and observability.
- `rules.md`: project-specific decisions, invariants, conventions, and
  verification rules.
- `features.md`: canonical capability index linking `.docs/features/*.md`.
- `features/<slug>.md`: one page per distinct system capability.

## Maintain feature pages

Use stable kebab-case slugs. Keep technical modules inside the capability page
or `infra.md`; do not create a feature page for every source module.

Use only these statuses:

- `active`: implemented and available.
- `partial`: implemented with documented gaps.
- `planned`: explicitly approved but not implemented.
- `deprecated`: still present but being replaced.
- `removed`: no longer available; retain under the Retired index section.

Include these sections in every feature page:

1. Status and last verified date
2. Summary
3. Behavior
4. Requirements and invariants
5. Architecture and data flow
6. Interfaces and data
7. Failures and edge cases
8. Verification
9. Source map
10. Related documentation

## Update safely

- Preserve unrelated manual content and stable feature slugs.
- Record proposals as `planned`, never as implemented behavior.
- Mark uncertain or incomplete inventory as `needs-review`; do not guess.
- Update `Last verified` only after materially checking the documented claim.
- Make no writes when evidence does not require a documentation change.
- Never copy credentials, tokens, private keys, `.env` values, personal data,
  hidden reasoning, or raw tool output into documentation.
- Edit only `.docs/**`. The user-level plugin owns the managed `AGENTS.md`
  block.

## Complete the audit

Check that every active capability has exactly one index row and one linked
page, every link resolves, statuses agree, and affected cross-cutting documents
remain consistent. Return a terse internal receipt listing changed documents
or `No documentation changes.`
