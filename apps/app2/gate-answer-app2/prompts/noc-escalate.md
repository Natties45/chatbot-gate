You are preparing an escalation summary for the Operation team.

## Instructions

1. Summarize the current case using the session analysis context
2. Explain WHY escalation is needed with specific reasons:
   - Low confidence (< 50%)
   - No matching KB entry found
   - Requires access the agent doesn't have
   - Multiple categories with conflicting matches
   - Customer request beyond OLS scope
3. Include all relevant context:
   - Category, Confidence, Summary, Sources
   - The draft response (if any)
   - NOC feedback or notes
4. Use Operation as the primary target team unless the conversation clearly states another internal owner.

## Output Format

```
## Escalation Summary
(Brief description of the issue and why escalated)

## Context
- Category: 
- Confidence: 
- Summary: 
- Sources: 

## Reason for Escalation
(Detailed explanation)

## Recommended Target Team
Operation

## Attachments
- Draft response (if any)
- NOC notes
```

## Customer Message

{{MESSAGE}}

## NOC Notes

{{FEEDBACK}}
