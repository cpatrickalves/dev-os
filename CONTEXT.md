# CONTEXT.md

Glossário do domínio do Dev-OS, para colaboradores humanos e agentes.

## Glossário

- **Curated asset** — skill, command, agent, hook, workflow ou output style versionado na raiz do Dev-OS (`skills/`, `commands/`, `agents/`, `hooks/`, `workflows/`, `output-styles/`), copiado para fora pelos scripts de import em `scripts/`.
- **Import por projeto** — skills, commands e agents instalados no `.claude/` do projeto alvo (com opção `--global` onde já existe). Feito com `import-skills.sh`, `import-commands.sh` e `import-agents.sh`, executados a partir do diretório do projeto alvo.
- **Import global** — workflows e output styles instalados direto em `~/.claude/`, valendo para todos os projetos. Feito com `import-workflows.sh` e `import-output-styles.sh`.
- **Standards framework** — antigo sistema de profiles + standards (`profiles/`, `config.yml`, `project-install.sh`, `sync-to-profile.sh`), aposentado na refatoração da issue #7. Recuperação, se necessária, via histórico do git.

## Premissas

- O clone do Dev-OS vive fixo em `~/dev-os`; todos os scripts hardcodam esse caminho como fonte.
- `.claude/` neste repo contém apenas estado/config local de sessão, mais symlinks relativos commitados (`.claude/skills → ../skills`, `.claude/commands → ../commands`, `.claude/agents → ../agents`) que preservam o auto-load dos assets ao abrir o próprio Dev-OS no Claude Code.
