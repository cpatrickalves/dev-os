---
name: improve-tech-writing
description: Apply clear technical writing patterns in Brazilian Portuguese — cut anglicisms, forced metaphors, parenthesis-as-dumping-ground, performative bold, defensive justifications, and tables used as prose. Use when writing or reviewing technical documents (plans, ADRs, PRDs, READMEs, PR descriptions, commit messages, doc comments) especially in PT-BR, or when the user says "melhorar a escrita", "revisar o doc", "deixar mais claro", "ficou denso", "não entendi essa frase", "reescrever isso", or points out that a text is dense or hard to follow.
---

# Escrita técnica clara (PT-BR)

## Quando aplicar

Você (Claude) está escrevendo ou revisando:

- planos de implementação, specs, PRDs, ADRs
- READMEs, docs em `docs/`, comentários longos em código
- descrições de PR, mensagens de commit
- summaries, problem frames, rationales

Ou o usuário disse algo como: "melhorar a escrita", "revisar o doc", "deixar mais claro", "ficou denso", "não entendi", "reescrever".

## As 11 regras

### 1. Sem metáfora econômica/antropomórfica que substitui explicação

- ❌ "PR1 paga upfront o custo de 4 tabelas." / "PR que se entusiasme."
- ✅ "PR1 adiciona 4 tabelas que ainda não têm chamador."

### 2. Traduzir anglicismo quando há equivalente PT-BR natural

Manter só consagrados (smoke test, round-trip, hash, JWT, token).

| Anglicismo | Equivalente |
|:--|:--|
| upfront | adiantado / antecipado |
| cutover | troca / corte |
| foundation | base / fundação |
| wire-up | ligação / acoplamento |
| trail | rastro / trilha |
| load-bearing | em uso real |
| fail-loud | falha explícita |
| path | caminho |
| drop (tabela) | remover / derrubar |
| flow | fluxo / passar |

### 3. Uma ideia por frase

Frase com 3 vírgulas e 2 parênteses é parágrafo disfarçado. Quebra.

### 4. Voz ativa com sujeito explícito

Quem faz o quê. Sujeito real (pessoa, arquivo, função) — nunca metafórico.

- ❌ "Esse pagamento upfront é o que torna B2-B5 tratáveis."
- ✅ "Adicionar essas tabelas agora permite implementar B2-B5 sem mexer na base."

### 5. Parênteses não são compostagem

Parêntese com mais de ~7 palavras: ou vira frase, ou vira próxima seção. Parênteses-parágrafo destroem a frase principal.

### 6. Bullets em vez de frase-lista

Se a frase enumera 4+ itens por vírgula, vira bullets. O olho do leitor agradece.

### 7. Bold só para âncora, não para ênfase

Bold marca nome de conceito ou trecho referenciado depois. Nunca para sinalizar "preste atenção". Se a frase precisa de "**Importante**:" para ser lida, ela está mal escrita.

### 8. Justifique só o que contraria convenção

Decisão alinhada com o default não precisa de "rationale". Se "rationale" aparece em toda decisão de um doc, suspeite — metade pode sair.

### 9. Sigla nua só se introduzida nas ~20 linhas anteriores

Senão, mini-rótulo: "DEV-178 (signup endpoints)" > só "DEV-178". O leitor não deve rolar pra cima pra lembrar.

### 10. Tabela só para dados comparáveis em ≤10 palavras/célula

Se uma célula vira microparágrafo, a tabela já falhou. Vire bullets ou subseções.

### 11. Afirme o que acontece; negação só contraria expectativa

- ❌ "Não há teste de `family_id` nesta PR (não há rotação ainda)."
- ✅ "O teste de `family_id` entra na PR3, junto com a rotação."

Negação cabe quando o leitor esperaria o oposto (ex.: "**não** dropar schema `logto`" numa PR onde a adjacente dropa).

## Workflow de revisão

Quando o usuário pede pra revisar um trecho:

1. Leia o trecho inteiro antes de comentar.
2. Cite cada problema pela regra (#1 a #11) ao explicar.
3. Mostre **antes / depois** lado a lado.
4. Ao final, aponte o padrão mais recorrente — é onde o autor deve calibrar.

## Workflow de escrita

Antes de entregar um trecho, faça uma checagem rápida:

- Toda frase tem ≤1 ideia? Toda frase tem sujeito explícito?
- Algum parêntese tem >7 palavras?
- Algum bold é "Importante" disfarçado?
- Alguma sigla aparece sem âncora local?
- Alguma negação não contraria expectativa real?
- Alguma tabela tem células que viraram parágrafo?

Se sim, aplique a regra correspondente.

## Lembre-se

Densidade não é qualidade. Um doc que cabe em metade do tamanho com a mesma informação é melhor.

Para exemplos detalhados antes/depois, ver [exemplos.md](exemplos.md).
