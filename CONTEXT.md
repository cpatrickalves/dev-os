# CONTEXT.md

Glossário do domínio do Dev-OS, para colaboradores humanos e agentes.

## Glossário

- **Curated asset** — skill, agent, hook, workflow ou output style versionado na raiz do Dev-OS (`skills/`, `agents/`, `hooks/`, `workflows/`, `output-styles/`), copiado para fora pelos scripts de import em `scripts/`. Os antigos slash commands viraram skills com `disable-model-invocation: true`.
- **Categoria de skill** — pasta de agrupamento dentro de `skills/` (`claude-code/`, `engineering/`, `learning/`, `productivity/`, com subcategorias em `engineering/`). Existe só na biblioteca fonte: o import achata cada skill para `.claude/skills/<nome>/`, porque o Claude Code não descobre skills em subpastas.
- **Catálogo externo** — plugins do Claude e pacotes de skills de terceiros que são *instalados* (via `claude plugin` / `npx skills`), não copiados. Declarados em `external-plugins.yaml` e `external-skills.yaml` na raiz e instalados por `install-plugins.sh` e `install-external-skills.sh`.
- **Mod** — plugin do Claude Code feito de function hooks que altera a interface (painéis, barras, status line, toasts). Instala como qualquer plugin, mas fica num catálogo próprio, `external-mods.yaml`, porque `manage-mods.sh` também o desinstala. _Evitar_: tema, extensão.
- **Third-party skill** — curated asset copiado de um upstream de terceiros para `skills/` e mantido em sincronia com ele; é identificado por ter `metadata.last_synced`, e registra a origem em `metadata.source` e as adaptações em `metadata.local_changes`. Difere do catálogo externo por ser copiado, não instalado. Uma skill própria apenas inspirada em material externo não é third-party skill; ela cita esse material em `metadata.reference`. _Evitar_: vendored skill.
- **Sync** — trazer para uma third-party skill as mudanças do upstream desde `last_synced`, preservando as adaptações locais, e avançar `last_synced`. Feito com `sync-third-party-skills.sh`. _Evitar_: update, refresh.
- **Import por projeto** — skills e agents instalados no `.claude/` do projeto alvo (com opção `--global` onde já existe). Feito com `import-skills.sh` e `import-agents.sh`, executados a partir do diretório do projeto alvo.
- **Import global** — workflows e output styles instalados direto em `~/.claude/`, valendo para todos os projetos. Feito com `import-workflows.sh` e `import-output-styles.sh`.
- **Standards framework** — antigo sistema de profiles + standards (`profiles/`, `config.yml`, `project-install.sh`, `sync-to-profile.sh`), aposentado na refatoração da issue #7. Recuperação, se necessária, via histórico do git.

## Premissas

- O clone do Dev-OS vive fixo em `~/dev-os`; todos os scripts hardcodam esse caminho como fonte.
- `.claude/` neste repo contém apenas estado/config local de sessão, mais o symlink relativo commitado `.claude/agents → ../agents`. As skills curadas não carregam sozinhas ao abrir o próprio Dev-OS no Claude Code.
