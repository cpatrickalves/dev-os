#!/bin/bash

# =============================================================================
# Dev-OS Import Agents Script
# Import Claude agents from Dev-OS to the current project
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

AGENTS_SOURCE="$HOME/dev-os/.claude/agents"
AGENTS_DEST="$PROJECT_DIR/.claude/agents"

# Arrays for agent handling
declare -a AGENT_FILES
declare -a AGENT_NAMES
declare -a AGENT_DESCRIPTIONS
declare -a SELECTED_AGENTS

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Import Claude agents from Dev-OS to the current project.

Options:
    --all              Import all available agents (skip selection)
    --overwrite        Overwrite existing agents without prompting
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

validate_agents_source() {
    if [[ ! -d "$AGENTS_SOURCE" ]]; then
        print_error "Agents source not found: $AGENTS_SOURCE"
        exit 1
    fi

    # Check that at least one agent file exists
    local count=0
    for file in "$AGENTS_SOURCE"/*.md; do
        if [[ -f "$file" ]]; then
            count=$((count + 1))
        fi
    done

    if [[ "$count" -eq 0 ]]; then
        print_error "No agents found in $AGENTS_SOURCE"
        exit 1
    fi

    print_verbose "Found $count agent file(s) in source"
}

# -----------------------------------------------------------------------------
# Agent Discovery
# -----------------------------------------------------------------------------

discover_agents() {
    AGENT_FILES=()
    AGENT_NAMES=()
    AGENT_DESCRIPTIONS=()

    for file in "$AGENTS_SOURCE"/*.md; do
        if [[ ! -f "$file" ]]; then
            continue
        fi

        local filename=$(basename "$file")
        local name="${filename%.md}"
        local description=""

        # Extract name and description from YAML frontmatter
        local in_frontmatter=false
        while IFS= read -r line; do
            if [[ "$line" == "---" ]]; then
                if [[ "$in_frontmatter" == "true" ]]; then
                    break
                fi
                in_frontmatter=true
                continue
            fi
            if [[ "$in_frontmatter" == "true" ]]; then
                if [[ "$line" =~ ^name:[[:space:]]*(.*) ]]; then
                    name="${BASH_REMATCH[1]}"
                    # Strip surrounding quotes if present
                    name="${name%\"}"
                    name="${name#\"}"
                elif [[ "$line" =~ ^description:[[:space:]]*(.*) ]]; then
                    description="${BASH_REMATCH[1]}"
                    # Strip surrounding quotes if present
                    description="${description%\"}"
                    description="${description#\"}"
                fi
            fi
        done < "$file"

        AGENT_FILES+=("$filename")
        AGENT_NAMES+=("$name")
        AGENT_DESCRIPTIONS+=("$description")
    done

    if [[ ${#AGENT_FILES[@]} -eq 0 ]]; then
        print_error "No agents discovered."
        exit 1
    fi

    print_verbose "Discovered ${#AGENT_FILES[@]} agents"
}

# -----------------------------------------------------------------------------
# Agent Selection
# -----------------------------------------------------------------------------

select_agents() {
    # If --all was specified, select all agents
    if [[ "$IMPORT_ALL" == "true" ]]; then
        SELECTED_AGENTS=("${AGENT_FILES[@]}")
        print_verbose "Selected all ${#SELECTED_AGENTS[@]} agents"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    PICKER_NAMES=("${AGENT_NAMES[@]}")
    PICKER_DESCS=("${AGENT_DESCRIPTIONS[@]}")
    PICKER_NOUN="agents"
    select_items

    SELECTED_AGENTS=()
    local i
    for i in "${PICKER_SELECTED[@]}"; do
        SELECTED_AGENTS+=("${AGENT_FILES[$i]}")
    done

    print_verbose "Selected ${#SELECTED_AGENTS[@]} agents"
}

# -----------------------------------------------------------------------------
# Conflict Detection
# -----------------------------------------------------------------------------

check_existing_agents() {
    local conflicts=()

    for agent in "${SELECTED_AGENTS[@]}"; do
        if [[ -f "$AGENTS_DEST/$agent" ]]; then
            conflicts+=("$agent")
        fi
    done

    if [[ ${#conflicts[@]} -eq 0 ]]; then
        return 0
    fi

    # If --overwrite specified, just continue
    if [[ "$OVERWRITE" == "true" ]]; then
        print_verbose "Overwriting ${#conflicts[@]} existing agent(s)"
        return 0
    fi

    # Prompt user
    echo ""
    print_warning "${#conflicts[@]} agent(s) already exist at destination:"
    for agent in "${conflicts[@]}"; do
        echo "    - ${agent%.md}"
    done
    echo ""

    while true; do
        echo "What do you want to do?"
        echo "  1) Overwrite (replace existing)"
        echo "  2) Skip existing agents"
        echo "  3) Cancel"
        echo ""
        read -p "Choice (1-3): " conflict_choice

        case "$conflict_choice" in
            1)
                return 0
                ;;
            2)
                # Remove conflicts from selected agents
                local new_selected=()
                for agent in "${SELECTED_AGENTS[@]}"; do
                    local is_conflict=false
                    for conflict in "${conflicts[@]}"; do
                        if [[ "$agent" == "$conflict" ]]; then
                            is_conflict=true
                            break
                        fi
                    done
                    if [[ "$is_conflict" == "false" ]]; then
                        new_selected+=("$agent")
                    fi
                done
                SELECTED_AGENTS=("${new_selected[@]}")

                if [[ ${#SELECTED_AGENTS[@]} -eq 0 ]]; then
                    print_warning "No agents left to import after skipping conflicts."
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
    mkdir -p "$AGENTS_DEST"

    local import_count=0
    for agent in "${SELECTED_AGENTS[@]}"; do
        cp "$AGENTS_SOURCE/$agent" "$AGENTS_DEST/"
        import_count=$((import_count + 1))
        print_verbose "Imported: ${agent%.md}"
    done

    echo ""
    print_success "Imported $import_count agent(s) to .claude/agents/"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Import Agents"

    # Parse arguments
    parse_arguments "$@"

    # Validate source
    validate_agents_source

    # Discover available agents
    discover_agents

    # Show summary
    echo ""
    print_status "Source: $AGENTS_SOURCE"
    print_status "Destination: $AGENTS_DEST"
    echo ""
    print_status "Available agents: ${#AGENT_FILES[@]}"
    echo ""

    # Select agents
    select_agents

    # Show selection summary
    echo ""
    print_status "Import summary:"
    echo "  Agents to import: ${#SELECTED_AGENTS[@]}"
    echo ""

    # Check for conflicts
    check_existing_agents

    # Execute import
    execute_import

    echo ""
}

# Run main function
main "$@"
