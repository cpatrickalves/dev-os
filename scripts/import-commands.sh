#!/bin/bash

# =============================================================================
# Dev-OS Import Commands Script
# Import Claude commands from Dev-OS to the current project
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

COMMANDS_SOURCE="$HOME/dev-os/.claude/commands"
COMMANDS_DEST="$PROJECT_DIR/.claude/commands"

# Arrays for command handling
declare -a COMMAND_FILES
declare -a COMMAND_NAMES
declare -a COMMAND_DESCRIPTIONS
declare -a SELECTED_COMMANDS

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Import Claude commands from Dev-OS to the current project.

Options:
    --all              Import all available commands (skip selection)
    --overwrite        Overwrite existing commands without prompting
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

validate_commands_source() {
    if [[ ! -d "$COMMANDS_SOURCE" ]]; then
        print_error "Commands source not found: $COMMANDS_SOURCE"
        exit 1
    fi

    # Check that at least one command file exists
    local count=0
    for file in "$COMMANDS_SOURCE"/*.md; do
        if [[ -f "$file" ]]; then
            count=$((count + 1))
        fi
    done

    if [[ "$count" -eq 0 ]]; then
        print_error "No commands found in $COMMANDS_SOURCE"
        exit 1
    fi

    print_verbose "Found $count command file(s) in source"
}

# -----------------------------------------------------------------------------
# Command Discovery
# -----------------------------------------------------------------------------

discover_commands() {
    COMMAND_FILES=()
    COMMAND_NAMES=()
    COMMAND_DESCRIPTIONS=()

    for file in "$COMMANDS_SOURCE"/*.md; do
        if [[ ! -f "$file" ]]; then
            continue
        fi

        local filename=$(basename "$file")
        local name="${filename%.md}"
        local description=""

        # Extract name and description from YAML frontmatter when present.
        # Command files often have no frontmatter; the filename is the
        # fallback name and the description stays empty.
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
                    name="${name%\"}"
                    name="${name#\"}"
                elif [[ "$line" =~ ^description:[[:space:]]*(.*) ]]; then
                    description="${BASH_REMATCH[1]}"
                    description="${description%\"}"
                    description="${description#\"}"
                fi
            fi
        done < "$file"

        COMMAND_FILES+=("$filename")
        COMMAND_NAMES+=("$name")
        COMMAND_DESCRIPTIONS+=("$description")
    done

    if [[ ${#COMMAND_FILES[@]} -eq 0 ]]; then
        print_error "No commands discovered."
        exit 1
    fi

    print_verbose "Discovered ${#COMMAND_FILES[@]} commands"
}

# -----------------------------------------------------------------------------
# Command Selection
# -----------------------------------------------------------------------------

select_commands() {
    # If --all was specified, select all commands
    if [[ "$IMPORT_ALL" == "true" ]]; then
        SELECTED_COMMANDS=("${COMMAND_FILES[@]}")
        print_verbose "Selected all ${#SELECTED_COMMANDS[@]} commands"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    PICKER_NAMES=("${COMMAND_NAMES[@]}")
    PICKER_DESCS=("${COMMAND_DESCRIPTIONS[@]}")
    PICKER_NOUN="commands"
    select_items

    SELECTED_COMMANDS=()
    local i
    for i in "${PICKER_SELECTED[@]}"; do
        SELECTED_COMMANDS+=("${COMMAND_FILES[$i]}")
    done

    print_verbose "Selected ${#SELECTED_COMMANDS[@]} commands"
}

# -----------------------------------------------------------------------------
# Conflict Detection
# -----------------------------------------------------------------------------

check_existing_commands() {
    local conflicts=()

    for command in "${SELECTED_COMMANDS[@]}"; do
        if [[ -f "$COMMANDS_DEST/$command" ]]; then
            conflicts+=("$command")
        fi
    done

    if [[ ${#conflicts[@]} -eq 0 ]]; then
        return 0
    fi

    # If --overwrite specified, just continue
    if [[ "$OVERWRITE" == "true" ]]; then
        print_verbose "Overwriting ${#conflicts[@]} existing command(s)"
        return 0
    fi

    # Prompt user
    echo ""
    print_warning "${#conflicts[@]} command(s) already exist at destination:"
    for command in "${conflicts[@]}"; do
        echo "    - ${command%.md}"
    done
    echo ""

    while true; do
        echo "What do you want to do?"
        echo "  1) Overwrite (replace existing)"
        echo "  2) Skip existing commands"
        echo "  3) Cancel"
        echo ""
        read -p "Choice (1-3): " conflict_choice

        case "$conflict_choice" in
            1)
                return 0
                ;;
            2)
                # Remove conflicts from selected commands
                local new_selected=()
                for command in "${SELECTED_COMMANDS[@]}"; do
                    local is_conflict=false
                    for conflict in "${conflicts[@]}"; do
                        if [[ "$command" == "$conflict" ]]; then
                            is_conflict=true
                            break
                        fi
                    done
                    if [[ "$is_conflict" == "false" ]]; then
                        new_selected+=("$command")
                    fi
                done
                SELECTED_COMMANDS=("${new_selected[@]}")

                if [[ ${#SELECTED_COMMANDS[@]} -eq 0 ]]; then
                    print_warning "No commands left to import after skipping conflicts."
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
    mkdir -p "$COMMANDS_DEST"

    local import_count=0
    for command in "${SELECTED_COMMANDS[@]}"; do
        cp "$COMMANDS_SOURCE/$command" "$COMMANDS_DEST/"
        import_count=$((import_count + 1))
        print_verbose "Imported: ${command%.md}"
    done

    echo ""
    print_success "Imported $import_count command(s) to .claude/commands/"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Import Commands"

    # Parse arguments
    parse_arguments "$@"

    # Validate source
    validate_commands_source

    # Discover available commands
    discover_commands

    # Show summary
    echo ""
    print_status "Source: $COMMANDS_SOURCE"
    print_status "Destination: $COMMANDS_DEST"
    echo ""
    print_status "Available commands: ${#COMMAND_FILES[@]}"
    echo ""

    # Select commands
    select_commands

    # Show selection summary
    echo ""
    print_status "Import summary:"
    echo "  Commands to import: ${#SELECTED_COMMANDS[@]}"
    echo ""

    # Check for conflicts
    check_existing_commands

    # Execute import
    execute_import

    echo ""
}

# Run main function
main "$@"
