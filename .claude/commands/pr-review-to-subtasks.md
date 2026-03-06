---
argument-hint: [pr-review-file] [work-item-to-create-subissues] [work-item-assignee]
description: Create subtasks for a work item based on a review file.
---

Analise o arquivo de review $1 e use a skill "planecli" para criar subtasks para cada item do arquivo para o work-item $2. Atribua as subtasks para o usuário $3 com o status "Todo" etiqueta apropriada e prioridade "Medium".
Na descrição, coloque todo o conteúdo de cada item do arquivo, incluindo sugestões de código se houver e não faça referência ao arquivo ($1).
No título coloque somente o item no arquivo com uma descriçaõ melhorada de acordo com a tarefa, não coloque a criticidade (P1, P2, P3).