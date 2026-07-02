# Version 2.4.0 — CI/CD Deploy Agent + Prompt Volume Mount

> **Status:** Planned
> **Date:** 2026-07-02
> **Scope:** Add one-click deploy from Settings page. Add deploy-agent sidecar container
  with Docker socket access to pull Git tags, build, deploy, and health-check app2.
  Add rollback on failure. Mount prompt files as Docker volume for instant prompt edits
  without rebuild. Add health check endpoint to app2.

---

## Goals

- Add **Deploy Agent** — a lightweight sidecar container that can:
  - Pull specific Git tags from GitHub.
  - Run `docker compose build app2` + `docker compose up -d app2`.
  - Health-check the new container.
  - Auto-rollback if health check fails.
- Add **Deploy Tab** in Settings page:
  - Show running version + latest available version.
  - "Check for Updates" button (syncs with GitHub tags).
  - "Deploy" button (builds and deploys specific tag).
  - Deploy history and logs.
- Add **health check endpoint** (`/api/health`) so deploy-agent can verify app2 is running.
- Add **prompt volume mount** in `docker-compose.yml` so prompt files can be edited on
  the server without rebuilding the Docker image.
- Keep the existing git repo at `/root/chatbot-gate` as the deployment source.

---

## Core Decisions

| Topic | Decision |
|-------|----------|
| Deploy agent implementation | Standalone Node.js HTTP server in dedicated Docker container (`deploy-agent:4105`) |
| Deploy agent trigger | Admin enters tag (e.g., `v2.1.0`) and clicks Deploy button; auto-sync nightly at midnight |
| Version detection | GitHub REST API: `/repos/Natties45/chatbot-gate/tags` |
| Deploy scope | `app2` service only (single-container deploy in v2.4.0) |
| Health check mechanism | `curl http://app2:3001/app2/api/health` — expect 200 + `{ status: "ok" }` |
| Health check wait | 15 seconds after container start |
| Rollback strategy | `docker compose up -d app2` (previous image still cached by Docker) |
| Retry on fail | No retry — immediate rollback, then admin investigates |
| Prompt volume mount | `./apps/app2/gate-answer-app2:/app/apps/app2/gate-answer-app2:rw` |
| Prompt edit workflow | Edit files on server → `docker compose restart app2` (15s) → no rebuild needed |
| Deploy security | Only admin role can trigger deploy via authenticated API |

---

## Documentation Set

| File | Purpose |
|------|---------|
| `plan.md` | Version overview, scope, decisions, architecture, file changes |
| `deploy-agent-spec.md` | Deploy agent API contract, Dockerfile, security model |

---

## Architecture

### Deploy Sequence

```
Admin presses [Deploy v2.1.0] in Settings
        │
        ▼
  app2 → POST /api/admin/deploy { tag: "v2.1.0" }
        │
        ▼
  Deploy Client (src/lib/deploy-client.ts)
        │
        ▼
  deploy-agent:4105 → POST /deploy/app2/v2.1.0
        │
        ├── 1. cd /root/chatbot-gate
        ├── 2. git fetch --tags
        ├── 3. git checkout v2.1.0
        ├── 4. docker compose build app2
        ├── 5. docker compose up -d app2
        ├── 6. sleep 15s
        ├── 7. curl http://app2:3001/app2/api/health
        │      │
        │      ├── 200 OK → ✅ { success: true, version: "2.1.0" }
        │      │
        │      └── !200 → ❌ docker compose up -d app2 (rollback)
        │                  → { success: false, error: "health check failed" }
        │
        └── 8. Return result to app2 → displayed in Settings Deploy tab
```

### Container Architecture (v2.4.0)

```
Server: /root/chatbot-gate/ (git repo)
        │
        ├── docker-compose.yml
        ├── Dockerfile.deploy-agent
        ├── apps/app2/ (app2 source, built into image)
        ├── apps/app2/gate-answer-app2/ (prompts — mounted as volume)
        └── mcp/deploy-agent/deploy-agent.mjs

Containers:
┌──────────┐  ┌──────────┐  ┌──────────────┐
│  nginx   │  │  app2    │  │deploy-agent  │
│  :80     │  │  :3001   │  │  :4105       │
└──────────┘  └────┬─────┘  └──────┬───────┘
                   │               │
                   │  prompt vol   │  docker socket
                   │  mount        │  + git repo vol
                   ▼               ▼
            ┌──────────┐    ┌──────────────┐
            │gate-     │    │/root/chatbot-│
            │answer-   │    │gate (repo)   │
            │app2/     │    └──────────────┘
            └──────────┘
```

---

## Feature Scope

### 1. Deploy Agent (`mcp/deploy-agent/deploy-agent.mjs`)

A standalone Node.js HTTP server (no framework, just `http` module) running in its own
Docker container.

**API Endpoints:**

```
POST /deploy/app2/:tag
  → Deploy app2 to specified git tag
  → Request: { tag: "v2.1.0" }  (also accepted as URL param)
  → Response: { success: boolean, version: string, builtAt: string, healthCheck: string, log: string }

GET /status
  → Check current deploy status
  → Response: {
      currentVersion: "2.0.0",
      latestTag: "v2.1.0",
      updateAvailable: true,
      repoStatus: "clean"
    }

GET /history
  → Last 10 deploy records
  → Response: { deploys: [{ tag, status, timestamp, duration }] }
```

**Deploy steps (internal):**
```javascript
async function deployApp2(tag) {
  log(`Starting deploy of app2 to ${tag}`);

  // 1. Git operations
  execSync(`git -C /root/chatbot-gate fetch --tags`);
  execSync(`git -C /root/chatbot-gate checkout ${tag}`);

  // 2. Build
  log('Building app2...');
  execSync(`docker compose -f /root/chatbot-gate/docker-compose.yml build app2`);

  // 3. Deploy
  log('Starting app2...');
  execSync(`docker compose -f /root/chatbot-gate/docker-compose.yml up -d app2`);

  // 4. Health check
  log('Waiting 15s for health check...');
  await sleep(15000);

  const healthy = await healthCheck('http://app2:3001/app2/api/health');
  if (!healthy) {
    log('Health check FAILED — rolling back');
    execSync(`docker compose -f /root/chatbot-gate/docker-compose.yml up -d app2`);
    return { success: false, error: 'Health check failed — rolled back' };
  }

  log('Deploy complete!');
  return { success: true, version: tag };
}

async function healthCheck(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    return res.ok && data.status === 'ok';
  } catch {
    return false;
  }
}
```

### 2. Dockerfile for Deploy Agent (`Dockerfile.deploy-agent`)

```dockerfile
FROM node:22-slim
RUN apt-get update && apt-get install -y git docker.io && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY mcp/deploy-agent/deploy-agent.mjs .
EXPOSE 4105
CMD ["node", "deploy-agent.mjs"]
```

**Needs:** node (HTTP server), git (fetch/checkout), docker CLI (build/up/down).

### 3. Docker Compose Changes

```yaml
# Add to docker-compose.yml:

deploy-agent:
  build:
    context: .
    dockerfile: Dockerfile.deploy-agent
  container_name: deploy-agent
  volumes:
    - /root/chatbot-gate:/root/chatbot-gate        # git repo
    - /var/run/docker.sock:/var/run/docker.sock    # docker access
  ports:
    - "4105:4105"
  restart: unless-stopped
  networks:
    - chatbot-gate

# Modify app2 service — add prompt volume mount:
app2:
  volumes:
    - app2-data:/app/apps/app2/prisma/data
    - ./apps/app2/gate-answer-app2:/app/apps/app2/gate-answer-app2:rw  # NEW
```

### 4. Health Check Endpoint (`src/app/api/health/route.ts`)

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Basic DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'ok',
      version: process.env.npm_package_version || '2.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Database unavailable' },
      { status: 503 }
    );
  }
}
```

### 5. Deploy Client & API Proxy

**`src/lib/deploy-client.ts`:**
```typescript
const DEPLOY_AGENT_URL = process.env.DEPLOY_AGENT_URL || 'http://deploy-agent:4105';

export async function getDeployStatus() {
  const res = await fetch(`${DEPLOY_AGENT_URL}/status`);
  return res.json();
}

export async function deployApp2(tag: string) {
  const res = await fetch(`${DEPLOY_AGENT_URL}/deploy/app2/${encodeURIComponent(tag)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag }),
  });
  return res.json();
}

export async function getDeployHistory() {
  const res = await fetch(`${DEPLOY_AGENT_URL}/history`);
  return res.json();
}
```

**`src/app/api/admin/deploy/route.ts`:**
```typescript
// Proxy — app2 calls this (authenticated), which calls deploy-agent (internal)
// Admin-only access via requireAuth(['admin'])

POST: { action: 'status' | 'deploy' | 'history', tag?: string }
  → validate admin auth
  → forward to deploy-agent:4105
  → return result
```

### 6. Settings UI — Deploy Tab

```
Deploy
├── Current Version: 2.0.0
├── Latest Available: v2.1.0  [Check for Updates]
├── Deploy Target: [tag input]  [Deploy]
│   └── Auto-fills from "Latest Available"
├── Status: Idle / Building / Deploying / Success / Failed
├── Deploy History:
│   ├── 2026-07-02 14:30  v2.0.0  ✓ Success (45s)
│   └── 2026-07-01 09:15  v1.9.0  ✓ Success (38s)
└── Logs: [expandable pre block]
    ├── ✓ git fetch --tags
    ├── ✓ git checkout v2.1.0
    ├── ✓ docker compose build app2
    ├── ✓ docker compose up -d app2
    ├── ✓ health check OK (200)
    └── ✓ Deploy complete!
```

### 7. Prompt Volume Mount Workflow

After volume mount, prompt edits are instant:

```bash
# Edit prompts on server directly:
ssh root@203.154.16.162
vi ~/chatbot-gate/apps/app2/gate-answer-app2/agents/noc-agent.md
docker compose restart app2   # 15 seconds

# Or from local:
scp noc-agent.md root@203.154.16.162:~/chatbot-gate/apps/app2/gate-answer-app2/agents/
ssh root@203.154.16.162 "cd chatbot-gate && docker compose restart app2"
```

**Note:** After editing prompts on server, the changes are NOT automatically committed
to git. The admin must manually commit if they want the changes version-controlled:
```bash
ssh root@203.154.16.162
cd chatbot-gate
git add apps/app2/gate-answer-app2/
git commit -m "prompt: update NOC agent behavior"
git push
```

---

## Out Of Scope

- Multi-service deploy (app2 only in v2.4.0 — web1, nginx, MCP services deploy manually).
- Automatic deploy on git push (manual trigger only).
- CI pipeline (no test runner, linting, or build validation in deploy flow — assumes
  admin tested locally first).
- Docker image registry (images built on server, not pushed to a registry).
- Blue-green or canary deployment (simple restart with rollback only).
- Rollback to arbitrary previous version (rolls back to current running image only).

---

## Implementation Phases

| Phase | Goal | Output |
|-------|------|--------|
| 1 | Health check endpoint | `GET /api/health` returns OK + version |
| 2 | Deploy agent HTTP server | `deploy-agent.mjs` with /deploy, /status, /history endpoints |
| 3 | Dockerfile + docker-compose integration | `Dockerfile.deploy-agent`, compose service, volumes |
| 4 | Deploy client + API proxy | `deploy-client.ts`, `/api/admin/deploy/route.ts` |
| 5 | Prompt volume mount | Edit `docker-compose.yml` app2 volumes |
| 6 | Settings Deploy tab UI | Version display, tag input, deploy button, history, logs |
| 7 | End-to-end test | Deploy test tag → verify build → verify health check → verify app works |

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `mcp/deploy-agent/deploy-agent.mjs` | **NEW** | Deploy agent HTTP server |
| `Dockerfile.deploy-agent` | **NEW** | Dockerfile for deploy agent container |
| `docker-compose.yml` | **EDIT** | Add deploy-agent service + app2 prompt volume mount |
| `src/app/api/health/route.ts` | **NEW** | Health check endpoint |
| `src/app/api/admin/deploy/route.ts` | **NEW** | Deploy API proxy (auth gated) |
| `src/lib/deploy-client.ts` | **NEW** | Client to call deploy-agent from app2 |
| `src/app/settings/page.tsx` | **EDIT** | Add Deploy tab |
| `src/lib/settings-db.ts` | **EDIT** | Add default settings for deploy |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| deploy-agent accessible from internet | Only exposed on Docker internal network (`deploy-agent:4105`), not published to host port |
| Unauthorized deploy | `/api/admin/deploy` requires admin auth (session cookie) |
| deploy-agent has docker socket | Trusted internal service; Docker socket required for `docker compose up -d` |
| SSH key exposure | Deploy agent uses host's existing `/root/.ssh/` for git push via volume mount |
| Rollback data loss | New DB migrations are additive — rollback doesn't revert schema. Acceptable risk for v2.4.0 |

---

## New Settings Keys

| Key | Default | Description |
|-----|---------|-------------|
| `deploy.currentVersion` | (from package.json) | Currently deployed version |
| `deploy.lastDeployAt` | `""` | ISO timestamp of last successful deploy |
| `deploy.lastDeployTag` | `""` | Git tag of last successful deploy |
| `deploy.lastDeployStatus` | `""` | Success/Failed |
| `deploy.lastDeployLog` | `""` | Log output of last deploy |

---

## Success Criteria

- Admin clicks [Deploy v2.1.0] in Settings → deploy-agent builds and starts new app2.
- Health check runs after 15s and confirms `{ status: "ok" }`.
- If health check fails, app2 auto-rolls back to previous running image.
- Prompt files can be edited on server → `docker compose restart app2` → changes take
  effect within 15 seconds.
- Deploy history and logs are visible in the Settings Deploy tab.
- Current version and latest available tag are displayed correctly.
- Entire deploy flow (build + start + health check) completes in under 2 minutes.
