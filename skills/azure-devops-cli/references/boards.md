# Boards & Work Items Reference

## Query Work Items

```bash
az boards query \
  --wiql "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.AssignedTo] = @Me AND [System.State] = 'Active'"

az boards query --wiql "SELECT * FROM WorkItems" --output table
```

## Show Work Item

```bash
az boards work-item show --id {work-item-id}
az boards work-item show --id {work-item-id} --open
```

## Create Work Item

```bash
# Basic
az boards work-item create --title "Fix login bug" --type Bug --assigned-to user@example.com \
  --description "Users cannot login with SSO"

# With area and iteration
az boards work-item create --title "New feature" --type "User Story" \
  --area "Project\\Area1" --iteration "Project\\Sprint 1"

# With custom fields
az boards work-item create --title "Task" --type Task --fields "Priority=1" "Severity=2"

# With discussion comment
az boards work-item create --title "Issue" --type Bug --discussion "Initial investigation completed"
```

## Update Work Item

```bash
az boards work-item update --id {id} --state "Active" --title "Updated title" --assigned-to user@example.com
az boards work-item update --id {id} --area "{ProjectName}\\{Team}\\{Area}"
az boards work-item update --id {id} --iteration "{ProjectName}\\Sprint 5"
az boards work-item update --id {id} --discussion "Work in progress"
az boards work-item update --id {id} --fields "Priority=1" "StoryPoints=5"
```

## Delete Work Item

```bash
az boards work-item delete --id {id} --yes           # Soft delete (can be restored)
az boards work-item delete --id {id} --destroy --yes  # Permanent delete
```

## Work Item Relations

```bash
az boards work-item relation list --id {id}
az boards work-item relation list-type
az boards work-item relation add --id {id} --relation-type parent --target-id {parent-id}
az boards work-item relation remove --id {id} --relation-id {relation-id}
```

## Area Paths

### Project Areas

```bash
az boards area project list --project {project}
az boards area project show --path "Project\\Area1" --project {project}
az boards area project create --path "Project\\NewArea" --project {project}
az boards area project update --path "Project\\OldArea" --new-path "Project\\UpdatedArea" --project {project}
az boards area project delete --path "Project\\AreaToDelete" --project {project} --yes
```

### Team Areas

```bash
az boards area team list --team {team-name} --project {project}
az boards area team add --team {team-name} --path "Project\\NewArea" --project {project}
az boards area team remove --team {team-name} --path "Project\\AreaToRemove" --project {project}
az boards area team update --team {team-name} --path "Project\\Area" --project {project} --include-sub-areas true
```

## Iterations

### Project Iterations

```bash
az boards iteration project list --project {project}
az boards iteration project show --path "Project\\Sprint 1" --project {project}
az boards iteration project create --path "Project\\Sprint 1" --project {project}
az boards iteration project update --path "Project\\OldSprint" --new-path "Project\\NewSprint" --project {project}
az boards iteration project delete --path "Project\\OldSprint" --project {project} --yes
```

### Team Iterations

```bash
az boards iteration team list --team {team-name} --project {project}
az boards iteration team add --team {team-name} --path "Project\\Sprint 1" --project {project}
az boards iteration team remove --team {team-name} --path "Project\\Sprint 1" --project {project}
az boards iteration team list-work-items --team {team-name} --path "Project\\Sprint 1" --project {project}
```

### Default and Backlog Iterations

```bash
az boards iteration team set-default-iteration --team {team-name} --path "Project\\Sprint 1" --project {project}
az boards iteration team show-default-iteration --team {team-name} --project {project}
az boards iteration team set-backlog-iteration --team {team-name} --path "Project\\Sprint 1" --project {project}
az boards iteration team show-backlog-iteration --team {team-name} --project {project}
az boards iteration team show --team {team-name} --project {project} --timeframe current
```
