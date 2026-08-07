---
argument-hint: [pr-review-file] [work-item-to-create-subissues] [work-item-assignee]
description: Create subtasks for a work item based on a review file.
disable-model-invocation: true
---

A partir do arquivo de review $1, use a skill "planecli" para criar subtasks para cada achado procedente no arquivo para o work-item $2 (não crie nada para achados descartados). Atribua as subtasks para o usuário $3 com o status "Todo" etiqueta apropriada e prioridade "Medium". Na descrição, coloque todo o conteúdo de cada item do arquivo, incluindo sugestões de código se houver, não faça referência ao arquivo ($1) nem cite os agentes revisores.
No título coloque somente os achados procedentes com uma descriçaõ melhorada de acordo com a tarefa, não coloque a criticidade (P1, P2, P3).