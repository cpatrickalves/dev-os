# Create or Update Changelog

You are tasked with creating (if needed) and updating a changelog for a software project. Follow these instructions carefully to create a well-structured and informative changelog.

You must focus on changes that impact users, developers, or the software's behavior. Avoid excessive technical details and keep entries brief and objective.

First, here is the template you should use for your changelog (CHANGELOG.md):

<changelog_template>
# Changelog

Todas as mudanças significativas neste projeto serão documentadas neste arquivo.

## [VERSÃO] - YYYY-MM-DD

### Adicionado
- [Descreva novas funcionalidades aqui]

### Corrigido
- [Descreva correções de bugs aqui]

### Alterado
- [Descreva alterações em funcionalidades existentes aqui]

### Removido
- [Descreva remoções ou depreciações aqui]

### Segurança
- [Correções de vulnerabilidades ou melhorias de segurança]

```
</changelog_template>

## Creating the Changelog

Next, consider these guidelines when creating your changelog entries:

- Create the first changelog to version using the commits
- The current version is the on in package.json or pyproject.toml file
- Create a git tag if it does not exists

## Updating the Changelog

Consider these versioning guidelines when updating your changelog entries:

<versioning_guidelines>
- Siga o Versionamento Semântico
- A versão (x.x.x) deve ser a mesma do `pyproject.toml` (Python) ou `packages.json` (Javascript)
</versioning_guidelines>

To help manage versions and releases, use Git tags. Here's a guide on how to use Git tags effectively:

<git_tags_guide>
- Listar os Commits Após a Última Tag, para saber o que mudou desde da última tag:
```
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```
- Criar tag
```
  git tag -a v[VERSAO no formaro x.x.x] -m "Mensagem descritiva da versão, ex.: Lançamento inicial com funcionalidades básicas"
```
</git_tags_guide>

Update version:
- Bump the version following Semantic Versioning
- Now, to create your changelog:

1. Update the CHANGELOG.md using provided template structure.
2. For each version or release:
   a. Use the correct version number following the versioning guidelines.
   b. Include the date in YYYY-MM-DD format.
   c. Categorize changes under "Adicionado", "Alterado", "Removido", "Corrigido", and "Segurança" as appropriate.
   d. Write clear, concise descriptions for each change, starting with a verb in the infinitive or past tense.
3. Order entries from the most recent version to the oldest.
4. Include an "[Não Publicado]" section at the top for ongoing changes.
5. Use Markdown formatting for readability.
6. Reference issue numbers or pull requests if relevant, but avoid duplicating information.
7. Update the changelog in conjunction with releases, using Git tags to mark each version.
- Commit (in Portuguese)
- Create a git tag bases on the commits before the last tag

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