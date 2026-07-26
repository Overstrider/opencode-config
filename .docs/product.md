# Product

Documentation status: `verified`

Last verified: 2026-07-26

## Audience

The repository serves one OpenCode user who wants the same global agent
behavior and integrations across projects and machines.

## Problems

- Global configuration otherwise drifts between machines.
- Local model gateways and memory workers can be unavailable silently.
- Credentials must remain outside version control.
- Codebase and project documentation need persistent, queryable context.
- Agent behavior should stay concise and implementation-focused.

## Outcomes

- One versioned source controls the active global OpenCode configuration.
- Install and update scripts restore pinned tools and integrations.
- Primary models route through 9Router; auxiliary Qwen calls use OpenRouter.
- Memory, structural indexing, graph navigation, and documentation auditing
  are available in every project.

## Workflows

1. Clone the repository and prepare Node, Python/uv, 9Router, and OpenRouter.
2. Run the platform installer and authenticate OpenCode.
3. Open projects normally; global plugins start or check required services.
4. Commit configuration changes from this repository.

## Non-goals

- Storing credentials, OpenCode sessions, memory databases, or project graphs.
- Installing or authenticating the external MerlinRouter checkout.
- Hosting a production service.

## Success signals

- `opencode debug config` succeeds.
- All repository tests pass.
- 9Router and claude-mem health endpoints respond.
- A normal root prompt receives prompt-enhancer metadata.
