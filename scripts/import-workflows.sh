#!/bin/bash

# =============================================================================
# Dev-OS Import Workflows Script
# Import Claude workflows from Dev-OS to the current project
# =============================================================================

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(pwd)"

# Source common functions
source "$SCRIPT_DIR/common-functions.sh"

# -----------------------------------------------------------------------------
# Default Values
# -----------------------------------------------------------------------------

VERBOSE="false"
IMPORT_ALL="false"
OVERWRITE="false"

WORKFLOWS_SOURCE="$HOME/dev-os/workflows"
WORKFLOWS_DEST="$PROJECT_DIR/.claude/workflows"

# Arrays for workflow handling
declare -a WORKFLOW_FILES
declare -a WORKFLOW_NAMES
declare -a WORKFLOW_DESCRIPTIONS
declare -a SELECTED_WORKFLOWS

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Import Claude workflows from Dev-OS to the current project.

Options:
    --all              Import all available workflows (skip selection)
    --overwrite        Overwrite existing workflows without prompting
    --verbose          Show detailed output
    -h, --help         Show this help message

Examples:
    $0
    $0 --all
    $0 --all --overwrite

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
                IMPORT_ALL="true"
                shift
                ;;
            --overwrite)
                OVERWRITE="true"
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
# Validation Functions
# -----------------------------------------------------------------------------

validate_workflows_source() {
    if [[ ! -d "$WORKFLOWS_SOURCE" ]]; then
        print_error "Workflows source not found: $WORKFLOWS_SOURCE"
        exit 1
    fi

    # Check that at least one workflow file exists
    local count=0
    for file in "$WORKFLOWS_SOURCE"/*.js; do
        if [[ -f "$file" ]]; then
            count=$((count + 1))
        fi
    done

    if [[ "$count" -eq 0 ]]; then
        print_error "No workflows found in $WORKFLOWS_SOURCE"
        exit 1
    fi

    print_verbose "Found $count workflow file(s) in source"
}

# -----------------------------------------------------------------------------
# Workflow Discovery
# -----------------------------------------------------------------------------

# Strip a JS literal value: drop a trailing comma, then surrounding quotes.
strip_js_value() {
    local v="$1"
    v="${v%,}"          # trailing comma
    v="${v#[\'\"]}"     # leading quote
    v="${v%[\'\"]}"     # trailing quote
    printf '%s' "$v"
}

discover_workflows() {
    WORKFLOW_FILES=()
    WORKFLOW_NAMES=()
    WORKFLOW_DESCRIPTIONS=()

    for file in "$WORKFLOWS_SOURCE"/*.js; do
        if [[ ! -f "$file" ]]; then
            continue
        fi

        local filename=$(basename "$file")
        local name="${filename%.js}"
        local description=""

        # Extract name/description from the `export const meta = {...}` block.
        # Workflows are plain JS, so the metadata is JS object properties
        # (name: '...', description: '...') rather than YAML frontmatter.
        # Only the first occurrence of each property is used.
        local got_name=false
        local got_desc=false
        while IFS= read -r line; do
            if [[ "$got_name" == "false" && "$line" =~ ^[[:space:]]*name:[[:space:]]*(.*) ]]; then
                name="$(strip_js_value "${BASH_REMATCH[1]}")"
                got_name=true
            elif [[ "$got_desc" == "false" && "$line" =~ ^[[:space:]]*description:[[:space:]]*(.*) ]]; then
                description="$(strip_js_value "${BASH_REMATCH[1]}")"
                got_desc=true
            fi
            if [[ "$got_name" == "true" && "$got_desc" == "true" ]]; then
                break
            fi
        done < "$file"

        WORKFLOW_FILES+=("$filename")
        WORKFLOW_NAMES+=("$name")
        WORKFLOW_DESCRIPTIONS+=("$description")
    done

    if [[ ${#WORKFLOW_FILES[@]} -eq 0 ]]; then
        print_error "No workflows discovered."
        exit 1
    fi

    print_verbose "Discovered ${#WORKFLOW_FILES[@]} workflows"
}

# -----------------------------------------------------------------------------
# Workflow Selection
# -----------------------------------------------------------------------------

select_workflows() {
    # If --all was specified, select all workflows
    if [[ "$IMPORT_ALL" == "true" ]]; then
        SELECTED_WORKFLOWS=("${WORKFLOW_FILES[@]}")
        print_verbose "Selected all ${#SELECTED_WORKFLOWS[@]} workflows"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    PICKER_NAMES=("${WORKFLOW_NAMES[@]}")
    PICKER_DESCS=("${WORKFLOW_DESCRIPTIONS[@]}")
    PICKER_NOUN="workflows"
    select_items

    SELECTED_WORKFLOWS=()
    local i
    for i in "${PICKER_SELECTED[@]}"; do
        SELECTED_WORKFLOWS+=("${WORKFLOW_FILES[$i]}")
    done

    print_verbose "Selected ${#SELECTED_WORKFLOWS[@]} workflows"
}

# -----------------------------------------------------------------------------
# Conflict Detection
# -----------------------------------------------------------------------------

check_existing_workflows() {
    local conflicts=()

    for workflow in "${SELECTED_WORKFLOWS[@]}"; do
        if [[ -f "$WORKFLOWS_DEST/$workflow" ]]; then
            conflicts+=("$workflow")
        fi
    done

    if [[ ${#conflicts[@]} -eq 0 ]]; then
        return 0
    fi

    # If --overwrite specified, just continue
    if [[ "$OVERWRITE" == "true" ]]; then
        print_verbose "Overwriting ${#conflicts[@]} existing workflow(s)"
        return 0
    fi

    # Prompt user
    echo ""
    print_warning "${#conflicts[@]} workflow(s) already exist at destination:"
    for workflow in "${conflicts[@]}"; do
        echo "    - ${workflow%.js}"
    done
    echo ""

    while true; do
        echo "What do you want to do?"
        echo "  1) Overwrite (replace existing)"
        echo "  2) Skip existing workflows"
        echo "  3) Cancel"
        echo ""
        read -p "Choice (1-3): " conflict_choice

        case "$conflict_choice" in
            1)
                return 0
                ;;
            2)
                # Remove conflicts from selected workflows
                local new_selected=()
                for workflow in "${SELECTED_WORKFLOWS[@]}"; do
                    local is_conflict=false
                    for conflict in "${conflicts[@]}"; do
                        if [[ "$workflow" == "$conflict" ]]; then
                            is_conflict=true
                            break
                        fi
                    done
                    if [[ "$is_conflict" == "false" ]]; then
                        new_selected+=("$workflow")
                    fi
                done
                SELECTED_WORKFLOWS=("${new_selected[@]}")

                if [[ ${#SELECTED_WORKFLOWS[@]} -eq 0 ]]; then
                    print_warning "No workflows left to import after skipping conflicts."
                    exit 0
                fi
                return 0
                ;;
            3)
                print_error "Cancelled."
                exit 1
                ;;
            *)
                echo "Invalid choice."
                ;;
        esac
    done
}

# -----------------------------------------------------------------------------
# Import Execution
# -----------------------------------------------------------------------------

execute_import() {
    mkdir -p "$WORKFLOWS_DEST"

    local import_count=0
    for workflow in "${SELECTED_WORKFLOWS[@]}"; do
        cp "$WORKFLOWS_SOURCE/$workflow" "$WORKFLOWS_DEST/"
        import_count=$((import_count + 1))
        print_verbose "Imported: ${workflow%.js}"
    done

    echo ""
    print_success "Imported $import_count workflow(s) to .claude/workflows/"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Import Workflows"

    # Parse arguments
    parse_arguments "$@"

    # Validate source
    validate_workflows_source

    # Discover available workflows
    discover_workflows

    # Show summary
    echo ""
    print_status "Source: $WORKFLOWS_SOURCE"
    print_status "Destination: $WORKFLOWS_DEST"
    echo ""
    print_status "Available workflows: ${#WORKFLOW_FILES[@]}"
    echo ""

    # Select workflows
    select_workflows

    # Show selection summary
    echo ""
    print_status "Import summary:"
    echo "  Workflows to import: ${#SELECTED_WORKFLOWS[@]}"
    echo ""

    # Check for conflicts
    check_existing_workflows

    # Execute import
    execute_import

    echo ""
}

# Run main function
main "$@"
