---
name: cognicode-sow
description: Gera documento de escopo de projeto (SOW — Statement of Work) em Markdown para a Cognicode, usando a hierarquia Fase → Capability → Critério de aceite. Use esta skill SEMPRE que o usuário mencionar "criar escopo", "SOW", "documento de escopo", "proposta técnica", "template de projeto", "definir escopo de projeto", "escopo para cliente", "statement of work", ou descrever um novo projeto (software, AI/LLM, RAG, agente, automação) que precisa ser escopado para cliente — mesmo que não peça explicitamente um "SOW". Também acione quando o usuário fornecer briefing de projeto e pedir para "transformar em documento", "gerar template", "estruturar como escopo" ou similar. Cobre projetos de AI/LLM (RAG, agentes), desenvolvimento web/mobile e mix dos dois, com blindagem contratual (deemed acceptance, change request, SLA de decisão) e conformidade com Lei 14.133/2021 para setor público brasileiro.
---

# Cognicode SOW Generator

Gera documentos de escopo de projeto (SOW) para a Cognicode em Markdown, prontos para virar anexo de proposta comercial ou contrato.

## Princípios estruturais (inegociáveis)

Estes princípios foram validados com o Patrick. Nunca gere um SOW que viole algum deles:

1. **Hierarquia Fase → Capability → Critério de aceite.** Nunca use user stories no SOW (voláteis demais, inflam o documento, criam rigidez contratual artificial). Backlog detalhado vive no Linear, referenciado por ID.
2. **4-6 fases como default**, extensível para N quando o projeto exige. Fases abaixo de 3 empacotam risco demais por marco; acima de 8 ficam granulares demais.
3. **Fase 0 (Discovery paga)** absorve toda a incerteza exploratória. Fases 1-N são sempre do tipo `fixo`. Não existe "bloco exploratório" espalhado pelo documento — fica tudo concentrado na Fase 0.
4. **Thresholds AI embutidos nas capabilities** da fase correspondente, nunca em seção dedicada separada. Exemplo: `Context Recall ≥ 0,80` aparece na linha da capability de retrieval, não em tabela global no final.
5. **Três cláusulas de proteção não-negociáveis** em todo SOW: *deemed acceptance* (10 dias úteis), SLA de decisão do cliente (2 dias úteis, atraso suspende prazo), Change Request escrita antes da execução.
6. **Exclusões explícitas** (`Escopo NÃO incluído`) pareadas item-a-item com o escopo positivo. Blindagem contra interpretação *contra proferentem*.
7. **"Quem somos" ao FINAL do documento**, não no início. Exceção: primeiro contato com cliente público sem relacionamento prévio.
8. **Valores monetários** aparecem apenas na versão proposta; SOW anexo ao contrato não contém valores (vão para o contrato em si).

## Fluxo de operação

Opere em **modo direto por padrão**. Só entre em **modo guiado** se o usuário disser explicitamente "modo guiado" ou equivalente ("vamos passo a passo", "me guie", etc.).

### Modo direto (padrão)

1. **Leia o briefing** do usuário (conversa atual + arquivos anexos).
2. **Identifique lacunas críticas** usando `references/checklists.md`. São lacunas críticas: nome do projeto/cliente, objetivo de negócio mensurável, domínio técnico (web/AI/mobile), setor (público/privado), prazo-alvo aproximado.
3. **Verifique status da stack mencionada**. Se o briefing menciona stack tecnológica específica (frameworks, bancos, bibliotecas, provedores) sem declarar se é decisão homologada ou sugestão, **inclua uma pergunta de status da stack na rodada crítica**. Stack homologada → trava como restrição em §6.2 e restrição no Discovery. Stack-sugestão → vira hipótese a validar na Fase 0 (capability de ADR de arquitetura).
4. **Faça UMA rodada de perguntas** cobrindo apenas as lacunas críticas — use o tool `ask_user_input_v0` se disponível, com no máximo 3 perguntas. Para o resto, aplique defaults sensatos (documentados em `references/checklists.md`) e declare no final do documento gerado.
5. **Gere o arquivo Markdown** seguindo `references/template.md` como esqueleto. Consulte `references/ai-examples.md` para projetos AI/LLM ou `references/web-examples.md` para projetos web/mobile tradicionais — embuta as capabilities relevantes nas fases do projeto. Em projetos mix, consulte ambos.
6. **Entregue o arquivo** em `/mnt/user-data/outputs/SOW-{cliente}-{projeto}-v1.0.0.md` e chame `present_files` para o usuário baixar.
7. **Liste explicitamente no final da resposta**: (a) defaults aplicados que o usuário deve validar, (b) lacunas que ficaram com placeholders `{...}` para preenchimento manual, (c) status da stack adotado no documento (homologada ou sugerida).

### Modo guiado

Ativa quando o usuário diz "modo guiado", "passo a passo" ou similar. Siga esta sequência, uma etapa por vez:

1. **Contexto geral** (cliente, projeto, domínio, setor, prazo, orçamento aproximado). Se houver menção a stack tecnológica, pergunte explicitamente se é decisão homologada ou sugestão a validar.
2. **Objetivos** (OKR de negócio + NFRs técnicos globais).
3. **Fases** — proponha 4-6 fases com base no briefing, confirme com usuário antes de detalhar capabilities.
4. **Capabilities por fase** — para cada fase confirmada, liste 2-5 capabilities com critérios de aceite. Para fases AI, puxe exemplos de `references/ai-examples.md`. Para fases web/mobile, puxe de `references/web-examples.md`.
5. **Exclusões** — pergunte explicitamente o que NÃO está incluído (crítico para blindagem).
6. **Premissas, restrições, riscos** — use defaults de `references/checklists.md` e confirme adaptações necessárias.
7. **Governança** (SPOC, SLA, canal único).
8. **Investimento** (se é versão proposta) ou pular (se é SOW-para-contrato).
9. **Revisão final** — apresente o documento completo no chat, pergunte se há ajustes antes de gerar o arquivo.
10. **Geração** do arquivo `.md` em `/mnt/user-data/outputs/` e `present_files`.

## Sinalizadores de domínio

Identifique rapidamente o tipo de projeto para puxar os exemplos certos:

- **Palavras-chave AI/LLM**: RAG, agente, chatbot, LLM, GPT, Claude, embedding, vector store, Langfuse, LangChain, LangGraph, "resposta gerada", "busca semântica", "classificação automática", "extração", "sumarização". → Consulte `references/ai-examples.md`.
- **Palavras-chave web/mobile tradicional**: React, Next.js, Vue, Svelte, FastAPI, Django, Flutter, React Native, mobile nativo, dashboard, BI, formulário, portal, área logada, integração de API, SaaS, marketplace, e-commerce, CMS. → Consulte `references/web-examples.md` para capabilities prontas de marketplace, dashboard/BI, SaaS, portal e mobile.
- **Setor público**: TCE, TCU, tribunal, ministério, prefeitura, órgão, licitação, Lei 14.133, dispensa, inexigibilidade. → Adicione cláusulas específicas (ETP/TR/TAP/TAD, LGPD reforçada, deployment on-premise como padrão). Consulte seção dedicada em `references/checklists.md`.

## Decisões estruturais recorrentes

Quando o briefing não disser, use estes defaults:

| Decisão | Default | Quando mudar |
|---------|---------|--------------|
| Quantidade de fases | 5 (inclui Fase 0 + Homologação) | Projeto < 4 semanas → 3 fases; projeto > 4 meses → 6+ fases |
| Duração do sprint | 2 semanas | Fixo |
| SLA de decisão do cliente | 2 dias úteis | Fixo (cláusula de proteção) |
| Deemed acceptance | 10 dias úteis | Fixo (cláusula de proteção) |
| Garantia pós-entrega | 90 dias | Fixo, salvo ajuste contratual |
| Duração da Fase 0 | 1-2 semanas | Projeto muito pequeno → 3-5 dias |
| % Fase 0 do valor total | 10% | Projeto com alta incerteza técnica → até 15-20% |
| Custos de API de LLM | Faturamento direto cliente→provider | Cliente insiste em bundle → cap mensal fechado |
| LGPD em projetos AI com dados sensíveis | Bedrock sa-east-1 ou on-premise | Fixo (não negociável) |
| Status da stack quando briefing omite | Perguntar na rodada crítica; nunca assumir | Ver seção "Tratamento de stack tecnológica" |

## Estilo de redação e tratamento de siglas

O SOW é um documento contratual lido por audiências mistas: gestor executivo da contratante (pode não ter background técnico), área jurídica, time técnico, eventualmente auditores. O padrão de redação **prioriza legibilidade para não-técnicos sem sacrificar precisão técnica**.

### Regra geral

Siglas devem ser **expandidas na primeira ocorrência** no corpo do documento, no formato `Nome completo em português (SIGLA)`. Nas ocorrências seguintes, usar a sigla isoladamente.

**Exemplo correto**: *"Requisitos técnicos globais (NFRs) definem critérios mensuráveis de performance, segurança e disponibilidade. O primeiro NFR trata de..."*

**Exemplo incorreto**: *"Os NFRs do projeto são..."* (sem expansão prévia).

### Siglas estruturais — SUBSTITUIR por termos em português

Estas siglas, quando usadas como **título de seção ou cabeçalho**, devem ser substituídas por expressões em português. Mantê-las como siglas quando reaparecem no corpo é aceitável (após expansão na primeira menção).

| Sigla | Substituir por (em títulos/cabeçalhos) |
|-------|---------------------------------------|
| NFR | "Requisitos técnicos globais" |
| RACI | "Matriz de responsabilidades" |
| OKR | "Objetivos de negócio" |
| SPOC | "Ponto único de contato" |
| SLA | "Tempo de resposta" (quando aplicável) ou manter SLA expandido |
| CR (Change Request) | "Solicitação de mudança" |

### Siglas contratuais — quadro de terminologia + menção isolada depois

Estas siglas são termos consagrados em contratos brasileiros (Lei 14.133/2021, prática de mercado). **Nunca substituir** nas ocorrências seguintes — substituí-las torna o documento mais longo sem ganho real, e o leitor contratual espera vê-las. A abordagem é **definir todas de uma vez em um quadro de terminologia no início da §4 (Escopo do projeto)**, antes da primeira aparição nas fases. Assim o leitor sempre encontra a definição antes do uso.

**Quadro obrigatório no início da §4**:

```markdown
> **Terminologia contratual usada neste documento**:
> - **TAP** (Termo de Aceite Provisório): documento assinado ao final de cada fase...
> - **TAD** (Termo de Aceite Definitivo): documento assinado ao término do projeto...
> - **CR** (Change Request — Solicitação de Mudança): documento escrito que formaliza alterações...
> - **ADR** (Architecture Decision Record — Registro de Decisão de Arquitetura): documento curto que registra uma decisão técnica...
```

Após esse quadro, as siglas podem aparecer isoladas no restante do documento. Exceção: em §9 (Metodologia) e §12 (Gestão de mudanças), manter uma expansão de reforço — o leitor que pular direto para essas seções precisa de contexto.

| Sigla | Quadro de terminologia + reforço em |
|-------|-------------------------------------|
| TAP | Quadro §4 + reforço em §9 e §13 |
| TAD | Quadro §4 + reforço em §9 e §10 (cronograma) |
| CR | Quadro §4 + reforço em §12 |
| ADR | Quadro §4 + reforço na primeira capability que mencione |
| LGPD | "LGPD (Lei Geral de Proteção de Dados — Lei 13.709/2018)" na primeira menção fora do quadro |
| CNPJ | Manter como está — sigla mais comum no Brasil |
| SOW | "Documento de Escopo Técnico (SOW — Statement of Work)" no título do documento; depois manter SOW |

### Siglas técnicas de código/arquitetura — EXPANDIR na primeira menção dentro de capabilities

Aparecem dentro de critérios de aceite de capabilities técnicas. O gestor normalmente delega a leitura desses detalhes ao time técnico, mas a primeira menção ainda deve ser expandida para quem decide ler.

| Sigla | Primeira menção deve ser |
|-------|--------------------------|
| SSR | "renderização server-side (SSR)" |
| PWA | "Progressive Web App (PWA — aplicativo web instalável)" |
| CRUD | "operações de criar, ler, atualizar e remover (CRUD)" |
| RBAC | "controle de acesso por papéis (RBAC)" |
| E2E | "testes ponta a ponta (E2E)" |
| CI/CD | "integração e entrega contínuas (CI/CD)" |
| DDL | "definição de estrutura de banco (DDL)" |
| API | Manter — sigla consagrada |
| REST | Manter — sigla consagrada |
| OIDC | "OpenID Connect (OIDC)" |

### Métricas técnicas — EXPLICAR entre parênteses na primeira menção

Métricas com valor numérico aparecem em critérios de aceite. Não mudar o número nem remover a métrica — adicionar explicação curta entre parênteses na primeira ocorrência.

| Métrica | Primeira menção deve ser |
|---------|--------------------------|
| p95 ≤ 2s | "latência do 95º percentil abaixo de 2 segundos (p95 ≤ 2s)" |
| p50/p95/p99 | "latência em percentis 50, 95 e 99 (p50/p95/p99)" |
| Lighthouse ≥ 80 | "pontuação Lighthouse ≥ 80 (ferramenta do Google que mede performance web)" |
| WCAG 2.1 AA | "WCAG 2.1 nível AA (padrão internacional de acessibilidade web)" |
| axe-core | "ferramenta axe-core (auditoria automática de acessibilidade)" |
| F1 macro ≥ 0,82 | "F1 macro ≥ 0,82 (métrica de acurácia balanceada; 1,0 = perfeito)" |
| Faithfulness, Context Recall, Tool-call Accuracy | "métrica Faithfulness ≥ 0,85 (fidelidade da resposta ao conteúdo recuperado, medida pela ferramenta Ragas)" — ajustar conforme a métrica |

### Matriz de responsabilidades — legenda obrigatória

Nas células da matriz, usar `R`, `A`, `C`, `I` (abreviações são padrão internacional do RACI). Imediatamente após a tabela, adicionar **legenda obrigatória**:

> **Legenda**: **R** — Responsável pela execução; **A** — Aprova e responde pelo resultado; **C** — Consultado antes da decisão; **I** — Informado após a decisão.

### Diretrizes gerais

- Preferir português claro a jargão quando ambos são precisos. *"marco de aceite"* é igualmente preciso que *"milestone"*.
- Em nomes próprios de ferramentas (Langfuse, Ragas, Playwright, Lighthouse, axe-core), manter o nome original e adicionar breve descrição entre parênteses na primeira menção.
- Evitar anglicismos desnecessários quando há termo consagrado em português: "entregável" em vez de "deliverable"; "fase" em vez de "milestone"; "marco" em vez de "checkpoint".
- Não escrever "deemed acceptance" em inglês no corpo do documento — usar "aceitação automática (deemed acceptance)" na primeira menção; depois "aceitação automática".
- No Sumário Executivo (§1), **evitar qualquer sigla técnica não expandida**. É a primeira seção lida pelo decisor; deve ser 100% legível sem consultar outras seções.

## Tratamento de stack tecnológica

A stack tecnológica é uma das informações mais ambíguas em briefings. O usuário pode mencioná-la em três contextos distintos, e o SOW deve tratar cada um diferente. **Nunca assuma** que uma stack mencionada é decisão final.

### Detecção

Considere como "menção a stack" qualquer referência a: frameworks (React, Next.js, Vite, Vue, FastAPI, Django, Flask), bancos de dados (PostgreSQL, MongoDB, Redis), provedores de autenticação (Logto, Auth0, Keycloak, gov.br), armazenamento (MinIO, S3), LLMs/providers de IA (Claude, GPT, Bedrock, Ollama), orquestração (Kestra, Airflow), ferramentas específicas (Langfuse, Langchain, Metabase, dbt).

### Três status possíveis

**1. Stack homologada** — o cliente já decidiu, a arquitetura está definida, não há negociação.
- Trata como `restrição` em §6.2 com a frase: *"Stack tecnológica congelada conforme definido: {lista}."*
- Capability de arquitetura na Fase 0 vira **"Detalhamento de arquitetura sobre stack definida"**, não "Escolha de stack".
- Mudança de stack após assinatura → Change Request obrigatória.

**2. Stack sugerida (hipótese a validar)** — o cliente mencionou uma stack mas está aberto a revisão.
- Trata como `premissa` em §6.1 com a frase: *"Stack indicativa sugerida: {lista}. Validação formal na Fase 0 pode recomendar ajustes."*
- Capability de arquitetura na Fase 0 vira **"Validação e decisão de stack"**, com ADR como entregável.
- Mudança durante Fase 0 → sem CR. Mudança após TAP Fase 0 → CR.

**3. Stack não mencionada** — briefing silencia sobre tecnologia.
- Capability de arquitetura na Fase 0 vira **"Definição de stack e arquitetura"**.
- Stack aparece apenas no ADR entregue ao final da Fase 0.
- SOW não lista tecnologias específicas nas fases 1+; apenas refere ADR.

### Pergunta-padrão quando briefing é ambíguo

Quando houver menção a stack sem declaração de status, inclua esta pergunta na rodada crítica (reformulada em linguagem natural conforme contexto):

> *"A stack mencionada ({lista resumida}) é decisão já homologada com o cliente (trava como restrição) ou sugestão indicativa (fica como hipótese a validar na Fase 0)?"*

### O que NUNCA fazer

- Nunca embutir nomes de tecnologias nas capabilities das fases 1+ sem antes confirmar o status. Capability `C-1.1: Implementar autenticação com Logto OSS` pressupõe que Logto é decisão final.
- Nunca listar stack no Sumário Executivo sem confirmar status. Se for sugerida, usar frase genérica: *"arquitetura web moderna baseada em React, API Python e banco relacional, a ser detalhada no Discovery."*
- Nunca tratar stack de projetos próprios da Cognicode (recorrente: Vite + React, FastAPI, PostgreSQL) como automaticamente homologada em projetos de cliente — o cliente precisa concordar formalmente.

## Estrutura do output

O arquivo gerado DEVE seguir esta ordem de seções (consistente com o template):

1. Front-matter YAML (documento, versao, status, data, partes, linear_project)
2. Sumário executivo
3. Entendimento do desafio
4. Objetivos (negócio + técnicos)
5. Escopo do projeto (fases com capabilities + escopo NÃO incluído)
6. Definition of Done global (referência a partial)
7. Premissas, restrições, dependências, riscos
8. Responsabilidades (RACI)
9. Governança
10. Metodologia
11. Cronograma alto nível
12. Investimento (apenas versão proposta)
13. Gestão de mudanças
14. Aceitação (deemed acceptance)
15. Termos e condições (referência a partial)
16. Quem somos
17. Próximos passos
18. Anexos

## Nome do arquivo

Padrão: `SOW-{cliente-slug}-{projeto-slug}-v{semver}.md`

- `cliente-slug` e `projeto-slug`: lowercase, kebab-case, sem acentos
- `semver` inicial: `1.0.0` para primeira versão; incrementar MAJOR em mudanças contratuais, MINOR em acréscimos, PATCH em redação
- Exemplo: `SOW-tce-pa-chatcontas-v1.0.0.md`

## Comportamento quando informação está incompleta

**Nunca invente** valores específicos do cliente (CNPJ, nomes, valores monetários, datas). Use placeholders claros `{como este}` e liste no final do output quais placeholders ficaram para preenchimento.

**Sempre declare** os defaults aplicados em uma seção final da resposta (fora do arquivo), não dentro do SOW. O SOW gerado deve parecer decidido e profissional; as explicações vão na mensagem ao usuário.

## O que NÃO fazer

- Não incluir user stories no SOW gerado.
- Não criar seção "Critérios de aceite de features AI" separada (os thresholds vão dentro das capabilities).
- Não misturar blocos exploratórios no meio das fases fixas (tudo vai para Fase 0).
- Não colocar "Quem somos" no início.
- Não incluir valores no SOW se o usuário indicar que é versão para contrato.
- Não inventar métricas específicas para projetos AI sem consultar `references/ai-examples.md`.
- Não omitir as três cláusulas de proteção (deemed acceptance, SLA decisão, CR).
- Não tratar stack mencionada no briefing como homologada sem confirmação explícita (ver seção "Tratamento de stack tecnológica").

## Referências bundled

- `references/template.md` — Esqueleto completo do SOW para copiar e preencher.
- `references/ai-examples.md` — Exemplos de capabilities com thresholds para RAG, agentes, classificação, extração. Ler quando o projeto envolver AI/LLM.
- `references/web-examples.md` — Exemplos de capabilities para marketplace, dashboard/BI, SaaS, portal institucional e mobile. Ler quando o projeto for web/mobile tradicional (sem AI).
- `references/checklists.md` — Lacunas críticas, defaults sensatos, adaptações para setor público. Ler no início de cada operação.
