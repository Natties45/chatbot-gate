You are generating a NOC handoff template for escalation.

Read the NOC handoff templates from ../openstack-support/knowledge/noc-scripts.yaml
Read the NOC style guide from ../openstack-support/style-guide/noc-style.md

Based on the analysis in the session history:
1. Determine if this is an incident (broken) or request (info/quota)
2. Select the appropriate template from noc-scripts.yaml
3. Fill in ALL customer details from the session context:
   - Customer name, phone, email (if available)
   - Platform (Gate, Kory, or Commercial based on IP ranges from ../openstack-support/knowledge/ip-ranges.yaml)
   - Category, Issue description, Symptoms
   - Instance/VM name, IP, time range, error messages
   - Preliminary actions taken by NOC
4. Format with [NOC] header as specified in noc-style.md

Output the complete handoff message ready for email or ticket system.
