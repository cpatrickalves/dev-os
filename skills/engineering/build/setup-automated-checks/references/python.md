# Python: ruff, mypy, pytest

Stack: **uv** (dependencies and lockfile), **ruff** (lint and format), **mypy strict** (types), **pytest** with **coverage** (tests). Everything lives in `pyproject.toml`, so there is one file to read and one place for versions (`uv.lock`).

Run every command from the component directory (`api/` in a monorepo, the root otherwise).

## Install

```bash
uv add --dev ruff mypy pytest pytest-cov
# add when the project uses them:
uv add --dev pytest-asyncio          # async tests
uv add --dev pytest-randomly         # fails tests that depend on order (lie detector)
uv add --dev pydantic                # already there in FastAPI projects; enables the mypy plugin below
```

Pin the interpreter once: `.python-version` (read by uv) must agree with `requires-python`. mypy's `python_version` is derived from the environment, so leave it out unless the project supports several versions.

Missing stubs show up on the first mypy run as `Library stubs not installed for "x"`; add the `types-x` package it names with `uv add --dev`.

## Config (`pyproject.toml`)

```toml
[tool.ruff]
# line-length: keep the project's existing value; ruff's default (88) when there is none.
extend-exclude = ["migrations"]        # generated code: alembic/, migrations/ … adapt

[tool.ruff.lint]
select = [
  "E", "W", "F",   # pycodestyle + pyflakes
  "I",             # isort
  "UP",            # pyupgrade: modern syntax for the target version
  "B",             # bugbear: likely bugs (mutable defaults, unused loop vars…)
  "SIM",           # simplify
  "C4",            # comprehensions
  "PT",            # pytest style: assert shapes, fixture decorators, useless asserts
  "RUF",           # ruff's own rules (unused noqa, implicit Optional…)
  "ARG",           # unused arguments
  "T20",           # print() left behind — services log, they do not print
  "ERA",           # commented-out code
  "S",             # bandit subset: subprocess shell, hardcoded passwords, assert in prod code
  "TC",            # type-checking imports
  "N",             # pep8 naming (drop if the project's domain naming conflicts)
]
ignore = ["E501"]  # formatter owns line length

[tool.ruff.lint.per-file-ignores]
"tests/**" = ["S101", "S106", "ARG"]   # asserts, fake passwords and unused fixture args are fine in tests
"**/conftest.py" = ["ARG"]

[tool.ruff.lint.isort]
known-first-party = ["app"]            # adapt: the package name

[tool.ruff.format]
docstring-code-format = true

[tool.mypy]
strict = true
warn_unreachable = true
pretty = true
# plugins = ["pydantic.mypy"]          # when pydantic is a dependency
# exclude = ["^migrations/"]

[[tool.mypy.overrides]]
module = ["tests.*"]
disallow_untyped_decorators = false    # pytest decorators are untyped; everything else stays strict

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-ra --strict-markers --strict-config"
xfail_strict = true                    # an xfail that passes is a failure: the test was lying about the bug
filterwarnings = ["error"]             # a warning is a future failure; silence specific ones explicitly below
# filterwarnings = ["error", "ignore::DeprecationWarning:somelib.*"]
markers = ["integration: needs the database"]
# asyncio_mode = "auto"                # with pytest-asyncio

[tool.coverage.run]
branch = true
source = ["app"]                       # adapt
omit = ["*/migrations/*"]

[tool.coverage.report]
show_missing = true
skip_covered = true
# No fail_under: coverage is a report the team reads, not a gate that blocks a PR.
```

Why the pytest block matters: `--strict-markers` rejects misspelled markers that would silently deselect tests, `--strict-config` rejects typos in this very section, `xfail_strict` and `filterwarnings = error` turn two common ways of hiding failures into failures. In an existing suite, `filterwarnings = ["error"]` is the line most likely to go red; see `existing-projects.md` before loosening it.

## Canonical commands

| Purpose | Command |
|---|---|
| lint | `uv run ruff check .` |
| format check | `uv run ruff format --check .` |
| fix + format (mutates) | `uv run ruff check --fix . && uv run ruff format .` |
| types | `uv run mypy .` |
| tests + coverage | `uv run pytest --cov --cov-report=term-missing` |
| lockfile in sync | `uv lock --check` |
| coverage for the CI summary | `uv run coverage report --format=markdown` |

Tests that hit PostgreSQL run against a real, disposable database (compose service locally, a service container in CI), never a stubbed session. The connection string comes from an env var with a test default in `conftest.py`.

## Docker-only projects

When the project runs everything through Compose, the same commands run inside the api container: `docker compose -f compose.yaml -f compose.dev.yaml run --rm --no-deps api uv run ruff check .`. Define them once in the Makefile (`API_NO_DB = …`) and let hooks and CI call the targets.
