# Projects & Repositories Reference

## Projects

```bash
az devops project list --organization https://dev.azure.com/{org} --top 10 --output table
az devops project create --name myNewProject --organization https://dev.azure.com/{org} \
  --description "My new DevOps project" --source-control git --visibility private
az devops project show --project {project-name} --org https://dev.azure.com/{org}
az devops project delete --id {project-id} --org https://dev.azure.com/{org} --yes
```

## Repositories

```bash
az repos list --org https://dev.azure.com/{org} --project {project} --output table
az repos show --repository {repo-name} --project {project}
az repos create --name {repo-name} --project {project}
az repos delete --id {repo-id} --project {project} --yes
az repos update --id {repo-id} --name {new-name} --project {project}
```

## Repository Import

```bash
# Import from public Git repository
az repos import create --git-source-url https://github.com/user/repo --repository {repo-name}

# Import with authentication
az repos import create --git-source-url https://github.com/user/private-repo \
  --repository {repo-name} --user {username} --password {password-or-pat}
```

## Git References (Branches)

```bash
az repos ref list --repository {repo}
az repos ref list --repository {repo} --query "[?name=='refs/heads/main']"
az repos ref create --name refs/heads/new-branch --object-type commit --object {commit-sha}
az repos ref delete --name refs/heads/old-branch --repository {repo} --project {project}
az repos ref lock --name refs/heads/main --repository {repo} --project {project}
az repos ref unlock --name refs/heads/main --repository {repo} --project {project}
```

## Repository Policies

```bash
az repos policy list --repository {repo-id} --branch main
az repos policy create --config policy.json
az repos policy update --id {policy-id} --config updated-policy.json
az repos policy delete --id {policy-id} --yes
```

### Policy Types

#### Approver Count

```bash
az repos policy approver-count create \
  --blocking true --enabled true --branch main --repository-id {repo-id} \
  --minimum-approver-count 2 --creator-vote-counts true
```

#### Build Policy

```bash
az repos policy build create \
  --blocking true --enabled true --branch main --repository-id {repo-id} \
  --build-definition-id {definition-id} --queue-on-source-update-only true --valid-duration 720
```

#### Work Item Linking

```bash
az repos policy work-item-linking create \
  --blocking true --branch main --enabled true --repository-id {repo-id}
```

#### Required Reviewer

```bash
az repos policy required-reviewer create \
  --blocking true --enabled true --branch main --repository-id {repo-id} \
  --required-reviewers user@example.com
```

#### Merge Strategy

```bash
az repos policy merge-strategy create \
  --blocking true --enabled true --branch main --repository-id {repo-id} \
  --allow-squash true --allow-rebase true --allow-no-fast-forward true
```

#### Case Enforcement

```bash
az repos policy case-enforcement create \
  --blocking true --enabled true --branch main --repository-id {repo-id}
```

#### Comment Required

```bash
az repos policy comment-required create \
  --blocking true --enabled true --branch main --repository-id {repo-id}
```

#### File Size

```bash
az repos policy file-size create \
  --blocking true --enabled true --branch main --repository-id {repo-id} \
  --maximum-file-size 10485760  # 10MB in bytes
```

## Git Aliases

```bash
# Enable Git aliases
az devops configure --use-git-aliases true

# Use Git commands for DevOps operations
git pr create --target-branch main
git pr list
git pr checkout 123
```
