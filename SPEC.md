# TeamLogger - Project Specification

**PROJECT:** In-house employee time and activity tracker (TeamLogger alternative).  
**ROLES:** admin, manager, employee.

## RULES
- Never record keystroke contents, webcam, or microphone. Only count input events.
- Tracking indicator must always be visible in the agent.
- Screenshots go directly from the agent to S3 via presigned URLs, never through the API.
- Every screenshot view and manual time edit is written to an audit log.
- Employees must accept the current policy version before tracking starts.
- Retention is policy-driven and enforced automatically.

## DATA MODELS
users, projects, tasks, timeEntries, activitySamples, screenshots, devices, policies, consents, auditLogs.
