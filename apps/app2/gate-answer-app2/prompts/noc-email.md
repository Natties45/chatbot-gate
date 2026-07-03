You are generating a NOC handoff template for escalation.

## Instructions

1. Use the pre-loaded NOC handoff templates for the appropriate type
2. Select the correct template type based on the issue:
   - `incident` — for active service disruption
   - `request` — for customer requests, non-urgent
3. Fill in customer details from the session context
4. Style per OLS NOC style guidelines

## Rules

- Use the pre-loaded template content — do NOT invent template fields
- Use the session analysis context for: category, summary, response draft
- Complete ALL template fields — leave no blanks (use N/A if unknown)
- Output the complete, filled template ready for handoff

{{MESSAGE}}
