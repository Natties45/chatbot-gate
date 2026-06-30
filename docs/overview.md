# chatbot-gate — Overview

> Current version: **1.10.0** — deployed locally for testing.
> Last updated: 2026-06-30

## What is it?

AI-powered NOC and Operation support tool. A thin web UI wrapper around the [opencode](https://opencode.ai) local HTTP API. Designed for **OpenLandscape Cloud (OLS)** NOC agents and operations engineers.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15.5 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS v4, lucide-react |
| AI Bridge | opencode v1.17+ (local binary, MIT) |
| LLM | opencode.ai/zen free models (big-pickle default) |
| Database | SQLite via Prisma ORM |
| Proxy | nginx:stable |
| Container | Docker Compose (4 services) |
| Server | Ubuntu 24.04 AMD64 — 203.154.16.197 |

## Apps

| App | Status | Description |
|-----|--------|-------------|
| `apps/web1/` | **Active** (v1.10.0) | Auth-driven NOC/Operation chat, History, Git Sync |
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
