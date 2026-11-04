# Renderizar o manual na aplicação

Quem mais precisa do manual costuma ser quem menos encontra um repositório. Este passo leva o manual para a própria tela, com uma única fonte: o build importa os arquivos de `docs/`, e cada arquivo vira uma tela (arquivo = tela).

## Decisões

Confirme com o usuário as que dependem do produto, e registre o conjunto em um ADR se o projeto usar ADRs.

- **Fonte única:** importe os arquivos no build. Cópia sincronizada duplica cada diff de imagem, e busca em tempo de execução acrescenta estados de carregamento e erro por capítulo.
- **Sem regra oculta de renderização:** retire da pasta o conteúdo técnico, que vai para o guia. Se o renderizador ignorar trechos marcados, a tela passa a divergir do arquivo sem que o autor perceba.
- **Rotas:** `/<área>/manual` para o índice e `/<área>/manual/<nome-do-arquivo>` para o capítulo, derivadas da pasta. Capítulo novo aparece sem registro em nenhuma lista.
- **Acesso:** dentro da área logada, com os mesmos capítulos para todos os papéis, e a trilha do índice orientando cada um. Os assets continuam acessíveis por URL, então confirme que o conteúdo não é sensível.
- **Entrada no menu:** no menu da conta, igual para todos os papéis. Se o menu estiver documentado no manual, atualize o capítulo e os testes juntos.

## Implementação

O exemplo usa Vite e React. Em outra stack, mantenha o mesmo contrato: arquivos lidos no build, capítulos sob demanda e imagens como assets.

```ts
const chapters = import.meta.glob('@docs/manual-de-uso/[0-9]*.md', { query: '?raw', import: 'default' });
const index = import.meta.glob('@docs/manual-de-uso/README.md', { query: '?raw', import: 'default' });
const images = import.meta.glob('@docs/manual-de-uso/img/**/*.png', { query: '?url', import: 'default', eager: true });
```

Use `react-markdown` com `remark-gfm`, carregados sob demanda na rota do manual, e estes overrides:

- **link:** `#âncora` fica na página, `README.md` vai para o índice, `NN-*.md` vira navegação interna e o restante abre em nova aba. Esse último caso cobre URL nua, que o `remark-gfm` transforma em link;
- **imagem:** resolva `img/NN/slug.png` no mapa de assets;
- **título:** gere o `id` com a mesma regra de âncora da auditoria, a do GitHub (`scripts/audit_manual.mjs`). Compartilhe a função, porque a âncora aprovada na guarda precisa existir na tela. Trate também os títulos repetidos, que recebem sufixo.

Cada arquivo importado entra também na varredura por glob: acrescente um teste que falha se a lista de capítulos vier vazia, senão todas as rotas respondem 404 em silêncio.

## Armadilhas que já aconteceram

- **Contexto do build Docker.** Com `./frontend` como contexto, `docs/` fica fora. Declare `additional_contexts: { docs: ./docs }` no Compose, use `COPY --from=docs . /docs` no Dockerfile e monte `./docs:/docs` em desenvolvimento. Exige Docker Compose 2.17 ou mais novo.
- **Exposição no servidor de desenvolvimento.** O que entra em `server.fs.allow` fica legível por URL. Libere a pasta do manual, e não `docs/` inteiro, onde ficam planos e material interno.
- **Bloqueio de perfil incompleto.** Se existir uma tela obrigatória de primeiro acesso, o manual precisa ficar isento dela, já que ensina a sair dali. Use um único predicado para a rota e para o tratamento de erro da API. Com regras separadas, uma requisição de fundo pode expulsar a pessoa no meio da leitura.
- **Falha ao baixar o pedaço do bundle.** Conexão instável ou implantação nova fazem o carregamento sob demanda falhar. Sem tela de erro própria nas rotas do manual, a falha derruba o cabeçalho e a navegação. Ofereça recarregar e evite aninhar um segundo `<main>`.
- **Imagem no dobro do tamanho.** Capturas com `deviceScaleFactor: 2` pedem `srcSet="url 2x"`. Mudou o fator no pipeline, mude no renderizador no mesmo commit.
- **Âncora que não rola.** Em navegação interna, o navegador não rola até o `#hash` depois do carregamento sob demanda. Trate o scroll depois de renderizar.
- **Tipografia fora do design.** Texto em Markdown costuma usar `prose`, que ignora os tokens do projeto. Ajuste títulos, links e largura de leitura em um único componente de moldura, e registre a exceção no design system.
- **Peso.** As imagens passam a contar nos assets. Em uma PWA, decida se entram no precache.

## Verificação

Automatize:

- rotas derivadas da pasta;
- tela de erro das rotas do manual;
- entrada no menu;
- isenção do primeiro acesso, se houver.

A leitura em si (imagem carregada, âncora que rola, menu em tela estreita) entra como casos do roteiro de testes. Confira também na aplicação em execução.
