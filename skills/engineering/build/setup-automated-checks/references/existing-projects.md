# Existing projects: measure, fix, baseline, ratchet

Turning strict checks on in a living codebase produces hundreds of findings. Fixing them all before anything is enforced never finishes; enforcing nothing keeps the slop coming. The path between the two: measure, apply the mechanical fixes, baseline the rest, and add a ratchet so the baseline only shrinks.

## 1. Measure

Run each tool with the target config and keep the counts per rule:

```bash
uv run ruff check . --statistics          # findings per rule code
uv run ruff format --check . | tail -1    # files that would change
uv run mypy . | tail -1                   # "Found N errors in M files"
uv run pytest -x -q 2>&1 | tail -3        # first failure with filterwarnings=error
pnpm biome check . 2>&1 | tail -5         # "Found N errors / N warnings"
pnpm tsc -b --noEmit 2>&1 | grep -c 'error TS'
```

Record these numbers in the final report: they are the baseline the ratchet protects.

## 2. Mechanical fixes, one commit, no behaviour change

```bash
uv run ruff check --fix .                 # safe fixes only
uv run ruff format .
pnpm biome check --write .
```

Commit as `chore: aplica correções automáticas do ruff e biome` (in the project's language) before any manual change, so the review of the real work is not buried under reformatting. `ruff check --fix --unsafe-fixes` is a second, separate commit, after reading what it would change (`--diff`).

## 3. Baseline what remains

Pick per tool, smallest blast radius first:

| Tool | Baseline mechanism | Ratchet |
|---|---|---|
| ruff | `uv run ruff check --add-noqa` writes a `# noqa: CODE` on every current violation (deterministic, reviewable) | `git grep -c 'noqa:' \| wc -l` must not grow; or per-rule: remove the rule from `select` into an `extend-select` TODO list with the count |
| ruff, whole directories | `[tool.ruff.lint.per-file-ignores] "legacy/**" = ["ARG", "S"]` | shrink the glob as modules are migrated |
| mypy | `[[tool.mypy.overrides]] module = ["app.legacy.*"] ignore_errors = true`, or keep `strict` off globally and list migrated modules under `strict = true` overrides | the module list only grows; `mypy --strict` on new modules is required by review |
| pytest `filterwarnings = error` | start with `["error", "ignore::DeprecationWarning:thirdparty.*"]`, one ignore per source, each with a comment naming the issue | remove ignores as libraries are upgraded |
| Biome | `"overrides": [{ "includes": ["src/legacy/**"], "linter": { "rules": { "suspicious": { "noExplicitAny": "off" } } } }]` | shrink the override's `includes` |
| tsc strict flags | enable `strict` in a `tsconfig.strict.json` that `include`s only migrated folders and runs as a second `typecheck:strict` script; or enable the flag and fix per file with `// @ts-expect-error TODO(strict)` | `git grep -c 'TODO(strict)'` must not grow |
| Coverage | nothing: it is a report | |

Write the baseline down in the config itself (a comment with the date and the count) and in the final report. A baseline nobody can see becomes permanent.

A ratchet script is ten lines and belongs in `make check` or CI:

```bash
# scripts/ratchet.sh — fails when the suppression count grows
max=$(cat .ratchet/noqa.max)
now=$(git grep -c 'noqa:' -- '*.py' | awk -F: '{s+=$2} END {print s+0}')
[ "$now" -le "$max" ] || { echo "noqa count grew: $now > $max"; exit 1; }
```

Lower `.ratchet/noqa.max` in the same PR that removes suppressions.

## 4. Tool conflicts

| Found | Proposed | Default | Migration when the user picks it |
|---|---|---|---|
| black + isort + flake8 | ruff | migrate (ruff replaces all three, reads black's `line-length`) | map flake8 plugins to ruff rule groups (`flake8-bugbear` → `B`, `flake8-simplify` → `SIM`, …), delete the old configs and dev deps in the same PR |
| pyright | mypy strict | **keep pyright**, set `typeCheckingMode = "strict"` | the gate is strict types, the tool is secondary; two type checkers disagree forever |
| ESLint + Prettier | Biome | keep in a large codebase with custom ESLint plugins; migrate otherwise | `pnpm biome migrate eslint --write && pnpm biome migrate prettier --write`, review the generated config, remove the old packages |
| Jest | Vitest | **keep Jest** when the suite is green; Vitest for new packages | `vitest` reads most Jest configs; migrate per package, never mid-sprint |
| Husky with slow hooks | split pre-commit / pre-push | move typecheck and tests to `.husky/pre-push` | |
| Custom shell CI | GitHub Actions jobs | wrap the existing commands first, replace later | |

## 5. Hooks in a team

Hooks live in each clone. `make setup` installs them and the README's "Como rodar" says to run it; CI is the gate that does not depend on anyone's clone. Never add hooks that need tools the README does not list as prerequisites.

## 6. Monorepos

One config per component (its `pyproject.toml`, its `biome.json`), one `.pre-commit-config.yaml` and one Makefile at the root, one CI job per component. All jobs run on every PR; filtering by path breaks required checks.
