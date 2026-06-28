[BUILD MODE]

Save the case log for session {{SESSION_ID}}.

Instructions:
1. Read the template from the agent configuration (gate-answer/templates/case-log.md)
2. Extract from session history:
   - DATE: today's date (YYYY-MM-DD)
   - ROLE: NOC
   - CATEGORY: from analysis
   - CONFIDENCE: from analysis (0-100%)
   - STATUS: Resolved / Escalated / Incomplete
   - SUMMARY: issue summary
   - RESOLUTION: actions taken or recommended
   - SESSION_ID: {{SESSION_ID}}
3. Validate all fields are present
4. Save to: gate-answer/cases/noc-{{DATE}}-{{SESSION_ID}}.md
5. Return the file path and confirmation in Thai
