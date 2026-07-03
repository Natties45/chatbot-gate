# v2.5.0 — Deployment SOP

> **Target server:** 203.154.16.162 (AMD64 Ubuntu)
> **Deploy method:** Manual SSH (Option C UI deploy available after fix)
> **Rollback:** Health-check guarded + docker image cache

---

## Pre-flight

```bash
# Local: verify build + lint pass
cd apps/app2
npm run lint
npm run build
```

---

## Step 1: SSH into server

```bash
ssh -i natties45.pem root@203.154.16.162
```

---

## Step 2: Pull latest code

```bash
cd /root/chatbot-gate
git pull origin main
git checkout v2.5.0    # or the latest release tag
```

If `git pull` fails (detached HEAD or dirty state):
```bash
git fetch --all --tags
git checkout v2.5.0
```

---

## Step 3: Build + Deploy app2

```bash
cd /root/chatbot-gate

# Build app2 image (includes prompt changes from gate-answer-app2 volume mount)
docker compose build app2

# Deploy app2
docker compose up -d app2

# Wait for health check
sleep 15
```

---

## Step 4: Restart Ollama (pick up new env vars)

```bash
# Restart ollama for OLLAMA_NUM_PARALLEL / MAX_LOADED_MODELS to take effect
docker compose up -d ollama

# Verify model loads correctly
curl -s http://localhost:11434/api/tags | grep qwen3
```

---

## Step 5: Fix deploy-agent (Option C)

```bash
# Start deploy-agent if it's not running
docker compose up -d deploy-agent

# Verify
curl -s http://localhost:4105/status
# Expected: {"currentVersion":"2.5.0","latestTag":"v2.5.0",...}
```

---

## Step 6: Verify the deployment

```bash
# Health check
curl -s http://localhost:3001/app2/api/health
# Expected: {"status":"ok"}

# Container status — all should be Up/running
docker compose ps

# Test Groq primary + Ollama fallback
curl -s -X POST http://localhost:3001/app2/api/chat/noc \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<admin-session>" \
  -d '{"action":"message","message":"สวัสดี ทดสอบระบบ","sessionId":"test-verify"}'
```

---

## Step 7: Verify Option B (Ollama no longer OOMs)

```bash
# Check ollama memory usage
docker stats --no-stream ollama
# Expected: MEM USAGE < 3.5GB (was crashing at ~4.5GB)

# Test fallback by temporarily disabling Groq:
# (set GROQ_API_KEY="" in docker-compose and redeploy — optional)
```

---

## Step 8 (Optional): Fix Git Sync for KB

```bash
# Only needed if you want to use Settings → Git Sync for KB repo
docker exec -it deploy-agent sh -c "
  cd /root/openstack-support
  git init
  git remote add origin <KB_REPO_URL>
  git fetch origin main
  git reset --hard origin/main
"
```

---

## Rollback

If health check fails or any issue:
```bash
# Option 1: Rollback to previous app2 image
docker compose up -d app2

# Option 2: Rollback to specific tag
git checkout v2.4.0
docker compose build app2
docker compose up -d app2
```

---

## What Changed in v2.5.0

| File | Change |
|------|--------|
| `src/lib/ai/prompt-registry.ts` | `loadRolePrompt` now concats `roles/` + `agents/` |
| `agents/noc-agent.md` | Boundary controls, reject patterns, Clarify/Confirm |
| `agents/operation-agent.md` | Boundary controls, reject patterns, format exception |
| `prompts/noc-analyze.md` | Priority out-of-scope check |
| `prompts/op-send.md` | Priority out-of-scope check |
| `prompts/op-diagnose.md` | Priority out-of-scope check |
| `prompts/noc-chat.md` | Strengthened boundary |
| `prompts/noc-email.md` | Removed file-reading instructions |
| `prompts/noc-draft.md` | Removed file-reading instructions |
| `providers/ollama.ts` | `num_ctx: 4096` |
| `ai-brain.ts` | `compactForFallback` 8000 → 4000 chars |
| `docker-compose.yml` | Ollama env vars (NUM_PARALLEL, KEEP_ALIVE, MAX_LOADED_MODELS) |
