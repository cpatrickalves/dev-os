# Security, Teams, Users, Wikis & Administration Reference

## Teams

```bash
az devops team list --project {project}
az devops team show --team {team-name} --project {project}
az devops team create --name {team-name} --description "Team description" --project {project}
az devops team update --team {team-name} --project {project} --name "{new-name}" --description "Updated"
az devops team delete --team {team-name} --project {project} --yes
az devops team list-member --team {team-name} --project {project}
```

## Users

```bash
az devops user list --org https://dev.azure.com/{org} --top 10 --output table
az devops user show --user {user-id-or-email} --org https://dev.azure.com/{org}
az devops user add --email user@example.com --license-type express --org https://dev.azure.com/{org}
az devops user update --user {user-id-or-email} --license-type advanced --org https://dev.azure.com/{org}
az devops user remove --user {user-id-or-email} --org https://dev.azure.com/{org} --yes
```

## Security Groups

```bash
az devops security group list --project {project}
az devops security group list --scope organization
az devops security group show --group-id {group-id}
az devops security group create --name {group-name} --description "Description" --project {project}
az devops security group update --group-id {group-id} --name "{new-name}" --description "Updated"
az devops security group delete --group-id {group-id} --yes
```

### Group Memberships

```bash
az devops security group membership list --id {group-id}
az devops security group membership add --group-id {group-id} --member-id {member-id}
az devops security group membership remove --group-id {group-id} --member-id {member-id} --yes
```

## Security Permissions

### Namespaces

```bash
az devops security permission namespace list
az devops security permission namespace show --namespace "GitRepositories"
```

### List / Show Permissions

```bash
az devops security permission list \
  --id {user-or-group-id} --namespace "GitRepositories" --project {project}

az devops security permission list \
  --id {user-or-group-id} --namespace "GitRepositories" --project {project} \
  --token "repoV2/{project}/{repository-id}"

az devops security permission show \
  --id {user-or-group-id} --namespace "GitRepositories" --project {project} \
  --token "repoV2/{project}/{repository-id}"
```

### Update / Reset Permissions

```bash
# Grant
az devops security permission update \
  --id {user-or-group-id} --namespace "GitRepositories" --project {project} \
  --token "repoV2/{project}/{repository-id}" --permission-mask "Pull,Contribute"

# Reset specific bits
az devops security permission reset \
  --id {user-or-group-id} --namespace "GitRepositories" --project {project} \
  --token "repoV2/{project}/{repository-id}" --permission-mask "Pull,Contribute"

# Reset all
az devops security permission reset-all \
  --id {user-or-group-id} --namespace "GitRepositories" --project {project} \
  --token "repoV2/{project}/{repository-id}" --yes
```

## Wikis

```bash
az devops wiki list --project {project}
az devops wiki show --wiki {wiki-name} --project {project}
az devops wiki show --wiki {wiki-name} --project {project} --open

# Create project wiki
az devops wiki create --name {wiki-name} --project {project} --type projectWiki

# Create code wiki from repository
az devops wiki create --name {wiki-name} --project {project} --type codeWiki \
  --repository {repo-name} --mapped-path /wiki

az devops wiki delete --wiki {wiki-id} --project {project} --yes
```

### Wiki Pages

```bash
az devops wiki page list --wiki {wiki-name} --project {project}
az devops wiki page show --wiki {wiki-name} --path "/page-name" --project {project}
az devops wiki page create --wiki {wiki-name} --path "/new-page" \
  --content "# New Page\n\nPage content here..." --project {project}
az devops wiki page update --wiki {wiki-name} --path "/existing-page" \
  --content "# Updated Page\n\nNew content..." --project {project}
az devops wiki page delete --wiki {wiki-name} --path "/old-page" --project {project} --yes
```

## Administration

### Banner Management

```bash
az devops admin banner list
az devops admin banner show --id {banner-id}
az devops admin banner add --message "System maintenance scheduled" --level info  # info, warning, error
az devops admin banner update --id {banner-id} --message "Updated" --level warning \
  --expiration-date "2025-12-31T23:59:59Z"
az devops admin banner remove --id {banner-id}
```

## DevOps Extensions (Organization)

```bash
az devops extension list --org https://dev.azure.com/{org}
az devops extension search --search-query "docker"
az devops extension show --ext-id {extension-id} --org https://dev.azure.com/{org}
az devops extension install --ext-id {extension-id} --org https://dev.azure.com/{org} --publisher {publisher-id}
az devops extension enable --ext-id {extension-id} --org https://dev.azure.com/{org}
az devops extension disable --ext-id {extension-id} --org https://dev.azure.com/{org}
az devops extension uninstall --ext-id {extension-id} --org https://dev.azure.com/{org} --yes
```

## CLI Extension Management

```bash
az extension list-available --output table
az extension list --output table
az extension add --name azure-devops
az extension update --name azure-devops
az extension remove --name azure-devops
```
