# Docker MCP — catalog entry

**Server:** `docker-mcp` (custom Node.js server using Dockerode + MCP SDK)
**Transport:** HTTP/SSE
**Port:** 1234
**Endpoint:** `http://localhost:1234/sse`

## Tools

| Tool | Description | Safe |
|------|-------------|------|
| `list_containers` | List all containers with status, ports, image | ✅ Read-only |
| `container_logs` | Get recent logs from a container | ✅ Read-only |
| `container_stats` | Get live CPU/memory/network stats | ✅ Read-only |
| `list_images` | List all Docker images | ✅ Read-only |
| `compose_ps` | List Compose stack services | ✅ Read-only |
| `docker_version` | Get Docker version info | ✅ Read-only |
| `start_container` | Start a stopped container | ⚠️ State change |
| `stop_container` | Stop a running container | ⚠️ State change |
| `restart_container` | Restart a container | ⚠️ State change |
| `remove_container` | Remove a container (with optional force) | ⚠️ Destructive |
| `exec_command` | Execute a command inside a container | ⚠️ Execution |

## Use Cases

- Monitor container health during development
- Restart web1 after config changes
- View container logs to debug issues
- Build and verify containers
- Run Playwright tests inside containers
- Check resource usage (CPU/memory)

## Per-Agent Use

| Agent | Use Case |
|-------|----------|
| operation-agent | View logs, restart containers, check stats |
| noc-agent | Verify web1 is running, check API connectivity |
| carbuncle-auditor | Automated infra checks during audit |
