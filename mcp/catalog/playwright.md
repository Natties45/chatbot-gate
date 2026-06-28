# Playwright MCP — catalog entry

**Server:** `@playwright/mcp`
**Standard:** yes (per sphere MCP policy)
**Container:** `ghcr.io/natties45/playwright-mcp` or local Dockerfile.mcp
**Port:** 8931

## Capabilities

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to URL |
| `browser_snapshot` | Get page content and state |
| `browser_click` | Click element by selector |
| `browser_type` | Type text into input |
| `browser_select` | Select option in dropdown |
| `browser_screenshot` | Take screenshot |
| `browser_set_viewport` | Resize browser viewport |

## Use Cases

- UI smoke tests for apps/web1
- Verify state transitions (idle → chat → offline)
- Check responsive layout (mobile/desktop viewports)
- Validate error states (opencode offline → 503)
- Dark/light mode toggle verification
- Form validation (empty input, disabled buttons)

## Per-Agent Use

| Agent | Use Case |
|-------|----------|
| carbuncle-auditor | Automated regression checks on deploy |
| phoenix-scaffolder | Scaffold verification after project init |
| Any dev-agent | Manual browser testing via MCP tools |
