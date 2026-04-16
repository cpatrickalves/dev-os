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
3. **Faça UMA rodada de perguntas** cobrindo apenas as lacunas críticas — use o tool `ask_user_input_v0` se disponível, com no máximo 3 perguntas. Para o resto, aplique defaults sensatos (documentados em `references/checklists.md`) e declare no final do documento gerado.
4. **Gere o arquivo Markdown** seguindo `references/template.md` como esqueleto. Para projetos AI/LLM, consulte `references/ai-examples.md` e embuta as capabilities relevantes nas fases do projeto.
5. **Entregue o arquivo** em `/mnt/user-data/outputs/SOW-{cliente}-{projeto}-v1.0.0.md` e chame `present_files` para o usuário baixar.
6. **Liste explicitamente no final da resposta**: (a) defaults aplicados que o usuário deve validar, (b) lacunas que ficaram com placeholders `{...}` para preenchimento manual.

### Modo guiado

Ativa quando o usuário diz "modo guiado", "passo a passo" ou similar. Siga esta sequência, uma etapa por vez:

1. **Contexto geral** (cliente, projeto, domínio, setor, prazo, orçamento aproximado).
2. **Objetivos** (OKR de negócio + NFRs técnicos globais).
3. **Fases** — proponha 4-6 fases com base no briefing, confirme com usuário antes de detalhar capabilities.
4. **Capabilities por fase** — para cada fase confirmada, liste 2-5 capabilities com critérios de aceite. Para fases AI, puxe exemplos de `references/ai-examples.md`.
5. **Exclusões** — pergunte explicitamente o que NÃO está incluído (crítico para blindagem).
6. **Premissas, restrições, riscos** — use defaults de `references/checklists.md` e confirme adaptações necessárias.
7. **Governança** (SPOC, SLA, canal único).
8. **Investimento** (se é versão proposta) ou pular (se é SOW-para-contrato).
9. **Revisão final** — apresente o documento completo no chat, pergunte se há ajustes antes de gerar o arquivo.
10. **Geração** do arquivo `.md` em `/mnt/user-data/outputs/` e `present_files`.

## Sinalizadores de domínio

Identifique rapidamente o tipo de projeto para puxar os exemplos certos:

- **Palavras-chave AI/LLM**: RAG, agente, chatbot, LLM, GPT, Claude, embedding, vector store, Langfuse, LangChain, LangGraph, "resposta gerada", "busca semântica", "classificação automática", "extração", "sumarização". → Consulte `references/ai-examples.md`.
- **Palavras-chave web/mobile tradicional**: React, Next.js, FastAPI, Flutter, mobile nativo, dashboard, formulário, integração de API, SaaS, marketplace, e-commerce. → Use estrutura-padrão do template sem puxar ai-examples.
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

## Referências bundled

- `references/template.md` — Esqueleto completo do SOW para copiar e preencher.
- `references/ai-examples.md` — Exemplos de capabilities com thresholds para RAG, agentes, classificação, extração. Ler quando o projeto envolver AI/LLM.
- `references/checklists.md` — Lacunas críticas, defaults sensatos, adaptações para setor público. Ler no início de cada operação.
