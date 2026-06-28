---
name: docker-deploy
description: Build and deploy chatbot-gate full stack (opencode + web1/Next.js + nginx + playwright-mcp + docker-mcp) via Docker Compose on Linux ARM64/AMD64. Includes image building, stack lifecycle, testing, and troubleshooting.
license: MIT
metadata:
  stack: opencode,nginx,nextjs,playwright,docker
  platform: linux/arm64,linux/amd64
  project: chatbot-gate
---

# Docker Deploy — chatbot-gate Full Stack

## Architecture

```
Docker Compose (5 services)
├── nginx:stable (:80) → web1:3000
│   └── proxy_read_timeout 300s (AI responses are slow)
├── web1 (node:22, Next.js prod, :3000)
│   ├── OPENCODE_SERVER_URL=http://opencode:4096
│   └── fetch timeout 120s for AI calls
├── opencode (ubuntu:24.04, opencode serve, :4096)
│   ├── agents/prompts from gate-answer/
│   ├── built-in free model (no API key)
│   ├── MCP → playwright-mcp:8931/sse
│   ├── MCP → docker-mcp:1234/sse
│   └── volume: /root/openstack-support:/root/openstack-support:ro (KB)
├── playwright-mcp (node:22-slim + @playwright/mcp, :8931)
└── docker-mcp (node:22-slim + dockerode, :1234)
        └── mount /var/run/docker.sock
```

### Production Server (203.154.16.197)

- **Location**: `/opt/chatbot-gate`
- **Architecture**: AMD64 (x86_64)
- **Knowledge Base**: `/root/openstack-support/` (mounted into opencode container)
- **SSH**: `root@203.154.16.197` with `natties45.pem`

## Prerequisites

- Docker Desktop 4.79+ (Linux ARM64/AMD64 containers)
- Docker Compose v2
- Ports free on host: 80 (nginx), 4096 (opencode)
- Base images pulled: `ubuntu:24.04`, `node:22`, `node:22-slim`, `nginx:stable`

## Files

| File | Purpose |
|------|---------|
| `Dockerfile.opencode` | Ubuntu 24.04 + opencode CLI binary (tar.gz, not .deb) |
| `Dockerfile.web1` | Node:22 Debian Bookworm (not Alpine) + Next.js build |
| `Dockerfile.mcp` | playwright-mcp with chromium + @playwright/mcp |
| `Dockerfile.docker-mcp` | dockerode MCP server for Docker management |
| `docker-compose.yml` | 5-service stack definition |
| `nginx.conf` | Reverse proxy web1:3000 on port 80 |
| `.dockerignore` | Excludes: node_modules, .next, .git, adr/, docs/, agents/, etc. |

## Build & Deploy

```powershell
# From project root
cd chatbot-gate

# Build all images
docker compose build

# Build specific services
docker compose build web1 playwright-mcp

# Start stack
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
docker compose logs web1 --tail 50

# Stop
docker compose down

# Rebuild + restart specific service
docker compose build opencode
docker compose up -d
```

## Test Plan

```powershell
# 1. Nginx → web1
curl -s http://localhost/ | Select-String "Chatbot Gate"

# 2. Next.js pages
curl -s -o /dev/null -w "%{http_code}" http://localhost/noc    # expect 200
curl -s -o /dev/null -w "%{http_code}" http://localhost/operation  # expect 200

# 3. opencode health
curl -s http://localhost:4096/global/health
# → {"healthy":true,"version":"1.17.11"}

# 4. opencode agents loaded
curl -s http://localhost:4096/agent | Select-String "noc-agent"

# 5. Playwright MCP
curl -s --max-time 3 http://localhost:8931/sse  # connects then times out
docker compose logs playwright-mcp

# 6. Docker MCP
docker compose logs docker-mcp
# → "Docker MCP server running on http://localhost:1234/sse"

# 7. API chat
curl -s -X POST http://localhost/api/chat/noc -H "Content-Type: application/json" -d '{"action":"init"}'
# → {"sessionId":"ses_..."}

# 8. Browser → http://localhost → NOC → New Case
```

## Key Decisions

### Base Images
- **All Debian/Ubuntu** (no Alpine) — matches production server environment
- `node:22` — official Debian Bookworm-based Node image

### opencode binary
- **Use `opencode-linux-arm64.tar.gz`** (CLI binary, ~52MB), **NOT** `opencode-desktop-linux-arm64.deb` (~108MB)
- The .deb installs an Electron GUI app to `/opt/OpenCode/` which is useless server-side
- The CLI binary is a single static binary extracted to `/usr/local/bin/`
- Download URL pattern:
  - ARM64: `https://github.com/anomalyco/opencode/releases/download/v{VERSION}/opencode-linux-arm64.tar.gz`
  - AMD64: `https://github.com/anomalyco/opencode/releases/download/v{VERSION}/opencode-linux-x64.tar.gz`

### MCP URLs in opencode.json
- `localhost` → Docker service names via `sed` in Dockerfile
- playwright-mcp: `http://playwright-mcp:8931/sse`
- docker-mcp: `http://docker-mcp:1234/sse`

### Session Creation
- opencode 1.17.11 **rejects** `{"title":"..."}` on POST /session (returns BadRequest)
- Workaround: send `{}`, then `PATCH /session/:id` with title if needed
- The web1 service was already updated to send `{}` only

### AI Model
- opencode has built-in free models via `opencode.ai/zen/v1`
- Default model: `big-pickle`
- Available free models: `deepseek-v4-flash-free`, `mimo-v2.5-free`, `nemotron-3-ultra-free`, `north-mini-code-free`
- **Known issue:** `opencode.ai/zen/v1/chat/completions` returns 500 Internal Server Error (as of 2026-06-28)
- Workarounds if free API is down:
  - Use **Ollama** as local provider: add to `opencode.json` providers
  - Configure a **paid API key** (OpenAI, Anthropic, etc.) via env vars

## Troubleshooting

### opencode: executable file not found
- Cause: Downloaded `.deb` (Desktop GUI) instead of CLI binary
- Fix: Change URL to `opencode-linux-arm64.tar.gz` or `opencode-linux-x64.tar.gz`

### opencode: bad file reference "gate-answer/agents/noc-agent.md"
- Cause: `gate-answer/` not copied into container
- Fix: Add `COPY gate-answer/ gate-answer/` to `Dockerfile.opencode`

### opencode API: SyntaxError JSON Parse error Expected '}'
- Cause: AI model provider (opencode.ai/zen) returns non-JSON or error response
- Fix: Wait for API to recover, or configure alternative provider (Ollama, API key)

### web1: JSON.parse error on API response
- Cause: opencode session creation returns BadRequest or unknown format
- Fix: Ensure `createSession()` sends `{}` as body (not `{title:...}`)

### web1: Session creation fails on first call after opencode restart
- Cause: opencode needs time to initialize project
- Fix: Add retry logic or health check wait period

### Port 4096 already in use
- Cause: Old systemd service or another process is using the port
- Fix: `systemctl stop opencode.service && systemctl disable opencode.service`
- Check: `ss -tlnp | grep 4096` or `fuser 4096/tcp`

### web1: UND_ERR_HEADERS_TIMEOUT
- Cause: Node.js fetch default timeout is too short for AI responses (30-90s)
- Fix: Add `signal: AbortSignal.timeout(120000)` to fetch calls in `opencode-service.ts`

### nginx: 504 Gateway Timeout
- Cause: nginx default proxy timeout is 60s, AI responses take longer
- Fix: Add to `nginx.conf`:
  ```nginx
  proxy_read_timeout 300s;
  proxy_send_timeout 300s;
  ```

### noc-agent: Cannot access knowledge base
- Cause: KB not mounted into container, or using relative paths
- Fix:
  1. Mount KB volume in `docker-compose.yml`:
     ```yaml
     volumes:
       - /root/openstack-support:/root/openstack-support:ro
     ```
  2. Use absolute paths in agent configs:
     ```yaml
     permission:
       read:
         allow:
           - /root/openstack-support/knowledge/**
     ```

### opencode container not reachable from web1
- Cause: Container not connected to Docker network
- Fix: Recreate the stack: `docker compose down && docker compose up -d`
- Check: `docker inspect chatbot-gate-opencode-1 --format '{{json .NetworkSettings.Networks}}'`

## Dockerfile Templates

### Dockerfile.opencode
```dockerfile
FROM ubuntu:24.04
RUN apt-get update && apt-get install -y curl ca-certificates --no-install-recommends && rm -rf /var/lib/apt/lists/*
ARG TARGETPLATFORM
RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
      URL="https://github.com/anomalyco/opencode/releases/download/v1.17.11/opencode-linux-arm64.tar.gz"; \
    else \
      URL="https://github.com/anomalyco/opencode/releases/download/v1.17.11/opencode-linux-x64.tar.gz"; \
    fi && \
    curl -fsSL "$URL" | tar xzf - -C /usr/local/bin/
WORKDIR /chatbot-gate
COPY .opencode/ .opencode/
COPY gate-answer/ gate-answer/
RUN sed -i 's|http://localhost:8931|http://playwright-mcp:8931|g' .opencode/opencode.json && \
    sed -i 's|http://localhost:1234|http://docker-mcp:1234|g' .opencode/opencode.json
EXPOSE 4096
CMD ["opencode", "serve", "--hostname", "0.0.0.0", "--port", "4096"]
```

### Dockerfile.web1
```dockerfile
FROM node:22 AS base
WORKDIR /app
COPY package*.json ./
COPY apps/web1/package*.json ./apps/web1/
RUN npm install
COPY . .
FROM base AS prod
RUN cd apps/web1 && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npm run start --workspace=apps/web1"]
```

### docker-compose.yml
```yaml
services:
  opencode:
    build:
      context: .
      dockerfile: Dockerfile.opencode
    ports:
      - "4096:4096"
    volumes:
      - opencode-data:/home/opencode
      - /root/openstack-support:/root/openstack-support:ro  # Knowledge Base
    restart: unless-stopped
  web1:
    build:
      context: .
      dockerfile: Dockerfile.web1
      target: prod
    environment:
      - OPENCODE_SERVER_URL=http://opencode:4096
      - NODE_ENV=production
    depends_on:
      - opencode
    restart: unless-stopped
  nginx:
    image: nginx:stable
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      web1:
        condition: service_healthy
    restart: unless-stopped
  playwright-mcp:
    build:
      context: .
      dockerfile: Dockerfile.mcp
    restart: unless-stopped
  docker-mcp:
    build:
      context: .
      dockerfile: Dockerfile.docker-mcp
    environment:
      - PORT=1234
      - DOCKER_HOST=unix:///var/run/docker.sock
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
volumes:
  opencode-data:
```

## Production Deployment

### Server Details
- **IP**: 203.154.16.197
- **OS**: Ubuntu AMD64
- **Location**: `/opt/chatbot-gate`
- **SSH**: `root@203.154.16.197` with `natties45.pem`
- **Knowledge Base**: `/root/openstack-support/` (9 OLS categories)

### Deploy from Windows

```powershell
# 1. Package code (exclude unnecessary files)
cd C:\Users\natti\OneDrive\Documents\natties45\chatbot-gate
tar.exe -czf C:\Users\natti\AppData\Local\Temp\opencode\chatbot-gate-deploy.tar.gz `
  --exclude=node_modules `
  --exclude=.next `
  --exclude=.git `
  --exclude=*.pem `
  --exclude=*.db `
  --exclude=apps/web `
  .

# 2. Upload to server
scp -i natties45.pem C:\Users\natti\AppData\Local\Temp\opencode\chatbot-gate-deploy.tar.gz root@203.154.16.197:/tmp/

# 3. Extract on server
ssh -i natties45.pem root@203.154.16.197
mkdir -p /opt/chatbot-gate
cd /opt/chatbot-gate
tar -xzf /tmp/chatbot-gate-deploy.tar.gz
rm /tmp/chatbot-gate-deploy.tar.gz

# 4. Build and deploy
docker compose build
docker compose up -d

# 5. Verify
docker compose ps
curl -s http://localhost/noc
curl -s http://localhost:4096/global/health
```

### Cleanup Old Deployment

```bash
# Stop and remove old containers
cd /opt/chatbot-gate
docker compose down --remove-orphans
docker compose down --rmi all --volumes
docker system prune -f

# Remove old files (if needed)
rm -rf /opt/chatbot-gate
```

### Update Running Deployment

```bash
cd /opt/chatbot-gate

# Update specific service
docker compose build --no-cache web1
docker compose up -d web1

# Update all services
docker compose build
docker compose up -d

# Check logs
docker compose logs -f web1
```

### Verify NOC Flow

```bash
# Test via API
curl -s -X POST http://localhost/api/chat/noc \
  -H "Content-Type: application/json" \
  -d '{"action":"init"}'
# → {"sessionId":"ses_..."}

# Send message (takes 20-90s)
curl -s -X POST http://localhost/api/chat/noc \
  -H "Content-Type: application/json" \
  -d '{"action":"message","sessionId":"ses_...","message":"VM ไม่สามารถ SSH ได้","promptType":"analyze"}'
# → Analysis with category, confidence, KB sources
```

### Key Files on Server

| Path | Purpose |
|------|---------|
| `/opt/chatbot-gate/` | Docker Compose stack |
| `/opt/chatbot-gate/.opencode/opencode.json` | Agent configs |
| `/opt/chatbot-gate/gate-answer/` | Prompts and templates |
| `/root/openstack-support/` | Knowledge Base (mounted into opencode) |
| `/root/openstack-support/knowledge/*.yaml` | 9 OLS category files |

### Performance Benchmarks

| Metric | Value |
|--------|-------|
| NOC AI response (with KB) | 21-26 seconds |
| NOC AI response (no KB) | 67 seconds |
| Container startup | ~10 seconds |
| Memory usage (all containers) | ~1.5GB |
| Disk usage (images + data) | ~15GB |

## References

- Build history: `docs/build-history-2026-06-28-deploy.md`
- Architecture: `docs/architecture.md`
- Production pilot (old): `docs/production-pilot-log-2026-06-27.md`

