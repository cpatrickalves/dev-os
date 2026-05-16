---
description: Create or update CHANGELOG.md (Keep a Changelog) and tag the release
argument-hint: "[version]"
context: fork
disable-model-invocation: true
---

# Create or Update Changelog

You are tasked with creating (if needed) and updating a changelog for a software project. Follow these instructions carefully to create a well-structured and informative changelog.

Focus on changes that impact users, developers, or the software's behavior. Avoid excessive technical details and keep entries brief and objective. The changelog output is written in **Brazilian Portuguese** — keep it that way.

## Workflow

Copy this checklist and work through it in order:

```
- [ ] Detect the version source: pyproject.toml (Python) or package.json (JavaScript)
- [ ] Run: git log $(git describe --tags --abbrev=0)..HEAD --oneline
- [ ] Categorize the changes using the Keep a Changelog order (see template)
- [ ] Bump the version following Semantic Versioning
- [ ] Write/update CHANGELOG.md: promote [Não Publicado] → [VERSÃO] - YYYY-MM-DD
- [ ] Confirm version + entries with the user
- [ ] Commit (commit message in Portuguese) — only after user confirmation
- [ ] Create the git tag for the version — only after user confirmation
```

## Changelog template (CHANGELOG.md)

```markdown
# Changelog

Todas as mudanças significativas neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não Publicado]

### Adicionado
- [Mudanças em andamento ainda não publicadas]

## [VERSÃO] - YYYY-MM-DD

### Adicionado
- [Descreva novas funcionalidades aqui]

### Alterado
- [Descreva alterações em funcionalidades existentes aqui]

### Depreciado
- [Descreva funcionalidades que serão removidas em breve]

### Removido
- [Descreva remoções aqui]

### Corrigido
- [Descreva correções de bugs aqui]

### Segurança
- [Correções de vulnerabilidades ou melhorias de segurança]
```

Always use this category order: **Adicionado → Alterado → Depreciado → Removido → Corrigido → Segurança**. Omit any category that has no entries for a given version.

## Creating the changelog (first time)

- Build the first changelog from the existing commit history.
- The current version is the one in `pyproject.toml` (Python) or `package.json` (JavaScript).
- If no git tag exists yet, create one for the current version (after user confirmation — see Versioning).

## Updating the changelog

<versioning_guidelines>
- Follow Semantic Versioning (x.x.x).
- The version (x.x.x) must match the one in `pyproject.toml` (Python) or `package.json` (JavaScript).
- Document not only *what* changed, but also *why* it changed. If there is a specific reason for the change, document the reason or ask the user.
</versioning_guidelines>

### Git tags

Use Git tags to manage versions and releases. Only create a tag after the user confirms the version.

- List the commits since the last tag, to see what changed:
  ```
  git log $(git describe --tags --abbrev=0)..HEAD --oneline
  ```
- Create the tag for the new version:
  ```
  git tag -a v[VERSAO no formato x.x.x] -m "Mensagem descritiva da versão, ex.: Lançamento inicial com funcionalidades básicas"
  ```

### Rules for entries

1. Update CHANGELOG.md using the template structure above.
2. For each version or release:
   a. Use the correct version number following the versioning guidelines.
   b. Include the date in YYYY-MM-DD format.
   c. Categorize changes under "Adicionado", "Alterado", "Depreciado", "Removido", "Corrigido", and "Segurança" as appropriate.
   d. Write clear, concise descriptions for each change, starting with a verb in the infinitive or past tense.
3. Order versions from the most recent to the oldest.
4. Keep a "[Não Publicado]" section at the top for ongoing changes; promote it to a versioned section on release.
5. Use Markdown formatting for readability.
6. Reference issue numbers or pull requests if relevant, but avoid duplicating information.
7. Update the changelog in conjunction with releases, using Git tags to mark each version.

## Changelog example

```markdown
# Changelog

Todas as mudanças significativas neste projeto serão documentadas neste arquivo.

## [1.5.0] - 2025-01-15

### Adicionado
- Sistema de notificações em tempo real
- Integração com serviços de pagamento PIX
- Suporte para múltiplos idiomas (PT-BR, EN, ES)

### Alterado
- Otimizada consulta ao banco de dados
- Melhorada responsividade em dispositivos móveis

### Corrigido
- Corrigido erro de timeout em uploads de arquivos grandes
- Corrigida exibição incorreta de valores monetários

### Segurança
- Implementada autenticação de dois fatores (2FA)
- Corrigida vulnerabilidade de injeção SQL

## [1.1.0] - 2024-12-01

### Adicionado
- Sistema de relatórios básicos
- Funcionalidade de pesquisa

### Alterado
- Melhorada interface principal
- Otimizada consulta ao banco de dados
- Atualizada documentação de instalação

### Corrigido
- Corrigidos erros de validação de dados

## [1.0.0] - 2024-10-01

### Adicionado
- Lançamento inicial do sistema
- Funcionalidades básicas de CRUD
- Sistema de autenticação e autorização
- Interface web responsiva
- Documentação básica de uso
```
