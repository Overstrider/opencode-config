# Project Agent Instructions

<!-- project-docs-local-begin -->
## Project Documentation Map

Project Docs is mandatory for this workspace. Load the global `project-docs`
skill before documentation work and treat current source as stronger evidence
than stale documentation.

- `.docs/project.md` — purpose, architecture, stack, entrypoints, commands.
- `.docs/product.md` — audience, problems, outcomes, workflows, non-goals.
- `.docs/specs.md` — requirements, contracts, constraints, acceptance criteria.
- `.docs/infra.md` — environments, services, data, deploy, operations.
- `.docs/rules.md` — decisions, invariants, conventions, verification rules.
- `.docs/features.md` — canonical capability index.
- `.docs/features/<slug>.md` — one page per system capability.

At task start, read `project.md`, `rules.md`, the feature index, and only the
feature pages relevant to the task. Read product, specs, and infra documents
when their domains are affected. Keep implemented facts verified, label
approved proposals as planned, preserve unrelated manual content, and never
store secrets. The user-level async hook audits documentation after each
completed root response; current code wins while an audit is still running.
<!-- project-docs-local-end -->
