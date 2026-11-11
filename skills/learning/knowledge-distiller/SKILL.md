---
name: knowledge-distiller
description: Distill a raw input — transcript, article, talk, notes, book excerpt — into a PT-BR knowledge document faithful to the author, with translated direct quotes and a practical application guide. Use when the user shares such material and asks to "destilar", "transformar em conhecimento", "sintetizar", "extrair insights", "organizar essas notas", or "resumir essa transcrição/aula/palestra".
metadata:
  version: "1.2.0"
---

# Destilador de conhecimento

Você recebe um input bruto (transcrição, artigo, palestra, notas) e devolve um único documento Markdown em PT-BR: o pensamento do autor, esclarecido e organizado, seguido de um guia prático de aplicação.

**Fidelidade ao autor** governa tudo. Todo conteúdo vem do input; sua contribuição é clareza, organização e tradução. Trate o que você já sabe sobre o tema como não confiável para este documento. Lacunas, erros e incertezas do autor ficam como ele os deixou: "acho que foi em 2015" continua "acho que foi em 2015"; "se não me engano" e "provavelmente" permanecem.

O documento é uma **fonte condensada para reconsulta**. O aprendizado acontece quando o leitor agrupa, relaciona e prioriza por conta própria, então o documento devolve esse trabalho a ele: entrega as relações e as perguntas do autor, e as palavras-chave sem agrupar.

Entrega: quando o input veio de um arquivo, salve o resultado ao lado dele como `<nome>-conhecimento.md`, a menos que o usuário indique outro destino; caso contrário, devolva o documento inline. Notion (Wiki ou qualquer outro local) só quando o usuário pedir explicitamente.

## Processo

1. **Ler tudo antes de escrever.** Separe o ruído e liste: conceitos, frases impactantes, exemplos/histórias/casos, metodologias/frameworks, termos que o autor cunha ou redefine, objeções que ele responde, relações que ele afirma entre conceitos, obras/pessoas/fontes que ele cita. Concluído quando cada conceito do autor está na lista com **todo o contexto** em que aparece.
2. **Mapear a estrutura.** Agrupe os conceitos pela similaridade natural do próprio autor, na ordem do pensamento dele. Cada grupo recebe um título **outlier** (fora da curva) em H1, que captura a essência única daquele grupo. Concluído quando cada item da lista pertence a um grupo.
3. **Escrever as seções.** Concluído quando cada item da lista aparece na sua seção com todo o contexto.
4. **Escrever o guia prático.** Concluído quando cada recomendação aponta para algo que o autor disse.
5. **Escrever os ganchos finais**: perguntas de retrieval e palavras-chave.
6. **Escrever o topo por último**: essência e "Antes de ler" resumem o que já está escrito. Concluído quando cada linha da essência tem uma seção do corpo que a explica.
7. **Conferir.** Releia o documento contra cada seção de regras abaixo, uma por vez, corrigindo no ato. Concluído quando cada regra foi conferida contra o documento inteiro.

## Estrutura do documento

A essência lista, as seções explicam, o guia aplica, os ganchos devolvem o trabalho ao leitor. Cada texto aparece em uma só dessas camadas.

```markdown
# [Título do documento]

**Fonte:** autor, tipo de material (indique se é transcrição automática), veículo e data quando houver, idioma original.
**Omitido do input:** [só se houver ruído omitido]
**Grafia a conferir:** [só se houver grafia incerta]

## Essência
- **Tese central:** uma ou duas frases, de preferência do autor.
- **[Método ou framework do autor]:** etapas em uma linha cada.
- **Vocabulário do autor:** termo (*original*) — definição em uma linha. [só se houver]
- **Como os conceitos se ligam:** A → B, uma relação por linha. [só se houver]

## Antes de ler
[gist e perguntas]

# [Título outlier do grupo 1]

## [Subseção: um conceito]
Parágrafo que abre pelo problema e explica a ideia do autor.

> "Citação traduzida." — contexto breve

Parágrafo com o exemplo do autor e o que ele conclui.

# [Título outlier do grupo N]

# Guia prático de aplicação
## Etapas de implementação
## O que fazer
## O que evitar
## Desafios e limitações

# Ganchos de encoding
## Perguntas de retrieval
## Palavras-chave

# Referências citadas pelo autor [só se houver]
```

A essência cabe em uma tela.

## Síntese

- Cada conceito entra com **todo o contexto** que o autor deu: nuances, qualificações e refinamentos; exemplos, histórias e casos; metodologias completas, com todas as etapas na ordem do autor.
- **Objeção → resposta** fica junta, na seção do conceito: a crítica que o autor antecipa ("as pessoas dizem X, mas..."), a pergunta da plateia que ele responde, o erro comum que ele corrige. É o trecho que mais protege o leitor de aplicar errado.

## Ruído e transcrição

Inputs de vídeo e áudio trazem material que não é do autor e erros de reconhecimento de fala. A fidelidade vale para o que o autor de fato disse; trate os dois antes de escrever.

**Ruído** é patrocínio e anúncio, pedido de inscrição, curtida e apoio, divulgação de comunidade, curso ou produto pago do canal, vinheta e despedida protocolar. Ele fica fora do documento inteiro e é registrado na linha "**Omitido do input:**", com marcador de tempo quando houver: "patrocínio (4:04–5:05); pedidos de inscrição". Produto que o autor usa como exemplo para ensinar é conteúdo; na dúvida entre anúncio e exemplo, mantenha.

**Erros de reconhecimento** (nomes, termos técnicos, palavras parecidas no som):

- Corrija só o que o próprio input resolve: a mesma palavra escrita de outra forma em outro ponto, ou um contexto que admite uma única leitura. O que você sabe de fora (quem é a pessoa, como o produto se escreve) fica fora da correção.
- Nome próprio ou termo técnico de grafia variável ou suspeita: use uma única grafia, a mais frequente no input, marque a primeira ocorrência com "(grafia incerta: legenda automática)" e liste o termo em "**Grafia a conferir:**".
- Trecho sem sentido por causa do reconhecimento: parafraseie se o contexto deixa a ideia clara; senão, marque "[trecho ininteligível]". Citação literal só de trecho íntegro.

## Escrita

O corpo é texto explicativo, lido de ponta a ponta. Escreva como quem explica a ideia a um colega, em prosa corrida:

- **Parágrafos de 2 a 4 frases**, cada um em torno de uma ideia. Um conceito costuma caber em um ou dois parágrafos mais a citação.
- **Comece pelo problema.** A subseção abre pela pergunta que o conceito responde ou pela situação que o autor observou; mecanismo e etapas vêm depois.
- **Uma ideia por frase**, sujeito explícito (o autor, a pessoa do exemplo ou o conceito), até ~25 palavras. Frase com três vírgulas e dois parênteses é parágrafo disfarçado: quebre.
- **Bullets só para enumeração**: etapas de um método, lista de quatro ou mais itens que o autor dá, listas do guia prático. Explicação, exemplo e argumento ficam em parágrafo.
- **Parênteses de até ~7 palavras**; o que passa disso vira frase própria. Exceção: o termo original do autor na primeira ocorrência.
- **Negrito só como âncora**: o termo do autor na primeira ocorrência e o nome de um conceito referenciado depois.
- **Português natural.** Traduza anglicismos que têm equivalente natural (*framework* pode ficar; *upfront*, *insight*, *trade-off* viram adiantado, percepção, compromisso).
- **Afirme o que acontece.** Negação só quando contraria uma expectativa real do leitor.
- **Metáfora só do autor**, como citação ou vocabulário dele. No texto seu, use o verbo direto: "o autor adia a decisão", e não "a decisão paga juros".
- **Teste de corte** em cada parágrafo: se metade das palavras sai sem perder informação, corte.

## Citações

Toda **frase impactante** do autor é preservada como citação, traduzida para o português. São frases impactantes as que revelam princípios universais, paradoxos e tensões, definições únicas de conceitos conhecidos, metáforas e analogias poderosas.

- Uma frase entra como citação **ou** no parágrafo. Se a formulação do autor já é clara, cite, e deixe o parágrafo para o que ela não diz sozinha: quando foi dita, sobre o quê, qual o mecanismo por trás.
- A citação fica logo após o parágrafo que ela sustenta.
- Toda citação traz contexto breve após o travessão, com marcador de tempo, página ou capítulo quando o input tem.

## Vocabulário do autor

Termos que o autor cunha, metáforas dele e palavras comuns que ele redefine ("porta de um sentido", "caneta hidrocor", "adjacência") são parte do conhecimento: com eles o leitor volta à fonte e conversa com quem leu o original.

- **Uma** tradução por termo em todo o documento, com o original entre parênteses na primeira ocorrência: "porta de um sentido" (*one-way door*).
- Cada termo entra na essência, definido em uma linha com as palavras do autor.

## Guia prático

Um passo a passo para aplicar o que foi ensinado, no tom e nível técnico do autor. Cada recomendação deriva de algo que o autor disse. Cenário que você cria para ilustrar entra marcado ("*Cenário ilustrativo:*"), ambientado onde o usuário disse que quer aplicar ("na squad", "no meu time de vendas") ou, sem isso, no contexto do próprio autor.

- **Etapas de implementação**: passos na ordem do autor, cada um com exemplo específico e suas considerações.
- **O que fazer**: boas práticas e por que importam.
- **O que evitar**: erros comuns, armadilhas e consequências; fonte principal: os pares objeção → resposta.
- **Desafios e limitações**: e as estratégias do autor para superá-los.

## Ganchos de encoding

Quatro elementos devolvem ao leitor o trabalho que produz aprendizado, todos sob a fidelidade ao autor.

- **Como os conceitos se ligam** (essência): relações que o autor enuncia, de causa, dependência, sequência, tensão ou prioridade ("X só funciona depois de Y"). Uma por linha, com o verbo do autor. Seções que ele deixa desconectadas ficam desconectadas.
- **Antes de ler** (após a essência): gist em 3 a 5 linhas e 3 a 5 perguntas que o corpo responde, tiradas das objeções que o autor responde e dos problemas que abrem cada subseção. Só perguntas, seguidas da linha "Preveja as respostas antes de seguir."
- **Perguntas de retrieval** (final): 6 a 12 perguntas respondíveis só com o corpo, tiradas dos pares objeção → resposta, das etapas dos métodos, das definições do vocabulário e do que o autor conclui de cada exemplo. Formato: `Pergunta → ver "[seção]"`, só a pergunta e o ponteiro.
- **Palavras-chave** (final): lista numerada de **no máximo 20** conceitos ou termos do autor, saídos da lista do passo 1. Seleção: os termos com mais relações com os demais no input; em empate, os que o autor define, repete ou cunha. Pessoas, produtos, ferramentas, casos e exemplos são folhas do mapa, e a lista só tem nós. Uma palavra ou expressão curta por linha, sem definição, plana, em ordem de aparição no input: a numeração é referência, e o agrupamento é trabalho do leitor.

## Referências citadas pelo autor

Livros, artigos, pessoas, palestras e ferramentas que o autor menciona: o que ele disse sobre cada um e para que recomenda, com as incertezas de título e ano que ele deixou.