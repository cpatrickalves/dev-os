---
argument-hint: [ticket-id]
description: Create a commit message.
model: haiku
allowed-tools: Bash(git diff *), Bash(git status), Bash(git log *)
---

# Use the following rules when crafting each commit:

Ticket-id: $1

0. Consider only the files in Stage on git.
- Use the command: `git diff --cached`

1. *Choose the appropriate prefix based on the type of change:**
- 'feat': New feature
- 'fix': Bug fix
- 'chore': Maintenance, configs, or non-functional updates
- 'docs': Documentation updates
- 'refactor': Code restructuring that does not change behavior
- 'test': Adding or improving tests
- 'style': Code style changes (formatting, linting)
- 'perf': Performance improvements
- 'ci': Continuous Integration or deployment changes
- 'build': Build system updates

2. **Structure the commit message:**
- Format: "<type> (<scope>): <short sumnary>"
- Scope is optional but encouraged (e.g., "auth", "api", "ui", "infra", etc.)
- Example: "feat(auth): add JWT authentication flow with tests and documentation"
- if a ticket id is provided, use it in the commit message as "<ticket> <type> (<scope>): <short sumnary>".

3. **Include a detailed description when necessary:**
- Explain what was done and why
- Usually, commits relates to issues that have tickets ids, asks the ticket id to the user and use as: "<ticket> <type> (<scope>): <short sumnary>". 
- Example: "FRONTEND-123 feat(auth): add JWT authentication flow with tests and documentation"

4. **Ensure clarity and consistency:**
- Use the imperative mood ("Add", "Fix", not "Added" or "Fixed")
- Keep the summary under 72 characters
- Avoid generic terms like "update" or "change"
- It must be in Brazilian Portuguese Language

Only outputs the suggested commit message, no other text.