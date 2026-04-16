# Checklists — Lacunas Críticas e Defaults

Use este arquivo para identificar rapidamente o que o briefing tem, o que falta, e quais defaults aplicar.

## 1. Lacunas críticas (bloqueiam a geração)

Se alguma destas informações estiver ausente, **pergunte antes de gerar** (máximo 3 perguntas por rodada):

| Campo | O que é | Placeholder aceitável? |
|-------|---------|------------------------|
| Nome do projeto | Identificador funcional (ex: "ChatContas 2.0", "Raízes Femininas") | ❌ Não |
| Cliente | Nome da organização contratante | ✅ Sim (`{Cliente}`) |
| Domínio técnico | AI/LLM, web, mobile, ou mix | ❌ Não — afeta estrutura |
| Setor | Público (órgão/tribunal) ou privado | ❌ Não — afeta cláusulas |
| Objetivo de negócio principal | Outcome mensurável que o cliente quer | ⚠️ Parcial — aceita descrição qualitativa com placeholder para métrica |
| Prazo-alvo aproximado | Janela de entrega em semanas ou meses | ⚠️ Parcial — default: 3 meses |

## 2. Lacunas não-críticas (use defaults)

Se ausentes, aplique o default e **declare no final da resposta** (não no SOW):

| Campo | Default |
|-------|---------|
| CNPJ do cliente | `XX.XXX.XXX/0001-XX` como placeholder |
| CNPJ Cognicode | `XX.XXX.XXX/0001-XX` como placeholder |
| Data do documento | Data atual no formato `YYYY-MM-DD` |
| Versão | `1.0.0` |
| Status | `proposta` |
| Linear project ID | `"a definir"` |
| SPOC do cliente | `{nome, e-mail, telefone}` |
| Canal único | `{Slack compartilhado / Teams}` |
| Duração total | 12 semanas (3 meses) |
| Duração da Fase 0 | 1-2 semanas |
| % Fase 0 do valor | 10% |
| Quantidade de fases | 5 (inclui Fase 0 + fase final de homologação) |
| Duração do sprint | 2 semanas |
| SLA de decisão | 2 dias úteis |
| Deemed acceptance | 10 dias úteis |
| Validade da proposta | 30 dias corridos |
| Condições de pagamento | 20% na assinatura + marcos de TAP |
| Reajuste | IPCA anual para projetos > 12 meses |
| Garantia pós-entrega | 90 dias |

## 3. Adaptações por setor

### Setor público (TCE, TCU, tribunais, ministérios, prefeituras)

**Adicionar sempre:**

- Em §6.1 Premissas: "Processo de aquisição conforme Lei 14.133/2021. SOW serve como subsídio técnico ao Termo de Referência (TR) a ser elaborado pelo órgão."
- Em §6.1 Premissas: "LGPD em regime reforçado — Cognicode atua como operadora (arts. 39-42)."
- Em §6.2 Restrições: "Deployment on-premise como padrão; uso de cloud pública condicionado à aprovação formal do órgão."
- Em §6.3 Dependências: "Emissão de Termo de Aceite Provisório (TAP) e Termo de Aceite Definitivo (TAD) conforme IN SGD/ME 94/2022 (aplicável a TIC federal; estados/municípios seguem normativo equivalente)."
- Em §15 Quem somos: **mover para o início do documento** (após §2) se for primeiro contato com o órgão.

**Considerar:**

- Enquadramento jurídico do contrato: prestação de serviços, empreitada, ou dispensa/inexigibilidade (arts. 74-75 da Lei 14.133/2021).
- Para IA com dados sensíveis (Art. 11 da LGPD): deployment Bedrock sa-east-1 ou on-premise obrigatório. Nunca envie dados sensíveis para LLM fora do Brasil sem base legal + cláusula de transferência internacional (Art. 33).

### Setor privado

**Adicionar:**

- Em §14 Termos e condições: cláusula de Non-Compete limitada (6 meses, domínio específico) se o projeto envolver know-how sensível.
- Em §6.1 Premissas: definir claramente o regime de propriedade intelectual (normalmente Foreground IP → cliente após pagamento integral; Background IP → Cognicode mantém).

**Remover/ajustar:**

- Referências a Lei 14.133/2021, ETP, TR, IN SGD/ME 94/2022.
- `TAP/TAD` pode virar apenas "Termo de Aceite" (sem distinção provisório/definitivo, salvo requisito específico).

## 4. Sinalizadores de domínio (o que observar no briefing)

### Projeto é AI/LLM se menciona:

RAG, agente, chatbot, LLM, GPT, Claude, OpenAI, Anthropic, Gemini, embedding, vector store, pgvector, Qdrant, Pinecone, Weaviate, Langfuse, LangChain, LangGraph, LlamaIndex, "resposta gerada", "busca semântica", "classificação automática", "extração de dados", "sumarização", "análise de sentimento", "triagem inteligente", "assistente virtual".

→ **Ação**: ler `ai-examples.md` e embutir capabilities AI nas fases correspondentes. Adicionar premissas e exclusões específicas.

### Projeto é web/mobile tradicional se menciona:

React, Next.js, Vue, Svelte, Vite, FastAPI, Flask, Django, Node, Express, Flutter, React Native, dashboard, formulário, CRUD, e-commerce, marketplace, SaaS, autenticação, OAuth, payment gateway, PWA, service worker.

→ **Ação**: usar template padrão sem puxar `ai-examples.md`. Focar capabilities em arquitetura, features funcionais, performance e acessibilidade.

### Projeto é mix se menciona ambos os grupos:

→ **Ação**: separar fases por domínio (ex: Fase 1 = infraestrutura web; Fase 2 = features AI). Não misturar capabilities de domínios diferentes na mesma fase.

## 5. Erros comuns a evitar

- **Prometer 100% em métrica AI**: substituir por threshold realista (≤ 0,95).
- **Deixar critério de aceite subjetivo** ("interface amigável", "boa performance"): trocar por métrica objetiva.
- **Esquecer o "Escopo NÃO incluído"**: sempre gerar pelo menos 3-5 exclusões, mesmo que o briefing não mencione.
- **Misturar outcome com output** no objetivo: OKR-01 é métrica de negócio; NFR é técnico.
- **Usar datas absolutas no cronograma** sem indicar dependência de kickoff: trocar datas por `S0`, `S1`, `S2` (semanas relativas).
- **Inflar número de capabilities**: máximo 5 por fase. Mais que isso indica que a fase deveria ser duas.
- **Colocar valores no SOW de contrato**: valores vão só na versão proposta.

## 6. Checklist final antes de gerar o arquivo

Antes de chamar `create_file`, confirme que o documento tem:

- [ ] Front-matter YAML completo
- [ ] Sumário executivo em 1 parágrafo
- [ ] Pelo menos 1 OKR de negócio + pelo menos 2 NFRs globais
- [ ] Fase 0 (Discovery) presente
- [ ] 4-6 fases no total (ajustar se briefing justificar outra quantidade)
- [ ] Cada fase com 2-5 capabilities
- [ ] Cada capability com critério de aceite objetivo e instrumento
- [ ] "Escopo NÃO incluído" com pelo menos 3 itens
- [ ] Premissas, restrições, dependências, riscos preenchidos
- [ ] RACI presente
- [ ] SLA de decisão do cliente (2 dias úteis, com cláusula de suspensão de prazo)
- [ ] Gestão de mudanças (§12) com processo de CR escrito
- [ ] Deemed acceptance (§13) com prazo de 10 dias úteis
- [ ] Nome do arquivo no padrão `SOW-{cliente-slug}-{projeto-slug}-v1.0.0.md`
