# MCP Profile: chatbot-gate Dev/Test

**Purpose:** Local development and browser testing of web1 on Windows Docker Desktop.

## Services

| Service | Port | Source |
|---------|------|--------|
| web1 | 4568 | Dockerfile.web1 (dev target) |
| playwright-mcp | 8931 | Dockerfile.mcp |
| docker-mcp | 1234 | Dockerfile.docker-mcp |

## opencode.json (runtime adapter)

```json
{
  "mcp": {
    "playwright": {
      "type": "remote",
      "url": "http://localhost:8931/sse",
      "enabled": true
    },
    "docker": {
      "type": "remote",
      "url": "http://localhost:1234/sse",
      "enabled": true
    }
  }
}
```

## Usage

```bash
# Start dev stack (web1 + Playwright MCP + Docker MCP)
docker compose -f docker-compose.dev.yml up -d

# opencode runs on host
opencode serve --hostname 0.0.0.0 --port 4096

# Run Playwright tests
npx playwright test --config=tests/playwright.config.ts
```

## AI Test Scenarios

| Ask AI | MCP Used |
|--------|----------|
| "Open NOC page and take screenshot" | Playwright (browser_navigate + browser_screenshot) |
| "Show me web1 container logs" | Docker (container_logs) |
| "Restart web1 and check if it comes up" | Docker (restart_container) → Playwright (browser_navigate) |
| "List all running containers and their status" | Docker (list_containers) |
| "Run Playwright test suite" | Docker (exec_command) |
| "Build and deploy web1" | Docker (exec_command: docker compose build) |

## Notes

- `OPENCODE_SERVER_URL=http://host.docker.internal:4096` for container→host communication
- Docker socket mounted from host → `docker-mcp` can manage Docker from inside container
- Chromium runs headless inside the MCP container
- Screenshots saved inside container (not persisted unless volume mounted)
