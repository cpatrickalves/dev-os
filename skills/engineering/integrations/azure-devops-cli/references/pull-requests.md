# Pull Requests Reference

## PR Command Parameter Reference

| Parameter | `create` | `update` | Description |
|-----------|:--------:|:--------:|-------------|
| `--repository` / `-r` | Y | - | Repository name or ID |
| `--source-branch` / `-s` | Y | - | Source branch |
| `--target-branch` / `-t` | Y | - | Target branch (defaults to default branch) |
| `--title` | Y | Y | PR title |
| `--description` / `-d` | Y | Y | PR description |
| `--draft` | Y | Y | Set as draft (`true`/`false`) |
| `--auto-complete` | Y | Y | Set auto-complete (`true`/`false`) |
| `--squash` | Y | Y | Squash merge (`true`/`false`) |
| `--delete-source-branch` | Y | Y | Delete source branch after merge (`true`/`false`) |
| `--merge-commit-message` | Y | Y | Custom merge commit message |
| `--transition-work-items` | Y | Y | Transition linked work items to next state (`true`/`false`) |
| `--bypass-policy` | Y | Y | Bypass required policies (`true`/`false`) |
| `--bypass-policy-reason` | Y | Y | Reason for bypassing policies |
| `--reviewers` | Y | - | Space-separated reviewer emails |
| `--required-reviewers` | Y | - | Space-separated required reviewer emails |
| `--work-items` | Y | - | Space-separated work item IDs |
| `--labels` | Y | - | Space-separated label names |
| `--open` | Y | - | Open PR in browser after creation |
| `--status` | - | Y | Set status (`active`/`completed`/`abandoned`) |

## Create Pull Request

```bash
# Basic PR creation
az repos pr create \
  --repository {repo} \
  --source-branch {source-branch} \
  --target-branch {target-branch} \
  --title "PR Title" \
  --description "PR description" \
  --open

# Draft PR with reviewers
az repos pr create \
  --repository {repo} \
  --source-branch feature/new-feature \
  --target-branch main \
  --title "Feature: New functionality" \
  --draft true \
  --reviewers user1@example.com user2@example.com \
  --required-reviewers lead@example.com \
  --labels "enhancement" "backlog"

# PR with auto-complete, squash merge, and source branch deletion
az repos pr create \
  --repository {repo} \
  --source-branch feature/quick-fix \
  --target-branch main \
  --title "Quick fix" \
  --auto-complete true \
  --squash true \
  --delete-source-branch true \
  --transition-work-items true \
  --merge-commit-message "Squash merge: Quick fix (#123)"

# PR bypassing policies (requires permissions)
az repos pr create \
  --repository {repo} \
  --source-branch hotfix/critical \
  --target-branch main \
  --title "Hotfix: Critical production issue" \
  --bypass-policy true \
  --bypass-policy-reason "Critical production hotfix - approved by manager"
```

## List Pull Requests

```bash
az repos pr list --repository {repo} --status active --output table
az repos pr list --repository {repo} --creator {email}
az repos pr list --repository {repo} --reviewer user@example.com
az repos pr list --repository {repo} --source-branch feature/my-feature --target-branch main
az repos pr list --repository {repo} --status active --top 10 --skip 0
```

## Show PR Details

```bash
az repos pr show --id {pr-id}
az repos pr show --id {pr-id} --open  # Open in browser
```

## Update PR (Complete/Abandon/Draft)

```bash
az repos pr update --id {pr-id} --status completed
az repos pr update --id {pr-id} --status abandoned
az repos pr update --id {pr-id} --draft true
az repos pr update --id {pr-id} --draft false
az repos pr update --id {pr-id} --auto-complete true
az repos pr update --id {pr-id} --title "New title" --description "New description"

# Complete with squash merge and delete source branch
az repos pr update --id {pr-id} --status completed \
  --squash true \
  --delete-source-branch true \
  --merge-commit-message "feat: implement feature X (#456)" \
  --transition-work-items true

# Complete bypassing policies (requires permissions)
az repos pr update --id {pr-id} --status completed \
  --bypass-policy true \
  --bypass-policy-reason "Emergency hotfix approved by team lead"
```

## Checkout PR Locally

```bash
az repos pr checkout --id {pr-id}
az repos pr checkout --id {pr-id} --remote-name upstream
```

## Vote on PR

```bash
az repos pr set-vote --id {pr-id} --vote approve
az repos pr set-vote --id {pr-id} --vote approve-with-suggestions
az repos pr set-vote --id {pr-id} --vote reject
az repos pr set-vote --id {pr-id} --vote wait-for-author
az repos pr set-vote --id {pr-id} --vote reset
```

## PR Reviewers

```bash
az repos pr reviewer add --id {pr-id} --reviewers user1@example.com user2@example.com
az repos pr reviewer add --id {pr-id} --reviewers lead@example.com --required true
az repos pr reviewer list --id {pr-id}
az repos pr reviewer remove --id {pr-id} --reviewers user1@example.com
```

## PR Work Items

```bash
az repos pr work-item add --id {pr-id} --work-items {id1} {id2}
az repos pr work-item list --id {pr-id}
az repos pr work-item remove --id {pr-id} --work-items {id1}
```

## PR Policies

```bash
az repos pr policy list --id {pr-id}
az repos pr policy queue --id {pr-id} --evaluation-id {evaluation-id}
```
