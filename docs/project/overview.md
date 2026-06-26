# Project Overview

## Purpose

`chatbot-gate` is a chatbot gateway app for users and admins. The app provides a web interface that talks to a server-side bridge, which then invokes `opencode` CLI and connects to MCP servers or a project knowledge base.

## Working Architecture

```text
External users/admins
        |
        v
Ubuntu server
        |
        +-- web app frontend
        |       |
        |       v
        +-- server-side API / CLI bridge
                |
                v
           opencode.ai CLI
                |
                v
             MCP / KB
```

## Initial Product Roles

- User: sends chatbot requests through the web app.
- Admin: manages configuration, knowledge sources, prompts, or operational settings.

## Early Constraints

- The browser must not call `opencode` CLI directly.
- CLI execution must be mediated by a server-side API layer.
- Admin capabilities must be separated from normal user capabilities.
- Tool and MCP choices are not finalized yet.
- Runtime implementation should wait for research and architecture review.

## Candidate Stack For Research

- Web app: Next.js, SvelteKit, or a simple backend plus static frontend.
- Backend bridge: Node.js or Python.
- CLI process control: restricted server-side process execution.
- Knowledge base: file-based docs first, then SQLite/PostgreSQL/vector search if needed.
- Deployment: Ubuntu, Nginx reverse proxy, systemd or Docker Compose.

## Open Questions

- Which runtime should host the web app and CLI bridge?
- Should chat responses stream with SSE or use request/response first?
- What authentication is required for user and admin access?
- Which MCP servers or KB sources are required for the first working version?
- Should deployment use Docker Compose or native systemd services?
