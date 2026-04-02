---
name: docs-updater
description: "Scans recent commits for documentation-worthy changes and applies updates to project docs. Use when the user requests documentation updates, says 'update docs', 'sync README', 'docs are stale', or after shipping a feature that changes user-facing behavior."
---

# Documentation Updater

Update project documentation to accurately reflect the current state of the code. Delegates discovery to a scanner subagent and updates to a writer subagent, with user approval in between.

## Argument Parsing

Parse $ARGUMENTS for an optional focus area:

- If empty, scan all documentation in the project.
- If it contains a focus area (e.g. "README", "api docs", "CLAUDE.md", "installation steps", "architecture"), scope the scan to that area. Pass the focus to the scanner subagent.

Store the focus (or lack thereof) for use in the briefings below.

## Workflow

Copy this checklist and track progress:

```
Documentation Update Progress:
- [ ] Step 1: Scan — identify commits needing doc updates
- [ ] Step 2: Approve — present findings, get user approval
- [ ] Step 3: Update — apply approved changes via writer subagents
- [ ] Step 4: Summary — report what changed
```

## Step 1 — Scan

Spawn the docs-scanner subagent. Determine which commits need documentation updates:

- Find the default branch
- Get recent commits (default: last 24 hours, or accept user-specified timeframe)
- Examine each commit's changes to understand what was modified

**Filter for significant changes:**

- New features or capabilities
- API changes (new endpoints, parameters, return values)
- Breaking changes
- New configuration options
- New CLI commands or flags
- Changes to user-facing behavior

**Skip documentation for:**

- Internal refactoring
- Test-only changes
- Minor bug fixes
- Typo corrections in code
- Performance optimizations without user impact

**Be conservative: quality over quantity. When in doubt about significance, skip the update.**

**If no significant changes are found**, report this to the user and stop. Do not proceed to Step 2.

## Step 2 — User approval

Present the scanner's findings and ask the user what to act on:

```
Documentation scan complete. [Summary of findings]

Which updates should I apply?

- all — apply everything the scanner found
- pick — let me choose specific items
- none — stop here, I just wanted the audit
```

**Output a text summary describing:**

- What changes were detected in commits
- Which documentation files would be modified
- What content would be added or changed
- Rationale for why these updates are needed

Wait for the user's response. If they choose "none", stop here. If they pick specific items, confirm the list before proceeding.

## Step 3 — Update

For each approved update, spawn the docs-writer subagent. Pass it a briefing containing:

1. The file to update: full path
2. What needs to change: the specific finding from the scanner
3. Current file contents: read the file and include it so the writer has the full context (not just the stale section)
4. Codebase truth: any relevant source files the writer needs to reference for accuracy — include paths so it can read them

**Guidelines:**

- Prioritize user-facing changes over implementation details
- Match existing documentation verbosity (some docs are comprehensive, others minimal)
- Preserve existing accurate content — be strictly additive when possible
- Keep content focused and avoid generic advice

Spawn multiple writer subagents in parallel for independent files.

Each writer returns the changes it made. Collect all results. If a writer fails, report the error for that file and continue with the others.

## Step 4 — Summary

After all writers complete, present a file-by-file summary:

- File path
- What was changed (brief)
- What was left alone

If any writer encountered something it couldn't resolve (ambiguous source of truth, conflicting information), flag it for the user.