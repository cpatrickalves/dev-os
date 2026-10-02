---
name: knowledge-distiller
description: Distill a raw input — transcript, article, talk, notes, book excerpt — into a PT-BR knowledge document faithful to the author, with translated direct quotes and a practical application guide. Use when the user shares such material and asks to "destilar", "transformar em conhecimento", "sintetizar", "extrair insights", "organizar essas notas", or "resumir essa transcrição/aula/palestra".
---

# Destilador de conhecimento

Você recebe um input bruto (transcrição, artigo, palestra, notas) e devolve um único documento Markdown em PT-BR pronto para reuso: o pensamento do autor, esclarecido e organizado, seguido de um guia prático de aplicação.

Princípio: **fidelidade ao autor**. Todo conteúdo vem do input; sua contribuição é clareza, organização e tradução. Trate o que você já sabe sobre o tema como não confiável para este documento: lacunas, erros e incertezas do autor ficam como ele os deixou.

O documento tem três camadas, e o leitor volta a cada uma com frequência diferente:

- **Essência** (topo) — o que se relê: tese, método compactado, vocabulário do autor. Cabe em uma tela.
- **Seções** (corpo) — o que se lê uma vez com atenção: cada conceito explicado em prosa, com contexto, exemplos e citações.
- **Guia prático** (fim) — o que se consulta na hora de aplicar.

A essência lista, as seções explicam, o guia aplica. O mesmo texto não se repete nas três.

## Processo

1. **Ler tudo antes de escrever.** Percorra o input inteiro e liste: conceitos importantes, frases impactantes candidatas a citação, exemplos/histórias/casos, metodologias/frameworks, termos que o autor cunha ou redefine, objeções que ele responde, obras/pessoas/fontes que ele cita. Concluído quando cada conceito do autor está na lista junto com **todo o contexto** em que ele aparece.
2. **Mapear a estrutura.** Agrupe os conceitos pela similaridade natural do próprio autor, respeitando a ordem do pensamento dele. Cada grupo recebe um título **outlier** (fora da curva) em H1 que captura a essência única daquela seção. Concluído quando cada item da lista pertence a um grupo.
3. **Escrever cada seção** na estrutura abaixo, aplicando as regras de síntese, escrita, citação e vocabulário. Concluído quando cada item da lista aparece na sua seção.
4. **Escrever o guia prático** como seção final.
5. **Escrever a essência por último** — ela resume o que você já escreveu — e posicioná-la no topo, logo após a fonte.
6. **Checagem final** com o checklist antes de entregar.

## Estrutura do documento

```markdown
# [Título do documento]

**Fonte:** autor, tipo de material (palestra, artigo, podcast, notas), veículo e data quando houver, idioma original.

## Essência
- **Tese central:** uma ou duas frases, de preferência do autor.
- **[Método ou framework do autor]:** etapas em uma linha cada.
- **Vocabulário do autor:** termo (*original*) — definição em uma linha. [só se houver]

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

# Referências citadas pelo autor [só se houver]
```

## Regras de síntese

- Cada conceito entra com **todo o contexto** que o autor deu: nuances, qualificações e refinamentos; exemplos, histórias e casos; metodologias completas — todas as etapas, na ordem do autor.
- Registre **objeções e respostas juntas**: quando o autor antecipa uma crítica ("as pessoas dizem X, mas..."), responde a uma pergunta da plateia ou corrige um erro comum de quem aplica a ideia, o par objeção → resposta é o trecho que mais protege o leitor de aplicar errado. Ele fica na seção do conceito e alimenta o "O que evitar" do guia.
- Incerteza do autor é conteúdo: "acho que foi em 2015" continua "acho que foi em 2015"; "se não me engano" e "provavelmente" permanecem.

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

## Entrega

Quando o input veio de um arquivo, salve o resultado ao lado dele como `<nome>-conhecimento.md`, a menos que o usuário indique outro destino. Caso contrário, responda com o documento inline.
