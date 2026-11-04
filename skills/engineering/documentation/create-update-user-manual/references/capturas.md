# Capturas do manual

Imagem desatualizada engana mais do que a ausência dela, e ninguém recaptura dezenas de telas à mão. Por isso um único comando precisa regenerar tudo a partir de um ambiente vazio.

## Como montar

Adapte os modelos de `assets/capturas/` e resolva cada `TODO(manual)`:

- `screenshots-manual.mjs`: sobe o ambiente, cria os dados, captura e apaga;
- `playwright.manual.config.ts`: configuração própria e mapa de viewports por capítulo;
- `helpers.ts`: função `capture`, sessão persistida e dados fictícios;
- `setup.spec.ts`: sessões e dados que o seed não cria;
- `nn-exemplo.spec.ts`: forma de um script de capítulo.

Sem ambiente descartável no projeto, crie um Docker Compose próprio antes de continuar, com banco e caixa de e-mails separados dos de desenvolvimento. Um banco novo a cada rodada torna as contagens reproduzíveis e permite cadastro real.

Crie um script no gerenciador de pacotes, como `screenshots:manual`. Exclua a pasta do pipeline da suíte principal com `testIgnore`, e o arquivo `.auth/` do Git.

## Regras do pipeline

- **Não é suíte de teste.** Sem `expect` de comportamento e com `retries: 0`. Use `waitFor` só para saber que o estado chegou. Falha significa que a tela mudou e o capítulo precisa de revisão.
- **Ordem determinística.** Com `workers: 1`, a ordem declarada dos projetos é a de execução. A jornada que cria dados roda antes da captura que os mostra.
- **Viewport pelo público do capítulo.** Use celular para jornada feita no celular e computador para painel. Capture a viewport, sem `fullPage`, e role até o elemento principal quando ele estiver abaixo da dobra.
- **Nomes estáveis:** `img/<NN>/<slug>.png`. O script sobrescreve o arquivo, e a revisão do PR vê o diff.
- **Dados fictícios únicos.** Capítulo, roteiro e `helpers.ts` contam a mesma história. Mudou em um, mude nos outros.
- **Capture sem desfazer o caminho.** Fotografe formulários antes de enviar e cancele diálogos depois da captura, para não quebrar o estado da captura seguinte.
- **Rodada parcial serve só para depurar.** As imagens canônicas saem da rodada completa, porque as contagens dependem da jornada inteira.

## Armadilhas que já aconteceram

- **Configuração que não carrega.** Os modelos usam `import.meta.url`, então o `package.json` da pasta precisa de `"type": "module"`. Sem isso, o Playwright falha com `exports is not defined in ES module scope`.
- **Destruir o ambiente de outra pessoa.** Antes de subir, aborte se o ambiente já estiver de pé, porque o `down -v` final apagaria o banco dela. `--force` assume o ambiente existente e implica `--keep-stack`.
- **Docker indisponível.** Sem checar o status de `docker compose ps`, a saída vazia parece ambiente desligado, e a falha só aparece depois, com outra mensagem.
- **Ctrl+C.** Com `spawnSync`, o `finally` pode não rodar. Trate `SIGINT` e `SIGTERM`, senão a próxima rodada tropeça no ambiente que ficou de pé.
- **Opção ignorada em silêncio.** `reducedMotion` só vale dentro de `contextOptions`. Inclua `e2e/`, as configurações do Playwright e `scripts/` no `tsc -b` e no lint.
- **Imagens gravadas no lugar errado.** Ancore os caminhos no arquivo com `import.meta.url`, e nunca em `process.cwd()`.
- **Script que acha zero testes.** Só `*.spec.ts` e `*.test.ts` são coletados por padrão. Sem o sufixo, o comando termina verde e sem capturas.
- **Sessão inválida entre capítulos.** Com rotação de refresh token, o estado salvo envelhece a cada navegação. A fixture de sessão persistida regrava o estado ao fim de cada teste.
- **Limite de tentativas no login.** Conte os logins da rodada e reaproveite `storageState`.
- **Senha da persona reprovada.** O validador do cliente pode aprovar uma senha que o backend recusa, como a que contém parte do nome. Prove o cadastro da persona antes de escrever os casos.
- **Diff aleatório.** Use `animations: 'disabled'` e `caret: 'hide'`, e espere a rede, as fontes e dois quadros de animação. A função `capture` já faz isso.
- **E-mail de verificação.** Extraia o token pela API da caixa de e-mails de teste, em vez de pular o fluxo.

## Depois da primeira rodada

Troque cada marcador por `![texto alternativo](img/NN/slug.png)`. O texto alternativo descreve a tela para quem usa leitor de tela. A troca é feita uma única vez, à mão: o script só escreve os PNGs.

Abra cada imagem e compare com o capítulo, olhando principalmente o estado que o texto promete: checklist visível, seletor aberto, botão desabilitado. As guardas conferem só a existência do arquivo.
