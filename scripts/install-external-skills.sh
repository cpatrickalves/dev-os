#!/bin/bash

# =============================================================================
# Dev-OS Install External Skills Script
# Pick skill packages from external-skills.yaml and install or update them
# =============================================================================
#
# Selection uses the same shared keyboard picker as import-skills.sh
# (select_items in common-functions.sh): ↑/↓ navigate, Space toggle,
# a all, n none, Enter confirm, q quit.
#
# Catalog: external-skills.yaml at the Dev-OS root (see its header for the
# fields). Commands are built from those fields and run as argv arrays.
#
# Install and update are the same command: `npx skills update <pkg>` exits 0
# with "No installed skills found" when the package was never added, so it
# cannot signal "not installed". `npx skills add` is idempotent (it re-copies
# files), so it serves as both install and update. `--yes` keeps it
# non-interactive under the picker-driven flow.

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

CATALOG_FILE="$BASE_DIR/external-skills.yaml"

# Parallel catalog arrays (bash 3.2: no associative arrays).
declare -a PACKAGE_NAMES
declare -a PACKAGE_DESCS
declare -a PACKAGE_SOURCES
declare -a PACKAGE_SKILLS  # "*" or comma-separated list
declare -a PACKAGE_SCOPES
declare -a SELECTED_PACKAGES

# -----------------------------------------------------------------------------
# Skill Catalog
# -----------------------------------------------------------------------------

load_packages() {
    PACKAGE_NAMES=(); PACKAGE_DESCS=(); PACKAGE_SOURCES=(); PACKAGE_SKILLS=(); PACKAGE_SCOPES=()

    local records
    records="$(load_catalog "$CATALOG_FILE" skills \
        name,description,source,skills,scope \
        name,description,source,skills,scope)" || exit 1

    local name desc source skills scope
    while IFS="$CATALOG_SEP" read -r name desc source skills scope; do
        [[ -z "$name" ]] && continue
        case "$scope" in
            project|global) ;;
            *)
                print_error "$CATALOG_FILE: $name: invalid scope \"$scope\" (project or global)"
                exit 1
                ;;
        esac
        PACKAGE_NAMES+=("$name")
        PACKAGE_DESCS+=("$desc ($scope)")
        PACKAGE_SOURCES+=("$source")
        PACKAGE_SKILLS+=("$skills")
        PACKAGE_SCOPES+=("$scope")
    done <<< "$records"

    print_verbose "Catalog contains ${#PACKAGE_NAMES[@]} skill packages"
    if [[ ${#PACKAGE_NAMES[@]} -eq 0 ]]; then
        print_error "No skill packages found in $CATALOG_FILE"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << HELP
Usage: $0 [OPTIONS]

Pick skill packages from external-skills.yaml and install or update them
with \`npx skills add\` (the same command does both).

Options:
    --all              Select every package (skip the interactive picker)
    --verbose          Show command output (default: only on failure)
    -h, --help         Show this help message

Examples:
    $0
    $0 --all
    $0 --all --verbose

HELP
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
    if ! command -v npx >/dev/null 2>&1; then
        print_error "'npx' was not found on PATH (install Node.js)."
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Selection
# -----------------------------------------------------------------------------

select_packages() {
    if [[ "$INSTALL_ALL" == "true" ]]; then
        SELECTED_PACKAGES=()
        local n=${#PACKAGE_NAMES[@]}
        local i
        for ((i=0; i<n; i++)); do
            SELECTED_PACKAGES+=("$i")
        done
        print_verbose "Selected all ${#SELECTED_PACKAGES[@]} packages"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    PICKER_NAMES=("${PACKAGE_NAMES[@]}")
    PICKER_DESCS=("${PACKAGE_DESCS[@]}")
    PICKER_NOUN="skill packages"
    select_items

    SELECTED_PACKAGES=("${PICKER_SELECTED[@]}")
    print_verbose "Selected ${#SELECTED_PACKAGES[@]} packages"
}

# -----------------------------------------------------------------------------
# Install / Update Execution
# -----------------------------------------------------------------------------

install_one() {
    local idx=$1
    local name="${PACKAGE_NAMES[$idx]}"
    local source="${PACKAGE_SOURCES[$idx]}"
    local scope="${PACKAGE_SCOPES[$idx]}"

    local cmd=(npx skills@latest add "$source" --agent claude-code --"$scope" --yes)
    local skill skills
    IFS=',' read -r -a skills <<< "${PACKAGE_SKILLS[$idx]}"
    for skill in "${skills[@]}"; do
        skill="${skill#"${skill%%[![:space:]]*}"}"
        skill="${skill%"${skill##*[![:space:]]}"}"
        [[ -n "$skill" ]] && cmd+=(--skill "$skill")
    done

    print_status "→ ${name}: installing/updating..."
    local ok="false"
    if [[ "$VERBOSE" == "true" ]]; then
        "${cmd[@]}" && ok="true"
    else
        local log
        log="$(mktemp)"
        if "${cmd[@]}" >"$log" 2>&1; then
            ok="true"
        else
            cat "$log"
        fi
        rm -f "$log"
    fi

    if [[ "$ok" == "true" ]]; then
        print_success "${name}: done"
        return 0
    fi
    print_error "${name}: install failed"
    return 1
}

execute_install() {
    local failed=()
    local ok=0
    local idx
    for idx in "${SELECTED_PACKAGES[@]}"; do
        if install_one "$idx"; then
            ok=$((ok + 1))
        else
            failed+=("${PACKAGE_NAMES[$idx]}")
        fi
    done

    echo ""
    print_success "$ok package(s) installed/updated"
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
    print_section "Dev-OS Install External Skills"

    parse_arguments "$@"
    validate_environment
    load_packages

    echo ""
    print_status "Available skill packages: ${#PACKAGE_NAMES[@]}"
    echo ""

    select_packages

    echo ""
    print_status "Install summary:"
    echo "  Packages to install/update: ${#SELECTED_PACKAGES[@]}"
    echo ""

    execute_install

    echo ""
}

# Run main function
main "$@"
