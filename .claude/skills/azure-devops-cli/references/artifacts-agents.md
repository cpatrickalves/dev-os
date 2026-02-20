# Artifacts & Service Endpoints Reference

## Universal Packages

### Publish Package

```bash
az artifacts universal publish \
  --feed {feed-name} \
  --name {package-name} \
  --version {version} \
  --path {package-path} \
  --project {project}
```

### Download Package

```bash
az artifacts universal download \
  --feed {feed-name} \
  --name {package-name} \
  --version {version} \
  --path {download-path} \
  --project {project}
```

## Service Endpoints

```bash
az devops service-endpoint list --project {project} --output table
az devops service-endpoint show --id {endpoint-id} --project {project}
az devops service-endpoint create --service-endpoint-configuration endpoint.json --project {project}
az devops service-endpoint delete --id {endpoint-id} --project {project} --yes
```

### Service Connection Configuration Example

```json
{
  "data": {
    "subscriptionId": "$SUBSCRIPTION_ID",
    "subscriptionName": "My Subscription",
    "creationMode": "Manual"
  },
  "url": "https://management.azure.com/",
  "authorization": {
    "parameters": {
      "tenantid": "$TENANT_ID",
      "serviceprincipalid": "$SP_ID",
      "authenticationType": "spnKey",
      "serviceprincipalkey": "$SP_KEY"
    },
    "scheme": "ServicePrincipal"
  },
  "type": "azurerm",
  "isShared": false,
  "isReady": true
}
```
