# Scripting Patterns & Workflows Reference

## Authentication Best Practices

```bash
# Use PAT from environment variable (most secure)
export AZURE_DEVOPS_EXT_PAT=$MY_PAT
az devops login --organization $ORG_URL

# Pipe PAT securely (avoids shell history)
echo $MY_PAT | az devops login --organization $ORG_URL

# Set defaults to avoid repetition
az devops configure --defaults organization=$ORG_URL project=$PROJECT

# Clear credentials after use
az devops logout --organization $ORG_URL
```

## Idempotent Operations

```bash
# Check existence before creation
if ! az pipelines show --id $PIPELINE_ID 2>/dev/null; then
  az pipelines create --name "$PIPELINE_NAME" --yaml-path azure-pipelines.yml
fi

# Use --output tsv for shell parsing
PIPELINE_ID=$(az pipelines list --query "[?name=='MyPipeline'].id" --output tsv)
```

## Script-Safe Output

```bash
az pipelines list --only-show-errors                                       # Suppress warnings
az pipelines run --name "$PIPELINE_NAME" --output none                     # No output
az repos pr list --output tsv --query "[].{ID:pullRequestId,Title:title}"  # TSV for scripts
az pipelines list --output json --query "[].{Name:name, ID:id, URL:url}"   # JSON with fields
```

## Retry Logic

```bash
retry_command() {
  local max_attempts=3 attempt=1 delay=5
  while [[ $attempt -le $max_attempts ]]; do
    if "$@"; then return 0; fi
    echo "Attempt $attempt failed. Retrying in ${delay}s..."
    sleep $delay
    ((attempt++))
    delay=$((delay * 2))
  done
  echo "All $max_attempts attempts failed"
  return 1
}

retry_command az pipelines run --name "$PIPELINE_NAME"
```

## Input Validation

```bash
if [[ -z "$PROJECT" || -z "$REPO" ]]; then
  echo "Error: PROJECT and REPO must be set"
  exit 1
fi

# Check if branch exists
if ! az repos ref list --repository "$REPO" --query "[?name=='refs/heads/$BRANCH']" -o tsv | grep -q .; then
  echo "Error: Branch $BRANCH does not exist"
  exit 1
fi
```

## Pipeline Orchestration

```bash
# Run pipeline and wait for completion
RUN_ID=$(az pipelines run --name "$PIPELINE_NAME" --query "id" -o tsv)

while true; do
  STATUS=$(az pipelines runs show --run-id $RUN_ID --query "status" -o tsv)
  [[ "$STATUS" != "inProgress" && "$STATUS" != "notStarted" ]] && break
  sleep 10
done

RESULT=$(az pipelines runs show --run-id $RUN_ID --query "result" -o tsv)
if [[ "$RESULT" != "succeeded" ]]; then
  echo "Pipeline failed with result: $RESULT"
  exit 1
fi
```

## Common Workflows

### Create PR from Current Branch

```bash
az repos pr create --source-branch $(git branch --show-current) --target-branch main \
  --title "Feature: $(git log -1 --pretty=%B)" --open
```

### Create Work Item on Pipeline Failure

```bash
az boards work-item create --title "Build $BUILD_BUILDNUMBER failed" --type bug \
  --org $SYSTEM_TEAMFOUNDATIONCOLLECTIONURI --project $SYSTEM_TEAMPROJECT
```

### Download Latest Pipeline Artifact

```bash
RUN_ID=$(az pipelines runs list --pipeline {pipeline-id} --top 1 --query "[0].id" -o tsv)
az pipelines runs artifact download --artifact-name 'webapp' --path ./output --run-id $RUN_ID
```

### Approve and Complete PR

```bash
az repos pr set-vote --id {pr-id} --vote approve
az repos pr update --id {pr-id} --status completed
```

### Bulk Update Work Items

```bash
for id in $(az boards query --wiql "SELECT ID FROM WorkItems WHERE State='New'" -o tsv); do
  az boards work-item update --id $id --state "Active"
done
```

### Idempotent Variable Group

```bash
VG_NAME="production-variables"
VG_ID=$(az pipelines variable-group list --query "[?name=='$VG_NAME'].id" -o tsv)
if [[ -z "$VG_ID" ]]; then
  VG_ID=$(az pipelines variable-group create --name "$VG_NAME" \
    --variables API_URL=$API_URL API_KEY=$API_KEY --authorize true --query "id" -o tsv)
fi
```

### PR Automation

```bash
PR_ID=$(az repos pr create --repository "$REPO_NAME" \
  --source-branch "$FEATURE_BRANCH" --target-branch main \
  --title "Feature: $(git log -1 --pretty=%B)" \
  --work-items $WI_1 $WI_2 --reviewers "$REVIEWER_1" "$REVIEWER_2" \
  --required-reviewers "$LEAD_EMAIL" --labels "enhancement" \
  --query "pullRequestId" -o tsv)
az repos pr update --id $PR_ID --auto-complete true
```

### Branch Policy Automation

```bash
REPOS=$(az repos list --project "$PROJECT" --query "[].id" -o tsv)
for repo_id in $REPOS; do
  az repos policy approver-count create --blocking true --enabled true \
    --branch main --repository-id "$repo_id" --minimum-approver-count 2
  az repos policy work-item-linking create --blocking true --branch main \
    --enabled true --repository-id "$repo_id"
done
```

## JMESPath Advanced Queries

```bash
# Filter by multiple conditions
az pipelines list --query "[?name.contains('CI') && enabled==true]"

# Sort and limit
az pipelines runs list --query "sort_by([?status=='completed'], &finishTime) | reverse(@) | [0:5]"

# Aggregation counts
az pipelines runs list --query "{Succeeded: length([?result=='succeeded']), Failed: length([?result=='failed'])}"

# Nested properties
az pipelines show --id $ID --query "{Name:name, Repo:repository.{Name:name, Type:type}}"

# Null-coalescing
az pipelines show --id $ID --query "{Name:name, Folder:folder || 'Root', Description:description || 'No description'}"
```
