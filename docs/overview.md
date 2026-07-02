# chatbot-gate — Overview

> Current version: **2.0.0** — deployed to production (203.154.16.162).
> Last updated: 2026-07-02

## What is it?

AI-powered NOC and Operation support tool. A thin web UI wrapper around the [opencode](https://opencode.ai) local HTTP API. Designed for **OpenLandscape Cloud (OLS)** NOC agents and operations engineers.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15.5 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, lucide-react |
| AI Bridge | Groq Free API (`qwen/qwen3-32b`) / Ollama (`qwen3:4b`) fallback |
| Database | SQLite via Prisma ORM |
| Proxy | nginx:stable |
| Container | Docker Compose (8 services) |
| Server | Ubuntu 26.04 AMD64 — 203.154.16.162 |

## Apps

| App | Status | Description |
|-----|--------|-------------|
| `apps/app2/` | **Active** (v2.0.0) | AI NOC/Operation chat, Groq API, MCP Tools, History, Git Sync |
| `apps/web1/` | Legacy (v1.10.0) | Old opencode-driven UI |
| `apps/web/` | Deleted | Old auth-driven UI (deprecated, removed) |

## Project Agents

| Agent | Role |
|-------|------|
| vivi-researcher | Research tools, tradeoff analysis |
| cid-architect | Architecture design, ADRs |
| zidane-builder | App code implementation |
| steiner-deployer | Docker build + deploy |

## Quick Links

- Architecture: `docs/architecture.md`
- Deployment: `docs/deployment-checklist.md`
- Server: `docs/server-inventory.md`
- Changelog: `docs/changelog.md`
- ADRs: `docs/adr/`
- Plans: `docs/versions/`
- App agents: `apps/web1/gate-answer/`
- Deploy skill: `skills/docker-deploy/SKILL.md`
