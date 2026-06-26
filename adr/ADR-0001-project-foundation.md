# ADR-0001: Project Foundation

## Status

Accepted

## Context

The project needs a minimal foundation for a chatbot app that will run on an Ubuntu Linux server. The app is expected to expose a web frontend for users and admins, while using `opencode` CLI and MCP or knowledge-base integrations on the server side.

The exact runtime tools are not finalized. The first project step should preserve flexibility while documenting the main boundaries.

## Decision

Create `chatbot-gate` as an app project with a minimal knowledge scaffold only. Do not add runtime application code until the tool choices are researched and approved.

Use Final Fantasy IX as the project agent naming theme.

Initial agents:

- `vivi-researcher` for tool, MCP, KB, security, and deployment research.
- `cid-architect` for architecture decisions and implementation plans.

Keep `opencode` CLI behind a server-side bridge. The browser must never execute CLI commands directly.

## Consequences

- The project starts with clear documentation and agent ownership, not premature framework code.
- Runtime decisions remain open until research is complete.
- Security and deployment boundaries are visible from the first ADR.
- Additional agents or runtime adapters can be added later only when there is a concrete need.
