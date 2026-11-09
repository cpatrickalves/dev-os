#!/bin/bash
# =============================================================================
# Dev-OS Check
# Validates the repo itself: external catalogs, workflow scripts, tool configs,
# skill and workflow versions, shell scripts and the mods under plugins/
# (validate, tests, types). Run before committing; .githooks/pre-commit runs it
# too, with --staged.
# =============================================================================
# Usage: ~/dev-os/scripts/check.sh [--staged]
#   --staged  check only the mods with staged changes (the rest of the repo is
#             always checked whole: it takes a second), and require a
#             version bump in every skill and workflow the commit changes
# Exit status: non-zero when any check fails.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/common-functions.sh"

failures=0
STAGED_ONLY=false
[ "${1:-}" = "--staged" ] && STAGED_ONLY=true

# A skill's metadata.version and a workflow's version line: quoted semver.
semver_re='^"[0-9]+\.[0-9]+\.[0-9]+"$'

fail() {
    print_error "$1"
    failures=$((failures + 1))
}

# -----------------------------------------------------------------------------
# Catalogs: parsed with the same schema the install scripts use
# -----------------------------------------------------------------------------

check_catalogs() {
    print_status "Catalogs"
    load_plugins_catalog "$BASE_DIR/external-plugins.yaml" > /dev/null || fail "external-plugins.yaml is invalid"
    load_skills_catalog "$BASE_DIR/external-skills.yaml" > /dev/null || fail "external-skills.yaml is invalid"
    load_mods_catalog "$BASE_DIR/external-mods.yaml" > /dev/null || fail "external-mods.yaml is invalid"
}

# -----------------------------------------------------------------------------
# Workflows: each carries a `// version: "X.Y.Z"` line, raised by every commit
# that changes it (with --staged), and is compiled, not run. A workflow script
# has a top-level `return` and `export const meta`, so the body is wrapped in an
# async function first.
# -----------------------------------------------------------------------------

# The raw value (quotes kept) of the `// version: "X.Y.Z"` line of the workflow
# on stdin. It is a comment, not a `meta` key: `meta` is read by Claude Code,
# which documents only name, description, whenToUse and phases.
workflow_version() {
    sed -n 's|^// version:[[:space:]]*||p' | sed 's/[[:space:]]*$//' | head -1
}

check_workflows() {
    print_status "Workflows"
    local file version
    for file in "$BASE_DIR"/workflows/*.js; do
        version=$(workflow_version < "$file")
        [[ "$version" =~ $semver_re ]] || fail "workflows/$(basename "$file"): needs a \`// version: \"X.Y.Z\"\` line after meta (got ${version:-nothing})"
    done
    [ "$STAGED_ONLY" = true ] && check_workflow_bumps
    if ! command -v node > /dev/null; then
        fail "node not found: workflow syntax was not checked"
        return
    fi
    for file in "$BASE_DIR"/workflows/*.js; do
        node -e '
const fs = require("fs"), vm = require("vm")
const src = fs.readFileSync(process.argv[1], "utf8").replace(/^export const meta/m, "const meta")
try {
  new vm.Script(`(async () => {\n${src}\n})`, { filename: process.argv[1] })
} catch (e) {
  console.error(e.message)
  process.exit(1)
}
' "$file" || fail "workflows/$(basename "$file") has a syntax error"
    done
}

# Each workflow with staged changes must raise its version over HEAD's.
check_workflow_bumps() {
    local path old new
    while read -r path; do
        [ -n "$path" ] || continue
        old=$(git -C "$BASE_DIR" show "HEAD:$path" 2>/dev/null | workflow_version)
        new=$(git -C "$BASE_DIR" show ":$path" | workflow_version)
        require_bump "$path" version "$old" "$new"
    done < <(git -C "$BASE_DIR" diff --cached --name-only --diff-filter=M -- 'workflows/*.js')
}

# -----------------------------------------------------------------------------
# Tool configs: the skins mod's made skins and settings, with the mod's rules
# -----------------------------------------------------------------------------

check_configs() {
    print_status "Configs"
    if ! command -v node > /dev/null; then
        fail "node not found: configs/claude-skins was not checked"
        return
    fi
    check_skin_configs "$BASE_DIR/configs/claude-skins" || fail "configs/claude-skins is invalid"
}

# -----------------------------------------------------------------------------
# Shell scripts: bash -n (parse only)
# -----------------------------------------------------------------------------

check_shell() {
    print_status "Shell scripts"
    local file
    for file in "$BASE_DIR"/scripts/*.sh "$BASE_DIR"/hooks/*.sh "$BASE_DIR"/.githooks/*; do
        [ -f "$file" ] || continue
        bash -n "$file" || fail "${file#"$BASE_DIR"/} has a syntax error"
    done
}

# -----------------------------------------------------------------------------
# Skills: every SKILL.md under skills/ carries `metadata.version: "X.Y.Z"`, and
# with --staged a skill whose folder the commit touches must raise it over HEAD.
# -----------------------------------------------------------------------------

# The raw value of `metadata.version` (quotes kept) in the SKILL.md on stdin,
# then `top-level` on a second line when the frontmatter has a bare `version:`.
skill_version() {
    awk '
        NR == 1 && /^---[[:space:]]*$/ { fm = 1; next }
        !fm || /^---[[:space:]]*$/ { exit }
        /^version:/ { top = 1 }
        /^metadata:[[:space:]]*$/ { inmeta = 1; next }
        inmeta && /^[^[:space:]]/ { inmeta = 0 }
        inmeta && !found && /^[[:space:]]+version:/ {
            sub(/^[[:space:]]+version:[[:space:]]*/, ""); sub(/[[:space:]]+$/, "")
            print; found = 1
        }
        END { if (top) print "top-level" }
    '
}

check_skill_versions() {
    print_status "Skills"
    local file name out version
    while IFS= read -r file; do
        name=${file#"$BASE_DIR"/}
        name=${name%/SKILL.md}
        out=$(skill_version < "$file")
        version=$(head -1 <<< "$out")
        grep -qx top-level <<< "$out" && fail "$name: move \`version\` under \`metadata:\`"
        [[ "$version" =~ $semver_re ]] || fail "$name: metadata.version must be \"X.Y.Z\" (got ${version:-nothing})"
    done < <(find "$BASE_DIR/skills" -name SKILL.md | sort)

    [ "$STAGED_ONLY" = true ] && check_skill_bumps
}

# Each skill with staged changes must raise metadata.version over HEAD's. A
# skill new to the commit (or moved), deleted, or without a valid version in
# HEAD has nothing to raise.
check_skill_bumps() {
    local skill_dirs changed dir old new
    skill_dirs=$(git -C "$BASE_DIR" ls-files -- 'skills/*SKILL.md' | sed 's|/SKILL.md$||')
    changed=$(git -C "$BASE_DIR" diff --cached --name-only -- skills/ |
        while read -r path; do
            # The skill a path belongs to is the longest skill folder that prefixes it.
            while read -r dir; do
                [[ "$path" == "$dir"/* ]] && echo "$dir"
            done <<< "$skill_dirs" | awk '{ print length, $0 }' | sort -rn | head -1 | cut -d' ' -f2-
        done | sort -u)
    while read -r dir; do
        [ -n "$dir" ] || continue
        old=$(git -C "$BASE_DIR" show "HEAD:$dir/SKILL.md" 2>/dev/null | skill_version | head -1)
        new=$(git -C "$BASE_DIR" show ":$dir/SKILL.md" | skill_version | head -1)
        require_bump "$dir" metadata.version "$old" "$new"
    done <<< "$changed"
}

# Fails unless the staged version ($4) is above HEAD's ($3); both are quoted
# semver. Nothing to raise when either is not valid semver (new, moved, or
# invalid in HEAD; an invalid staged one is reported by the format check).
require_bump() {
    local name=$1 field=$2 old=$3 new=$4
    [[ "$old" =~ $semver_re && "$new" =~ $semver_re ]] || return 0
    old=${old//\"/}
    new=${new//\"/}
    if [ "$old" = "$new" ] || [ "$(printf '%s\n%s\n' "$old" "$new" | sort -V | tail -1)" != "$new" ]; then
        fail "$name: changed without a version bump: raise $field above $old"
    fi
}

# -----------------------------------------------------------------------------
# Mods: every plugin under plugins/ validated the way the engine reads it, its
# tests run (hooks/*.test.tsx or tests/*.test.ts), and each hooks module
# type-checked against the engine's API plus the contracts of its dependencies.
# -----------------------------------------------------------------------------

# The engine's API types for the running Claude Code: written under its temp
# folder, one file per version, when the plugin-authoring skill loads. Empty
# when this version has not written them yet.
mod_api_types() {
    local version
    version=$(claude --version 2>/dev/null | awk '{print $1}')
    [ -n "$version" ] || return 0
    ls -t "${TMPDIR:-/tmp}"/claude-"$(id -u)"/bundled-skills/"$version"/*/plugin-authoring/types/claude-code.d.ts 2>/dev/null | head -1
}

# Writes to $3 a tsconfig that type-checks the mod in $1 (hooks/ and types/,
# test files aside: `claude plugin test` runs those) against the API types in
# $2 and the `types` contract of each installed plugin its manifest depends on.
write_mod_tsconfig() {
    node -e '
const fs = require("fs"), path = require("path"), os = require("os")
const [dir, api, out] = process.argv.slice(1)
const manifest = JSON.parse(fs.readFileSync(path.join(dir, ".claude-plugin/plugin.json"), "utf8"))
let installed = {}
try {
  installed = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".claude/plugins/installed_plugins.json"), "utf8")).plugins ?? {}
} catch {}
const deps = (manifest.dependencies ?? []).flatMap(id => {
  const at = installed[id]?.[0]?.installPath
  if (!at) return []
  const types = JSON.parse(fs.readFileSync(path.join(at, ".claude-plugin/plugin.json"), "utf8")).types
  return types ? [path.join(at, types)] : []
})
fs.writeFileSync(out, JSON.stringify({
  compilerOptions: {
    target: "es2023", lib: ["es2023"], types: [], module: "esnext", moduleResolution: "bundler",
    strict: true, noUncheckedIndexedAccess: true, noEmit: true, skipLibCheck: true,
    jsx: "react", jsxFactory: "h", jsxFragmentFactory: "Fragment",
  },
  include: [api, ...deps, path.join(dir, "hooks/**/*"), path.join(dir, "types/**/*")],
  exclude: [path.join(dir, "**/*.test.*")],
}))
' "$1" "$2" "$3"
}

# The mod folders to check, one per line: every one under plugins/, or with
# --staged only those the commit touches (a mod takes seconds: tests, tsc).
mod_dirs() {
    if [ "$STAGED_ONLY" = true ]; then
        git -C "$BASE_DIR" diff --cached --name-only -- plugins/ | cut -d/ -f2 | sort -u |
            while read -r name; do [ -d "$BASE_DIR/plugins/$name" ] && echo "$BASE_DIR/plugins/$name"; done
    else
        local dir
        for dir in "$BASE_DIR"/plugins/*/; do echo "${dir%/}"; done
    fi
}

check_mods() {
    print_status "Mods"
    local dirs
    dirs=$(mod_dirs)
    [ -n "$dirs" ] || return 0
    if ! command -v claude > /dev/null; then
        fail "claude not found: plugins/ was not checked"
        return
    fi
    local dir name
    while read -r dir; do
        name=${dir#"$BASE_DIR"/}
        claude plugin validate "$dir" > /dev/null 2>&1 || fail "$name does not validate: claude plugin validate $name"
        if compgen -G "$dir/hooks/*.test.*" > /dev/null || compgen -G "$dir/tests/*.test.*" > /dev/null; then
            claude plugin test "$dir" > /dev/null 2>&1 || fail "$name has failing tests: claude plugin test $name"
        fi
    done <<< "$dirs"

    local api
    api=$(mod_api_types)
    if [ -z "$api" ]; then
        print_warning "Mod types not checked: this Claude Code version has no API types yet (load the plugin-authoring skill once to write them)"
        return
    fi
    if ! command -v node > /dev/null || ! command -v npx > /dev/null; then
        fail "node/npx not found: mod types were not checked"
        return
    fi
    local tmp
    tmp=$(mktemp -d)
    while read -r dir; do
        [ -f "$dir/hooks/hooks.json" ] || continue
        name=${dir#"$BASE_DIR"/}
        write_mod_tsconfig "$dir" "$api" "$tmp/tsconfig.json"
        npx -y -p typescript@5 tsc -p "$tmp/tsconfig.json" > "$tmp/out" 2>&1 || {
            grep 'error TS' "$tmp/out" | sed "s|^$BASE_DIR/||"
            fail "$name has type errors"
        }
    done <<< "$dirs"
    rm -rf "$tmp"
}

check_catalogs
check_workflows
check_configs
check_skill_versions
check_shell
check_mods

if [ "$failures" -gt 0 ]; then
    print_error "$failures check(s) failed"
    exit 1
fi
print_success "All checks passed"
