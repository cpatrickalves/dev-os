#!/bin/bash

# =============================================================================
# Dev-OS Install Plugins Script
# Pick Claude plugins / skills from a curated catalog and install or update them
# =============================================================================
#
# Selection uses the same shared keyboard picker as import-skills.sh
# (select_items in common-functions.sh): ↑/↓ navigate, Space toggle,
# a all, n none, Enter confirm, q quit.
#
# Execution policy: for every selected entry, always try the *update*
# command first. Only if that fails (non-zero exit) do we run the
# one-time setup (e.g. `claude plugin marketplace add`) and then install.
# A never-installed plugin's update naturally fails, which falls through
# to install — so the same flow both installs and updates.
#
# EXCEPTION — npx-skills entries: `npx skills update <pkg>` exits 0 with
# "No installed skills found" when the package was never added, so it
# never falls through to install. `npx skills add` is idempotent (it
# re-copies files, acting as both install and update), so npx-skills
# entries use the `add` command in BOTH the update and install slots.

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Source common functions
source "$SCRIPT_DIR/common-functions.sh"

# -----------------------------------------------------------------------------
# Default Values
# -----------------------------------------------------------------------------

VERBOSE="false"
INSTALL_ALL="false"

# Parallel catalog arrays (bash 3.2: no associative arrays).
# Command strings are hardcoded here and run via `eval`, never built from
# user input, so eval is safe. `'*'` stays literal through eval re-parse.
declare -a PLUGIN_NAMES
declare -a PLUGIN_DESCS
declare -a PLUGIN_SETUP    # one-time prerequisite (marketplace add), may be ""
declare -a PLUGIN_UPDATE   # tried first
declare -a PLUGIN_INSTALL  # fallback when update fails
declare -a SELECTED_PLUGINS

# -----------------------------------------------------------------------------
# Plugin Catalog
# -----------------------------------------------------------------------------
#
# npx-skills entries carry `--yes` so update/add run non-interactively under
# the picker-driven flow (the original notes omitted it on a few lines).

add_plugin() {
    PLUGIN_NAMES+=("$1")
    PLUGIN_DESCS+=("$2")
    PLUGIN_SETUP+=("$3")
    PLUGIN_UPDATE+=("$4")
    PLUGIN_INSTALL+=("$5")
}

define_catalog() {
    PLUGIN_NAMES=(); PLUGIN_DESCS=(); PLUGIN_SETUP=(); PLUGIN_UPDATE=(); PLUGIN_INSTALL=()

    add_plugin "github" \
        "GitHub plugin (official, global)" \
        "" \
        "claude plugin update github@claude-plugins-official" \
        "claude plugin install github@claude-plugins-official"

    add_plugin "claude-md-management" \
        "CLAUDE.md management (official, user scope)" \
        "" \
        "claude plugin update claude-md-management@claude-plugins-official" \
        "claude plugin install claude-md-management@claude-plugins-official --scope user"

    add_plugin "skill-creator" \
        "Skill scaffolding helper (user scope)" \
        "" \
        "claude plugin update skill-creator" \
        "claude plugin install skill-creator -s user"

    # npx-skills: `add` is idempotent and used for update too (see header note).

    add_plugin "compound-engineering" \
        "Compound Engineering pipeline (every-marketplace, user scope)" \
        "claude plugin marketplace add EveryInc/compound-engineering-plugin" \
        "claude plugin marketplace update every-marketplace && claude plugin update compound-engineering@every-marketplace" \
        "claude plugin install compound-engineering@every-marketplace --scope user"

    add_plugin "andrej-karpathy-skills" \
        "Andrej Karpathy guideline skills" \
        "claude plugin marketplace add multica-ai/andrej-karpathy-skills" \
        "claude plugin update andrej-karpathy-skills@karpathy-skills" \
        "claude plugin install andrej-karpathy-skills@karpathy-skills"

    add_plugin "mattpocock-skills" \
        "Matt Pocock skills (npx skills, global)" \
        "" \
        "npx skills@latest add mattpocock/skills --agent claude-code --global --yes" \
        "npx skills@latest add mattpocock/skills --agent claude-code --global --yes"

    add_plugin "pyright-lsp" \
        "Python Pyright LSP (official, project scope)" \
        "" \
        "claude plugin update pyright-lsp@claude-plugins-official" \
        "claude plugin install pyright-lsp@claude-plugins-official --scope project"

    add_plugin "typescript-lsp" \
        "TypeScript LSP (official, project scope)" \
        "" \
        "claude plugin update typescript-lsp@claude-plugins-official" \
        "claude plugin install typescript-lsp@claude-plugins-official --scope project"

    add_plugin "langchain-skills" \
        "LangChain skills (npx skills, project scope)" \
        "" \
        "npx skills@latest add langchain-ai/langchain-skills --agent claude-code --skill '*' --project --yes" \
        "npx skills@latest add langchain-ai/langchain-skills --agent claude-code --skill '*' --project --yes"

    add_plugin "shadcn-ui" \
        "shadcn/ui skills (npx skills, project scope)" \
        "" \
        "npx skills@latest add shadcn/ui --agent claude-code --skill '*' --yes --project" \
        "npx skills@latest add shadcn/ui --agent claude-code --skill '*' --yes --project"

    add_plugin "frontend-slides" \
        "Frontend slides plugin (project scope)" \
        "claude plugin marketplace add zarazhangrui/frontend-slides" \
        "claude plugin update frontend-slides@frontend-slides" \
        "claude plugin install frontend-slides@frontend-slides --scope project"
}

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Pick Claude plugins/skills from a curated catalog and install or update them.
Each selected entry is updated first; if that fails it is installed.

Options:
    --all              Select every plugin (skip the interactive picker)
    --verbose          Show command output (default: only on failure/fallback)
    -h, --help         Show this help message

Examples:
    $0
    $0 --all
    $0 --all --verbose

EOF
    exit 0
}

# -----------------------------------------------------------------------------
# Parse Command Line Arguments
# -----------------------------------------------------------------------------

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                INSTALL_ALL="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                print_error "Unknown option: $1"
                show_help
                ;;
        esac
    done
}

# -----------------------------------------------------------------------------
# Validation
# -----------------------------------------------------------------------------

validate_environment() {
    if ! command -v claude >/dev/null 2>&1; then
        print_error "The 'claude' CLI was not found on PATH."
        exit 1
    fi
    if ! command -v npx >/dev/null 2>&1; then
        print_warning "'npx' not found; npx-skills entries will fail if selected."
    fi
    print_verbose "Catalog contains ${#PLUGIN_NAMES[@]} plugins"
}

# -----------------------------------------------------------------------------
# Selection
# -----------------------------------------------------------------------------

select_plugins() {
    if [[ "$INSTALL_ALL" == "true" ]]; then
        SELECTED_PLUGINS=()
        local n=${#PLUGIN_NAMES[@]}
        local i
        for ((i=0; i<n; i++)); do
            SELECTED_PLUGINS+=("$i")
        done
        print_verbose "Selected all ${#SELECTED_PLUGINS[@]} plugins"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    PICKER_NAMES=("${PLUGIN_NAMES[@]}")
    PICKER_DESCS=("${PLUGIN_DESCS[@]}")
    PICKER_NOUN="plugins"
    select_items

    SELECTED_PLUGINS=("${PICKER_SELECTED[@]}")
    print_verbose "Selected ${#SELECTED_PLUGINS[@]} plugins"
}

# -----------------------------------------------------------------------------
# Install / Update Execution
# -----------------------------------------------------------------------------

# Update first; on failure run one-time setup then install.
# Every `eval` sits in an `if` condition so a non-zero exit never trips
# the script-level `set -e`.
install_one() {
    local idx=$1
    local name="${PLUGIN_NAMES[$idx]}"
    local setup="${PLUGIN_SETUP[$idx]}"
    local update="${PLUGIN_UPDATE[$idx]}"
    local install="${PLUGIN_INSTALL[$idx]}"

    local redir=' >/dev/null 2>&1'
    [[ "$VERBOSE" == "true" ]] && redir=''

    print_status "→ ${name}: trying update..."
    if eval "${update}${redir}"; then
        print_success "${name}: updated"
        return 0
    fi

    print_warning "${name}: update failed — installing"
    if [[ -n "$setup" ]]; then
        eval "${setup}${redir}" || true
    fi
    if eval "$install"; then
        print_success "${name}: installed"
        return 0
    fi

    print_error "${name}: install failed"
    return 1
}

execute_install() {
    local failed=()
    local ok=0
    local idx
    for idx in "${SELECTED_PLUGINS[@]}"; do
        if install_one "$idx"; then
            ok=$((ok + 1))
        else
            failed+=("${PLUGIN_NAMES[$idx]}")
        fi
    done

    echo ""
    print_success "$ok plugin(s) installed/updated"
    if [[ ${#failed[@]} -gt 0 ]]; then
        print_error "${#failed[@]} failed:"
        local f
        for f in "${failed[@]}"; do
            echo "    - $f"
        done
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Install Plugins"

    parse_arguments "$@"
    define_catalog
    validate_environment

    echo ""
    print_status "Available plugins: ${#PLUGIN_NAMES[@]}"
    echo ""

    select_plugins

    echo ""
    print_status "Install summary:"
    echo "  Plugins to install/update: ${#SELECTED_PLUGINS[@]}"
    echo ""

    execute_install

    echo ""
}

# Run main function
main "$@"
