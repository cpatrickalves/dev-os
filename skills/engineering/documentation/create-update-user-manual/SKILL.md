---
name: create-update-user-manual
description: >-
  Cria ou atualiza o manual de uso de um produto com interface: capítulos por jornada para quem
  usa a tela, screenshots regeneráveis por um comando, guardas de links e imagens, roteiro de
  testes espelhado e, se fizer sentido, o manual dentro da aplicação. Use ao pedir "criar manual
  de uso", "user manual", "guia do usuário", "atualizar o manual", "regenerar os screenshots do
  manual" ou depois de mudar uma tela, mensagem ou menu já descritos no manual. Para documentação
  de desenvolvedor (README, ADR, arquitetura), use docs-generator.
metadata:
  author: Patrick Alves
  version: "1.0"
---

# Manual de uso

O manual ensina a usar o produto pela tela e é a fonte da verdade do comportamento visível: rótulos, mensagens e passos. A skill constrói esse manual em camadas, e cada camada já entrega valor sozinha. O maior risco é o manual envelhecer em silêncio, por isso as imagens são regeneradas por comando e as guardas reprovam ponteiro quebrado. Guarda aqui é uma verificação automática que lê os arquivos e falha quando uma regra é quebrada.

## Diagnóstico

Comece sempre por aqui, para saber em que ponto o projeto está.

1. Leia `AGENTS.md`/`CLAUDE.md`, o README, o glossário e a árvore de `docs/`. Eles definem idioma, local dos documentos e regras de commit.
2. Procure o manual e o guia de manutenção dele. O guia existente prevalece sobre os padrões desta skill.
3. Levante as rotas, os papéis e os componentes de tela no código.
4. Classifique cada passo de "Criar" como feito, parcial ou ausente.
5. Escolha o modo:
   - manual inexistente ou incompleto: siga "Criar" a partir do primeiro passo ausente;
   - manual completo e pedido ligado a uma mudança: siga "Atualizar".

Feche o diagnóstico mostrando essa classificação e fazendo, de uma vez, as perguntas ainda sem resposta. Traga uma recomendação tirada do código para cada uma:

- quem lê o manual, quais papéis existem e qual o letramento digital desse público;
- em qual dispositivo cada jornada acontece;
- a quem a pessoa pede ajuda quando o manual não resolve;
- se o projeto tem QA manual, o que define o passo 6;
- se o manual deve aparecer dentro da aplicação, o que define o passo 8.

## Criar

Siga esta ordem. Cada passo termina no critério indicado.

### 1. Separar os tipos de documento

Registre no glossário do projeto três tipos, com o limite de cada um. Sem glossário, o registro vai para o guia do passo 2.

- **Manual de uso:** o que acontece na tela.
- **Guia técnico:** terminal, infraestrutura e procedimentos internos.
- **Roteiro de testes manuais:** prova caso a caso que as jornadas do manual funcionam.

Encontre os documentos atuais que misturam esses tipos e proponha para onde vai cada trecho.

Critério: cada documento de uso existente tem destino definido, e os três termos estão registrados.

### 2. Fixar o molde e as convenções

Copie `assets/manutencao-do-manual.md` para fora da pasta do manual, ao lado dos outros guias técnicos, e preencha com as respostas do diagnóstico. Sem convenção de pastas no projeto, use `docs/manutencao-do-manual.md` e `docs/manual-de-uso/`.

Este guia é a casa viva do molde. Spec e plano envelhecem depois da entrega e deixam de refletir o que vale.

Critério: nenhum marcador `{...}` restante no guia.

### 3. Escrever os capítulos

1. Monte o inventário: cada jornada vira um capítulo `NN-nome.md`, e os papéis viram trilhas de leitura no índice.
2. Crie o índice a partir de `assets/manual-README.md`.
3. Escreva um capítulo completo no molde e mostre ao usuário. Ele calibra tom e nível de detalhe antes do restante.
4. Escreva os demais capítulos. Leia cada rótulo e cada mensagem no componente da tela, e cubra toda mensagem de erro que a pessoa pode ver.
5. Use um marcador onde cada imagem vai entrar: `<!-- 🖼️ img/NN/slug.png — tela e estado a capturar -->`.
6. Registre como issue toda divergência entre a tela e o comportamento esperado. O manual descreve o que existe.

Rode a auditoria, com a pasta de código da interface em `--source` para conferir os literais:

```bash
node <pasta-desta-skill>/scripts/audit_manual.mjs --manual <pasta-do-manual> --allow-placeholders --source <pasta-do-código-de-tela>
```

Critério: auditoria aprovada e todo literal listado por `--source` conferido no código. Essa lista é só um aviso: texto com variável ou plural aparece nela e pode estar correto.

### 4. Automatizar as capturas

Leia `references/capturas.md` e adapte os modelos de `assets/capturas/`.

Critério:

- o comando único gera todas as imagens a partir de um ambiente vazio, e uma segunda rodada também termina sem erro;
- você abriu cada imagem e conferiu com o texto do capítulo;
- os marcadores viraram `![texto alternativo](img/NN/slug.png)`, sem `TODO(manual)` restante nos arquivos adaptados.

### 5. Ligar as guardas

Copie `scripts/audit_manual.mjs` para os scripts do projeto, onde ele passa a ser mantido, e ligue-o à suíte de testes. Em um projeto com Vitest, por exemplo:

```ts
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('o manual de uso passa na auditoria', () => {
  const run = spawnSync('node', ['scripts/audit_manual.mjs', '--manual', '../docs/manual-de-uso'], {
    encoding: 'utf8',
  });
  expect(run.status, run.stdout + run.stderr).toBe(0);
});
```

Critério: a suíte passa, fica vermelha ao quebrar um link de propósito e volta a passar ao desfazer.

### 6. Espelhar o roteiro de testes

Só para projeto com QA manual. Crie o roteiro a partir de `assets/roteiro-de-testes.md`. Cada capítulo ganha uma seção com o mesmo número e título, e cada caso aponta a seção do manual em vez de repetir os rótulos. Acrescente `--roteiro <arquivo>` à chamada da auditoria.

Critério: cada tarefa do manual tem ao menos um caso, ou a ausência está justificada no roteiro, e a guarda fica vermelha ao renomear um título do manual.

### 7. Incluir o manual na definição de pronto

As guardas não detectam tela nova sem capítulo, então essa cobrança precisa estar onde quem altera a tela vai ler. Acrescente ao `CONTRIBUTING.md`, ao modelo de PR ou à definição de pronto do projeto, e também ao `AGENTS.md`:

> Mudou algo visível na tela (rótulo, mensagem, fluxo, menu): atualize o capítulo do manual, as imagens e o roteiro no mesmo PR. Procedimento em `<caminho do guia>`.

Critério: a regra está nos dois lugares, com o caminho correto do guia.

### 8. Renderizar dentro da aplicação

Só se o usuário confirmou no diagnóstico. Leia `references/renderizar-na-aplicacao.md`. É o passo mais caro: o build passa a depender de `docs/`, e editar o manual pode reprovar os testes do frontend.

Critério: todas as telas do manual abrem na aplicação, com imagens e âncoras funcionando, e um teste cobre a falha de carregamento dessas telas.

## Atualizar

1. **Delimite a mudança.** Use a base indicada pelo usuário ou a base do branch: `git diff <base>...HEAD --stat`.
2. **Classifique cada arquivo de interface alterado:** texto muda, tarefa nova, capítulo novo ou sem efeito visível. Procure os rótulos e mensagens antigos nos capítulos para achar os trechos afetados.
3. **Edite os capítulos** lendo os literais novos no código. Divergência que o diff não explica vira pergunta ou issue.
4. **Regenere as imagens** das telas que mudaram, com o comando do guia, e abra cada PNG alterado para conferir. Capítulo novo pega o próximo número, ganha trilha no índice, script de captura e entrada no mapa de viewports.
5. **Ajuste o roteiro:** links de títulos renomeados, casos de tarefas novas e resultados esperados que mudaram.
6. **Revise o que o guia do projeto declara espelhado à mão**, como testes que copiam uma tabela do manual.
7. **Rode a auditoria** com `--source` e a suíte de testes do projeto.

Critério: todo arquivo de interface do diff está classificado, e a auditoria e a suíte passam.

## Entrega

Informe ao usuário os capítulos, as imagens e os casos alterados, o resultado da auditoria e dos testes, as issues encontradas e o que ficou sem verificar. Siga as regras de commit do projeto e faça commit só se o usuário pedir.
