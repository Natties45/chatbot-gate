# Deployment Checklist

> Steps to deploy chatbot-gate to production server.
> Last updated: 2026-06-28

---

## Prerequisites

- [ ] SSH key: `natties45.pem` in project root
- [ ] Server: `203.154.16.197` accessible
- [ ] Knowledge Base: `/root/openstack-support/` exists on server
- [ ] Docker & Docker Compose installed on server

---

## Pre-deploy

```bash
# Connect to server
ssh -i natties45.pem root@203.154.16.197

# Check disk space
df -h /

# Check running containers
cd /opt/chatbot-gate
docker compose ps

# Check for port conflicts
ss -tlnp | grep -E '80|4096'
```

---

## Deploy from Windows

### 1. Package Code

```powershell
cd C:\Users\natti\OneDrive\Documents\natties45\chatbot-gate

tar.exe -czf C:\Users\natti\AppData\Local\Temp\opencode\chatbot-gate-deploy.tar.gz `
  --exclude=node_modules `
  --exclude=.next `
  --exclude=.git `
  --exclude=*.pem `
  --exclude=*.db `
  --exclude=apps/web `
  .
```

### 2. Upload to Server

```powershell
scp -i natties45.pem `
  C:\Users\natti\AppData\Local\Temp\opencode\chatbot-gate-deploy.tar.gz `
  root@203.154.16.197:/tmp/
```

### 3. Extract on Server

```bash
ssh -i natties45.pem root@203.154.16.197

mkdir -p /opt/chatbot-gate
cd /opt/chatbot-gate
tar -xzf /tmp/chatbot-gate-deploy.tar.gz
rm /tmp/chatbot-gate-deploy.tar.gz
```

### 4. Build & Start

```bash
cd /opt/chatbot-gate

# Build all images (first time: ~10 min)
docker compose build

# Start stack
docker compose up -d

# Wait for healthy
sleep 10
docker compose ps
```

---

## Verify

### Container Status

```bash
# All 5 containers should be running
docker compose ps

# Expected:
# chatbot-gate-nginx-1            Up
# chatbot-gate-web1-1             Up (healthy)
# chatbot-gate-opencode-1         Up
# chatbot-gate-playwright-mcp-1   Up
# chatbot-gate-docker-mcp-1       Up
```

### Pages Load

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost/noc        # expect 200
curl -s -o /dev/null -w "%{http_code}" http://localhost/operation  # expect 200
curl -s -o /dev/null -w "%{http_code}" http://203.154.16.197/noc   # expect 200
```

### opencode Health

```bash
curl -s http://localhost:4096/global/health
# → {"healthy":true,"version":"1.17.11"}
```

### NOC Flow (Full Test)

```bash
# 1. Init session
INIT=$(curl -s -X POST http://localhost/api/chat/noc \
  -H "Content-Type: application/json" \
  -d '{"action":"init"}')
echo "$INIT"
# → {"sessionId":"ses_..."}

# 2. Extract session ID
SID=$(echo "$INIT" | python3 -c "import sys,json; print(json.load(sys.stdin)['sessionId'])")

# 3. Send message (takes 20-90s)
curl -s -m 150 -X POST http://localhost/api/chat/noc \
  -H "Content-Type: application/json" \
  -d "{\"action\":\"message\",\"sessionId\":\"$SID\",\"message\":\"VM ไม่สามารถ SSH ได้\",\"promptType\":\"analyze\"}"
# → Analysis with category, confidence, KB sources
```

---

## Update Running Deployment

### Update Specific Service

```bash
cd /opt/chatbot-gate

# Rebuild web1 only
docker compose build --no-cache web1
docker compose up -d web1

# Rebuild opencode only
docker compose build --no-cache opencode
docker compose up -d opencode
```

### Update All Services

```bash
cd /opt/chatbot-gate
docker compose build
docker compose up -d
```

---

## Common Issues

### Port 4096 Already in Use

**Symptom**: `failed to bind host port 0.0.0.0:4096/tcp: address already in use`

**Cause**: Old systemd service or another process using the port.

**Fix**:
```bash
# Find what's using the port
ss -tlnp | grep 4096

# If it's opencode.service
systemctl stop opencode.service
systemctl disable opencode.service

# Then restart containers
docker compose up -d
```

### Knowledge Base Not Accessible

**Symptom**: noc-agent says "ไม่สามารถเข้าถึงไฟล์ฐานความรู้"

**Cause**: KB not mounted into opencode container.

**Fix**:
```bash
# Check volume mount in docker-compose.yml
grep -A5 "volumes:" docker-compose.yml

# Should have:
# - /root/openstack-support:/root/openstack-support:ro

# If missing, add it and recreate opencode
docker compose up -d opencode

# Verify inside container
docker exec chatbot-gate-opencode-1 ls /root/openstack-support/knowledge/
```

### Timeout Errors (UND_ERR_HEADERS_TIMEOUT)

**Symptom**: `Error [HeadersTimeoutError]: Headers Timeout Error` in web1 logs

**Cause**: Node.js fetch timeout too short for AI responses.

**Fix**: Ensure `opencode-service.ts` has `AbortSignal.timeout(120000)` on fetch calls.

### nginx 504 Gateway Timeout

**Symptom**: `504 Gateway Timeout` from nginx

**Cause**: nginx proxy timeout too short.

**Fix**: Ensure `nginx.conf` has:
```nginx
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

Then restart nginx:
```bash
docker compose restart nginx
```

### opencode Container Not Reachable

**Symptom**: web1 can't connect to `http://opencode:4096`

**Cause**: Container not on Docker network.

**Fix**:
```bash
# Check network
docker inspect chatbot-gate-opencode-1 --format '{{json .NetworkSettings.Networks}}'

# If empty, recreate stack
docker compose down
docker compose up -d
```

---

## Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f web1
docker compose logs -f opencode

# Last N lines
docker compose logs --tail 50 web1
```

---

## Rollback

If issues arise:

```bash
# Stop new stack
cd /opt/chatbot-gate
docker compose down

# If old deployment exists elsewhere, restore it
# (Currently no automatic rollback — old deployment was removed)
```

---

## References

- `docs/server-inventory.md` — Server details and paths
- `docs/build-history-2026-06-28-deploy.md` — Full deployment log
- `.opencode/skills/docker-deploy/SKILL.md` — Docker deploy skill
