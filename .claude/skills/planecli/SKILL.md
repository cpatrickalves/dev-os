---
name: planecli
description: "Manages Plane.so project management resources via the planecli CLI. Use when listing/creating/updating work items, projects, cycles, modules, labels, states, docs, or comments. Triggers on Plane.so mentions, sprint management, or identifiers like ABC-123."
allowed-tools: Bash(planecli *)
---

# PlaneCLI

CLI for [Plane.so](https://plane.so) project management. Installed as `planecli`.

## Key Concepts

- **Fuzzy resolution**: All resource arguments (projects, states, labels, users, work items) accept names, identifiers (e.g. `ABC-123`), or UUIDs. Fuzzy matching with 60% threshold finds close matches.
- **"me" shortcut**: Use `me` as assignee value to reference the authenticated user.
- **Output**: Rich tables to stderr (default) + JSON to stdout with `--json`. To capture JSON: `planecli ... --json 2>/dev/null`.
- **Caching**: Responses are cached on disk. Use `--no-cache` to bypass or `planecli cache clear` to reset.
- **Project scoping**: Most commands need `-p PROJECT`. Work items with identifier format (ABC-123) auto-resolve across projects.

## Quick Reference

### Identity & Configuration

```bash
planecli whoami                    # Show authenticated user
planecli configure                 # Interactive setup
planecli users ls                  # List workspace members
```

### Work Items (most common)

```bash
# List / filter
planecli wi ls -p "Project" --state "In Progress" --assignee me --limit 10
planecli wi ls -p "Project" --labels "bug,critical" --sort updated

# Create
planecli wi create "Title" -p "Project" --assign me --priority urgent --state "Todo"
planecli wi create "Sub-task" --parent ABC-123 --assign "Patrick" --labels "backend"

# Update
planecli wi update ABC-123 --state "Done" --priority none
planecli wi update ABC-123 --assign "Patrick" --labels "bug,urgent"

# Other
planecli wi show ABC-123
planecli wi assign ABC-123                    # Assign to yourself
planecli wi assign ABC-123 --assign "Name"    # Assign to someone
planecli wi search "login bug" -p "Project"
planecli wi delete ABC-123
```

### Projects

```bash
planecli project ls --state started --sort created
planecli project show "Frontend"
planecli project create "New Project" -i "NP" -d "Description"
planecli project update "Name" --name "New Name"
planecli project delete "Name"
```

### Cycles (Sprints)

```bash
planecli cycle ls -p "Project"
planecli cycle create "Sprint 1" -p "Project" --start-date 2026-02-17 --end-date 2026-03-02
planecli cycle add-item "Sprint 1" ABC-123 -p "Project"
planecli cycle remove-item "Sprint 1" ABC-123 -p "Project"
planecli cycle items "Sprint 1" -p "Project"
```

### Modules, Labels, States, Documents, Comments

```bash
# Modules
planecli module ls -p "Project"
planecli module create "Auth" -p "Project" -d "Login flows"

# Labels
planecli label ls -p "Project"
planecli label create "urgent" -p "Project" --color "#FF0000"

# States (groups: backlog, unstarted, started, completed, cancelled)
planecli state ls -p "Project" --group started
planecli state create "In Review" -p "Project" --group started --color "#FFA500"

# Documents
planecli doc ls -p "Project"
planecli doc create --title "Spec" --content "## Details..." -p "Project"

# Comments
planecli comment ls ABC-123
planecli comment create ABC-123 --body "Fixed in PR #456"
```

## Command Aliases

| Full | Aliases |
|---|---|
| `work-item` | `wi`, `issues`, `issue` |
| `project` | `projects` |
| `document` | `doc`, `docs`, `documents` |
| `comment` | `comments` |
| `module` | `modules` |
| `label` | `labels` |
| `state` | `states` |
| `cycle` | `cycles` |
| `user` | `users` |
| `list` | `ls` |
| `show` | `read` |
| `create` | `new` |

## Priority Values

`urgent` (1), `high` (2), `medium` (3), `low` (4), `none` (0). Accept names or numbers.

## Common Patterns

```bash
# Get my in-progress items across all projects
planecli wi ls --assignee me --state "In Progress"

# JSON output piped to jq
planecli wi ls -p "Project" --json 2>/dev/null | jq '.[].name'

# Create sub-issue under parent
planecli wi create "Sub-task" --parent ABC-123 -p "Project"

# Bulk check: list then update
planecli wi ls -p "Project" --state "In Review"
planecli wi update ABC-456 --state "Done"
```

## Full Command Reference

For complete flag details on every command, see [references/command-reference.md](references/command-reference.md).
