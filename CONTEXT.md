# CONTEXT.md

Glossário do domínio do Dev-OS, para colaboradores humanos e agentes.

## Glossário

- **Curated asset** — skill, agent, hook, workflow ou output style versionado na raiz do Dev-OS (`skills/`, `agents/`, `hooks/`, `workflows/`, `output-styles/`), copiado para fora pelos scripts de import em `scripts/`. Os antigos slash commands viraram skills com `disable-model-invocation: true`.
- **Categoria de skill** — pasta de agrupamento dentro de `skills/` (`claude-code/`, `engineering/`, `learning/`, `productivity/`, com subcategorias em `engineering/`). Existe só na biblioteca fonte: o import achata cada skill para `.claude/skills/<nome>/`, porque o Claude Code não descobre skills em subpastas.
- **Catálogo externo** — plugins do Claude e pacotes de skills de terceiros que são *instalados* (via `claude plugin` / `npx skills`), não copiados. Declarados em `external-plugins.yaml` e `external-skills.yaml` na raiz e instalados por `install-plugins.sh` e `install-external-skills.sh`. Skills de terceiros copiadas à mão para `skills/` são curated assets (ver `docs/vendored-skills.md`).
- **Import por projeto** — skills e agents instalados no `.claude/` do projeto alvo (com opção `--global` onde já existe). Feito com `import-skills.sh` e `import-agents.sh`, executados a partir do diretório do projeto alvo.
- **Import global** — workflows e output styles instalados direto em `~/.claude/`, valendo para todos os projetos. Feito com `import-workflows.sh` e `import-output-styles.sh`.
- **Standards framework** — antigo sistema de profiles + standards (`profiles/`, `config.yml`, `project-install.sh`, `sync-to-profile.sh`), aposentado na refatoração da issue #7. Recuperação, se necessária, via histórico do git.

## Premissas

- O clone do Dev-OS vive fixo em `~/dev-os`; todos os scripts hardcodam esse caminho como fonte.
- `.claude/` neste repo contém apenas estado/config local de sessão, mais o symlink relativo commitado `.claude/agents → ../agents`. As skills curadas não carregam sozinhas ao abrir o próprio Dev-OS no Claude Code.
