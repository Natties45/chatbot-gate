You are generating a NOC handoff template for escalation.

## Instructions

1. Read the NOC handoff templates from `../openstack-support/knowledge/noc-scripts.yaml`
2. Select the correct template type based on the issue:
   - `incident` — for active service disruption
   - `request` — for customer requests, non-urgent
3. Fill in customer details from the session context
4. Style per `../openstack-support/style-guide/noc-style.md`

## Rules

- Do NOT hardcode template content — always read from `noc-scripts.yaml`
- Use the session analysis context for: category, summary, response draft
- Complete ALL template fields — leave no blanks (use N/A if unknown)
- Output the complete, filled template ready for handoff

{{MESSAGE}}
