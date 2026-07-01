# Deployment Plan - app2 v2.0.0 Phase 9

> **Status:** Planned (not yet deployed)
> **Scope:** Deploy `apps/app2` alongside `apps/web1` on production server `203.154.16.197`
> **Strategy:** Parallel run - web1 continues serving `/`, app2 serves `/app2`

---

## Current State (Before Phase 9)

| Container | Port | Purpose |
|-----------|------|---------|
| nginx | 80 (public) | Reverse proxy -> web1:3000 |
| web1 | 3000 (internal) | Next.js app v1.10.0 |
| opencode | 4096 | AI engine |
| playwright-mcp | 8931 | Browser automation MCP |
| docker-mcp | 1234 | Docker management MCP |

Nginx routes: `/` -> web1:3000, 300s timeouts.

---

## Target State (After Phase 9)

| Container | Port | Purpose |
|-----------|------|---------|
| nginx | 80 (public) | `/` -> web1, `/app2` -> app2 |
| web1 | 3000 (internal) | Next.js v1.10.0 (unchanged) |
| **app2** (new) | 3001 (internal) | Next.js v2.0.0 free-first LLM |
| **ollama** (new) | 11434 (internal) | Local fallback model qwen3:4b |
| **kb-mcp** (new) | 4101 (internal) | Knowledge base search/read |
| **case-history-mcp** (new) | 4102 (internal) | Case memory retrieval |
| opencode | 4096 | AI engine (web1 still uses) |
| playwright-mcp | 8931 | Browser automation (unchanged) |
| docker-mcp | 1234 | Docker management (unchanged) |

Nginx routes:
- `/` -> web1:3000
- `/app2` -> app2:3001
- 300s timeouts for all proxy paths

---

## Infrastructure Changes

### 1. docker-compose.yml Additions

```yaml
services:
  # --- Existing services remain unchanged ---
  # opencode, web1, nginx, docker-mcp, playwright-mcp

  # --- New: app2 ---
  app2:
    build:
      context: .
      dockerfile: apps/app2/Dockerfile
      target: prod
    environment:
      - GROQ_API_KEY=${GROQ_API_KEY}
      - OLLAMA_BASE_URL=http://ollama:11434
      - APP2_PRIMARY_PROVIDER=groq
      - APP2_PRIMARY_MODEL=qwen/qwen3-32b
      - APP2_FALLBACK_PROVIDER=ollama
      - APP2_FALLBACK_MODEL=qwen3:4b
      - DATABASE_URL=file:/app/apps/app2/data/app2.db
      - KNOWLEDGE_REPO_PATH=/root/openstack-support
      - MCP_KB_URL=http://kb-mcp:4101
      - MCP_CASE_HISTORY_URL=http://case-history-mcp:4102
      - MCP_DOCKER_URL=http://docker-mcp:1234
      - NODE_ENV=production
    volumes:
      - app2-data:/app/apps/app2/data
      - /root/openstack-support:/root/openstack-support:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/noc"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 30s

  # --- New: Ollama (local fallback LLM) ---
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 4G

  # --- New: kb-mcp (knowledge base search) ---
  kb-mcp:
    build:
      context: .
      dockerfile: Dockerfile.kb-mcp
    environment:
      - PORT=4101
      - KNOWLEDGE_REPO_PATH=/root/openstack-support
    volumes:
      - /root/openstack-support:/root/openstack-support:ro
    restart: unless-stopped

  # --- New: case-history-mcp (case memory) ---
  case-history-mcp:
    build:
      context: .
      dockerfile: Dockerfile.case-history-mcp
    environment:
      - PORT=4102
      - DATABASE_URL=file:/app/apps/app2/data/app2.db
    volumes:
      - app2-data:/app/apps/app2/data
    restart: unless-stopped

volumes:
  # --- Existing volumes ---
  opencode-data:
  web1-data:

  # --- New volumes ---
  app2-data:
  ollama-data:
```

### 2. nginx.conf Update

```nginx
server {
    listen 80;
    server_name _;

    # app2 routes - must come before catch-all / location
    location /app2 {
        proxy_pass http://app2:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Prefix /app2;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 300s;
    }

    # web1 routes (default)
    location / {
        proxy_pass http://web1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 300s;
    }
}
```

### 3. New Dockerfiles Required

**Dockerfile.kb-mcp**
```dockerfile
FROM node:22 AS base
WORKDIR /app
COPY mcp/servers/kb-mcp/package*.json ./
RUN npm install
COPY mcp/servers/kb-mcp/ .
EXPOSE 4101
CMD ["node", "index.js"]
```

**Dockerfile.case-history-mcp**
```dockerfile
FROM node:22 AS base
WORKDIR /app
COPY mcp/servers/case-history-mcp/package*.json ./
RUN npm install
COPY mcp/servers/case-history-mcp/ .
EXPOSE 4102
CMD ["node", "index.js"]
```

### 4. Environment Variables

Create `.env.production` in project root:

```env
# Required
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional (defaults shown)
OLLAMA_BASE_URL=http://ollama:11434
APP2_PRIMARY_PROVIDER=groq
APP2_PRIMARY_MODEL=qwen/qwen3-32b
APP2_FALLBACK_PROVIDER=ollama
APP2_FALLBACK_MODEL=qwen3:4b
```

---

## Deployment Steps

### Prerequisites

- [ ] Server `203.154.16.197` accessible via SSH
- [ ] Docker 29+ and Docker Compose 2.40+ installed
- [ ] Knowledge repo exists at `/root/openstack-support/`
- [ ] Groq Free API key obtained (https://console.groq.com)
- [ ] At least 10GB free disk space (Ollama model ~2.5GB)
- [ ] At least 4GB free RAM (Ollama needs ~3GB)

### Step 1: Package and Upload Code

```powershell
# On Windows development machine
cd C:\Users\natti\OneDrive\Documents\natties45\chatbot-gate

tar.exe -czf C:\Users\natti\AppData\Local\Temp\opencode\chatbot-gate-app2-deploy.tar.gz `
  --exclude=node_modules `
  --exclude=.next `
  --exclude=.git `
  --exclude=*.pem `
  --exclude=*.db `
  ` -exclude=apps/web `
  .
```

```powershell
# Upload to server
scp -i natties45.pem `
  C:\Users\natti\AppData\Local\Temp\opencode\chatbot-gate-app2-deploy.tar.gz `
  root@203.154.16.197:/tmp/
```

### Step 2: Extract and Prepare on Server

```bash
ssh -i natties45.pem root@203.154.16.197

# Backup current deployment
cp -r /opt/chatbot-gate /opt/chatbot-gate.backup.$(date +%Y%m%d)

# Extract update
cd /opt/chatbot-gate
tar -xzf /tmp/chatbot-gate-app2-deploy.tar.gz
rm /tmp/chatbot-gate-app2-deploy.tar.gz

# Create .env.production with Groq key
cat > .env.production << 'EOF'
GROQ_API_KEY=your_groq_key_here
EOF

# Set proper permissions
chmod 600 .env.production
```

### Step 3: Preload Ollama Model

```bash
# Pull Ollama image and start container
docker compose up -d ollama

# Wait for Ollama to be ready
sleep 10

# Preload qwen3:4b model (~2.5GB download, 5-15 min)
docker exec chatbot-gate-ollama-1 ollama pull qwen3:4b

# Verify model is available
docker exec chatbot-gate-ollama-1 ollama list
# Expected: qwen3:4b
```

### Step 4: Build and Start New Services

```bash
cd /opt/chatbot-gate

# Build new services (app2, kb-mcp, case-history-mcp)
docker compose build app2 kb-mcp case-history-mcp

# Start new services alongside existing ones
docker compose up -d app2 kb-mcp case-history-mcp

# Wait for health checks
sleep 30

# Reload nginx with updated config
docker compose restart nginx
```

### Step 5: Verify Container Status

```bash
docker compose ps

# Expected (9 containers total):
# chatbot-gate-nginx-1              Up
# chatbot-gate-web1-1               Up (healthy)
# chatbot-gate-app2-1               Up (healthy)
# chatbot-gate-ollama-1             Up
# chatbot-gate-kb-mcp-1             Up
# chatbot-gate-case-history-mcp-1   Up
# chatbot-gate-opencode-1           Up
# chatbot-gate-playwright-mcp-1     Up
# chatbot-gate-docker-mcp-1         Up
```

---

## Verification Checklist

### Tier 1: Basic Health

- [ ] All 9 containers running: `docker compose ps`
- [ ] web1 still accessible at `http://203.154.16.197/`
- [ ] web1 NOC page loads at `http://203.154.16.197/noc`
- [ ] web1 Operation page loads at `http://203.154.16.197/operation`
- [ ] app2 NOC page loads at `http://203.154.16.197/app2/noc`
- [ ] app2 Operation page loads at `http://203.154.16.197/app2/operation`
- [ ] app2 History page loads at `http://203.154.16.197/app2/history`
- [ ] app2 Settings page loads at `http://203.154.16.197/app2/settings`

### Tier 2: API Endpoints

- [ ] `GET /app2/api/auth/profile` returns 401 (no auth) - auth working
- [ ] `POST /app2/api/auth/login` with admin credentials returns user data
- [ ] `GET /app2/api/cases` returns case list
- [ ] `GET /app2/api/settings` returns settings + providers
- [ ] `GET /app2/api/admin/knowledge-sync/status` returns sync status (admin only)
- [ ] `POST /app2/api/admin/knowledge-sync/action` with `check_status` works (admin only)

### Tier 3: LLM Provider Connectivity

- [ ] Groq connectivity: `curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"` returns model list
- [ ] Ollama connectivity: `docker exec chatbot-gate-ollama-1 ollama list` shows `qwen3:4b`
- [ ] Ollama health: `curl -s http://203.154.16.197:11434/api/tags` returns model list
- [ ] Groq ~ rate limit check configured correctly

### Tier 4: MCP Services

- [ ] kb-mcp accessible: `docker exec chatbot-gate-app2-1 wget -qO- http://kb-mcp:4101/health`
- [ ] case-history-mcp accessible: `docker exec chatbot-gate-app2-1 wget -qO- http://case-history-mcp:4102/health`
- [ ] docker-mcp still accessible from app2: `docker exec chatbot-gate-app2-1 wget -qO- http://docker-mcp:1234/health`
- [ ] kb-mcp can read knowledge repo: verify files visible at `/root/openstack-support/` inside kb-mcp container

### Tier 5: Database

- [ ] app2 SQLite DB created at `/opt/chatbot-gate/volumes/app2-data/app2.db`
- [ ] User tables seeded (admin user exists)
- [ ] Settings defaults loaded correctly
- [ ] ToolCallLog and LlmCallLog tables exist

---

## Testing Scenarios

### Test 1: NOC Chat Flow (Groq Primary)

```bash
# Login
LOGIN=$(curl -s -X POST http://localhost/app2/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}')
echo "$LOGIN"

# Init session
INIT=$(curl -s -X POST http://localhost/app2/api/chat/noc \
  -H "Content-Type: application/json" \
  -d '{"action":"init"}')
echo "$INIT"
SID=$(echo "$INIT" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")

# Send analyze message (expect ~5-30s)
curl -s -m 120 -X POST http://localhost/app2/api/chat/noc \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"message\",\"sessionId\":\"$SID\",\"message\":\"VM \u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16 SSH \u0e44\u0e14\u0e49\",\"promptType\":\"analyze\"}"

# Expected: Thai analysis with provider info
# {"response":"...","provider":"groq","model":"qwen/qwen3-32b"}
```

### Test 2: Operation Chat Flow

```bash
# Init
INIT=$(curl -s -X POST http://localhost/app2/api/chat/operation \
  -H "Content-Type: application/json" \
  -d '{"action":"init"}')
SID=$(echo "$INIT" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")

# Send message
curl -s -m 120 -X POST http://localhost/app2/api/chat/operation \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"message\",\"sessionId\":\"$SID\",\"message\":\"nginx container restarting repeatedly\"}"
```

### Test 3: Knowledge Sync (Admin)

```bash
# Check KB sync status
curl -s http://localhost/app2/api/admin/knowledge-sync/status

# Pull latest knowledge
curl -s -X POST http://localhost/app2/api/admin/knowledge-sync/action \
  -H "Content-Type: application/json" \
  -d '{"action":"pull_latest"}'
```

### Test 4: Settings API

```bash
# Get settings (should show Groq/Ollama providers)
curl -s http://localhost/app2/api/settings

# Expected providers:
# [{"id":"groq","name":"Groq Free","models":["qwen/qwen3-32b"]},
#  {"id":"ollama","name":"Ollama Local","models":["qwen3:4b"]}]
```

### Test 5: Case Persistence

```bash
# List cases
curl -s "http://localhost/app2/api/cases?status=in_progress"

# Export cases
curl -s "http://localhost/app2/api/cases/export?from=2026-07-01&to=2026-07-01" \
  -o /tmp/cases.md

# Verify exported file has content
wc -l /tmp/cases.md
```

### Test 6: Fallback Scenario

Manual test in browser:

1. Temporarily invalidate Groq API key (or exhaust quota)
2. Create new NOC case at `/app2/noc`
3. Send message - app2 should fallback to Ollama
4. Response should include `fallbackFrom: groq` in API response
5. Browser UI should show Ollama provider badge

### Test 7: Tool Call Logging

```bash
# After running NOC/Operation chat, check tool call logs
docker exec chatbot-gate-app2-1 node -e "
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
prisma.toolCallLog.findMany({take:10,orderBy:{createdAt:'desc'}}).then(console.log);
"
```

---

## Rollback Plan

### If app2 breaks, web1 still works

Since web1 is unchanged and serves `/` while app2 serves `/app2`:

**Quick disable (no downtime for web1):**
```bash
# Stop app2 container only
docker compose stop app2

# Restore old nginx config (without /app2 route)
cp nginx.conf.backup nginx.conf
docker compose restart nginx
```

**Full rollback:**
```bash
# Stop app2 + new services
docker compose stop app2 ollama kb-mcp case-history-mcp

# Restore backup
cp -r /opt/chatbot-gate.backup.YYYYMMDD/docker-compose.yml /opt/chatbot-gate/
cp -r /opt/chatbot-gate.backup.YYYYMMDD/nginx.conf /opt/chatbot-gate/

# Restart existing services
docker compose up -d web1 nginx
```

### Key Safety Measures

1. web1 is **never stopped** during app2 deployment
2. nginx routes are **additive only** - web1 `/` route stays
3. app2 uses **separate volume** (app2-data) - doesn't touch web1-data
4. app2 uses **separate DB** (app2.db) - doesn't touch web1 DB
5. opencode container is **not touched** - web1 still uses it
6. Backup created **before** any changes

---

## Cutover Readiness Checklist

Before declaring app2 ready for cutover (replacing web1):

- [ ] NOC chat answers without opencode (verified 10+ cases)
- [ ] Operation chat answers without opencode (verified 10+ cases)
- [ ] Groq primary path works with `qwen/qwen3-32b`
- [ ] Ollama fallback works when Groq unavailable
- [ ] KB retrieval works through kb-mcp
- [ ] Case history retrieval works through case-history-mcp
- [ ] Cases close with summary/detail saved
- [ ] Tool and LLM call logs are visible in DB
- [ ] No destructive tools are reachable from app2
- [ ] Thai eval set passes (NOC: 10 cases, Operation: 10 cases)
- [ ] Fallback eval set passes (5 cases)
- [ ] Memory usage stable: app2 + Ollama < 4GB total
- [ ] Response times acceptable: Groq < 30s, Ollama < 120s
- [ ] Docker MCP read-only verified (denied tools produce proper errors)
- [ ] Knowledge sync admin actions work without breaking

---

## Disk Space Budget

| Component | Size |
|-----------|------|
| app2 Docker image | ~500MB |
| Ollama Docker image | ~3GB |
| qwen3:4b model | ~2.5GB |
| kb-mcp + case-history-mcp images | ~300MB each |
| app2.db (initial) | < 10MB |
| **Total new disk usage** | **~6.6GB** |
| Available on server | ~84GB |

---

## Memory Budget

| Component | Typical | Peak |
|-----------|---------|------|
| app2 (Next.js) | ~200MB | ~500MB |
| Ollama (qwen3:4b) | ~2.5GB | ~3.5GB |
| kb-mcp | ~50MB | ~100MB |
| case-history-mcp | ~50MB | ~100MB |
| **Total new memory** | **~2.8GB** | **~4.2GB** |
| Available on server | ~6.8GB | |
| **Headroom** | **~2.6GB** | |

---

## Timeline Estimate

| Step | Time |
|------|------|
| Code upload | 2 min |
| Ollama image pull | 5 min |
| qwen3:4b model download | 10-15 min |
| Docker build (app2, kb-mcp, case-history-mcp) | 5 min |
| Container start + health check | 2 min |
| nginx reload | < 1 min |
| Verification tests | 10 min |
| **Total** | **~35 min** |
