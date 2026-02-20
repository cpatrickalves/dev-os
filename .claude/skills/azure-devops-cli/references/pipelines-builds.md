# Pipelines & Builds Reference

## Pipelines

### List Pipelines

```bash
az pipelines list --output table
az pipelines list --query "[?name=='myPipeline']"
az pipelines list --folder-path 'folder/subfolder'
```

### Create Pipeline

```bash
# With specific branch and YAML path
az pipelines create \
  --name {pipeline-name} \
  --repository {repo} \
  --branch main \
  --yaml-path azure-pipelines.yml \
  --description "My CI/CD pipeline"

# For GitHub repository
az pipelines create \
  --name 'GitHubPipeline' \
  --repository https://github.com/Org/Repo \
  --branch main \
  --repository-type github

# Skip first run
az pipelines create --name 'MyPipeline' --skip-run true
```

### Show / Update / Delete Pipeline

```bash
az pipelines show --id {pipeline-id}
az pipelines show --name {pipeline-name}
az pipelines update --id {pipeline-id} --name "New name" --description "Updated description"
az pipelines delete --id {pipeline-id} --yes
```

### Run Pipeline

```bash
az pipelines run --name {pipeline-name} --branch main
az pipelines run --id {pipeline-id} --branch refs/heads/main
az pipelines run --name {pipeline-name} --parameters version=1.0.0 environment=prod
az pipelines run --name {pipeline-name} --variables buildId=123 configuration=release
az pipelines run --name {pipeline-name} --open
```

## Pipeline Runs

```bash
az pipelines runs list --pipeline {pipeline-id}
az pipelines runs list --name {pipeline-name} --top 10
az pipelines runs list --branch main --status completed
az pipelines runs show --run-id {run-id}
```

### Pipeline Artifacts

```bash
az pipelines runs artifact list --run-id {run-id}
az pipelines runs artifact download --artifact-name '{name}' --path {local-path} --run-id {run-id}
az pipelines runs artifact upload --artifact-name '{name}' --path {local-path} --run-id {run-id}
```

### Pipeline Run Tags

```bash
az pipelines runs tag add --run-id {run-id} --tags production v1.0
az pipelines runs tag list --run-id {run-id} --output table
```

## Builds

```bash
az pipelines build list
az pipelines build list --definition {build-definition-id} --status completed --result succeeded
az pipelines build queue --definition {build-definition-id} --branch main
az pipelines build show --id {build-id}
az pipelines build cancel --id {build-id}
az pipelines build tag add --build-id {build-id} --tags prod release
az pipelines build tag delete --build-id {build-id} --tag prod
```

### Build Definitions

```bash
az pipelines build definition list
az pipelines build definition show --id {definition-id}
```

## Releases

```bash
az pipelines release list
az pipelines release list --definition {release-definition-id}
az pipelines release create --definition {release-definition-id} --description "Release v1.0"
az pipelines release show --id {release-id}
az pipelines release definition list
az pipelines release definition show --id {definition-id}
```

## Pipeline Variables

```bash
az pipelines variable list --pipeline-id {pipeline-id}

# Create non-secret variable
az pipelines variable create --name {var-name} --value {var-value} --pipeline-id {pipeline-id}

# Create secret variable
az pipelines variable create --name {var-name} --secret true --pipeline-id {pipeline-id}

# Update
az pipelines variable update --name {var-name} --value {new-value} --pipeline-id {pipeline-id}

# Delete
az pipelines variable delete --name {var-name} --pipeline-id {pipeline-id} --yes
```

## Variable Groups

```bash
az pipelines variable-group list --output table
az pipelines variable-group show --id {group-id}
az pipelines variable-group create --name {group-name} --variables key1=value1 key2=value2 --authorize true
az pipelines variable-group update --id {group-id} --name {new-name} --description "Updated description"
az pipelines variable-group delete --id {group-id} --yes
```

### Variable Group Variables

```bash
az pipelines variable-group variable list --group-id {group-id}
az pipelines variable-group variable create --group-id {group-id} --name {var-name} --value {var-value}
az pipelines variable-group variable create --group-id {group-id} --name {var-name} --secret true
az pipelines variable-group variable update --group-id {group-id} --name {var-name} --value {new-value}
az pipelines variable-group variable delete --group-id {group-id} --name {var-name}
```

Secret variables can also be set via environment variable:

```bash
export AZURE_DEVOPS_EXT_PIPELINE_VAR_MySecret=secretvalue
az pipelines variable-group variable create --group-id {group-id} --name MySecret --secret true
```

## Pipeline Folders

```bash
az pipelines folder list
az pipelines folder create --path 'folder/subfolder' --description "My folder"
az pipelines folder delete --path 'folder/subfolder'
az pipelines folder update --path 'old-folder' --new-path 'new-folder'
```

## Agent Pools and Queues

```bash
az pipelines pool list
az pipelines pool list --pool-type automation
az pipelines pool show --pool-id {pool-id}
az pipelines queue list
az pipelines queue show --id {queue-id}
az pipelines agent list --pool-id {pool-id}
az pipelines agent show --agent-id {agent-id} --pool-id {pool-id}
```
