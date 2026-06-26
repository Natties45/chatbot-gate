# chatbot-gate

`chatbot-gate` is an app project for a web-based chatbot gateway deployed on an Ubuntu Linux server.

The initial architecture is intentionally minimal:

```text
user/admin -> web app frontend -> server-side opencode.ai CLI bridge -> MCP / KB
```

## Current Scope

- Build a chatbot web app with separate user and admin access paths.
- Keep `opencode` CLI execution on the server side only.
- Connect the CLI bridge to MCP servers and/or a knowledge base.
- Start with research and architecture before choosing runtime tools.
- Deploy to Ubuntu Linux after the implementation approach is approved.

## Initial Decisions

- Project type: app
- Naming theme: Final Fantasy IX
- Initial agents:
  - `vivi-researcher`
  - `cid-architect`
- Preferred deployment direction: Ubuntu Linux server, likely with Nginx and either systemd or Docker Compose after runtime selection.

## Project Files

- `docs/project/overview.md` contains the project overview and working architecture.
- `adr/ADR-0001-project-foundation.md` records the first project foundation decision.
- `agents/` contains self-contained project agent specs.
- `governance/source-of-truth.md` defines where decisions should live.

## Next Work

1. Use `vivi-researcher` to compare frontend/backend/runtime options.
2. Use `cid-architect` to turn the chosen approach into an implementation design.
3. Approve the runtime scaffold before adding application code.
