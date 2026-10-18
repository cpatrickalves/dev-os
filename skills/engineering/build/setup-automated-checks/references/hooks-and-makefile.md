# Hooks and the Makefile entry point

## Which hook runner

| Project | Runner | Why |
|---|---|---|
| Python, or Python + TypeScript | **pre-commit framework** | One config at the root covers both components plus actionlint and shellcheck; runs through `uvx`, no global install |
| TypeScript only | **Husky + lint-staged** | No Python on the machine; the ecosystem's default, which the team already knows |

Both follow the same split: **pre-commit** runs only on staged files and finishes in seconds (lint + format, whitespace, secrets); **pre-push** runs the whole gate (`make check`). A pre-commit that takes a minute gets bypassed with `--no-verify`, and a bypassed hook protects nothing.

Project tools (ruff, mypy, Biome, pytest, Vitest) run through the project's own package manager (`uv run`, `pnpm exec`), never through a mirror repo with its own `rev`: the hook then runs the exact version in the lockfile, the same one CI runs. Mirror repos are only for tools the project does not depend on (pre-commit-hooks, actionlint, shellcheck).

## pre-commit framework (`.pre-commit-config.yaml` at the repo root)

```yaml
default_install_hook_types: [pre-commit, pre-push]
default_stages: [pre-commit]

repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: ""   # filled by: uvx pre-commit autoupdate
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-toml
      - id: check-json
      - id: check-merge-conflict
      - id: check-added-large-files
      - id: detect-private-key

  - repo: https://github.com/rhysd/actionlint
    rev: ""
    hooks:
      - id: actionlint

  - repo: https://github.com/shellcheck-py/shellcheck-py
    rev: ""
    hooks:
      - id: shellcheck

  - repo: local
    hooks:
      # ---- Python (adapt the directory; drop --directory at the root) ----
      - id: ruff-check
        name: ruff check (fix)
        entry: uv run --directory api ruff check --fix --exit-non-zero-on-fix
        language: system
        types_or: [python, pyi]
        pass_filenames: false
      - id: ruff-format
        name: ruff format
        entry: uv run --directory api ruff format
        language: system
        types_or: [python, pyi]
        pass_filenames: false
      # ---- TypeScript (mixed repos) ----
      - id: biome
        name: biome check (fix)
        entry: pnpm --dir web exec biome check --write --no-errors-on-unmatched --files-ignore-unknown=true
        language: system
        files: ^web/
        types_or: [ts, tsx, javascript, jsx, json, css]
        pass_filenames: false
      # ---- full gate before push ----
      - id: make-check
        name: make check
        entry: make check
        language: system
        pass_filenames: false
        always_run: true
        stages: [pre-push]
```

`pass_filenames: false` with `--directory` / `--dir` is simpler than translating staged paths into component-relative paths, and ruff and Biome are fast enough to scan the component. `--exit-non-zero-on-fix` makes the commit fail after ruff rewrote files, so the author re-stages and sees what changed.

Then:

```bash
uvx pre-commit autoupdate          # fills every rev with the latest tag
uvx pre-commit install             # installs both hook types (default_install_hook_types)
uvx pre-commit run --all-files     # first run: proves the config, applies fixes everywhere
```

## Husky + lint-staged (TypeScript-only repos)

```bash
pnpm add -D husky lint-staged
pnpm exec husky init               # creates .husky/pre-commit and the "prepare": "husky" script
```

`.husky/pre-commit`:

```sh
pnpm exec lint-staged
```

`.husky/pre-push`:

```sh
make check
```

`package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json,jsonc,css}": "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true"
  }
}
```

Husky v9 hook files need no shebang. `prepare` runs on `pnpm install`, so every clone gets the hooks; CI sets `HUSKY=0` or runs `pnpm install --frozen-lockfile --ignore-scripts` to skip them.

## Makefile targets

Follow the `/create-update-makefile` format (`.PHONY` first, `help` default target with the awk block, `##@` sections, `## ` comment on every target, tab indentation). Add this section to an existing Makefile; create the file with `help` plus this section when there is none.

```makefile
##@ Qualidade de Código
# lint, typecheck e test não alteram arquivos; fmt ALTERA.
# Fluxo: make fmt && make check && git commit

check: lint typecheck test lint-infra ## Roda todas as checagens (o mesmo que a CI)

lint: ## Lint e formatação — não altera arquivos
	cd api && uv run ruff check . && uv run ruff format --check .
	cd web && pnpm lint

fmt: ## Formata e aplica correções automáticas — ALTERA arquivos
	cd api && uv run ruff check --fix . && uv run ruff format .
	cd web && pnpm fmt

typecheck: ## Verifica tipos (mypy strict, tsc)
	cd api && uv run mypy .
	cd web && pnpm typecheck

test: ## Testes com cobertura
	cd api && uv run pytest --cov --cov-report=term-missing
	cd web && pnpm test

lint-infra: ## actionlint nos workflows e shellcheck nos .sh
	docker run --rm -v "$(CURDIR):/repo" -w /repo rhysd/actionlint:<exact version> -color
	docker run --rm -v "$(CURDIR):/mnt" koalaman/shellcheck:<exact version> $$(git ls-files '*.sh')

##@ Setup
setup: ## Instala dependências e os git hooks
	cd api && uv sync
	cd web && pnpm install --frozen-lockfile
	uvx pre-commit install
```

Keep only the lines for components that exist. Comment language follows the project's documentation language (the example is Portuguese because the reference format is). `lint-infra` runs the tools through their official Docker images with exact versions, so nothing needs a global install; when the project forbids Docker in hooks, install `actionlint` and `shellcheck` locally and call them directly.

Resolve `<exact version>` with `gh api repos/rhysd/actionlint/releases/latest --jq .tag_name` and `gh api repos/koalaman/shellcheck/releases/latest --jq .tag_name`.
