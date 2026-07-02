# Deployment Plan — v2.4.0

> **Status:** Ready to deploy
> **Date:** 2026-07-02
> **Scope:** Deploy CI/CD agent + prompt volume mount + full NOC/Operation UI upgrade

---

## Prerequisites

| Requirement | Minimum |
|-------------|---------|
| OS | Ubuntu/Debian AMD64 |
| Docker | >= 26 |
| Docker Compose | >= 2.30 |
| RAM free | >= 4 GB |
| Disk free | >= 10 GB |
| Ports free | 80, 4096 |
| Git | installed |
| Groq API key | https://console.groq.com |

---

## What's New (from v2.0.1)

| Feature | Phase | Description |
|---------|-------|-------------|
| `/api/health` + path foundation | 1 | Health endpoint with DB check, nginx root → /app2 redirect, compose healthcheck patched |
| Dashboard + Login UI | 2 | Role-based Dashboard after login, responsive Sidebar/AppLayout, dark hero login screen |
| Settings KB + Deploy tabs | 3 | KB Auto-Generate tab (schedule/toggle/manual), Deploy tab (version/history/logs) |
| NOC Clarify → Escalate/Handoff | 4 | 6-state NOC flow, structured option buttons, file upload, escalate to Operation |
| Operation Research + Diagnose | 5 | Clarify → sequential research (KB→OpenCode→Docker) → progress polling → diagnosis grid |
| KB Auto-Generate | 6 | YAML writer for closed cases, split `auto-generated/YYYY-MM-DD/`, git push only auto-generated/ |
| Deploy Agent + Prompt Volume | 7 | deploy-agent sidecar with health-check rollback, one-click deploy from Settings, prompt volume mount rw |

---

## Setup Files Verified

| File | Status | Notes |
|------|--------|-------|
| `docker-compose.yml` | ✓ | deploy-agent service added, prompt volume mount added, app2 healthcheck uses /app2/api/health |
| `nginx.conf` | ✓ | root `/` → 302 redirect to `/app2$request_uri` |
| `Dockerfile.deploy-agent` | ✓ | Node 22, git + docker.io installed, socket mount via compose |
| `apps/app2/Dockerfile` | ✓ | `COPY . .` covers all new files, includes git+openssh-client |
| `Dockerfile.kb-mcp` | ✓ | Unchanged |
| `Dockerfile.case-history-mcp` | ✓ | Unchanged |
| `Dockerfile.docker-mcp` | ✓ | Unchanged |
| `Dockerfile.opencode` | ✓ | Unchanged |
| `deploy-agent.mjs` | ✓ | Node syntax check passed, endpoints /status /history /deploy/app2/:tag |
| `install.sh` | ✓ | Updated: v2.4.0, 8 services include deploy-agent, health + dashboard checks added |

---

## Container Architecture (v2.4.0)

```
                   ┌────────────────────────────────────┐
                   │           nginx :80                 │
                   │  /     → 302 /app2$request_uri      │
                   │  /app2 → proxy app2:3001            │
                   └──────────────┬─────────────────────┘
                                  │
    ┌─────────────┬───────────────┼───────────────┬──────────────┐
    │             │               │               │              │
    ▼             ▼               ▼               ▼              ▼
┌───────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
│ app2  │  │deploy-   │  │ opencode  │  │  ollama   │  │  kb-mcp   │
│:3001  │  │agent     │  │ :4096     │  │  :11434   │  │  :4101    │
│ Next  │  │:4105     │  │ served    │  │  qwen3:4b │  │  served   │
│ 15.5  │  │sidecar   │  │           │  │           │  │           │
└───┬───┘  └─────┬─────┘  └───────────┘  └───────────┘  └───────────┘
    │            │
    │  prompt    │  docker.sock
    │  volume    │  + repo vol
    ▼            ▼
┌────────┐  ┌─────────────┐
│gate-   │  │/root/       │
│answer- │  │chatbot-gate │
│app2/   │  │(git repo)   │
└────────┘  └─────────────┘

┌───────────┐  ┌───────────┐
│case-hist  │  │docker-mcp │
│ :4102     │  │ :1234     │
│ served    │  │ served    │
└───────────┘  └───────────┘
```

---

## Deploy Steps

### 1. Prerequisites Check

```bash
ssh root@<SERVER_IP>
docker --version           # >= 26
docker compose version     # >= 2.30
df -h /                    # >= 10GB free
free -h                    # >= 4GB free
systemctl status docker    # running
ss -tlnp | grep -E ':80 |:4096 '  # ports free
```

### 2. Pull Latest Code

```bash
cd /opt/chatbot-gate
git fetch --tags
git checkout v2.4.0

# Or if deploying from main directly:
git pull origin main
```

### 3. Run Installer

```bash
cd /opt/chatbot-gate
bash install.sh

# Or non-interactive:
bash install.sh --yes
```

The installer executes in 8 sections:

| Section | Description | Approx Time |
|---------|-------------|-------------|
| 1/7 | Prerequisites check (Docker, disk, RAM, ports) | 5s |
| 2/7 | Detect fresh/upgrade mode | 5s |
| 3/7 | .env setup (GROQ_API_KEY, admin password) | interactive |
| 4/7 | Clone knowledge base from GitHub | ~30s |
| 5/7 | Preload Ollama qwen3:4b (~2.5GB) | 10-15 min |
| 6/7 | Build all 8 Docker images | 5-10 min |
| 7/7 | Verify (HTTP endpoints, API, login, MCP, Ollama, opencode) | 2 min |

### 4. Verification Checklist

```bash
# Dashboard
curl -s -o /dev/null -w '%{http_code}' http://localhost/app2/

# Health endpoint (DB check)
curl -s http://localhost/app2/api/health | jq .

# Pages
curl -s -o /dev/null -w '%{http_code}' http://localhost/app2/noc
curl -s -o /dev/null -w '%{http_code}' http://localhost/app2/operation
curl -s -o /dev/null -w '%{http_code}' http://localhost/app2/history
curl -s -o /dev/null -w '%{http_code}' http://localhost/app2/settings
curl -s -o /dev/null -w '%{http_code}' http://localhost/app2/login

# Login (replace PASSWORD)
curl -s -X POST http://localhost/app2/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}'

# Deploy agent status
docker compose exec deploy-agent wget -qO- http://localhost:4105/status

# Container status
docker compose ps

# All containers running?
docker compose ps --filter "status=running" --format '{{.Name}}' | wc -l
# Should be 8

# Ollama model
docker compose exec ollama ollama list | grep qwen3:4b
```

---

## Post-Deploy Verification (Functional)

| Test | How | Expected |
|------|-----|----------|
| Login with admin | Browser: http://IP/app2/login | Dashboard shows after login |
| Login with noc role | Create noc user in Settings → login as noc | Only NOC + History + Dashboard visible |
| NOC clarify flow | New NOC case → paste ambiguous message | AI asks with [1] [2] [3] options |
| NOC escalate | Run case through draft → click Escalate | Escalation summary generated |
| NOC upload | Attach .txt file in NOC chat | File chip appears, content sent |
| Operation research | New Operation case → describe issue → click เริ่ม Research | Progress bar shows, diagnosis generated |
| Settings KB Auto | Admin → Settings → KB Auto-Generate → Generate & Push Now | YAML files written to repo |
| Settings Deploy | Admin → Settings → Deploy → Check for Updates | Version/latest tag displayed |
| Prompt volume edit | ssh → edit gate-answer-app2/agents/noc-agent.md → docker compose restart app2 | Changes take effect in 15s |

---

## Rollback Plan

### Health-check driven (automatic)
- deploy-agent performs health check after deploy
- If `/app2/api/health` returns non-200 → `docker compose up -d app2` (rollback to cached image)

### Manual rollback
```bash
cd /opt/chatbot-gate
docker compose down
git checkout v2.0.1
docker compose up -d
```

### Data safety
- Named volumes (`app2-data`, `ollama-data`, `opencode-data`) survive `docker compose down`
- DB migrations in v2.4.0 use existing Prisma schema (no schema changes)
- Closed case data, user accounts, and settings are preserved

---

## Useful Commands

```bash
# View all container status
docker compose ps

# Follow app2 logs
docker compose logs -f app2

# View deploy-agent logs
docker compose logs deploy-agent

# Restart only app2 (after prompt edits)
docker compose restart app2

# Edit prompts without rebuild
vi /opt/chatbot-gate/apps/app2/gate-answer-app2/agents/noc-agent.md
docker compose restart app2

# Check for code updates
git fetch --tags
git tag --sort=-creatordate | head -5

# Full restart
docker compose down && docker compose up -d
```
