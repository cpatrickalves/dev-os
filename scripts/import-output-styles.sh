#!/bin/bash

# =============================================================================
# Dev-OS Import Output Styles Script
# Import Claude output styles from Dev-OS globally (~/.claude/output-styles)
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

# Output styles are installed globally (user-level) so they are available in
# every project, not into the current project's .claude/output-styles.
STYLES_SOURCE="$HOME/dev-os/output-styles"
STYLES_DEST="$HOME/.claude/output-styles"

# Arrays for style handling
declare -a STYLE_FILES
declare -a STYLE_NAMES
declare -a STYLE_DESCRIPTIONS
declare -a SELECTED_STYLES

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Import Claude output styles from Dev-OS globally (into ~/.claude/output-styles),
making them available in every project.

Options:
    --all              Import all available output styles (skip selection)
    --overwrite        Overwrite existing output styles without prompting
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

validate_styles_source() {
    if [[ ! -d "$STYLES_SOURCE" ]]; then
        print_error "Output styles source not found: $STYLES_SOURCE"
        exit 1
    fi

    # Check that at least one style file exists
    local count=0
    for file in "$STYLES_SOURCE"/*.md; do
        if [[ -f "$file" ]]; then
            count=$((count + 1))
        fi
    done

    if [[ "$count" -eq 0 ]]; then
        print_error "No output styles found in $STYLES_SOURCE"
        exit 1
    fi

    print_verbose "Found $count output style file(s) in source"
}

# -----------------------------------------------------------------------------
# Output Style Discovery
# -----------------------------------------------------------------------------

discover_styles() {
    STYLE_FILES=()
    STYLE_NAMES=()
    STYLE_DESCRIPTIONS=()

    for file in "$STYLES_SOURCE"/*.md; do
        if [[ ! -f "$file" ]]; then
            continue
        fi

        local filename=$(basename "$file")
        local name="${filename%.md}"
        local description=""

        # Extract name and description from YAML frontmatter when present.
        # The filename is the fallback name and the description stays empty.
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

        STYLE_FILES+=("$filename")
        STYLE_NAMES+=("$name")
        STYLE_DESCRIPTIONS+=("$description")
    done

    if [[ ${#STYLE_FILES[@]} -eq 0 ]]; then
        print_error "No output styles discovered."
        exit 1
    fi

    print_verbose "Discovered ${#STYLE_FILES[@]} output styles"
}

# -----------------------------------------------------------------------------
# Output Style Selection
# -----------------------------------------------------------------------------

select_styles() {
    # If --all was specified, select all styles
    if [[ "$IMPORT_ALL" == "true" ]]; then
        SELECTED_STYLES=("${STYLE_FILES[@]}")
        print_verbose "Selected all ${#SELECTED_STYLES[@]} output styles"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    PICKER_NAMES=("${STYLE_NAMES[@]}")
    PICKER_DESCS=("${STYLE_DESCRIPTIONS[@]}")
    PICKER_NOUN="output styles"
    select_items

    SELECTED_STYLES=()
    local i
    for i in "${PICKER_SELECTED[@]}"; do
        SELECTED_STYLES+=("${STYLE_FILES[$i]}")
    done

    print_verbose "Selected ${#SELECTED_STYLES[@]} output styles"
}

# -----------------------------------------------------------------------------
# Conflict Detection
# -----------------------------------------------------------------------------

check_existing_styles() {
    local conflicts=()

    for style in "${SELECTED_STYLES[@]}"; do
        if [[ -f "$STYLES_DEST/$style" ]]; then
            conflicts+=("$style")
        fi
    done

    if [[ ${#conflicts[@]} -eq 0 ]]; then
        return 0
    fi

    # If --overwrite specified, just continue
    if [[ "$OVERWRITE" == "true" ]]; then
        print_verbose "Overwriting ${#conflicts[@]} existing output style(s)"
        return 0
    fi

    # Prompt user
    echo ""
    print_warning "${#conflicts[@]} output style(s) already exist at destination:"
    for style in "${conflicts[@]}"; do
        echo "    - ${style%.md}"
    done
    echo ""

    while true; do
        echo "What do you want to do?"
        echo "  1) Overwrite (replace existing)"
        echo "  2) Skip existing output styles"
        echo "  3) Cancel"
        echo ""
        read -p "Choice (1-3): " conflict_choice

        case "$conflict_choice" in
            1)
                return 0
                ;;
            2)
                # Remove conflicts from selected styles
                local new_selected=()
                for style in "${SELECTED_STYLES[@]}"; do
                    local is_conflict=false
                    for conflict in "${conflicts[@]}"; do
                        if [[ "$style" == "$conflict" ]]; then
                            is_conflict=true
                            break
                        fi
                    done
                    if [[ "$is_conflict" == "false" ]]; then
                        new_selected+=("$style")
                    fi
                done
                SELECTED_STYLES=("${new_selected[@]}")

                if [[ ${#SELECTED_STYLES[@]} -eq 0 ]]; then
                    print_warning "No output styles left to import after skipping conflicts."
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
    mkdir -p "$STYLES_DEST"

    local import_count=0
    for style in "${SELECTED_STYLES[@]}"; do
        cp "$STYLES_SOURCE/$style" "$STYLES_DEST/"
        import_count=$((import_count + 1))
        print_verbose "Imported: ${style%.md}"
    done

    echo ""
    print_success "Imported $import_count output style(s) globally to $STYLES_DEST/"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Import Output Styles"

    # Parse arguments
    parse_arguments "$@"

    # Validate source
    validate_styles_source

    # Discover available styles
    discover_styles

    # Show summary
    echo ""
    print_status "Source: $STYLES_SOURCE"
    print_status "Destination: $STYLES_DEST"
    echo ""
    print_status "Available output styles: ${#STYLE_FILES[@]}"
    echo ""

    # Select styles
    select_styles

    # Show selection summary
    echo ""
    print_status "Import summary:"
    echo "  Output styles to import: ${#SELECTED_STYLES[@]}"
    echo ""

    # Check for conflicts
    check_existing_styles

    # Execute import
    execute_import

    echo ""
}

# Run main function
main "$@"
