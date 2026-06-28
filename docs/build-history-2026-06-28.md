# Build History — 2026-06-28

## Objective

Deploy `apps/web1` (Next.js) in Docker locally on Windows ARM (Docker Desktop) simulating Ubuntu Linux server, with full stack including opencode AI server, Playwright MCP, and Docker MCP.

## Architecture

```
Docker Compose (5 services)
├── nginx:stable (:80) → web1:3000
├── web1 (node:22, Next.js prod, :3000)
│   └── OPENCODE_SERVER_URL=http://opencode:4096
├── opencode (ubuntu:24.04, opencode serve, :4096)
│   ├── agents/prompts from gate-answer/  ← built-in free model (no API key needed)
│   ├── MCP → playwright-mcp:8931/sse
│   └── MCP → docker-mcp:1234/sse
├── playwright-mcp (node:22-slim + @playwright/mcp, :8931)
└── docker-mcp (node:22-slim + dockerode, :1234)
        └── mount /var/run/docker.sock
```

## Key Discoveries

- **opencode has built-in free models** — No API key required. AI service works immediately after `opencode serve`.
- **Linux ARM64 binary exists** — `opencode-desktop-linux-arm64.deb` available on GitHub releases v1.17.11+.
- **Dockerfile.opencode** uses `TARGETPLATFORM` build arg to auto-select ARM64 or AMD64 binary.

## Files Changed

| File | Change |
|------|--------|
| `Dockerfile.opencode` | **Created** — Ubuntu 24.04 + opencode binary |
| `Dockerfile.web1` | `node:22-alpine` → `node:22` (Debian Bookworm) |
| `docker-compose.yml` | Full 5-service stack (was 2) |
| `.dockerignore` | Added exclusions: `adr/`, `docs/`, `agents/`, `governance/`, `packages/`, `apps/web/` |

## Dockerfile.opencode Detail

```dockerfile
FROM ubuntu:24.04 AS base
RUN apt-get update && apt-get install -y curl ca-certificates --no-install-recommends
ARG TARGETPLATFORM
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
      URL="https://github.com/anomalyco/opencode/releases/download/v1.17.11/opencode-desktop-linux-arm64.deb"; \
    else \
      URL="https://github.com/anomalyco/opencode/releases/download/v1.17.11/opencode-desktop-linux-amd64.deb"; \
    fi && \
    curl -fsSL -o /tmp/opencode.deb "$URL" && \
    apt-get install -y /tmp/opencode.deb && \
    rm /tmp/opencode.deb
WORKDIR /chatbot-gate
COPY .opencode/ .opencode/
RUN sed -i 's|http://localhost:8931|http://playwright-mcp:8931|g' .opencode/opencode.json && \
    sed -i 's|http://localhost:1234|http://docker-mcp:1234|g' .opencode/opencode.json
EXPOSE 4096
CMD ["opencode", "serve", "--hostname", "0.0.0.0", "--port", "4096"]
```

## Build & Run Commands

```powershell
# From project root
cd C:\Users\natti\OneDrive\Documents\natties45\chatbot-gate

# Build all images (first time, takes ~5-10min)
docker compose build

# Start stack
docker compose up -d

# Check status
docker compose ps
docker compose logs -f

# Stop
docker compose down
```

## Test Plan (run after `docker compose up -d`)

| Step | Command | Expected |
|------|---------|----------|
| 1 | `curl http://localhost/` | Next.js page HTML |
| 2 | `curl http://localhost:4096/global/health` | opencode health OK |
| 3 | `curl http://localhost:8931/sse` | SSE endpoint (stays connected) |
| 4 | `curl http://localhost:1234/sse` | SSE endpoint (stays connected) |
| 5 | Browser → http://localhost → NOC → New Case | Session created |
| 6 | Browser → Send message | AI responds (free model) |
| 7 | `docker compose logs opencode` | MCP registered, no errors |

## Notes for Next Build

- opencode's free built-in models work out of the box — no API keys needed
- Test MCP connectivity via SSE endpoints first
- If opencode binary version changes, update URL in Dockerfile.opencode
- For production server (AMD64), `TARGETPLATFORM` auto-selects correct binary
