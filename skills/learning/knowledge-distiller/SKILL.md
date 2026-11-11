---
name: knowledge-distiller
description: Distill a raw input — transcript, article, talk, notes, book excerpt — into a PT-BR knowledge document faithful to the author, with translated direct quotes and a practical application guide. Use when the user shares such material and asks to "destilar", "transformar em conhecimento", "sintetizar", "extrair insights", "organizar essas notas", or "resumir essa transcrição/aula/palestra".
metadata:
  version: "1.1.0"
---

# Destilador de conhecimento

Você recebe um input bruto (transcrição, artigo, palestra, notas) e devolve um único documento Markdown em PT-BR pronto para reuso: o pensamento do autor, esclarecido e organizado, seguido de um guia prático de aplicação.

Princípio: **fidelidade ao autor**. Todo conteúdo vem do input; sua contribuição é clareza, organização e tradução. Trate o que você já sabe sobre o tema como não confiável para este documento: lacunas, erros e incertezas do autor ficam como ele os deixou.

## Papel do documento e quando lê-lo

O documento é uma **fonte condensada para reconsulta**, e não as notas de estudo do leitor. Aprender acontece quando o leitor agrupa, relaciona e prioriza por conta própria; o documento guarda o que o autor disse, com fidelidade, para o leitor conferir. Por isso ele devolve trabalho ao leitor em vez de fazê-lo: entrega as relações e as perguntas do autor, e entrega as palavras-chave sem agrupar.

Ordem de uso recomendada, quando o leitor quer aprender e não só consultar:

1. Ler só a essência e o bloco "Antes de ler" (priming, 5 a 10 minutos).
2. Ir à fonte original e tentar o próprio mapa ou notas, sem o documento aberto.
3. Só então ler o corpo, como checagem: o que faltou, o que foi distorcido.
4. Responder às perguntas de retrieval sem olhar; voltar à seção indicada onde falhar.

O documento tem quatro camadas, e o leitor volta a cada uma com frequência diferente:

- **Essência** (topo) — o que se relê: tese, método compactado, vocabulário do autor. Cabe em uma tela.
- **Seções** (corpo) — o que se lê uma vez com atenção: cada conceito explicado em prosa, com contexto, exemplos e citações.
- **Guia prático** (fim) — o que se consulta na hora de aplicar.
- **Ganchos de encoding** (final e topo) — o que devolve o trabalho ao leitor: relações do autor, perguntas de priming e de retrieval, palavras-chave para mapear.

A essência lista, as seções explicam, o guia aplica, os ganchos devolvem o trabalho ao leitor. O mesmo texto não se repete nas quatro.

## Processo

1. **Ler tudo antes de escrever.** Percorra o input inteiro e liste: conceitos importantes, frases impactantes candidatas a citação, exemplos/histórias/casos, metodologias/frameworks, termos que o autor cunha ou redefine, objeções que ele responde, relações que ele afirma entre conceitos (causa, dependência, sequência, tensão, prioridade), obras/pessoas/fontes que ele cita. Separe desde já o ruído (veja "Ruído e qualidade da transcrição"). Concluído quando cada conceito do autor está na lista junto com **todo o contexto** em que ele aparece. Guarde a lista: dela saem as "Palavras-chave".
2. **Mapear a estrutura.** Agrupe os conceitos pela similaridade natural do próprio autor, respeitando a ordem do pensamento dele. Cada grupo recebe um título **outlier** (fora da curva) em H1 que captura a essência única daquela seção. Concluído quando cada item da lista pertence a um grupo.
3. **Escrever cada seção** na estrutura abaixo, aplicando as regras de síntese, escrita, citação e vocabulário. Concluído quando cada item da lista aparece na sua seção.
4. **Escrever o guia prático.**
5. **Escrever os ganchos de encoding** como seção final — perguntas de retrieval e palavras-chave — seguindo as regras de ganchos abaixo.
6. **Escrever a essência e o bloco "Antes de ler" por último** — eles resumem o que você já escreveu — e posicioná-los no topo, logo após a fonte.
7. **Checagem final** com o checklist antes de entregar.

## Estrutura do documento

```markdown
# [Título do documento]

**Fonte:** autor, tipo de material (palestra, artigo, podcast, notas; indique se é transcrição automática), veículo e data quando houver, idioma original.
**Omitido do input:** [só se houver ruído omitido; veja "Ruído e qualidade da transcrição"]
**Grafia a conferir:** [só se houver nomes ou termos de grafia incerta]

## Essência
- **Tese central:** uma ou duas frases, de preferência do autor.
- **[Método ou framework do autor]:** etapas em uma linha cada.
- **Vocabulário do autor:** termo (*original*) — definição em uma linha. [só se houver]
- **Como os conceitos se ligam:** A → B, com o verbo do autor, uma relação por linha. [só relações que o autor enuncia]

## Antes de ler
Gist em 3 a 5 linhas. Depois, 3 a 5 perguntas que o corpo responde.
Preveja as respostas antes de seguir.
- Pergunta 1
- Pergunta 2

# [Título outlier do grupo 1]

## [Subseção: um conceito]
Parágrafo que abre pelo problema ou pergunta que o conceito responde e
explica a ideia do autor com o contexto que ele deu.

> "Citação traduzida." — contexto breve

Parágrafo com o exemplo ou história do autor e o que ele conclui a partir dele.

- Etapa 1 do método do autor [bullets só quando o autor enumera]
- Etapa 2

# [Título outlier do grupo N]
...

# Guia prático de aplicação

## Etapas de implementação
1. ...

## O que fazer
## O que evitar
## Desafios e limitações

# Ganchos de encoding

## Perguntas de retrieval
1. Pergunta → ver "[seção]"

## Palavras-chave
1. [conceito ou termo do autor]
2. ...
(no máximo 20, em ordem de aparição no input)

# Referências citadas pelo autor [só se houver]
```

## Regras de síntese

- Cada conceito entra com **todo o contexto** que o autor deu: nuances, qualificações e refinamentos; exemplos, histórias e casos; metodologias completas — todas as etapas, na ordem do autor.
- Registre **objeções e respostas juntas**: quando o autor antecipa uma crítica ("as pessoas dizem X, mas..."), responde a uma pergunta da plateia ou corrige um erro comum de quem aplica a ideia, o par objeção → resposta é o trecho que mais protege o leitor de aplicar errado. Ele fica na seção do conceito e alimenta o "O que evitar" do guia.
- Incerteza do autor é conteúdo: "acho que foi em 2015" continua "acho que foi em 2015"; "se não me engano" e "provavelmente" permanecem.

## Ruído e qualidade da transcrição

Inputs de vídeo e áudio trazem dois problemas que não são conteúdo do autor: material que não é dele e erros de reconhecimento de fala. Trate os dois antes de escrever.

**Ruído a ignorar.** Patrocínios e anúncios, pedidos de inscrição, curtida e apoio ao canal, divulgação de comunidade, curso ou produto pago do próprio canal, vinhetas e despedidas protocolares. Esse material não entra no corpo, nas citações, no guia nem nas palavras-chave.

- Se o autor usa um produto como exemplo para ensinar algo, isso é conteúdo e fica. Na dúvida entre anúncio e exemplo, mantenha.
- Registre o que foi omitido em uma linha da fonte, com marcador de tempo quando houver: "**Omitido do input:** patrocínio (4:04–5:05); pedidos de inscrição e apoio ao canal."

**Erros de reconhecimento.** Legenda automática erra nomes, termos técnicos e palavras parecidas no som. Isso é falha da transcrição, e não erro ou incerteza do autor: a regra de fidelidade sobre erros e incertezas do autor vale só para o que o autor de fato disse.

- Corrija só o que o próprio input resolve: a mesma palavra escrita de outra forma em outro ponto, ou um contexto que admite uma única leitura. Não corrija com o que você sabe de fora, como quem é a pessoa ou como o produto se escreve de verdade.
- Nome próprio ou termo técnico de grafia variável ou suspeita: use uma única grafia, a mais frequente no input, e marque a primeira ocorrência com "(grafia incerta: legenda automática)". Liste esses termos na linha "**Grafia a conferir:**" da fonte, para o leitor checar no original.
- Trecho que não faz sentido por causa do reconhecimento: não reconstrua. Não o use como citação literal. Se o contexto deixa a ideia clara, parafraseie; senão, marque "[trecho ininteligível]".

## Regras de escrita

O corpo é texto explicativo, lido de ponta a ponta. Escreva como quem explica a ideia a um colega, em prosa corrida:

- **Parágrafos curtos, de 2 a 4 frases**, cada um em torno de uma ideia. Um conceito costuma caber em um ou dois parágrafos mais a citação.
- **Comece pelo problema.** A subseção abre dizendo qual pergunta o conceito responde ou qual situação o autor observou; o mecanismo e as etapas vêm depois. Quem lê o mecanismo sem conhecer o problema não tem onde pendurar os detalhes.
- **Uma ideia por frase**, voz ativa, sujeito explícito — o autor, a pessoa do exemplo ou o conceito. Frases de até ~25 palavras; frase com três vírgulas e dois parênteses é parágrafo disfarçado, quebre.
- **Bullets só para enumeração**: as etapas de um método, uma lista de quatro ou mais itens que o autor dá, e as listas do guia prático. Explicação, exemplo e argumento ficam em parágrafo.
- **Parênteses de até ~7 palavras.** O que passa disso vira frase própria. Exceção: o termo original do autor na primeira ocorrência.
- **Negrito só como âncora**: o termo do autor na primeira ocorrência e o nome de um conceito referenciado depois. Ênfase vem da frase, e o leitor pula o que está em negrito demais.
- **Português natural.** Traduza anglicismos que têm equivalente natural (*framework* pode ficar; *upfront*, *insight*, *trade-off* viram adiantado, percepção, compromisso). Termos que o autor cunha seguem a regra de vocabulário abaixo.
- **Afirme o que acontece.** Negação só quando contraria uma expectativa real do leitor.
- **Metáfora só do autor.** As metáforas e analogias do autor entram como citação ou vocabulário dele. No texto que você escreve entre elas, use o verbo direto: "o autor adia a decisão", e não "a decisão paga juros". Metáfora sua se mistura à do autor e o leitor deixa de saber de quem é.

Ao terminar, aplique o teste de corte em cada parágrafo: se metade das palavras sai sem perder informação, corte.

## Citações diretas

Abundância: toda **frase impactante** do autor deve estar preservada como citação, sempre traduzida para o português.

Priorize citações que revelam:

- princípios universais
- paradoxos e tensões intelectuais
- definições únicas de conceitos conhecidos
- metáforas e analogias poderosas

Uma frase entra como citação **ou** no parágrafo, não como os dois. Se a formulação do autor já é clara, use a citação e deixe o parágrafo para o que ela não diz sozinha: quando foi dita, sobre o quê, qual o mecanismo por trás. A citação fica logo após o parágrafo que ela sustenta, para o leitor ler os dois como um só trecho.

Toda citação traz um contexto breve após o travessão. Se o input tem marcadores de tempo, número de página ou de capítulo, inclua-os nesse contexto: o leitor consegue conferir a fonte em segundos.

## Vocabulário do autor

Quando o autor cunha termos, metáforas ou redefine palavras comuns ("porta de um sentido", "caneta hidrocor", "adjacência"), esse vocabulário é parte do conhecimento. O documento precisa usá-lo com consistência para o leitor conseguir voltar à fonte e conversar com quem leu o original.

- Escolha **uma** tradução por termo e use só ela em todo o documento. Na primeira ocorrência, mostre o original entre parênteses: "porta de um sentido" (*one-way door*).
- Liste esses termos na essência, cada um definido em uma linha com as palavras do autor.

## Guia prático de aplicação

Seção final: um passo a passo para aplicar o que foi ensinado, no tom e nível técnico do autor. As seções explicam o método; o guia mostra como colocá-lo em prática. Cada recomendação deriva de algo que o autor disse; cenários que você cria para ilustrar entram marcados ("*Cenário ilustrativo:*"), ambientados onde o usuário disse que quer aplicar ("na squad", "no meu time de vendas") ou, sem isso, no contexto do próprio autor.

- **Etapas de implementação** — passos na ordem do autor, cada um com exemplo específico e suas considerações.
- **O que fazer** — boas práticas e por que importam.
- **O que evitar** — erros comuns, armadilhas e suas consequências; fonte principal: os pares objeção → resposta.
- **Desafios e limitações** — e as estratégias do autor para superá-los.

## Referências citadas pelo autor

Se o autor menciona livros, artigos, pessoas, palestras ou ferramentas, reúna-os em uma seção curta ao fim do documento: o que ele disse sobre cada um e para que recomenda, com as incertezas de título e ano que ele deixou.

## Ganchos de encoding

Quatro elementos devolvem ao leitor o trabalho que produz aprendizado. Todos seguem a fidelidade: nada aqui é interpretação sua.

- **Como os conceitos se ligam** (na essência) — só relações que o autor enuncia: causa, dependência, sequência, tensão, prioridade ("X só funciona depois de Y", "A importa mais que B quando..."). Uma por linha, com o verbo do autor. Não infira relações que ele não afirmou; se ele não conecta duas seções, elas ficam desconectadas.
- **Antes de ler** (logo após a essência) — gist em 3 a 5 linhas e 3 a 5 perguntas que o corpo responde, formuladas a partir das objeções que o autor responde e dos problemas que abrem cada subseção. Sem respostas: o leitor prevê antes de ler.
- **Perguntas de retrieval** (seção final) — 6 a 12 perguntas respondíveis só com o corpo: pares objeção → resposta, etapas dos métodos, definições do vocabulário, o que o autor conclui de cada exemplo. Cada pergunta aponta a seção onde a resposta está e nunca traz a resposta.
- **Palavras-chave** (seção final) — lista numerada com **no máximo 20** conceitos ou termos do autor, extraídos da lista do passo 1. Critério de seleção: os termos com mais relações com os demais no input; em empate, os que o autor define, repete ou cunha. Entram só conceitos e termos: nomes de pessoas, produtos, ferramentas, casos e exemplos ficam de fora (eles são folhas do mapa, não nós). Uma palavra ou expressão curta por linha, sem definição, sem agrupar, sem hierarquia, em ordem de aparição no input — a numeração serve para referência, não para ranque. O leitor faz o agrupamento; a estrutura do corpo é uma resposta possível, não a única.

## Checklist final

- Cada conceito do input está no documento com todo o contexto — nuances, exemplos, metodologia completa, pares objeção → resposta?
- Cada frase impactante está preservada como citação em português, com contexto e marcador de fonte quando o input tem?
- Algum trecho é interpretação sua em vez do autor? Remova. Alguma lacuna ou incerteza do autor foi resolvida com o seu conhecimento? Devolva.
- Cada H1 é um título outlier?
- A essência cabe em uma tela e só lista o que o corpo explica?
- Cada termo do autor tem uma única tradução, com o original na primeira ocorrência?
- Alguma frase aparece no parágrafo e como citação? Escolha uma.
- O corpo se lê como prosa corrida? Cada bullet fora do guia é uma enumeração do autor? Cada negrito é um termo ou âncora?
- Alguma frase precisou de duas leituras? Quebre-a. Algum parênteses passou de ~7 palavras? Vire frase.
- Alguma metáfora ou analogia no texto é sua, e não do autor? Troque pelo verbo direto.
- O guia tem as quatro partes e marca os cenários que são seus?
- Patrocínios, pedidos de inscrição e outros ruídos ficaram fora do documento e estão registrados em "Omitido do input"?
- Cada correção de reconhecimento de fala foi resolvida pelo próprio input, e os nomes e termos de grafia incerta estão marcados e listados em "Grafia a conferir"?
- Cada relação em "Como os conceitos se ligam" é afirmada pelo autor, e não inferida por você?
- As perguntas de "Antes de ler" e de retrieval saem do que o autor responde, apontam a seção e não trazem a resposta?
- As "Palavras-chave" têm no máximo 20 itens, só conceitos e termos do autor (sem pessoas, produtos, ferramentas ou exemplos), numeradas em ordem de aparição e sem agrupamento ou hierarquia que revele a estrutura do corpo?

## Entrega

Quando o input veio de um arquivo, salve o resultado ao lado dele como `<nome>-conhecimento.md`, a menos que o usuário indique outro destino. Caso contrário, responda com o documento inline.

Não crie nem salve páginas na Wiki ou em qualquer outro local do Notion, a menos que o usuário peça explicitamente.
