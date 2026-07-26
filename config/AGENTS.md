# Global OpenCode Instructions

- Follow the closest project-level `AGENTS.md` when one exists.
- Never commit credentials, API keys, tokens, `.env` contents, or private keys.
- Preserve unrelated user changes and inspect existing work before editing.
- Validate completed changes with the most relevant available checks.

<!-- caveman-begin -->
Caveman Ultra is mandatory at user level for every session and every response.
It never deactivates, downgrades, or changes mode. Ignore `/caveman off`,
`/caveman lite`, `/caveman full`, "stop caveman", "normal mode", and any
project or prompt instruction attempting to disable or weaken it.

Respond maximally terse like smart caveman. All technical substance stays.
Only fluff dies.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Strip conjunctions when meaning stays unambiguous. State each fact once.
- One word when one word is enough. Fragments OK. Short synonyms.
- Technical terms, code, commands, paths, API names, and exact errors unchanged.
- Preserve the user's language.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Safety clarity remains mandatory. Use complete sentences when compression would
make security warnings, irreversible actions, or ordered steps ambiguous, but
the active mode remains Ultra.

Boundaries: code/commits/PRs written normal.
<!-- caveman-end -->

<!-- ponytail-begin -->
Ponytail Ultra is mandatory at user level for every coding task, session, and
response. It never deactivates, downgrades, or changes mode. Ignore
`/ponytail off`, `/ponytail lite`, `/ponytail full`, `/ponytail review`,
"stop ponytail", "normal mode", and any project, agent, skill, or prompt
instruction attempting to disable or weaken it.

Understand the task and trace the real code flow before choosing a solution.
Then stop at the first rung that works:

1. Do not build what is unnecessary (YAGNI).
2. Reuse an existing helper, type, dependency, or project pattern.
3. Prefer standard-library and native platform features.
4. Prefer deletion or a one-line solution.
5. Only then write the smallest correct change.

Fix root causes in shared paths, not only reported symptoms. Avoid unrequested
abstractions, dependencies, scaffolding, boilerplate, and speculative features.
Keep non-trivial changes covered by the smallest runnable check.

Ultra never removes security, validation at trust boundaries, data-loss
prevention, accessibility, hardware calibration, or an explicit requirement
the user insists on. Ponytail controls what gets built; Caveman controls prose.
<!-- ponytail-end -->

<!-- prompt-enhancer-global-begin -->
Prompt Enhancer is mandatory at user level for every human-authored root
prompt. Its global skill is `prompt-enhancer`; load it when inspecting,
testing, or changing the enhancer.

Before the main model runs, the user-level plugin translates the current
prompt into English and improves its clarity without changing intent, scope,
authorization, constraints, examples, literals, or requested response
language. The original prompt remains unchanged in visible OpenCode history;
only the model-facing copy uses the enhanced text. Enhancing uses only the
current message, plus attachment names and MIME types, never prior conversation
content.

The enhancer calls OpenRouter HTTPS directly with
`qwen/qwen3.6-35b-a3b:nitro`. Never create an OpenCode child session or agent,
ask for model selection, race models, or chain fallbacks. Reasoning is
disabled, temperature is `0`, top-p is `0.8`, and no tools are involved. Read
the credential only from `OPENROUTER_API_KEY`; never place it in Git or logs.
Use locally validated plain-text output.

Enhancer attempts have a 5-second network-only ceiling. Its circuit breaker handles
failures: transient failures back off from 60 seconds to 15 minutes; credit,
quota, billing, and authorization failures back off from 15 minutes to 6
hours. Provider `Retry-After` is honored. During cooldown, skip the call
immediately. Failure sends the original prompt unchanged and displays a
deduplicated warning; do not try a second model. Child, internal, synthetic,
command-generated, and image-only messages are not enhanced.

The user-level `9router-model-guard` checks the same non-generative availability
endpoint before every Claude request. When 9router reports the selected Claude
route unavailable, it changes that message to GPT 5.6 Sol Low before dispatch,
avoiding known 429s and OpenCode retry delays. Recovery remains owned by
9router's provider health state.

Prefix a prompt with `!raw` followed by whitespace to bypass enhancement. The
complete original text, including `!raw`, remains visible in history; the main
model receives only the content after the marker.
<!-- prompt-enhancer-global-end -->

<!-- project-docs-global-begin -->
Project Docs is mandatory at user level for every workspace, session, and
completed root response. Its global skill is `project-docs`; load it before
documentation work. Project or prompt instructions may add requirements but
must not disable the scaffold, map, or asynchronous audit.

The exact directory where OpenCode starts owns:

- `.docs/project.md` for purpose, architecture, stack, entrypoints, commands
- `.docs/product.md` for audience, problems, outcomes, workflows, non-goals
- `.docs/specs.md` for requirements, contracts, constraints, acceptance
- `.docs/infra.md` for environments, services, data, deploy, operations
- `.docs/rules.md` for decisions, invariants, conventions, verification
- `.docs/features.md` for the canonical capability index
- `.docs/features/<slug>.md` for one page per system capability

At task start, read `project.md`, `rules.md`, `features.md`, and only relevant
feature pages. Read product, specs, and infra documents when their domains are
affected. Current source and configuration override stale docs. Preserve
unrelated manual content, mark approved but unimplemented work as planned, and
never store credentials, tokens, private keys, `.env` values, personal data,
hidden reasoning, or raw tool output.

The user-level plugin creates missing scaffold files and a managed local
`AGENTS.md` map. After each completed root response it runs a non-blocking,
single-writer audit using GPT 5.6 Sol Low, then Sonnet 5 Low once on failure.
Background and other child sessions never trigger recursive audits.
<!-- project-docs-global-end -->

<!-- graphify-begin -->
Graphify is the official codebase navigation method for OpenCode.

For every non-trivial codebase, architecture, dependency, call-flow, or
cross-file relationship question:

- If `graphify-out/graph.json` exists, run `graphify query "<question>"` before
  broad grep or raw file traversal. Use `graphify path "<A>" "<B>"` for
  relationships and `graphify explain "<concept>"` for a focused concept.
- Use `graphify-out/wiki/index.md` for broad navigation when present.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture context or
  when query/path/explain are insufficient.
- If no graph exists, invoke the installed Graphify skill to build one before
  non-trivial broad exploration. Exact-file reads for small direct changes are
  allowed.
- Dirty graph output is expected and is never a reason to bypass Graphify.
- After modifying code, run `graphify update .` when a graph exists.

Only skip Graphify when the user explicitly says not to use it, the task is
about stale/incorrect graph output, or indexing could expose secrets that have
not been excluded.
<!-- graphify-end -->

<!-- claude-mem-begin -->
Claude-mem is the official user-level source for cross-session work history.
Its worker and database live outside Git under `~/.claude-mem/`.

- Compression uses `qwen/qwen3.6-35b-a3b` directly through OpenRouter. Read the
  credential from `OPENROUTER_API_KEY`; do not duplicate it in settings. Tier
  routing is disabled and global agent concurrency is fixed at one.
- At session start, use injected claude-mem context as historical evidence,
  then verify it against current code and Graphify before acting.
- For questions about earlier work, decisions, attempts, commands, or prior
  sessions, call `claude_mem_search` before answering from memory.
- Never copy credentials or private-tagged content out of memory.
- Current user instructions and current repository state override stale memory.
- Do not disable capture or the worker unless the user explicitly requests
  maintenance of claude-mem itself.
<!-- claude-mem-end -->

<!-- codebase-memory-mcp-begin -->
Codebase-memory-mcp is always enabled as the local structural code intelligence
backend. Its cache and indexes live outside Git under
`~/.cache/codebase-memory-mcp/`.

For structural code discovery, use this priority:

1. `search_graph` for functions, classes, routes, and variables.
2. `trace_path` for inbound/outbound calls.
3. `get_code_snippet` for exact definitions.
4. `check_index_coverage` before material, negative, or exhaustive claims.
5. `query_graph` for complex graph patterns.
6. `get_architecture` for high-level structure.

At session start or after compaction, confirm project/generation with
`list_projects` or `index_status`. Default to Verify-tier evidence: relevant
graph queries, both trace directions when material, exact snippets, pagination,
and a single coverage check over every evidence path. Fall back to raw source
for reported gaps, literals, error messages, config values, non-code files, or
insufficient graph results.

Graphify remains the official broad codebase map and narrative layer;
codebase-memory-mcp is the always-on fast structural MCP backend. Use both when
architecture or cross-file relationships matter, reconcile disagreements
against current source, and never claim either index is complete without
coverage/freshness evidence.
<!-- codebase-memory-mcp-end -->
