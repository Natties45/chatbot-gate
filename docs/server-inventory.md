# Production Server Inventory

> Single source of truth for the production server environment.
> Last updated: 2026-06-28

---

## Server Details

| Property | Value |
|----------|-------|
| **IP** | 203.154.16.197 |
| **OS** | Ubuntu 24.04 LTS (AMD64) |
| **SSH** | `root@203.154.16.197` |
| **SSH Key** | `natties45.pem` (project root) |
| **App Location** | `/opt/chatbot-gate` |
| **Docker** | 29.1.3 |
| **Docker Compose** | 2.40.3 |
| **Disk** | 96GB total, ~84GB free |
| **RAM** | 7.9GB total, ~6.8GB available |

---

## Docker Containers (5 services)

| Service | Image | Port | Status | Purpose |
|---------|-------|------|--------|---------|
| **nginx** | nginx:stable | 80 (public) | Running | Reverse proxy → web1:3000 |
| **web1** | chatbot-gate-web1 | 3000 (internal) | Running (healthy) | Next.js app (apps/web1) |
| **opencode** | chatbot-gate-opencode | 4096 (public) | Running | AI engine (opencode serve) |
| **playwright-mcp** | chatbot-gate-playwright-mcp | 8931 (internal) | Running | Browser automation MCP |
| **docker-mcp** | chatbot-gate-docker-mcp | 1234 (internal) | Running | Docker management MCP |

### Container Network

- Network name: `chatbot-gate_default`
- web1 → opencode: `http://opencode:4096`
- opencode → playwright-mcp: `http://playwright-mcp:8931/sse`
- opencode → docker-mcp: `http://docker-mcp:1234/sse`

---

## Host-Level Resources

| Path | Purpose | Notes |
|------|---------|-------|
| `/opt/chatbot-gate/` | Docker Compose stack | App code, docker-compose.yml, Dockerfiles |
| `/opt/chatbot-gate/.opencode/opencode.json` | Agent configs | noc-agent, operation-agent, noc-closer |
| `/opt/chatbot-gate/gate-answer/` | Prompts & templates | Agent prompts, NOC/Operation templates |
| `/root/openstack-support/` | **Knowledge Base** | Git repo, mounted read-only into opencode |
| `/root/openstack-support/knowledge/*.yaml` | 9 OLS categories | vm-instance.yaml, network-security.yaml, etc. |
| `/root/openstack-support/style-guide/` | Writing style guides | noc-style.md, etc. |
| `/var/run/docker.sock` | Docker socket | Mounted into docker-mcp container |

### Knowledge Base Files

| File | Category |
|------|----------|
| `vm-instance.yaml` | VM / Instance (password, SSH/RDP, resize, snapshot) |
| `network-security.yaml` | Network / Security (port, Security Group, IP, DNS) |
| `account.yaml` | Account / Gate (login, registration, quota, eKYC) |
| `billing.yaml` | Billing / Payment (top-up, quotation, refund) |
| `domain.yaml` | Domain (register, renew, DNS, NS, transfer) |
| `ssl.yaml` | SSL Certificate (purchase, CSR, validation, install) |
| `file-storage.yaml` | File Storage (Object Storage, bucket, enigma) |
| `abuse.yaml` | Abuse (spam, brute force, phishing, malware, DDOS) |
| `generic.yaml` | Generic (acknowledge, resolution, no-response) |

---

## Disabled Services

| Service | Reason |
|---------|--------|
| `opencode.service` (systemd) | Conflicts with Docker container on port 4096. Disabled and stopped. |

---

## Environment Variables

### web1 container

| Variable | Value |
|----------|-------|
| `OPENCODE_SERVER_URL` | `http://opencode:4096` |
| `NODE_ENV` | `production` |

### opencode container

| Variable | Value |
|----------|-------|
| (none) | Uses built-in free models via opencode.ai/zen |

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `/opt/chatbot-gate/docker-compose.yml` | 5-service stack definition |
| `/opt/chatbot-gate/nginx.conf` | Reverse proxy (300s timeout) |
| `/opt/chatbot-gate/.opencode/opencode.json` | Agent routing, permissions, MCP config |
| `/opt/chatbot-gate/gate-answer/agents/*.md` | Agent system prompts |
| `/opt/chatbot-gate/gate-answer/prompts/*.md` | Prompt templates |

---

## Timeouts

| Component | Timeout | Reason |
|-----------|---------|--------|
| nginx `proxy_read_timeout` | 300s | AI responses take 20-90s |
| nginx `proxy_send_timeout` | 300s | Same |
| web1 fetch (opencode-service.ts) | 120s | AI responses with KB analysis |

---

## Performance Benchmarks

| Metric | Value |
|--------|-------|
| NOC AI response (with KB) | 21-26 seconds |
| NOC AI response (no KB) | 67 seconds |
| Container startup | ~10 seconds |
| Memory usage (all containers) | ~1.5GB |
| Disk usage (images + data) | ~15GB |

---

## Access URLs

| URL | Purpose |
|-----|---------|
| `http://203.154.16.197/` | Main app (redirects to /noc) |
| `http://203.154.16.197/noc` | NOC Chat page |
| `http://203.154.16.197/operation` | Operation Chat page |
| `http://203.154.16.197:4096/` | opencode Web UI (debugging) |
| `http://203.154.16.197:4096/global/health` | opencode health check |

---

## Related Projects

| Project | Location | Relationship |
|---------|----------|--------------|
| chatbot-gate | `/opt/chatbot-gate/` | This project |
| openstack-support | `/root/openstack-support/` | Knowledge Base (separate Git repo) |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-06-28 | Initial inventory after production deployment |
| 2026-06-28 | Disabled systemd opencode.service (port conflict) |
| 2026-06-28 | Added KB volume mount to opencode container |
| 2026-06-28 | Fixed agent paths to use absolute `/root/openstack-support/` |
