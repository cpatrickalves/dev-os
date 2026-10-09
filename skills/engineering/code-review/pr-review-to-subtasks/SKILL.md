---
name: pr-review-to-subtasks
argument-hint: [pr-review-file] [work-item-to-create-subissues] [work-item-assignee]
description: Create subtasks for a work item based on a review file.
disable-model-invocation: true
---

A partir do arquivo de Markdown de review, use a skill "planecli" para criar subtasks/sub issues para os achados. Me pergunte se é para criar para todos os achados procedentes ou se eu irei listar/filtras os achados (na maioria das vezes irei listar). Crie subissues para issue original (tente deduzir a partir do título ou descrição do PR, caso contrário me pergunte). Atribua as subtasks para o usuário que criou o PR (na dúvida me pergunte). As subissues devem ser criadas com o status "Todo" etiqueta apropriada e prioridade apropriada de acordo com o review (criticidade). Na descrição, coloque todo o conteúdo de descrito no arquivo, incluindo sugestões de código se houver, não faça referência ao arquivo markdown nem cite os agentes revisores. Para cada issue coloque uma descrição melhorada de acordo com a tarefa, não coloque a criticidade (P1, P2, P3).