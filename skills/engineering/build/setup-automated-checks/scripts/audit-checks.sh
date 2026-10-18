#!/usr/bin/env bash
# Audit a project's deterministic checks and review files. Read-only.
# Usage: audit-checks.sh [project-dir]   (default: current directory)
# Prints a Markdown report: components, package managers, tool configs, hooks, CI, repo files, local tools.
set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT" || { echo "cannot cd to $ROOT" >&2; exit 1; }

PRUNE='-name node_modules -o -name .venv -o -name venv -o -name .git -o -name dist -o -name build -o -name .next -o -name __pycache__ -o -name .tox -o -name .mypy_cache -o -name .ruff_cache -o -name coverage -o -name htmlcov'

# find_files <maxdepth> <name pattern>  -> relative paths, pruned, sorted
find_files() {
  local depth="$1" pattern="$2"
  # shellcheck disable=SC2086
  find . -maxdepth "$depth" \( $PRUNE \) -prune -o -type f -name "$pattern" -print 2>/dev/null | sed 's|^\./||' | sort
}
# find_dirs <maxdepth> <name>
find_dirs() {
  local depth="$1" name="$2"
  # shellcheck disable=SC2086
  find . -maxdepth "$depth" \( $PRUNE \) -prune -o -type d -name "$name" -print 2>/dev/null | sed 's|^\./||' | sort
}
yn() { if [ -n "$1" ]; then echo "yes ($1)"; else echo "no"; fi; }
has_key() { # has_key <file> <regex>
  [ -f "$1" ] && grep -Eq "$2" "$1"
}
row() { printf '| %s | %s |\n' "$1" "$2"; }
default_branch() {
  local b
  b=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||') && [ -n "$b" ] && { echo "$b"; return; }
  b=$(git symbolic-ref --short HEAD 2>/dev/null) && [ -n "$b" ] && { echo "$b (current)"; return; }
  echo "unknown"
}

echo "# Automated checks audit"
echo
echo "Project: \`$(pwd)\`"
echo

# ---------- Components ----------
echo "## Components"
echo
PY_MANIFESTS=$(find_files 3 'pyproject.toml'; find_files 3 'setup.py'; find_files 3 'requirements*.txt')
TS_MANIFESTS=$(find_files 3 'package.json')
PY_COUNT=$(find . \( -name node_modules -o -name .venv -o -name venv -o -name .git \) -prune -o -type f -name '*.py' -print 2>/dev/null | wc -l | tr -d ' ')
TS_COUNT=$(find . \( -name node_modules -o -name .venv -o -name venv -o -name .git -o -name dist \) -prune -o -type f \( -name '*.ts' -o -name '*.tsx' \) -print 2>/dev/null | wc -l | tr -d ' ')
echo "| Signal | Found |"
echo "|---|---|"
row "Python manifests" "$(echo "$PY_MANIFESTS" | grep -v '^$' | tr '\n' ' ' | sed 's/ $//')"
row "Python files (*.py)" "$PY_COUNT"
row "JS/TS manifests" "$(echo "$TS_MANIFESTS" | grep -v '^$' | tr '\n' ' ' | sed 's/ $//')"
row "TypeScript files (*.ts, *.tsx)" "$TS_COUNT"
row "Monorepo hints" "$(for d in apps packages api web backend frontend services; do [ -d "$d" ] && printf '%s ' "$d"; done)"
echo

# ---------- Package managers ----------
echo "## Package managers and runtimes"
echo
echo "| Signal | Found |"
echo "|---|---|"
row "uv.lock" "$(yn "$(find_files 3 'uv.lock' | tr '\n' ' ')")"
row "poetry.lock" "$(yn "$(find_files 3 'poetry.lock' | tr '\n' ' ')")"
row "Pipfile" "$(yn "$(find_files 3 'Pipfile' | tr '\n' ' ')")"
row ".python-version" "$(yn "$(find_files 3 '.python-version' | tr '\n' ' ')")"
row "pnpm-lock.yaml" "$(yn "$(find_files 3 'pnpm-lock.yaml' | tr '\n' ' ')")"
row "yarn.lock" "$(yn "$(find_files 3 'yarn.lock' | tr '\n' ' ')")"
row "package-lock.json" "$(yn "$(find_files 3 'package-lock.json' | tr '\n' ' ')")"
row "bun.lock(b)" "$(yn "$(find_files 3 'bun.lock*' | tr '\n' ' ')")"
row ".nvmrc / .node-version" "$(yn "$( (find_files 3 '.nvmrc'; find_files 3 '.node-version') | tr '\n' ' ')")"
for pj in $TS_MANIFESTS; do
  pm=$(grep -Eo '"packageManager" *: *"[^"]+"' "$pj" 2>/dev/null | head -1 | sed 's/.*: *"//; s/"$//')
  [ -n "$pm" ] && row "packageManager ($pj)" "$pm"
done
echo

# ---------- Tool configs ----------
echo "## Tool configuration"
echo
echo "| Tool | Found |"
echo "|---|---|"
# Python
PYPROJ_ALL=$(find_files 3 'pyproject.toml')
ruff=""; mypy=""; pyright=""; black=""; isort=""; flake8=""; pytest=""; cov=""; pytest_strict=""
for f in $PYPROJ_ALL; do
  has_key "$f" '^\[tool\.ruff' && ruff="$ruff $f"
  has_key "$f" '^\[tool\.mypy' && mypy="$mypy $f"
  has_key "$f" '^\[tool\.pyright' && pyright="$pyright $f"
  has_key "$f" '^\[tool\.black' && black="$black $f"
  has_key "$f" '^\[tool\.isort' && isort="$isort $f"
  has_key "$f" '^\[tool\.pytest' && pytest="$pytest $f"
  has_key "$f" '^\[tool\.coverage' && cov="$cov $f"
  has_key "$f" 'strict-markers|xfail_strict|filterwarnings' && pytest_strict="$pytest_strict $f"
done
ruff="$ruff $(find_files 3 'ruff.toml' | tr '\n' ' ')$(find_files 3 '.ruff.toml' | tr '\n' ' ')"
mypy="$mypy $(find_files 3 'mypy.ini' | tr '\n' ' ')"
pyright="$pyright $(find_files 3 'pyrightconfig.json' | tr '\n' ' ')"
flake8="$(find_files 3 '.flake8' | tr '\n' ' ')$(find_files 3 'tox.ini' | tr '\n' ' ')$(find_files 3 'setup.cfg' | tr '\n' ' ')"
pytest="$pytest $(find_files 3 'pytest.ini' | tr '\n' ' ')$(find_files 3 'conftest.py' | tr '\n' ' ')"
cov="$cov $(find_files 3 '.coveragerc' | tr '\n' ' ')"
row "ruff" "$(yn "$(echo "$ruff" | xargs)")"
row "mypy" "$(yn "$(echo "$mypy" | xargs)")"
row "pyright" "$(yn "$(echo "$pyright" | xargs)")"
row "black / isort / flake8 (legacy)" "$(yn "$(echo "$black $isort $flake8" | xargs)")"
row "pytest" "$(yn "$(echo "$pytest" | xargs)")"
row "pytest lie detectors (strict-markers, xfail_strict, filterwarnings)" "$(yn "$(echo "$pytest_strict" | xargs)")"
row "coverage.py" "$(yn "$(echo "$cov" | xargs)")"
row "import-linter / vulture / deptry" "$(yn "$( for f in $PYPROJ_ALL; do grep -Eo '^\[tool\.(importlinter|vulture|deptry)' "$f" | sed "s|^|$f:|"; done | tr '\n' ' ')")"
# TypeScript
biome=$( (find_files 3 'biome.json'; find_files 3 'biome.jsonc') | tr '\n' ' ')
eslint=$( (find_files 3 'eslint.config.*'; find_files 3 '.eslintrc*') | tr '\n' ' ')
prettier=$( (find_files 3 '.prettierrc*'; find_files 3 'prettier.config.*') | tr '\n' ' ')
tsconfigs=$(find_files 3 'tsconfig*.json')
strict_ts=""
for f in $tsconfigs; do has_key "$f" '"strict" *: *true' && strict_ts="$strict_ts $f"; done
vitest=$(find_files 3 'vitest.config.*' | tr '\n' ' ')
jest=$( (find_files 3 'jest.config.*') | tr '\n' ' ')
playwright=$(find_files 3 'playwright.config.*' | tr '\n' ' ')
knip=$( (find_files 3 'knip.json'; find_files 3 'knip.jsonc'; find_files 3 'knip.config.*') | tr '\n' ' ')
depcruise=$(find_files 3 '.dependency-cruiser.*' | tr '\n' ' ')
row "Biome" "$(yn "$(echo "$biome" | xargs)")"
row "ESLint" "$(yn "$(echo "$eslint" | xargs)")"
row "Prettier" "$(yn "$(echo "$prettier" | xargs)")"
row "tsconfig" "$(yn "$(echo "$tsconfigs" | tr '\n' ' ' | xargs)")"
row "tsconfig with strict: true" "$(yn "$(echo "$strict_ts" | xargs)")"
row "Vitest" "$(yn "$(echo "$vitest" | xargs)")"
row "Jest" "$(yn "$(echo "$jest" | xargs)")"
row "Playwright" "$(yn "$(echo "$playwright" | xargs)")"
row "knip" "$(yn "$(echo "$knip" | xargs)")"
row "dependency-cruiser" "$(yn "$(echo "$depcruise" | xargs)")"
echo
for pj in $TS_MANIFESTS; do
  scripts=$(grep -Eo '"(lint|format|fmt|typecheck|type-check|check|test|test:[a-z]+|build|prepare)" *:' "$pj" 2>/dev/null | sed 's/" *:$//; s/"//' | tr '\n' ' ')
  [ -n "$scripts" ] && echo "- \`$pj\` scripts: $scripts"
done
echo

# ---------- Hooks ----------
echo "## Git hooks"
echo
echo "| Signal | Found |"
echo "|---|---|"
row ".pre-commit-config.yaml" "$(yn "$(find_files 2 '.pre-commit-config.yaml' | tr '\n' ' ')")"
row ".husky/" "$(yn "$(find_dirs 3 '.husky' | tr '\n' ' ')")"
row "lefthook" "$(yn "$(find_files 3 'lefthook.y*ml' | tr '\n' ' ')")"
ls_cfg=$( (find_files 3 '.lintstagedrc*'; find_files 3 'lint-staged.config.*') | tr '\n' ' ')
for pj in $TS_MANIFESTS; do has_key "$pj" '"lint-staged"' && ls_cfg="$ls_cfg $pj"; done
row "lint-staged config" "$(yn "$(echo "$ls_cfg" | xargs)")"
row "git core.hooksPath" "$(git config core.hooksPath 2>/dev/null || echo "unset")"
row "hooks installed in .git/hooks" "$(for h in .git/hooks/*; do [ -f "$h" ] && case "$h" in *.sample) ;; *) printf '%s ' "${h##*/}";; esac; done)"
echo

# ---------- CI ----------
echo "## CI"
echo
echo "| Signal | Found |"
echo "|---|---|"
row "GitHub workflows" "$(for w in .github/workflows/*.y*ml; do [ -f "$w" ] && printf '%s ' "$w"; done)"
row ".gitlab-ci.yml" "$(yn "$( [ -f .gitlab-ci.yml ] && echo .gitlab-ci.yml)")"
row "Dependabot / Renovate" "$(yn "$( (ls .github/dependabot.y*ml renovate.json .renovaterc* 2>/dev/null) | tr '\n' ' ')")"
row "git remote" "$(git remote get-url origin 2>/dev/null || echo "none")"
row "default branch" "$(default_branch)"
echo
for wf in .github/workflows/*.y*ml; do
  [ -f "$wf" ] || continue
  echo "- \`$wf\`: shell-bash=$(grep -Eq 'shell: *bash' "$wf" && echo yes || echo no), concurrency=$(grep -Eq '^concurrency:' "$wf" && echo yes || echo no), unpinned-actions=$(grep -Eo 'uses: *[^ ]+@(main|master|latest)' "$wf" | wc -l | tr -d ' '), jobs=$(awk '/^jobs:/{f=1; next} f && /^[^ #]/{f=0} f && /^  [A-Za-z0-9_-]+:/{sub(/:.*/,""); gsub(/ /,""); printf "%s,", $0}' "$wf" | sed 's/,$//')"
done
echo

# ---------- Repository files ----------
echo "## Repository files"
echo
echo "| File | Found |"
echo "|---|---|"
for f in CODING_STANDARDS.md CONTRIBUTING.md AGENTS.md CLAUDE.md GLOSSARY.md .editorconfig Makefile README.md .env.example compose.yaml docker-compose.yml Dockerfile; do
  if [ -f "$f" ]; then
    row "$f" "yes ($(wc -l < "$f" | tr -d ' ') lines)"
  else
    row "$f" "no"
  fi
done
row "Dockerfiles (depth 3)" "$(find_files 3 'Dockerfile*' | tr '\n' ' ')"
echo
if [ -f Makefile ]; then
  echo "Makefile targets: $(grep -Eo '^[a-zA-Z0-9_-]+:' Makefile | tr -d ':' | sort -u | tr '\n' ' ')"
  echo
fi
for f in AGENTS.md CLAUDE.md; do
  if [ -f "$f" ]; then
    n=$(grep -Eic 'standard|convention|always|never|must' "$f" || true)
    echo "- \`$f\`: $(wc -l < "$f" | tr -d ' ') lines, $n lines mentioning standard/convention/always/never/must (candidates to move to CODING_STANDARDS.md when high)"
  fi
done
echo

# ---------- Local tools ----------
echo "## Tools available on this machine"
echo
out=""
for t in uv python3 pnpm npm yarn bun node docker pre-commit gh actionlint shellcheck biome ruff mypy make; do
  if command -v "$t" >/dev/null 2>&1; then out="$out $t"; else out="$out ~~$t~~"; fi
done
echo "$out"
echo
echo "(struck through = not on PATH; project-local binaries via \`uv run\` / \`pnpm exec\` still work)"
