# Capabilities AI/LLM — Exemplos com Thresholds

Este arquivo contém capabilities prontas para copiar em fases de projetos AI/LLM. **Os thresholds ficam embutidos na linha da capability**, nunca em seção separada.

Leia este arquivo SOMENTE quando o projeto envolver AI/LLM (RAG, agente, classificação, extração, sumarização, etc.). Para projetos web/mobile tradicionais, use apenas o `template.md`.

## 1. RAG (Retrieval-Augmented Generation)

Projetos típicos: ChatContas, assistentes de documentação, busca semântica em acórdãos, FAQ automatizado sobre base de conhecimento.

### Capabilities recomendadas (em ordem lógica de fase)

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Ingestão e chunking | 100% dos documentos do dataset-base indexados; chunks com metadados obrigatórios (fonte, data, autor/origem) | Dashboard Langfuse + script de validação |
| C-X.2 | Retrieval | Context Recall ≥ 0,80 em golden-{N} v1 | Ragas v0.2 |
| C-X.3 | Geração com citações | Faithfulness ≥ 0,85; Answer Relevance ≥ 0,80; 100% das respostas com ≥1 citação válida | Ragas + revisão manual (amostra 20%) |
| C-X.4 | Guardrails de tópico | Topic Adherence ≥ 0,95 em dataset adversarial (out-of-scope) | LLM-judge + revisão manual |
| C-X.5 | Interface de consulta | Página funcional com streaming, histórico por usuário, feedback 👍/👎 registrado | Homologação manual |
| C-X.6 | Observabilidade | Traces completos em Langfuse (user_id, session_id, prompt, retrievals, resposta, tokens, latência p50/p95/p99) | Dashboard Langfuse |

### Premissas específicas de RAG (adicionar em §6.1)

- Base de conhecimento com ≥ 95% texto selecionável (não-escaneado).
- Volume mínimo baseline da base de conhecimento estabelecido no Discovery.
- Curadoria do golden dataset é atividade do cliente com suporte da Cognicode; dataset versionado e assinado antes do desenvolvimento da capability de retrieval.
- Degradação por qualidade insuficiente da base de conhecimento não constitui defeito — correções demandam aditivo de *data engineering*.

### Exclusões específicas de RAG (adicionar em §4.2)

- Curadoria e digitalização de documentos-fonte (responsabilidade do cliente).
- OCR de documentos escaneados com qualidade abaixo de 300dpi — tratado em projeto separado.
- Fine-tuning do modelo de embedding ou LLM — usamos modelos comerciais via API.
- Ajustes de resposta baseados em feedback subjetivo não amparado pelo golden dataset.

## 2. Agentes (LangGraph, tool use, automação agentic)

Projetos típicos: triagem automática, assistente de preenchimento de formulários, automação de fluxos com HITL, orquestração de múltiplas APIs.

### Capabilities recomendadas

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Catálogo de tools registrado | 100% das tools com schema validado, docstring e testes unitários | pytest + JSON schema validation |
| C-X.2 | Tool-call accuracy | Tool-call Accuracy ≥ 0,90 em scenarios-{N} v1 | LangSmith / Langfuse evaluations |
| C-X.3 | Execução end-to-end | Goal Accuracy ≥ 0,80; ≤ {N} passos por tarefa em 95% dos casos | LangSmith + revisão manual |
| C-X.4 | Guardrails e HITL | Ações de alto impacto bloqueadas sem aprovação humana explícita; 100% de cobertura em ações classificadas como críticas | Testes adversariais + revisão de logs |
| C-X.5 | Resiliência a falha | Fallback funcional quando tool falha; retry com backoff exponencial configurado | Testes de injeção de falha |
| C-X.6 | Observabilidade | Traces completos da árvore de decisão do agente (input, plano, tool calls, outputs, resposta final) em Langfuse | Dashboard Langfuse |

### Premissas específicas de agentes (adicionar em §6.1)

- Lista de tools autorizadas definida e congelada no final do Discovery.
- Ações classificadas como "alto impacto" (HITL obrigatório) formalmente identificadas pelo cliente.
- Limite de passos por tarefa acordado como proteção contra loops (default: 15 passos).
- Substituição integral de operador humano não é objetivo — HITL é obrigatório para ações críticas.

### Exclusões específicas de agentes (adicionar em §4.2)

- Ações com efeito irreversível em sistemas de produção do cliente sem HITL.
- Integração com sistemas que exijam credenciais não-disponibilizadas no Discovery.
- Garantia de comportamento em prompts adversariais fora do dataset de testes homologado.

## 3. Classificação / Extração estruturada

Projetos típicos: classificação de processos, extração de campos de documentos, categorização de atendimentos, análise de sentimento.

### Capabilities recomendadas

| ID | Capability | Critério de aceite | Instrumento |
|----|------------|--------------------|-------------|
| C-X.1 | Pipeline de extração/classificação | Processamento funcional de {tipo de documento} em ambiente de homologação | Testes de integração |
| C-X.2 | Acurácia de classificação | F1 macro ≥ 0,82 em test-set-{N}; precision ≥ 0,90 em classes críticas {listar} | scikit-learn metrics + test set homologado |
| C-X.3 | Extração estruturada | Field-level accuracy ≥ 0,90 para campos obrigatórios; schema validation 100% | Pydantic validation + revisão manual |
| C-X.4 | Abstention / confiança | Taxa de *abstention* ≤ {X}% com threshold de confiança configurável; casos abstidos roteados para revisão humana | Dashboard + revisão de amostras |
| C-X.5 | Observabilidade | Logs estruturados por documento (input, predição, confiança, tempo, modelo usado) | Langfuse + dashboard operacional |

### Premissas específicas (adicionar em §6.1)

- Test set homologado pelo cliente antes do desenvolvimento da capability de acurácia.
- Classes com baixo volume no dataset de treino (< 30 exemplos) podem não atingir threshold — tratadas por abstention + revisão humana.
- Falso-negativo em classes críticas exige threshold dedicado de precision, não F1 macro.

## 4. Notas sobre redação das capabilities AI

### Fazer

- **Threshold numérico explícito** (≥ 0,80, ≥ 0,85). Sem "boa acurácia", "alta precisão", "satisfatório".
- **Instrumento de medição nominado** (Ragas v0.2, LangSmith, DeepEval, métricas scikit-learn). Quem mede o quê fica rastreável.
- **Dataset versionado** (golden-{N} v1, scenarios-{N} v1, test-set-{N}). Dataset homologado ANTES do desenvolvimento da capability dependente.
- **Amostra de revisão manual** quando métrica automática é insuficiente (ex: 20% das respostas com revisão humana complementar).

### Não fazer

- Não usar "100% de acurácia" — métricas AI são estocásticas. Máximo razoável: 0,95.
- Não deixar métrica sem instrumento ("Faithfulness alta" sem dizer como mede).
- Não colocar golden dataset como entregável da mesma fase que depende dele — sempre em fase anterior (tipicamente Fase 0).
- Não garantir comportamento fora do escopo do dataset homologado.

## 5. Thresholds de referência (sem contexto específico)

Use como ponto de partida quando o briefing não especifica. Ajustar para cima ou para baixo conforme criticidade do caso de uso:

| Métrica | Conservador | Default | Ambicioso |
|---------|-------------|---------|-----------|
| RAG Context Recall | 0,70 | 0,80 | 0,90 |
| RAG Faithfulness | 0,80 | 0,85 | 0,92 |
| RAG Answer Relevance | 0,75 | 0,80 | 0,88 |
| Topic Adherence (guardrails) | 0,90 | 0,95 | 0,98 |
| Tool-call Accuracy (agentes) | 0,85 | 0,90 | 0,95 |
| Goal Accuracy (agentes) | 0,70 | 0,80 | 0,90 |
| Classificação F1 macro | 0,75 | 0,82 | 0,90 |
| Extração field-level accuracy | 0,85 | 0,90 | 0,95 |

**Regra prática**: quanto maior a criticidade (decisão irreversível, impacto financeiro, setor regulado), mais alto o threshold. Mas cuidado com overfitting ao golden dataset — thresholds ambiciosos exigem datasets maiores e mais diversos.
