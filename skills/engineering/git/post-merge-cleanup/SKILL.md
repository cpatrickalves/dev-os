---
name: post-merge-cleanup
argument-hint: "[PR url or number] [issue id]"
description: After a PR is merged, delete the local and remote branches already merged into the default branch, remove their worktrees, and update the PR's issue/work item in the issue tracker (PR link + status Done). Invoked only as /post-merge-cleanup.
disable-model-invocation: true
metadata:
  author: Patrick Alves
  version: "1.0"
---

# Post-merge cleanup

The PR has been merged. Tidy the repository and close the loop in the issue tracker:

1. Delete the local and remote branches already merged into the default branch, and remove the worktrees that hold them.
2. Update the PR's issue/work item: link the PR and move it to the tracker's done state.

Arguments: `$ARGUMENTS`, both optional. A PR URL or number pins the PR; an issue ID (`#45`, `ABC-123`, `AB#123`) pins the issue. Whatever is missing, discover it.

Deleting a branch is the one step here that can lose work, so every deletion rests on evidence that the branch's commits are already in the default branch. When the evidence is missing, keep the branch and say why in the report. A leftover branch costs nothing; a lost commit does.

## 1. Identify the PR and the default branch

- Work from the main worktree (the first entry of `git worktree list`) and run git with `git -C <main-worktree>`, because the session may be sitting inside a worktree this skill is about to remove.
- Default branch: `git symbolic-ref --short refs/remotes/origin/HEAD` (usually `origin/main`). Below it is called `<default>`.
- Git host: read `git remote get-url origin`. Use `gh` for GitHub and `az repos` for Azure DevOps.
- PR: from the argument, otherwise the PR of the current branch (`gh pr view --json number,url,state,headRefName,headRefOid,baseRefName,body,title`; on Azure DevOps `az repos pr list --source-branch <branch> --status all`). If the current branch is already the default branch and no argument was given, take the most recently merged PR authored by the user (`gh pr list --state merged --author @me --limit 1`) and confirm it with the user before going on.
- Stop if the PR is not merged (on Azure DevOps, status `completed`). Nothing below is safe for an open PR.

## 2. Bring the default branch up to date

```bash
git -C <main-worktree> fetch --prune origin
```

If the main worktree has the PR's branch checked out, switch it to the default branch first (`git switch main`), but only when `git status --porcelain` is empty; with local changes, stop and tell the user. Then `git pull --ff-only` on the default branch.

## 3. Find the merged branches

A branch counts as merged when one of these holds:

- **Merge or rebase-merge:** `git merge-base --is-ancestor <branch> origin/<default>` succeeds.
- **Squash merge:** the ancestry check fails because the squash created a new commit, so match the branch against a merged PR: the branch tip equals the PR's `headRefOid`, or is an ancestor of it. Get all merged PRs in one call: `gh pr list --state merged --limit 200 --json number,headRefName,headRefOid`. On Azure DevOps: `az repos pr list --status completed --top 200` (`sourceRefName`, `lastMergeSourceCommit.commitId`).

A local branch whose upstream shows `[gone]` in `git branch -vv` is a strong hint but not proof; someone may have deleted an unmerged remote branch. It still has to pass one of the checks above.

Check local branches (`git for-each-ref refs/heads`) and remote branches (`git for-each-ref refs/remotes/origin`). Never touch the default branch, `main`, `master`, `develop`, `HEAD`, or a release branch (`release/*`).

The PR's own branch has a special case: if the local branch has commits that are not in the merged PR (`git rev-list <headRefOid>..<branch>` is not empty), work was added after the merge. Keep the branch and report the extra commits.

## 4. Confirm, then delete

The PR's own branch is the reason the user ran this skill, so clean it up without asking. If other merged branches turned up, list them (name, local/remote, the PR or merge commit that proves it) and ask once, with `AskUserQuestion`, whether to delete them too. They may belong to teammates.

For each branch to delete, in this order:

1. **Worktree.** Find it in `git worktree list --porcelain`. If `git -C <path> status --porcelain` shows changes, keep the worktree and the branch, and report it. Otherwise `git worktree remove <path>`. If that worktree is the session's current directory, remove it last and tell the user the session's working directory is gone.
2. **Local branch.** `git branch -d <branch>`. A squash-merged branch fails this check, so use `git branch -D <branch>` only for a branch that passed the squash check in step 3.
3. **Remote branch.** Skip it if the host already deleted it on merge (`git ls-remote --heads origin <branch>` is empty). Otherwise `git push origin --delete <branch>`.

Finish with `git worktree prune` and `git fetch --prune origin`.

## 5. Find the issue and its tracker

Take the issue from the argument. Otherwise look, in order, at:

- the PR body and title: `Closes #45`, `Fixes ABC-123`, `AB#123`, tracker links;
- the branch name, such as `feat/ABC-123-login` or `45-fix-timeout`;
- the PR's commit messages.

Then identify the tracker. A link settles it: `linear.app`, `github.com/<org>/<repo>/issues`, `dev.azure.com/.../_workitems`, `atlassian.net`, Plane. Without a link, combine the ID format with the project's own signals: `CLAUDE.md`, `AGENTS.md`, docs that name the tracker, `.mcp.json`, and the tools available in this session (search `ToolSearch` for "linear", "plane", "jira"; check `planecli`, `gh`, `az boards`). `#45` in a GitHub repo is GitHub Issues; `AB#123` is Azure Boards; `ABC-123` could be Linear, Plane or Jira, so look the ID up in the trackers you can reach and use the one that finds it.

If no issue turns up, ask the user for the ID with `AskUserQuestion`, offering "no issue" as an option. If the tracker cannot be reached, skip this part and say so in the report.

## 6. Update the issue

Read the issue first. Trackers often link the PR and close the issue on their own (`Closes #45` on GitHub, the Linear and Azure DevOps integrations), so update only what is still missing and never add a second link.

**Link the PR.** Prefer the tracker's native link or attachment over a comment, because the link shows up in the issue's development panel:

| Tracker | Link | Done |
|---|---|---|
| GitHub Issues | the PR body's `Closes #N` already links it; otherwise `gh issue comment N --body "Merged in <PR url>"` | `gh issue close N --reason completed`; if the issue is on a GitHub Project with a Status field, set it to Done with `gh project item-edit` |
| Linear (MCP) | `save_issue` with `links: [{url: <PR url>, title: <PR title>}]` | `save_issue` with `state` set to the team's status of type `completed` (`list_issue_statuses`) |
| Plane (`planecli`) | no native link command: `planecli comment create <ID> --body "Merged in <PR url>"` | `planecli wi update <ID> --state <name>`, using the state in the `completed` group (`planecli state ls -p <project> --group completed`) |
| Azure Boards | `az repos pr work-item add --id <pr> --work-items <id>` | `az boards work-item update --id <id> --state <Done/Closed>`; the state name depends on the process, so read the allowed states first |
| Jira | remote link to the PR URL (Atlassian MCP or `acli`) | the transition into the Done status category |

The done state's name varies with the team's workflow ("Done", "Feito", "Closed", "Concluído"), so pick it by category (completed/done), not by name. If more than one state qualifies, prefer the one named Done.

Read the issue back after the update to confirm the new status and the link.

## 7. Report

End with a short report:

```
PR #123 (merged) — feat: login timeout
Branches
  deleted   feat/ABC-123-login   local + remote + worktree ../app-login
  deleted   fix/typo             local (remote already gone)
  kept      feat/old-spike       worktree has uncommitted changes
Issue ABC-123 (Linear)
  PR linked · status In Review → Done
```

List everything kept or skipped, with the reason. The user should be able to finish by hand whatever the skill left alone.
