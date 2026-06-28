---
status: proposed
date: 2026-06-28
deciders: natties45
consulted: vivi-researcher, cid-architect
informed: bahamut-curator
---

# ADR-0003: Playwright MCP for Browser Testing

## Context

We need automated testing for the web1 app. The project currently has zero tests — all verification is manual via browser. We need:
1. A testing strategy that works on both Windows (Docker Desktop) and Linux (production)
2. Integration with AI agents so they can verify UI behavior
3. MCP (Model Context Protocol) alignment with sphere's standard tooling

## Decision

Standardize on Playwright MCP (`@playwright/mcp`) for browser testing. Run it as a sidecar container in the Docker Compose stack.

## Rationale

- **Sphere standard** — `mcp/policy.md` specifies Playwright over Puppeteer
- **MCP-native** — works with any MCP-compatible AI tool (opencode, Claude Code, etc.)
- **Sidecar pattern** — Playwright MCP runs as a container alongside web1, accessible at `http://playwright-mcp:8931`
- **Cross-platform** — works on Windows Docker Desktop and Linux
- **Infrastructure-as-code** — MCP tools can invoke browser actions programmatically

## Consequences

- Playwright MCP container adds ~500MB to the image (Chromium bundled)
- Tests depend on the MCP server being running — must be part of `docker compose up`
- Manual curl/browser testing remains for exploratory testing
- MCP tools (browser_navigate, browser_snapshot, browser_click) become available to AI agents during development
