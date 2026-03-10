---
argument-hint: [pr-number] [pr-url]
description: Revisa um PR do Azure Devops e crie subtasks para um work item baseado no review.
---

/compound-engineering:workflows:review Revise o PR $1 do Azure devops (url: $2), use a skill do azure-devops-cli para obter dados do PR. Antes do review, verifique as branchs de origen e destino no PR e se elas estão atualizadas localmente, faça o checkout apropriado nas branches para uma melhor análise. Salve o relatório final em um arquivo markdown.