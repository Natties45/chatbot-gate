[BUILD MODE]

Save the case log for session {{SESSION_ID}}.

Use the template from the agent configuration.
Extract from the session history:
- DATE: today's date (YYYY-MM-DD)
- ROLE: NOC
- CATEGORY: from analysis
- CONFIDENCE: from analysis
- STATUS: Resolved (if draft was approved) or Escalated
- SUMMARY: issue summary
- RESOLUTION: actions taken
- SESSION_ID: {{SESSION_ID}}

Save to: .opencode/gate-answer/cases/noc-{{DATE}}-{{SESSION_ID}}.md

Return the saved file path and confirmation in Thai.
