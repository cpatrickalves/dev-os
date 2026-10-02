#!/bin/bash

# =============================================================================
# Dev-OS Install Plugins Script
# Pick Claude plugins from external-plugins.yaml and install or update them
# =============================================================================
#
# Selection uses the same shared keyboard picker as import-skills.sh
# (select_items in common-functions.sh): ↑/↓ navigate, Space toggle,
# a all, n none, Enter confirm, q quit.
#
# Catalog: external-plugins.yaml at the Dev-OS root (see its header for
# the fields). Commands are built from those fields, never read from the
# file, and run as argv arrays — no eval.
#
# Execution policy: for every selected entry, always try the *update*
# first (refreshing its marketplace when it has a marketplace_source).
# Only if that fails (non-zero exit) do we add the marketplace and then
# install. A never-installed plugin's update naturally fails, which falls
# through to install — so the same flow both installs and updates.

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

CATALOG_FILE="$BASE_DIR/external-plugins.yaml"

# Parallel catalog arrays (bash 3.2: no associative arrays).
declare -a PLUGIN_NAMES
declare -a PLUGIN_DESCS
declare -a PLUGIN_MARKETPLACES
declare -a PLUGIN_SOURCES  # marketplace_source, may be ""
declare -a PLUGIN_SCOPES
declare -a SELECTED_PLUGINS

# -----------------------------------------------------------------------------
# Plugin Catalog
# -----------------------------------------------------------------------------

load_plugins() {
    PLUGIN_NAMES=(); PLUGIN_DESCS=(); PLUGIN_MARKETPLACES=(); PLUGIN_SOURCES=(); PLUGIN_SCOPES=()

    local records
    records="$(load_catalog "$CATALOG_FILE" plugins \
        name,description,marketplace,marketplace_source,scope \
        name,description,marketplace,scope)" || exit 1

    local name desc marketplace source scope
    while IFS="$CATALOG_SEP" read -r name desc marketplace source scope; do
        [[ -z "$name" ]] && continue
        case "$scope" in
            user|project|local) ;;
            *)
                print_error "$CATALOG_FILE: $name: invalid scope \"$scope\" (user, project or local)"
                exit 1
                ;;
        esac
        # Relative paths resolve against the Dev-OS root, not the target project.
        case "$source" in
            .|./*|../*) source="$BASE_DIR/${source#./}"; source="${source%/.}" ;;
        esac
        PLUGIN_NAMES+=("$name")
        PLUGIN_DESCS+=("$desc ($scope)")
        PLUGIN_MARKETPLACES+=("$marketplace")
        PLUGIN_SOURCES+=("$source")
        PLUGIN_SCOPES+=("$scope")
    done <<< "$records"

    print_verbose "Catalog contains ${#PLUGIN_NAMES[@]} plugins"
    if [[ ${#PLUGIN_NAMES[@]} -eq 0 ]]; then
        print_error "No plugins found in $CATALOG_FILE"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Pick Claude plugins from external-plugins.yaml and install or update them.
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

# Run a command, hiding its output unless --verbose.
run_quiet() {
    if [[ "$VERBOSE" == "true" ]]; then
        "$@"
    else
        "$@" >/dev/null 2>&1
    fi
}

# Update first; on failure add the marketplace then install.
# Every command sits in an `if` condition so a non-zero exit never trips
# the script-level `set -e`.
install_one() {
    local idx=$1
    local name="${PLUGIN_NAMES[$idx]}"
    local marketplace="${PLUGIN_MARKETPLACES[$idx]}"
    local source="${PLUGIN_SOURCES[$idx]}"
    local scope="${PLUGIN_SCOPES[$idx]}"
    local ref="$name@$marketplace"

    print_status "→ ${name}: trying update..."
    if [[ -n "$source" ]]; then
        run_quiet claude plugin marketplace update "$marketplace" || true
    fi
    if run_quiet claude plugin update "$ref"; then
        print_success "${name}: updated"
        return 0
    fi

    print_warning "${name}: update failed — installing"
    if [[ -n "$source" ]]; then
        run_quiet claude plugin marketplace add "$source" || true
    fi
    if claude plugin install "$ref" --scope "$scope"; then
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
    validate_environment
    load_plugins

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
