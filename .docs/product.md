# Product

Documentation status: `verified`

Last verified: 2026-07-28

## Audience

The repository serves one OpenCode user who wants the same global agent
behavior and integrations across projects and machines.

## Problems

- Global configuration otherwise drifts between machines.
- Remote model gateways and memory workers can be unavailable silently.
- Credentials must remain outside version control.
- Codebase and project documentation need persistent, queryable context.
- Agent behavior should stay concise and implementation-focused.

## Outcomes

- One versioned source controls the active global OpenCode configuration.
- Install and update scripts restore pinned tools and integrations.
- Primary build models and GPT Sol High planning route through Merlin 9Router;
  Qwen 3.7 Flash handles memory compression.
- Memory, structural indexing, graph navigation, and documentation auditing
  are available in every project.

## Workflows

1. Clone the repository and prepare Node, Python/uv, and Merlin credentials.
2. Run the platform installer and authenticate OpenCode.
3. Open projects normally; global plugins start or check required services.
4. Commit configuration changes from this repository.

## Non-goals

- Storing credentials, OpenCode sessions, memory databases, or project graphs.
- Provisioning or authenticating the remote MerlinRouter service.
- Hosting a production service.

## Success signals

- `opencode debug config` succeeds.
- All repository tests pass.
- Merlin 9Router and claude-mem health endpoints respond.
