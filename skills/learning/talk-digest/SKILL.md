---
name: talk-digest
description: Transforma a transcrição automática de uma palestra em um registro curto e crítico para reconsulta, fiel ao que o palestrante disse.
disable-model-invocation: true
metadata:
  version: "1.0.0"
---

# Talk digest

Transforme a transcrição automática de uma palestra em um documento de consulta.
Teste final: daqui a meses, eu leio o documento e entendo a palestra sem reassistir ao vídeo.

## Entrada

A invocação traz:

- a transcrição;
- título, palestrante, evento e data;
- meu objetivo: por que a palestra me interessa;
- anotações, quando houver: minhas notas e fotos de slides.

Se faltar o objetivo, pergunte antes de começar. Outro campo ausente fica como "não informado" no cabeçalho.

## Passos

1. **Ler tudo e montar o inventário.** Liste argumentos, exemplos e casos reais, números, conceitos, ferramentas, referências, recomendações e objeções que o palestrante responde, inclusive perguntas da plateia. Concluído quando cada item da fala está no inventário.
2. **Corrigir a transcrição**, conforme a seção "Transcrição".
3. **Escrever as seções 2 a 6** da estrutura. Concluído quando cada item do inventário aparece em uma seção.
4. **Escrever a tese central por último.** Concluído quando cada frase da tese tem um argumento da seção 2 que a sustenta.
5. **Conferir.** Releia o documento contra "Fidelidade" e "Transcrição" e corrija no ato.
6. **Entregar.** Se a transcrição veio de um arquivo, salve o documento ao lado dele como `<nome>-digest.md`. Senão, devolva o documento na resposta.

## Fidelidade

O documento registra a fala. Cada afirmação tem origem no que o palestrante disse. O seu conhecimento sobre o tema fica fora, inclusive para fechar uma lacuna.

O grau de certeza do palestrante fica como ele deixou: "acho que foi em 2015" continua "acho que foi em 2015".

As anotações são minhas. Use-as para corrigir a transcrição. Ideia que aparece só nelas entra marcada como (nota minha).

Agradecimentos, piadas, logística, patrocínio e repetições ficam fora. Piada ou produto que serve de exemplo a um argumento é conteúdo.

## Transcrição

O ASR (reconhecimento automático de fala) erra mais em nomes próprios, siglas e termos técnicos.

- Corrija o que a própria entrada resolve: a grafia de um slide ou das minhas notas, a mesma palavra escrita de outra forma em outro ponto, ou um contexto que admite uma única leitura.
- No resto, mantenha o original, marque com [?] e liste o termo em "Grafia a conferir". Use uma única grafia por termo, a mais frequente na transcrição.
- Trecho sem sentido: parafraseie se o contexto deixa a ideia clara. Senão, registre o trecho na seção 6.

## Estrutura

Em PT-BR, com termos técnicos em inglês. Quando a transcrição traz marcadores de tempo, cada argumento, exemplo e número leva o seu.

```markdown
# [Título da palestra]

**Fonte:** palestrante, evento, data, transcrição automática.
**Meu objetivo:** [objetivo]
**Grafia a conferir:** [só se houver termo marcado com [?]]

## 1. Tese central
## 2. Argumentos principais
## 3. Conceitos e frameworks
## 4. Números, resultados, ferramentas e referências
## 5. Acionável
## 6. Lacunas
```

1. **Tese central**: 2 ou 3 frases.
2. **Argumentos principais**, na ordem lógica. Cada um traz:
   - a evidência ou o exemplo que o palestrante usou;
   - uma etiqueta, conforme ele o apresentou: [fato], [opinião] ou [aposta];
   - a objeção que ele respondeu e a resposta, quando houver.
3. **Conceitos e frameworks**, com a definição do palestrante e as etapas na ordem dele.
4. **Números, resultados, ferramentas e referências**, cada um com o contexto em que apareceu e o que o palestrante disse sobre ele.
5. **Acionável**: o que o palestrante recomenda fazer. Destaque o que toca meu objetivo.
6. **Lacunas**:
   - afirmações sem evidência;
   - raciocínios que ficaram incompletos na fala;
   - trechos que a transcrição não permitiu entender.
