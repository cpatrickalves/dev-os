#!/bin/bash
# =============================================================================
# Dev-OS Check
# Validates the repo itself: external catalogs, workflow scripts and shell
# scripts. Run before committing; .githooks/pre-commit runs it too.
# =============================================================================
# Usage: ~/dev-os/scripts/check.sh
# Exit status: non-zero when any check fails.

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

source "$SCRIPT_DIR/common-functions.sh"

failures=0

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
# Workflows: compiled, not run. A workflow script has a top-level `return` and
# `export const meta`, so the body is wrapped in an async function first.
# -----------------------------------------------------------------------------

check_workflows() {
    print_status "Workflows"
    if ! command -v node > /dev/null; then
        fail "node not found: workflow syntax was not checked"
        return
    fi
    local file
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

check_catalogs
check_workflows
check_shell

if [ "$failures" -gt 0 ]; then
    print_error "$failures check(s) failed"
    exit 1
fi
print_success "All checks passed"
