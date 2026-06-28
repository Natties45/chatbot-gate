# chatbot-gate

Chatbot Gateway — AI-powered NOC and Operation support tool.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full design.

**Core concept:** opencode is a free standalone binary (MIT) that runs as a local HTTP server. This app calls opencode's API to provide AI-assisted chat for NOC and Operation teams.

## Structure

```
apps/web/        ← OLD (deprecated, incorrect AI integration)
apps/web1/       ← NEW (simplified, no login, tests core opencode integration)
.opencode/       ← opencode agent and prompt definitions
docs/            ← architecture documentation
```

## Quick Start

1. Install opencode binary (`opencode serve --hostname 0.0.0.0 --port 4096`)
2. `cd apps/web1 && npm install && npm run dev`
3. Open http://localhost:4568

## Dev

```bash
npm install          # from root (workspaces)
npm run dev --workspace=apps/web1
```
