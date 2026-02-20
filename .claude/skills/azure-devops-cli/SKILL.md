---
name: azure-devops-cli
description: Manages Azure DevOps resources via CLI including projects, repos, pipelines, builds, pull requests, work items, artifacts, and service endpoints. Use when working with Azure DevOps, az devops commands, CI/CD automation, or when the user mentions Azure DevOps CLI, pipelines, boards, or repos.
---

# Azure DevOps CLI

Manage Azure DevOps resources using the Azure CLI with the Azure DevOps extension.

## Prerequisites

```bash
# Install Azure CLI
brew install azure-cli  # macOS
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash  # Linux

# Install Azure DevOps extension
az extension add --name azure-devops

# Verify
az --version && az extension show --name azure-devops
```

## CLI Structure

```
az devops          # Organization, projects, teams, users, wikis, security
az pipelines       # Pipelines, builds, releases, runs, variables, agents
az boards          # Work items, areas, iterations
az repos           # Repositories, pull requests, policies, refs
az artifacts       # Universal packages (publish/download)
```

## Authentication

```bash
# Login with PAT
az devops login --organization https://dev.azure.com/{org} --token $PAT

# Set defaults (avoids repeating --org and --project)
az devops configure --defaults organization=https://dev.azure.com/{org} project={project}

# Use PAT from environment variable (most secure)
export AZURE_DEVOPS_EXT_PAT=$MY_PAT
```

## Quick Reference

### Projects

```bash
az devops project list --output table
az devops project create --name {name} --visibility private --source-control git
az devops project show --project {name}
```

### Repositories

```bash
az repos list --output table
az repos create --name {repo-name}
az repos show --repository {repo-name}
```

### Pull Requests

```bash
# Create
az repos pr create -r {repo} -s {source-branch} -t {target-branch} --title "Title" -d "Description"

# List, show, vote
az repos pr list --repository {repo} --status active --output table
az repos pr show --id {pr-id}
az repos pr set-vote --id {pr-id} --vote approve

# Complete
az repos pr update --id {pr-id} --status completed
```

Full PR reference (parameters, reviewers, policies, work items): [references/pull-requests.md](references/pull-requests.md)

### Pipelines

```bash
# List and run
az pipelines list --output table
az pipelines run --name {name} --branch main

# Create
az pipelines create --name {name} --repository {repo} --branch main --yaml-path azure-pipelines.yml

# Runs and artifacts
az pipelines runs list --pipeline {id} --top 10
az pipelines runs artifact download --artifact-name {name} --path ./output --run-id {id}
```

Full pipeline reference (builds, releases, variables, folders, agents): [references/pipelines-builds.md](references/pipelines-builds.md)

### Work Items

```bash
# Query
az boards query --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.AssignedTo] = @Me"

# Create and update
az boards work-item create --title "Fix bug" --type Bug --assigned-to user@example.com
az boards work-item update --id {id} --state "Active"
az boards work-item show --id {id}
```

Full boards reference (areas, iterations, relations): [references/boards.md](references/boards.md)

### Service Endpoints

```bash
az devops service-endpoint list --output table
az devops service-endpoint create --service-endpoint-configuration endpoint.json
```

## Detailed References

| Topic | File |
|-------|------|
| Pull requests (params, reviewers, policies, work items) | [references/pull-requests.md](references/pull-requests.md) |
| Pipelines, builds, releases, variables, agents | [references/pipelines-builds.md](references/pipelines-builds.md) |
| Work items, areas, iterations | [references/boards.md](references/boards.md) |
| Projects, repos, refs, policies | [references/projects-repos.md](references/projects-repos.md) |
| Teams, users, security, wikis, admin | [references/security-admin.md](references/security-admin.md) |
| Artifacts, service endpoints | [references/artifacts-agents.md](references/artifacts-agents.md) |
| Scripting patterns, JMESPath, workflows | [references/scripting-patterns.md](references/scripting-patterns.md) |

## Output Formats

```bash
--output table   # Human-readable
--output json    # Default, machine-readable
--output tsv     # Shell-script friendly
--output yaml    # YAML format
--output none    # Suppress output
```

## JMESPath Queries

```bash
az pipelines list --query "[?name=='myPipeline']"
az pipelines list --query "[].{Name:name, ID:id}" --output table
az pipelines runs list --query "[?status=='completed' && result=='succeeded']"
```

## Global Arguments

| Parameter | Description |
|-----------|-------------|
| `--org` / `--organization` | Azure DevOps organization URL |
| `--project` / `-p` | Project name or ID |
| `--output` / `-o` | Output format (json, table, tsv, yaml, none) |
| `--query` | JMESPath query string |
| `--yes` / `-y` | Skip confirmation prompts |
| `--open` | Open in web browser |
| `--detect` | Auto-detect organization from git config |

## Common Workflows

### Create PR from current branch

```bash
az repos pr create --source-branch $(git branch --show-current) --target-branch main \
  --title "Feature: $(git log -1 --pretty=%B)" --open
```

### Run pipeline and wait for completion

```bash
RUN_ID=$(az pipelines run --name "$PIPELINE_NAME" --query "id" -o tsv)
while true; do
  STATUS=$(az pipelines runs show --run-id $RUN_ID --query "status" -o tsv)
  [[ "$STATUS" != "inProgress" && "$STATUS" != "notStarted" ]] && break
  sleep 10
done
RESULT=$(az pipelines runs show --run-id $RUN_ID --query "result" -o tsv)
echo "Result: $RESULT"
```

More scripting patterns and real-world workflows: [references/scripting-patterns.md](references/scripting-patterns.md)
