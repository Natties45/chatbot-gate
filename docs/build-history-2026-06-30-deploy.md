# Deploy Pipeline History — 2026-06-30

This document records the exact steps, executed commands, and verification logs for deploying `chatbot-gate` Version 1.10.0 to the new Ubuntu 26.04 server (`203.154.16.7`).

## 1. Remote Server Environment Details
- **IP Address**: `203.154.16.7`
- **OS**: Ubuntu 26.04 LTS (resolute, amd64)
- **Status**: Blank machine (Docker, Docker Compose, Git not installed or not configured initially)

---

## 2. Step-by-Step Execution History

### Step 2.1: Key Permission Adjustment (Windows Host)
Because Windows default NTFS permissions are too open for private SSH keys, SSH initially rejected `natties45.pem`.
**Commands Run (Local Powershell)**:
```powershell
# Disable permission inheritance on the key file
icacls C:\Users\natti\OneDrive\Documents\natties45\chatbot-gate\.secrets\natties45.pem /inheritance:r

# Grant Read-only rights exclusively to the current active user
icacls C:\Users\natti\OneDrive\Documents\natties45\chatbot-gate\.secrets\natties45.pem /grant:r "nattties4\natti:(R)"

# Explicitly remove other sandbox user permissions
icacls C:\Users\natti\OneDrive\Documents\natties45\chatbot-gate\.secrets\natties45.pem /remove "nattties4\CodexSandboxUsers"
```
*Result*: Succeeded. SSH access allowed without throwing private key warnings.

### Step 2.2: Server Package Update & Docker/Git Installation
**Commands Run**:
```bash
ssh -i natties45.pem -o StrictHostKeyChecking=no root@203.154.16.7 \
  "apt-get update && apt-get install -y docker.io docker-compose git"
```
*Result*: Succeeded. Output:
- `docker.io` (v29.1.3-0ubuntu4.1) installed
- `docker-compose-v2` (v2.40.3+ds1-0ubuntu1) installed
- `git` (v1:2.53.0-1ubuntu1) updated/verified

### Step 2.3: Knowledge Base Cloning
**Commands Run**:
```bash
ssh -i natties45.pem root@203.154.16.7 \
  "git clone https://github.com/Natties45/openstack-support.git /root/openstack-support"
```
*Result*: Succeeded. Cloned files successfully into `/root/openstack-support`. Verified path `/root/openstack-support/knowledge/` contains OLS YAML category rules.

### Step 2.4: Codebase Packaging & Transfer
**Commands Run (Local Windows)**:
```powershell
# Package active codebase
tar.exe -czf C:\Users\natti\AppData\Local\Temp\chatbot-gate-deploy.tar.gz `
  --exclude=node_modules `
  --exclude=.next `
  --exclude=.git `
  --exclude=*.pem `
  --exclude=*.db `
  --exclude=.secrets `
  .

# Transfer to remote temp path
scp -i natties45.pem C:\Users\natti\AppData\Local\Temp\chatbot-gate-deploy.tar.gz root@203.154.16.7:/tmp/
```
*Result*: Transfer completed successfully.

### Step 2.5: Extraction & Deployment Optimization
Extracted code to `/opt/chatbot-gate`.
**Commands Run (Remote)**:
```bash
mkdir -p /opt/chatbot-gate
tar -xzf /tmp/chatbot-gate-deploy.tar.gz -C /opt/chatbot-gate
rm /tmp/chatbot-gate-deploy.tar.gz
```

*Note on Bug Fix*: 
Prisma CLI was not installed globally in the container. Running `npx prisma` from the root directory failed with `prisma: not found` during startup. 
*Fix*: Modified the startup command in `apps/web1/Dockerfile` to run via npm workspace:
```dockerfile
CMD ["sh", "-c", "npm run prisma:migrate --workspace=apps/web1 && npm run db:seed --workspace=apps/web1 && npm run start --workspace=apps/web1"]
```

### Step 2.6: Container Build and Launch
**Commands Run**:
```bash
cd /opt/chatbot-gate
docker compose build
docker compose up -d
```
*Result*: Succeeded. Next.js production bundle compiled cleanly in 8.7s. 4 containers started successfully:
- `chatbot-gate-nginx-1` (nginx:stable) -> Up (Port 80)
- `chatbot-gate-web1-1` (Next.js Node) -> Up (healthy)
- `chatbot-gate-opencode-1` (opencode AI) -> Up (Port 4096)
- `chatbot-gate-docker-mcp-1` (dockerrode) -> Up

---

## 3. Deployment Verification Logs

### Service Status Checks (`docker compose ps`)
```
NAME                        IMAGE                     COMMAND                  SERVICE      CREATED          STATUS                    PORTS
chatbot-gate-docker-mcp-1   chatbot-gate-docker-mcp   "docker-entrypoint.s…"   docker-mcp   9 minutes ago    Up 9 minutes              1234/tcp
chatbot-gate-nginx-1        nginx:stable              "/docker-entrypoint.…"   nginx        9 minutes ago    Up 18 seconds             0.0.0.0:80->80/tcp, [::]:80->80/tcp
chatbot-gate-opencode-1     chatbot-gate-opencode     "opencode serve --ho…"   opencode     9 minutes ago    Up 9 minutes              0.0.0.0:4096->4096/tcp, [::]:4096->4096/tcp
chatbot-gate-web1-1         chatbot-gate-web1         "docker-entrypoint.s…"   web1         25 seconds ago   Up 23 seconds (healthy)   3000/tcp
```

### Nginx Routing & Web UI Verification
```bash
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" http://localhost/login
# Output -> HTTP Code: 200 (Success)
```

### Opencode AI Engine Health Check
```bash
curl -s http://localhost:4096/global/health
# Output -> {"healthy":true,"version":"1.17.11"} (Success)
```

### Prisma Startup Logs (`docker compose logs web1`)
```
web1-1  | Datasource "db": SQLite database "app.db" at "file:/app/apps/web1/data/app.db"
web1-1  | SQLite database app.db created at file:/app/apps/web1/data/app.db
web1-1  | 1 migration found in prisma/migrations
web1-1  | Applying migration `20260630053054_init`
web1-1  | All migrations have been successfully applied.
web1-1  | 
web1-1  | > web1@1.10.0 db:seed
web1-1  | > node prisma/seed.js
web1-1  | Seeded admin user: admin
web1-1  | 
web1-1  | > web1@1.10.0 start
web1-1  | > next start
web1-1  |    ▲ Next.js 15.5.19
web1-1  |    - Local:        http://localhost:3000
web1-1  |  ✓ Starting...
web1-1  |  ✓ Ready in 833ms
```

### Authentication Protection Check (Middleware Test)
```bash
curl -s -X POST http://localhost/api/chat/noc -H "Content-Type: application/json" -d '{"action":"init"}'
# Output -> {"error":"Unauthorized"} (Success, endpoint is secured via cookies RBAC!)
```
