---
status: accepted
date: 2026-06-27
deciders: natties45
consulted: vivi-researcher
informed: cid-architect
---

# ADR-0001: opencode as AI Bridge

## Context

We need AI-powered chat for NOC and Operation teams. Options:
1. Call LLM APIs directly (DeepSeek, Anthropic, OpenAI)
2. Use opencode — a free (MIT) standalone local binary that:
   - Acts as an HTTP server with REST API
   - Manages sessions, agent routing, prompt templates
   - Provides a web UI for provider configuration
   - Handles LLM provider abstraction

## Decision

Use opencode as the AI bridge. All chat API calls go through opencode's HTTP API (`POST /session/:id/message`), never directly to LLM providers.

## Rationale

- **Free and self-hosted** — MIT license, no per-seat or per-token costs for the bridge itself
- **Provider abstraction** — swap DeepSeek/Anthropic/OpenAI without app changes
- **Session management** — opencode handles conversation continuity
- **Agent routing** — route messages to different agents (noc-agent, operation-agent, noc-closer) from the same API
- **Prompt separation** — agent/prompt files live outside app code, editable without redeployment
- **Existing project pattern** — matches the broader ecosystem (openstack-* projects)

## Consequences

- opencode must be installed and running on the server (systemd service)
- App depends on opencode being reachable — must handle 503 gracefully
- No direct control over LLM streaming/chunking (opencode manages this)
- `OPENCODE_API_KEY` must be configured (not yet set as of 2026-06-27)
