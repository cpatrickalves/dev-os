#!/bin/bash

# =============================================================================
# Dev-OS Import Skills Script
# Import Claude skills from Dev-OS to the current project
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

SKILLS_SOURCE="$HOME/dev-os/.claude/skills"
SKILLS_DEST="$PROJECT_DIR/.claude/skills"

# Arrays for skill handling
declare -a SKILL_DIRS
declare -a SKILL_NAMES
declare -a SKILL_DESCRIPTIONS
declare -a SELECTED_SKILLS

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Import Claude skills from Dev-OS to the current project.

Options:
    --all              Import all available skills (skip selection)
    --overwrite        Overwrite existing skills without prompting
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

validate_skills_source() {
    if [[ ! -d "$SKILLS_SOURCE" ]]; then
        print_error "Skills source not found: $SKILLS_SOURCE"
        exit 1
    fi

    # Check that at least one skill subdirectory exists
    local count=0
    for dir in "$SKILLS_SOURCE"/*/; do
        if [[ -d "$dir" ]]; then
            count=$((count + 1))
        fi
    done

    if [[ "$count" -eq 0 ]]; then
        print_error "No skills found in $SKILLS_SOURCE"
        exit 1
    fi

    print_verbose "Found $count skill directories in source"
}

# -----------------------------------------------------------------------------
# Skill Discovery
# -----------------------------------------------------------------------------

discover_skills() {
    SKILL_DIRS=()
    SKILL_NAMES=()
    SKILL_DESCRIPTIONS=()

    for dir in "$SKILLS_SOURCE"/*/; do
        if [[ ! -d "$dir" ]]; then
            continue
        fi

        local dirname=$(basename "$dir")
        local skill_md="$dir/SKILL.md"
        local name="$dirname"
        local description=""

        # Extract name and description from SKILL.md YAML frontmatter
        if [[ -f "$skill_md" ]]; then
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
                    elif [[ "$line" =~ ^description:[[:space:]]*(.*) ]]; then
                        description="${BASH_REMATCH[1]}"
                    fi
                fi
            done < "$skill_md"
        fi

        SKILL_DIRS+=("$dirname")
        SKILL_NAMES+=("$name")
        SKILL_DESCRIPTIONS+=("$description")
    done

    if [[ ${#SKILL_DIRS[@]} -eq 0 ]]; then
        print_error "No skills discovered."
        exit 1
    fi

    print_verbose "Discovered ${#SKILL_DIRS[@]} skills"
}

# -----------------------------------------------------------------------------
# Skill Selection
# -----------------------------------------------------------------------------

select_skills() {
    # If --all was specified, select all skills
    if [[ "$IMPORT_ALL" == "true" ]]; then
        SELECTED_SKILLS=("${SKILL_DIRS[@]}")
        print_verbose "Selected all ${#SELECTED_SKILLS[@]} skills"
        return
    fi

    # Initialize selection array (all deselected by default)
    local selected=()
    for ((i=0; i<${#SKILL_DIRS[@]}; i++)); do
        selected[$i]=0
    done

    # Calculate lines to clear (skills + 7 for header/footer/spacing)
    local lines_to_clear=$((${#SKILL_DIRS[@]} + 7))

    display_skill_selection() {
        echo ""
        print_status "Select skills to import:"
        echo ""
        local i=1
        for ((idx=0; idx<${#SKILL_DIRS[@]}; idx++)); do
            local mark=" "
            if [[ ${selected[$idx]} -eq 1 ]]; then
                mark="x"
            fi
            local desc="${SKILL_DESCRIPTIONS[$idx]}"
            # Truncate description to 60 chars
            if [[ ${#desc} -gt 60 ]]; then
                desc="${desc:0:57}..."
            fi
            if [[ -n "$desc" ]]; then
                printf "  %2d) [%s] %s — %s\n" "$i" "$mark" "${SKILL_NAMES[$idx]}" "$desc"
            else
                printf "  %2d) [%s] %s\n" "$i" "$mark" "${SKILL_NAMES[$idx]}"
            fi
            ((i++))
        done
        echo ""
        echo ""
        echo "  Enter number to toggle   a) All   n) None   d) Done"
        echo ""
    }

    clear_display() {
        # Move cursor up and clear lines
        for ((i=0; i<lines_to_clear; i++)); do
            tput cuu1 2>/dev/null || echo -ne "\033[1A"
            tput el 2>/dev/null || echo -ne "\033[2K"
        done
    }

    local first_display=true

    while true; do
        if [[ "$first_display" == "true" ]]; then
            first_display=false
        else
            clear_display
        fi

        display_skill_selection
        read -p "Toggle (1-${#SKILL_DIRS[@]}), a, n, or d: " choice

        case "$choice" in
            a|A)
                for ((i=0; i<${#SKILL_DIRS[@]}; i++)); do
                    selected[$i]=1
                done
                ;;
            n|N)
                for ((i=0; i<${#SKILL_DIRS[@]}; i++)); do
                    selected[$i]=0
                done
                ;;
            d|D)
                break
                ;;
            *)
                if [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -ge 1 ]] && [[ "$choice" -le ${#SKILL_DIRS[@]} ]]; then
                    local idx=$((choice-1))
                    if [[ ${selected[$idx]} -eq 1 ]]; then
                        selected[$idx]=0
                    else
                        selected[$idx]=1
                    fi
                fi
                # Invalid input just redisplays
                ;;
        esac
    done

    # Build selected skills array
    SELECTED_SKILLS=()
    for ((i=0; i<${#SKILL_DIRS[@]}; i++)); do
        if [[ ${selected[$i]} -eq 1 ]]; then
            SELECTED_SKILLS+=("${SKILL_DIRS[$i]}")
        fi
    done

    if [[ ${#SELECTED_SKILLS[@]} -eq 0 ]]; then
        print_error "No skills selected."
        exit 1
    fi

    print_verbose "Selected ${#SELECTED_SKILLS[@]} skills"
}

# -----------------------------------------------------------------------------
# Conflict Detection
# -----------------------------------------------------------------------------

check_existing_skills() {
    local conflicts=()

    for skill in "${SELECTED_SKILLS[@]}"; do
        if [[ -d "$SKILLS_DEST/$skill" ]]; then
            conflicts+=("$skill")
        fi
    done

    if [[ ${#conflicts[@]} -eq 0 ]]; then
        return 0
    fi

    # If --overwrite specified, just continue
    if [[ "$OVERWRITE" == "true" ]]; then
        print_verbose "Overwriting ${#conflicts[@]} existing skill(s)"
        return 0
    fi

    # Prompt user
    echo ""
    print_warning "${#conflicts[@]} skill(s) already exist at destination:"
    for skill in "${conflicts[@]}"; do
        echo "    - $skill"
    done
    echo ""

    while true; do
        echo "What do you want to do?"
        echo "  1) Overwrite (replace existing)"
        echo "  2) Skip existing skills"
        echo "  3) Cancel"
        echo ""
        read -p "Choice (1-3): " conflict_choice

        case "$conflict_choice" in
            1)
                return 0
                ;;
            2)
                # Remove conflicts from selected skills
                local new_selected=()
                for skill in "${SELECTED_SKILLS[@]}"; do
                    local is_conflict=false
                    for conflict in "${conflicts[@]}"; do
                        if [[ "$skill" == "$conflict" ]]; then
                            is_conflict=true
                            break
                        fi
                    done
                    if [[ "$is_conflict" == "false" ]]; then
                        new_selected+=("$skill")
                    fi
                done
                SELECTED_SKILLS=("${new_selected[@]}")

                if [[ ${#SELECTED_SKILLS[@]} -eq 0 ]]; then
                    print_warning "No skills left to import after skipping conflicts."
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
    mkdir -p "$SKILLS_DEST"

    local import_count=0
    for skill in "${SELECTED_SKILLS[@]}"; do
        cp -r "$SKILLS_SOURCE/$skill" "$SKILLS_DEST/"
        import_count=$((import_count + 1))
        print_verbose "Imported: $skill"
    done

    echo ""
    print_success "Imported $import_count skill(s) to .claude/skills/"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Import Skills"

    # Parse arguments
    parse_arguments "$@"

    # Validate source
    validate_skills_source

    # Discover available skills
    discover_skills

    # Show summary
    echo ""
    print_status "Source: $SKILLS_SOURCE"
    print_status "Destination: $SKILLS_DEST"
    echo ""
    print_status "Available skills: ${#SKILL_DIRS[@]}"
    echo ""

    # Select skills
    select_skills

    # Show selection summary
    echo ""
    print_status "Import summary:"
    echo "  Skills to import: ${#SELECTED_SKILLS[@]}"
    echo ""

    # Check for conflicts
    check_existing_skills

    # Execute import
    execute_import

    echo ""
}

# Run main function
main "$@"
