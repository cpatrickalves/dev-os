# Template SOW — Esqueleto

Este é o esqueleto a ser preenchido. Mantenha a ordem das seções e o estilo enxuto. Placeholders `{...}` devem ser preenchidos com informação real ou deixados explícitos para o usuário completar manualmente.

```markdown
---
documento: SOW-{cliente-slug}-{projeto-slug}
versao: 1.0.0
status: proposta
data: {YYYY-MM-DD}
partes:
  contratada: Cognicode (CNPJ XX.XXX.XXX/0001-XX)
  contratante: {Cliente} (CNPJ XX.XXX.XXX/0001-XX)
linear_project: {LIN-PROJ-XXX ou "a definir"}
---

# Documento de Escopo e Proposta Técnica — {Projeto}

## 1. Sumário executivo

{Problema + solução proposta + resultado esperado + prazo em 1 parágrafo.}

## 2. Entendimento do desafio

{2-3 parágrafos demonstrando escuta do problema do cliente, justificando a solução proposta.}

## 3. Objetivos

### 3.1 Objetivos de negócio (OKR — Objectives and Key Results)

- **OKR-01**: {métrica de negócio mensurável, baseline → meta, prazo}
- **OKR-02**: {...}

### 3.2 Requisitos técnicos globais

> Critérios técnicos transversais que todas as fases devem observar. No jargão técnico, são chamados de Requisitos Não-Funcionais (NFRs).

- **Requisito-01**: {performance — ex: latência do 95º percentil abaixo de 2 segundos (p95 ≤ 2s), taxa de requisições ≥ 50 por segundo}
- **Requisito-02**: {segurança — autenticação, LGPD, proteção contra ataques comuns}
- **Requisito-03**: {disponibilidade, observabilidade (registro de métricas e logs para diagnóstico)}

## 4. Escopo do projeto

> **Terminologia contratual usada neste documento**:
> - **TAP** (Termo de Aceite Provisório): documento assinado ao final de cada fase atestando que as capacidades foram entregues conforme os critérios de aceite. Dispara o pagamento da parcela vinculada à fase (em versões proposta) ou o reconhecimento formal da entrega (em versões contrato).
> - **TAD** (Termo de Aceite Definitivo): documento assinado ao término do projeto atestando a operação estável em produção. Inicia o período de garantia.
> - **CR** (Change Request — Solicitação de Mudança): documento escrito que formaliza alterações no escopo contratado, com avaliação de prazo e custo antes da execução. Detalhamento em §12.
> - **ADR** (Architecture Decision Record — Registro de Decisão de Arquitetura): documento curto que registra uma decisão técnica relevante, seu contexto e suas consequências. Vive no repositório de código em `docs/decisions/`.

### 4.1 Fases

#### Fase 0 — Discovery ({semanas}) | {%} do valor | `tipo: exploratório`

**Objetivo**: Reduzir incerteza técnica e funcional a nível contratável. Entregável único vira anexo vinculante para as fases seguintes.

**Capacidades entregues**

| ID | Capacidade | Critério de aceite | Instrumento de verificação |
|----|------------|--------------------|----------------------------|
| C-0.1 | Levantamento funcional | Documento de requisitos consolidado assinado pelas partes | Revisão conjunta |
| C-0.2 | Definição de arquitetura | Registro de Decisão de Arquitetura (ADR) cobrindo decisões de stack e integrações | `docs/decisions/` |
| C-0.3 | {Golden dataset v1, se AI} | {100+ exemplos homologados pelo cliente} | {Planilha versionada} |

**Marco de aceite**: entrega do pacote Discovery (requisitos + ADR + dataset, se aplicável) com assinatura do cliente.

**Cláusula de saída**: ao final da Fase 0, cliente pode (a) seguir com fases 1+, (b) renegociar escopo das fases seguintes com base no discovery, (c) encerrar o engajamento levando os artefatos produzidos.

---

#### Fase 1 — {Nome} ({semanas}) | {%} do valor | `tipo: fixo`

**Objetivo**: {uma frase descrevendo o valor entregue ao final desta fase}.

**Capacidades entregues**

| ID | Capacidade | Critério de aceite | Instrumento de verificação |
|----|------------|--------------------|----------------------------|
| C-1.1 | {nome} | {métrica ou condição objetiva} | {ferramenta/processo} |
| C-1.2 | {nome} | {métrica ou condição objetiva} | {ferramenta/processo} |
| C-1.3 | {nome} | {métrica ou condição objetiva} | {ferramenta/processo} |

**Marco de aceite**: Termo de Aceite Provisório (TAP) da Fase 1 assinado mediante aprovação de todas as capacidades.

**Entregáveis vinculados**: {repo/branch, URL de homologação, ADRs, dashboards}.

---

#### Fase 2 — {Nome} ({semanas}) | {%} do valor | `tipo: fixo`

{Repetir a estrutura acima. Default: 4-6 fases fixas. Última fase geralmente é "Homologação e go-live".}

---

### 4.2 Escopo NÃO incluído

> Exclusões explícitas, pareadas item-a-item com o escopo positivo. Fundamental para blindagem contratual (*contra proferentem*).

- {Item excluído 1 — ex: Migração de dados legados de {sistema X} — tratada em projeto separado.}
- {Item excluído 2 — ex: Desenvolvimento de app mobile nativo (web responsivo apenas).}
- {Item excluído 3 — ex: Treinamento/fine-tuning de modelo proprietário.}
- {Item excluído 4 — ex: Suporte a navegadores fora do último ano.}
- {Item excluído 5 — ex: Custos de API de LLM (faturamento direto cliente→provider).}

## 5. Critérios globais de entrega (Definition of Done)

> Critérios que toda entrega deve atender antes de ser considerada pronta para aceite. Aplicável a todas as fases.

`![[_partials/dod-cognicode]]`

## 6. Premissas, restrições, dependências, riscos

### 6.1 Premissas

- Cliente fornece acessos (VPN, chaves de API, credenciais) em até 5 dias úteis pós-kickoff.
- {Se AI: Base de conhecimento com ≥ 95% texto selecionável (não-escaneado).}
- {Se AI: Custos de API de modelos de linguagem (LLMs) faturados diretamente pelo cliente ao provedor.}
- Ponto único de contato (SPOC) do cliente com autonomia para decisões funcionais e disponibilidade mínima de 4h/semana.
- {Se AI: Alucinação é mitigada, não eliminada — degradação por qualidade insuficiente dos dados não constitui defeito.}

### 6.2 Restrições

- {Ex: Deployment em infraestrutura própria do cliente — on-premise — (sem cloud pública) — impacta escolhas de stack.}
- Conformidade com LGPD (Lei Geral de Proteção de Dados — Lei 13.709/2018), atuando a Cognicode como operadora (arts. 39-42).

### 6.3 Dependências

- Liberação de VPN/acessos pelo setor de TI até S1.
- {Se AI: Homologação do golden dataset pelo cliente em até 5 dias úteis após entrega da Fase 0.}

### 6.4 Riscos

| ID | Risco | Probabilidade | Impacto | Mitigação |
|----|-------|---------------|---------|-----------|
| R1 | {risco específico do projeto} | {Baixa/Média/Alta} | {Baixo/Médio/Alto} | {mitigação} |
| R2 | {...} | | | |

## 7. Matriz de responsabilidades

| Atividade | Cognicode | Cliente |
|-----------|-----------|---------|
| Desenvolvimento e arquitetura | R/A | I |
| {Se AI: Curadoria da base de conhecimento} | C | R/A |
| {Se AI: Golden dataset (construção)} | R | A/C |
| Homologação funcional | C | R/A |
| {Se on-premise: Infraestrutura} | C | R/A |
| {Se AI: Custos de API de LLM} | I | R/A |

> **Legenda**: **R** — Responsável pela execução; **A** — Aprova e responde pelo resultado; **C** — Consultado antes da decisão; **I** — Informado após a decisão.

## 8. Governança

- **Ponto único de contato (SPOC) do cliente**: {nome, e-mail, telefone}
- **Tempo de resposta para aprovações**: 2 dias úteis; atraso superior suspende automaticamente o prazo da fase em curso.
- **Rituais**: reunião diária assíncrona (Slack), reunião de revisão quinzenal (Meet 1h).
- **Canal único de comunicação**: {Slack compartilhado / Teams}.
- **Rastreabilidade**: cada capacidade `C-X.Y` deste documento mapeia para uma *Initiative* em `{linear_project}` no Linear. Backlog detalhado (stories, tasks) vive no Linear, não neste documento.

## 9. Metodologia

Fase 0 (Discovery) → fases executivas em ciclos (sprints) de 2 semanas → testes automatizados em integração contínua (CI — GitHub Actions) → homologação → Termo de Aceite Provisório (TAP) da fase → Termo de Aceite Definitivo (TAD) ao término do projeto.

## 10. Cronograma (alto nível)

| Fase | Semanas | Marco |
|------|---------|-------|
| 0 — Discovery | S0-S1 | Pacote Discovery assinado |
| 1 — {Nome} | S{X}-S{Y} | TAP Fase 1 |
| 2 — {Nome} | S{X}-S{Y} | TAP Fase 2 |
| ... | | |
| Final — Homologação e go-live | S{X}-S{Y} | TAD + go-live |
| Garantia | S{X}-S{Y} | Encerramento |

## 11. Investimento

> Detalhe apenas na versão **proposta**; o SOW anexo ao contrato não contém valores (vão para o contrato).

| Fase | Modalidade | Valor |
|------|-----------|-------|
| 0 — Discovery | Preço fechado | R$ {X} |
| 1 — {Nome} | Preço fechado, pagamento no TAP | R$ {Y} |
| ... | | |
| **Total** |  | **R$ {Z}** |

- **Condições**: 20% na assinatura, restante por marco de TAP.
- **Validade da proposta**: 30 dias corridos.
- **Reajuste**: IPCA anual para projetos > 12 meses.

## 12. Gestão de mudanças

Alterações no escopo contratado requerem Solicitação de Mudança (Change Request — CR) escrita, avaliação formal em 5 dias úteis e aceite antes da execução. Ajustes pontuais inferiores a 4 horas de trabalho individual, limitados a 10% da fase em curso, são absorvidos sem CR. Revisões de aceite de marco limitadas a 2 ciclos por fase.

## 13. Aceitação

Entregáveis de fase são considerados aceitos (aceitação automática — *deemed acceptance*) se não houver objeção escrita específica em 10 dias úteis após entrega formal (TAP). Objeções devem ser acompanhadas de evidência vinculada ao critério de aceite descumprido conforme tabelas da §4.1. Ausência de evidência vinculada a critério específico não obstaculiza o aceite.

## 14. Termos e condições

`![[_partials/terms-legal-cognicode]]`

> Inclui: propriedade intelectual (Foreground IP — criada no projeto / Background IP — pré-existente da Cognicode), LGPD (Lei 13.709/2018) na condição de operadora, acordo de confidencialidade (NDA), jurisdição, rescisão, garantia pós-entrega (90 dias).

## 15. Quem somos

Cognicode — {1 parágrafo de posicionamento} + 2-3 cases com métricas concretas.

## 16. Próximos passos

1. Aceite da proposta até {data}.
2. Assinatura do contrato + SOW anexo.
3. Kickoff em até 5 dias úteis.

## Anexos

- **A1**: Arquitetura proposta (Registros de Decisão de Arquitetura — ADRs + diagramas) — gerados na Fase 0.
- **A2**: {Se AI: Golden dataset de referência — gerado na Fase 0.}
- **A3**: Minuta de contrato.
- **A4**: Critérios globais de entrega (Definition of Done — `_partials/dod-cognicode.md`).
- **A5**: Termos legais padrão (`_partials/terms-legal-cognicode.md`).
```
