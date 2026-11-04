# Manutenção do manual de uso

Guia técnico do [manual de uso]({caminho}/README.md): molde dos capítulos, convenções de escrita e procedimentos. Ele fica fora da pasta do manual porque esse conteúdo é para quem mantém o produto, não para quem usa a tela.

Público: {quem lê, papéis e letramento digital}.

## O que entra em cada documento

- **Manual de uso:** o que a pessoa vê e faz na tela. É a fonte da verdade de rótulos, mensagens e passos.
- **Guia técnico:** terminal, infraestrutura e procedimentos internos.
- **Roteiro de testes manuais:** prova que as jornadas funcionam e aponta o manual em vez de repetir a tela. {Remover se o projeto não tiver QA manual.}

Ficam fora do manual:

- comandos de terminal e conteúdo para desenvolvedores;
- racional de decisão, que fica no ADR, de onde se aponta o capítulo;
- catálogo de endpoints e códigos internos de erro;
- casos de teste;
- telas que ainda não existem;
- link para fora da pasta do manual.

Regra de negócio que a pessoa encontra na tela fica no manual, explicada por quem a vive: o que acontece e como proceder.

## Molde do capítulo

Um capítulo cobre uma jornada completa. Papéis diferentes leem os mesmos capítulos pelas trilhas do índice, então não crie capítulo repetido por papel.

```markdown
# N. Nome da jornada

> **Para quem:** papéis.
> **O que você faz aqui:** uma ou duas frases.

## Como fazer a tarefa

1. Passo numerado com o rótulo exato: clique em **Entrar**.
2. Próximo passo.

![O que a tela mostra, para quem usa leitor de tela](img/NN/slug-da-tarefa.png)

> ⚠️ **Se aparecer** "mensagem literal" → o que significa e o que fazer.

## Perguntas frequentes

Só quando houver.

## Quando pedir ajuda

Se algo aqui não funcionar como descrito, veja [a quem pedir ajuda](README.md#quando-pedir-ajuda).
```

Regras do molde:

- Escreva a tarefa como "Como faço…?". O capítulo acompanha o objetivo da pessoa, e não a disposição da tela.
- Cubra toda mensagem de erro visível, de preferência na tarefa em que ela ocorre.
- Cada tarefa tem ao menos uma imagem do estado final ou do mais informativo. Dispense a imagem só quando ela não ajudar a pessoa a se localizar.
- Quando um papel muda o fluxo, use um aviso no ponto exato da diferença: `> {emoji} **Se você é {papel}:** …`. {Remover se o produto tiver um só papel.}
- Capítulo novo pega o próximo número. Mudar um número obriga a corrigir links e o roteiro.

## Convenções de escrita

- Idioma: {idioma do produto}. Tom: {tom}. Use frases curtas, verbo direto e nenhuma metáfora.
- Rótulos da tela ficam em **negrito**, exatamente como aparecem.
- Mensagens da tela ficam "entre aspas", literais.
- As imagens usam só dados fictícios, os mesmos do roteiro de testes.
- Se a tela diverge do esperado, abra uma issue. O manual descreve o que existe.

{Regras de terminologia do projeto, como gênero e nomes de papéis.}

## Como regenerar os screenshots

```bash
{comando único}
```

O comando sobe um ambiente descartável, cria os dados fictícios, captura as imagens em `img/<NN>/<slug>.png` e apaga o ambiente. Rode de novo e commite o diff dos PNGs sempre que uma tela retratada mudar.

{Opções do comando, pré-requisitos e o que pode ser reexecutado sem apagar o ambiente.}

Uma falha significa que a tela mudou: revise o capítulo, e não apenas o script. A guarda confere se a imagem existe, então abra cada PNG novo para conferir o conteúdo.

## Guardas

`{comando da auditoria}` roda em `{comando de testes}` e reprova:

- link para fora do manual, link quebrado e âncora inexistente;
- imagem citada que não existe e imagem que nenhum capítulo cita;
- capítulo fora do molde ou ausente do índice;
- roteiro que deixou de espelhar os capítulos. {Remover se o projeto não tiver QA manual.}

A auditoria não prova que o texto descreve a tela de hoje. Isso depende da revisão de PR e da execução do roteiro.

{Partes do manual copiadas à mão em testes, como uma tabela de menu por papel: indique o que muda junto.}

## Quando atualizar

Toda mudança visível na tela (rótulo, mensagem, fluxo ou menu) atualiza, no mesmo PR, o capítulo, as imagens e o roteiro. Tela nova ganha tarefa em um capítulo existente ou um capítulo novo.
