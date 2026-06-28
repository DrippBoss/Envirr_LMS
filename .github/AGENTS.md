# Custom Agents

This repository defines workspace-specific custom agents for Copilot Chat and related automation workflows.

- `auto-sanity-check` — `.github/agents/auto-sanity-check.agent.md`
  - Use for scheduled product sanity audits across the Envirr LMS repository.
  - Intended to identify broken features, failing tests, and code issues, then report findings and propose solution PRs.
  - Triggered manually via Copilot Chat or used as the anchor for automation workflows.
