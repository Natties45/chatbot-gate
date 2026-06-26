# Source Of Truth

This document defines where authoritative project knowledge lives for `chatbot-gate`.

## Authoritative Locations

- Project overview: `docs/project/overview.md`
- Architecture decisions: `adr/`
- Agent responsibilities: `agents/`
- Governance rules: `governance/`
- Runtime code and deployment files: future app directories after approval

## Rules

- ADRs are the source of truth for accepted architecture decisions.
- The overview describes current intent, not every implementation detail.
- Agent specs define responsibilities, not runtime behavior.
- Runtime implementation should not be added until the stack is approved.
- Secrets, API keys, tokens, and private server details must never be committed.

## Change Process

1. Research options with `vivi-researcher` when the decision needs external or technical comparison.
2. Ask `cid-architect` to convert the chosen option into an architecture decision.
3. Record accepted decisions as ADRs.
4. Update the overview only when the project direction changes.
