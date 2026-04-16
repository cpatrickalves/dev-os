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

### 3.1 Objetivos de negócio (outcomes)

- **OKR-01**: {métrica de negócio mensurável, baseline → meta, prazo}
- **OKR-02**: {...}

### 3.2 Objetivos técnicos (NFRs globais)

- **NFR-01**: {performance, ex: p95 ≤ 2s, RPS ≥ 50}
- **NFR-02**: {segurança, LGPD, autenticação}
- **NFR-03**: {disponibilidade, observabilidade}

## 4. Escopo do projeto

### 4.1 Fases

#### Fase 0 — Discovery ({semanas}) | {%} do valor | `tipo: exploratório`

**Objetivo**: Reduzir incerteza técnica e funcional a nível contratável. Entregável único vira anexo vinculante para as fases seguintes.

**Capabilities**

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-0.1 | Levantamento funcional | Documento de requisitos consolidado assinado pelas partes | Revisão conjunta |
| C-0.2 | Spike de arquitetura | ADR registrando decisões de stack e integrações | `docs/decisions/` |
| C-0.3 | {Golden dataset v1, se AI} | {100+ exemplos homologados pelo cliente} | {Planilha versionada} |

**Marco de aceite**: entrega do pacote Discovery (requisitos + ADR + dataset, se aplicável) com assinatura do cliente.

**Cláusula de saída**: ao final da Fase 0, cliente pode (a) seguir com fases 1+, (b) renegociar escopo das fases seguintes com base no discovery, (c) encerrar o engajamento levando os artefatos produzidos.

---

#### Fase 1 — {Nome} ({semanas}) | {%} do valor | `tipo: fixo`

**Objetivo**: {uma frase descrevendo o valor entregue ao final desta fase}.

**Capabilities**

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-1.1 | {nome} | {métrica ou condição objetiva} | {ferramenta/processo} |
| C-1.2 | {nome} | {métrica ou condição objetiva} | {ferramenta/processo} |
| C-1.3 | {nome} | {métrica ou condição objetiva} | {ferramenta/processo} |

**Marco de aceite**: TAP da Fase 1 assinado mediante aprovação de todas as capabilities.

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

## 5. Definition of Done (global, aplicável a todas as fases)

`![[_partials/dod-cognicode]]`

## 6. Premissas, restrições, dependências, riscos

### 6.1 Premissas

- Cliente fornece acessos (VPN, API keys, credenciais) em até 5 dias úteis pós-kickoff.
- {Se AI: Base de conhecimento com ≥ 95% texto selecionável (não-escaneado).}
- {Se AI: Custos de API de LLM faturados diretamente pelo cliente ao provider.}
- SPOC do cliente com autonomia para decisões funcionais e disponibilidade mínima de 4h/semana.
- {Se AI: Alucinação é mitigada, não eliminada — degradação por qualidade insuficiente dos dados não constitui defeito.}

### 6.2 Restrições

- {Ex: Deployment on-premise {cliente} (sem cloud pública) — impacta escolhas de stack.}
- Conformidade LGPD como operadora (Lei 13.709/2018 arts. 39-42).

### 6.3 Dependências

- Liberação de VPN/acessos pelo setor de TI até S1.
- {Se AI: Homologação do golden dataset pelo cliente em até 5 dias úteis após entrega da Fase 0.}

### 6.4 Riscos

| ID | Risco | Prob | Impacto | Mitigação |
|----|-------|------|---------|-----------|
| R1 | {risco específico do projeto} | {B/M/A} | {B/M/A} | {mitigação} |
| R2 | {...} | | | |

## 7. Responsabilidades (RACI simplificado)

| Atividade | Cognicode | Cliente |
|-----------|-----------|---------|
| Desenvolvimento e arquitetura | R/A | I |
| {Se AI: Curadoria da base de conhecimento} | C | R/A |
| {Se AI: Golden dataset (construção)} | R | A/C |
| Homologação funcional | C | R/A |
| {Se on-premise: Infraestrutura} | C | R/A |
| {Se AI: Custos de API de LLM} | I | R/A |

## 8. Governança

- **SPOC do cliente**: {nome, e-mail, telefone}
- **SLA de decisão**: 2 dias úteis para aprovações; atraso superior suspende automaticamente o prazo da fase em curso.
- **Rituais**: daily assíncrona (Slack), review quinzenal (Meet 1h).
- **Canal único**: {Slack compartilhado / Teams}.
- **Rastreabilidade de capabilities**: cada `C-X.Y` do SOW mapeia para uma *Initiative* em `{linear_project}`. Stories e tasks filhas vivem no Linear, não neste documento.

## 9. Metodologia

Fase 0 (Discovery) → fases executivas em sprints de 2 semanas → QA + evals automatizados em CI (GitHub Actions) → homologação → TAP da fase → aceite final (TAD) ao término do projeto.

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

Alterações no escopo contratado requerem Change Request (CR) escrita, avaliação formal em 5 dias úteis e aceite antes da execução. Ajustes pontuais inferiores a 4h individuais, limitados a 10% da fase em curso, são absorvidos sem CR. Revisões de aceite de marco limitadas a 2 ciclos por fase.

## 13. Aceitação

Entregáveis de fase considerados aceitos (*deemed acceptance*) se não houver objeção escrita específica em 10 dias úteis após entrega formal (TAP). Objeções devem ser acompanhadas de evidência vinculada ao critério de aceite descumprido.

## 14. Termos e condições

`![[_partials/terms-legal-cognicode]]`

> Inclui: propriedade intelectual (Foreground/Background IP), LGPD como operadora, NDA, jurisdição, rescisão, garantia pós-entrega (90 dias).

## 15. Quem somos

Cognicode — {1 parágrafo de posicionamento} + 2-3 cases com métricas concretas.

## 16. Próximos passos

1. Aceite da proposta até {data}.
2. Assinatura do contrato + SOW anexo.
3. Kickoff em até 5 dias úteis.

## Anexos

- **A1**: Arquitetura proposta (ADRs + diagramas) — gerado na Fase 0.
- **A2**: {Se AI: Golden dataset de referência — gerado na Fase 0.}
- **A3**: Minuta de contrato.
- **A4**: Partial DoD (`_partials/dod-cognicode.md`).
- **A5**: Partial Termos Legais (`_partials/terms-legal-cognicode.md`).
```
