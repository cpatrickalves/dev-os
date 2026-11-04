# Testes manuais de interface

Roteiro para uma pessoa provar pela tela que as jornadas do [manual de uso]({caminho-do-manual}/README.md) funcionam. O manual guarda rótulos, mensagens e passos; este roteiro guarda só o que é de QA: pré-condições, ações, resultado esperado e registro de execução.

## Como usar este documento

1. Confira os pré-requisitos uma vez.
2. Execute os casos na ordem de cada seção.
3. Faça as ações e compare a tela com o resultado esperado.
4. Preencha **Resultado da execução** com data, nome e status.
5. Se um caso reprovar, abra uma ocorrência com o ID e um print da tela.

## Pré-requisitos

{Ambiente no ar, caixa de e-mails de teste, contas de exemplo e dados fictícios. Os dados fictícios são os mesmos usados nas capturas do manual: mudou aqui, mude lá.}

## Convenções

- **ID:** `T-` + prefixo de três letras da área + número, como `T-ENT-01`. O ID nunca é renumerado, porque ocorrências e ciclos antigos o citam.
- **Fluxo:** é o primeiro item de todo caso e aponta, com âncora, a seção do capítulo correspondente à própria seção do roteiro. Link para outro capítulo entra inline no passo que precisar dele.
- **Resultado esperado:** afirma o efeito observável: para onde a tela vai, que contagem muda, que status aparece, que mensagem chega. O texto literal é conferido no trecho linkado em **Fluxo**.
- **Exceções:** um rótulo literal entra no caso só quando ele é o próprio comportamento testado. {Liste aqui cada exceção; a lista é fechada.}
- **Pós-condições:** entram só nos casos que preparam outro.

{Se a ordem de execução cruza seções, registre aqui um bloco próprio com essa ordem.}

## 1. {Título idêntico ao do capítulo 1}

### T-XXX-01 — {Nome do caso}

- **Fluxo:** [{Seção do manual}]({caminho-do-manual}/01-{capitulo}.md#{ancora-da-secao})
- **Pré-condições:** {estado inicial}.
- **Ações:**
  1. {Ação}.
  2. {Ação}.
- **Resultado esperado:** {efeito observável}.
- **Resultado da execução:** _aguardando execução_
