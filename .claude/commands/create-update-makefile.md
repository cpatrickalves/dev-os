---
description: Create or update a project Makefile using the self-documenting standard format (awk-driven help, sectioned, inline-documented targets).
argument-hint: "[optional: target/section to add or focus on]"
context: fork
disable-model-invocation: true
---

You will create or update a project's `Makefile`, collecting the important and frequently used commands so developers (and AI agents) can run common tasks without memorizing them.

## Step 1 — Understand the project

Read these before writing anything:

- `README.md` and `CLAUDE.md` / `AGENTS.md` — documented workflows and commands.
- Manifests to detect the stack: `pyproject.toml`, `package.json`, `go.mod`, `Cargo.toml`, `Gemfile`, `composer.json`, etc.
- `docker-compose.yml` / `compose.yaml`, `.github/workflows/*` — real CI and service commands.
- The existing `Makefile`, if any — **preserve working targets**; update rather than replace unless they're broken.

Then map out: project type, package manager, test runner, linter/formatter, services (DB, queues, frontend), and CI pipeline. Use the project's real tooling — do not invent commands that aren't backed by the manifests or docs.

## Step 2 — Output standard (required format)

Every Makefile you generate or update MUST follow this exact structure. It is self-documenting: `make` or `make help` prints grouped, colorized command help by parsing `##@` section headers and `## ` target comments.

```makefile
.PHONY: help <every target listed here, space-separated>

# Cores para output
CYAN := \033[36m
RESET := \033[0m

##@ Geral
help: ## Mostra esta mensagem de ajuda
	@awk 'BEGIN {FS = ":.*##"; printf "\nUso:\n  make $(CYAN)<comando>$(RESET)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n%s\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ <Section Name>
<target>: ## <short description shown in help>
	<command>
	<command>
```

### Format rules — non-negotiable

1. **Recipe indentation is a TAB**, never spaces. This is the most common Makefile failure — verify it.
2. **First line is `.PHONY`** listing every target name (none of these create files). Keep it in sync whenever you add/remove a target.
3. **`help` is the default target** — it is the first real target after `.PHONY`, so a bare `make` prints help. (Optionally add `.DEFAULT_GOAL := help` if a non-help target must come first.)
4. **`CYAN`/`RESET` color vars** declared exactly as above; the `help` awk block is copied verbatim.
5. **Group with `##@ <Section>`** comment lines. Use these sections when applicable, in this order; omit ones that don't apply, add others as needed:
   - `Geral` — `help`
   - `Setup` — install deps, create virtualenv/env
   - `Desenvolvimento` — run app/services locally (api, worker, frontend, dev server)
   - `Docker` — `up`, `down`, `reset`, `logs`, build
   - `Banco de Dados` — migrations, seed, reset (if a DB exists)
   - `Qualidade de Código` — `lint`, `format`, `format-check`, `fix`, `typecheck`, `check`, `ci`
   - `Testes` — `test` plus focused variants (`test-x`, `test-v`, integration, etc.)
   - `Limpeza` — `clean`
6. **Every target gets a `## ` comment** on its declaration line — short, in the project's documentation language (match the language already used in README/CLAUDE.md; the reference example is Portuguese). This text is what `help` displays.
7. **Add explanatory `#` comment blocks** inside a section when a workflow needs guidance (e.g. under `Qualidade de Código`, note which targets mutate files vs. only check, and the typical `fix → format → check → commit` flow). Mark mutating targets explicitly (e.g. `ALTERA arquivos` vs `não altera arquivos`).
8. **Compose multi-step targets** by listing commands line by line, or depend on other targets (`check: lint format-check typecheck`) when that better expresses intent. Prefer prerequisite targets over copy-pasted command chains where it improves clarity.
9. Keep target names short, kebab-case, and consistent (`test`, `test-v`, `test-x`; `format`, `format-check`).

## Step 3 — Reference example (Python / uv / Docker stack)

This is a complete, conforming Makefile. Mirror its **structure, help target, sectioning, and comment style** — substitute commands for whatever the project's stack actually uses (npm/pnpm, go, cargo, poetry, pip, make, etc.).

```makefile
.PHONY: help dev setup db migrate api worker frontend up down reset logs lint format format-check fix typecheck check ci test test-x test-v test-live test-media test-demo test-demo-up test-flows clean

# Cores para output
CYAN := \033[36m
RESET := \033[0m

##@ Geral
help: ## Mostra esta mensagem de ajuda
	@awk 'BEGIN {FS = ":.*##"; printf "\nUso:\n  make $(CYAN)<comando>$(RESET)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2 } /^##@/ { printf "\n%s\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Setup
setup: ## Cria .venv e instala dependências
	uv venv
	uv pip install -e ".[dev]"

##@ Desenvolvimento
dev: ## Inicia LangGraph Studio (desenvolvimento de agentes)
	uv run langgraph dev

db: ## Inicia apenas o PostgreSQL (com pgvector)
	docker compose up -d db

migrate: ## Aplica migrações pendentes no banco
	uv run python db/migrate.py

api: ## Roda a API localmente (fora do Docker)
	uv run uvicorn whatsapp_langchain.server.main:app --reload --port 8000

worker: ## Roda o Worker localmente (fora do Docker)
	uv run python -m whatsapp_langchain.worker.main

frontend: ## Admin Panel (Next.js)
	cd frontend && npm run dev

##@ Docker
up: ## Inicia todos os serviços (API + Worker + Frontend + DB)
	docker compose up -d

down: ## Para todos os serviços
	docker compose down

reset: ## Reseta stack Docker (remove containers/rede/volumes e sobe com build limpo)
	docker compose down -v --remove-orphans
	docker compose up -d --build
	docker compose ps

logs: ## Mostra logs de todos os serviços
	docker compose logs -f

##@ Qualidade de Código
# Estes comandos verificam estilo e tipos, NÃO lógica.
# Para testar lógica, use: make test
#
# Fluxo típico:
#   make fix && make format   # Corrige e formata
#   make check                # Verifica se está tudo ok
#   git commit

lint: ## Encontra problemas (imports, sintaxe) — não altera arquivos
	uv run ruff check .

format: ## Formata código — ALTERA arquivos
	uv run ruff format .

format-check: ## Verifica se está formatado — não altera (para CI)
	uv run ruff format --check .

fix: ## Corrige problemas automaticamente — ALTERA arquivos
	uv run ruff check --fix .

typecheck: ## Verifica tipos estáticos (pyright) — não altera arquivos
	uv run pyright src/

check: ## Verifica tudo (lint + format + types) — não altera arquivos
	uv run ruff check . && uv run ruff format --check . && uv run pyright src/

ci: ## CI/CD: verifica tudo + roda testes — não altera arquivos
	uv run ruff check . && uv run ruff format --check . && uv run pyright src/ && uv run pytest -m "not docker_demo"

##@ Testes
test: ## Roda todos os testes
	uv run pytest -m "not docker_demo"

test-x: ## Roda testes, para no primeiro erro
	uv run pytest -x -m "not docker_demo"

test-v: ## Roda testes com output verboso
	uv run pytest -v -m "not docker_demo"

test-live: ## Roda integracoes live com OpenRouter real (requer OPENROUTER_API_KEY valida)
	OPENROUTER_LIVE_TESTS=1 uv run pytest tests/integration/test_context_middleware.py tests/integration/test_memory.py tests/integration/test_media_real.py -v

test-media: ## Roda testes de mídia real (requer OPENROUTER_API_KEY)
	OPENROUTER_LIVE_TESTS=1 uv run pytest tests/integration/test_media_real.py -v -s

test-demo: ## Roda testes demonstrativos (requer stack Docker rodando)
	uv run pytest -m docker_demo -v

test-demo-up: ## Sobe stack Docker e roda testes demonstrativos
	docker compose up -d --build
	uv run pytest -m docker_demo -v

test-flows: ## Roda testes de fluxo realista (requer stack Docker)
	uv run pytest tests/integration/test_realistic_flows.py -v -s

##@ Limpeza
clean: ## Remove arquivos de cache do Python
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
```

## Step 4 — Write and verify

1. Write the `Makefile` at the project root, adapting commands to the detected stack while keeping the format above.
2. If updating an existing Makefile: keep correct existing targets, retrofit them into the `##@`/`## ` format, and reconcile `.PHONY`.
3. Verify before finishing:
   - All recipe lines are TAB-indented (run `cat -A Makefile | head` or `grep -nP '^ +' Makefile` to catch space-indented recipes — there should be none).
   - `.PHONY` lists exactly the defined targets.
   - `make help` would render every target (each has a `## ` comment, each group has a `##@ `).
4. Report which sections/targets you added or changed and why, and note any documented command you intentionally omitted.
