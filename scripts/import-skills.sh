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

SKILLS_SOURCE="$HOME/dev-os/skills"
SKILLS_DEST="$PROJECT_DIR/.claude/skills"

# Skills installed globally (user-level) instead of into the project.
# These are copied to $GLOBAL_SKILLS_DEST so they are available in every project.
GLOBAL_SKILLS_DEST="$HOME/.claude/skills"
declare -a GLOBAL_SKILLS=("ce-code-review" "docs-generator" "planecli" "azure-devops-cli" "napkin-runbook" "unslop" "pr-security-review" "logbook" "end-session")

# Arrays for skill handling. SKILL_PATHS holds each skill's path relative to
# $SKILLS_SOURCE (e.g. engineering/build/python-testing); SKILL_DIRS its basename.
declare -a SKILL_PATHS
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

    # Check that at least one skill exists, at any category depth
    local count
    count=$(find "$SKILLS_SOURCE" -name SKILL.md -type f | wc -l | tr -d ' ')

    if [[ "$count" -eq 0 ]]; then
        print_error "No skills found in $SKILLS_SOURCE"
        exit 1
    fi

    print_verbose "Found $count skills in source"
}

# -----------------------------------------------------------------------------
# Destination Resolution
# -----------------------------------------------------------------------------

# Return 0 if the given skill (by source directory name) installs globally.
is_global_skill() {
    local skill="$1"
    local g
    for g in "${GLOBAL_SKILLS[@]}"; do
        if [[ "$skill" == "$g" ]]; then
            return 0
        fi
    done
    return 1
}

# Echo the destination skills root for the given skill.
skill_dest_dir() {
    local skill="$1"
    if is_global_skill "$skill"; then
        echo "$GLOBAL_SKILLS_DEST"
    else
        echo "$SKILLS_DEST"
    fi
}

# -----------------------------------------------------------------------------
# Skill Discovery
# -----------------------------------------------------------------------------

# Skills are grouped into category folders in the source (skills/<category>/...),
# but Claude Code only discovers .claude/skills/<name>/SKILL.md one level deep.
# Discovery therefore finds SKILL.md at any depth, and the import flattens each
# skill to its basename at the destination.
discover_skills() {
    SKILL_PATHS=()
    SKILL_DIRS=()
    SKILL_NAMES=()
    SKILL_DESCRIPTIONS=()

    local skill_md
    while IFS= read -r skill_md; do
        local dir
        dir="$(dirname "$skill_md")"
        local rel="${dir#$SKILLS_SOURCE/}"
        local dirname
        dirname="$(basename "$dir")"
        local name="$dirname"
        local description=""

        # Extract name and description from SKILL.md YAML frontmatter.
        # A block-scalar description (`description: >` or `|`) continues on the
        # following indented lines, which are joined into one line.
        local in_frontmatter=false
        local in_block_desc=false
        while IFS= read -r line; do
            if [[ "$line" == "---" ]]; then
                if [[ "$in_frontmatter" == "true" ]]; then
                    break
                fi
                in_frontmatter=true
                continue
            fi
            if [[ "$in_frontmatter" == "true" ]]; then
                if [[ "$in_block_desc" == "true" ]]; then
                    if [[ "$line" =~ ^[[:space:]]+(.*) ]]; then
                        description="${description:+$description }${BASH_REMATCH[1]}"
                        continue
                    fi
                    in_block_desc=false
                fi
                if [[ "$line" =~ ^name:[[:space:]]*(.*) ]]; then
                    name="${BASH_REMATCH[1]}"
                elif [[ "$line" =~ ^description:[[:space:]]*(.*) ]]; then
                    description="${BASH_REMATCH[1]}"
                    if [[ "$description" =~ ^[\>\|][+-]?$ ]]; then
                        description=""
                        in_block_desc=true
                    else
                        # Strip surrounding quotes if present
                        description="${description%\"}"
                        description="${description#\"}"
                    fi
                fi
            fi
        done < "$skill_md"

        SKILL_PATHS+=("$rel")
        SKILL_DIRS+=("$dirname")
        SKILL_NAMES+=("$name")
        SKILL_DESCRIPTIONS+=("$description")
    done < <(find "$SKILLS_SOURCE" -name SKILL.md -type f | sort)

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
        SELECTED_SKILLS=("${SKILL_PATHS[@]}")
        print_verbose "Selected all ${#SELECTED_SKILLS[@]} skills"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    # Group skills under their category (discovery is sorted by path, so each
    # category is contiguous) and tag the ones that land in ~/.claude/skills.
    PICKER_NAMES=()
    PICKER_GROUPS=()
    local i
    for i in "${!SKILL_NAMES[@]}"; do
        local category
        category="$(dirname "${SKILL_PATHS[$i]}")"
        [[ "$category" == "." ]] && category="(uncategorized)"
        PICKER_GROUPS+=("$category")
        if is_global_skill "${SKILL_DIRS[$i]}"; then
            PICKER_NAMES+=("${SKILL_NAMES[$i]} (global)")
        else
            PICKER_NAMES+=("${SKILL_NAMES[$i]} (local)")
        fi
    done
    PICKER_DESCS=("${SKILL_DESCRIPTIONS[@]}")
    PICKER_NOUN="skills"
    select_items

    SELECTED_SKILLS=()
    for i in "${PICKER_SELECTED[@]}"; do
        SELECTED_SKILLS+=("${SKILL_PATHS[$i]}")
    done

    print_verbose "Selected ${#SELECTED_SKILLS[@]} skills"
}

# -----------------------------------------------------------------------------
# Conflict Detection
# -----------------------------------------------------------------------------

check_existing_skills() {
    local conflicts=()

    local path
    for path in "${SELECTED_SKILLS[@]}"; do
        local skill
        skill="$(basename "$path")"
        local dest_dir
        dest_dir="$(skill_dest_dir "$skill")"
        if [[ -d "$dest_dir/$skill" ]]; then
            conflicts+=("$path")
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
    for path in "${conflicts[@]}"; do
        echo "    - $(basename "$path")"
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
    local local_count=0
    local global_count=0
    local path
    for path in "${SELECTED_SKILLS[@]}"; do
        local skill
        skill="$(basename "$path")"
        local dest_dir
        dest_dir="$(skill_dest_dir "$skill")"
        mkdir -p "$dest_dir"
        # Read from the categorized source path, write flat as <dest>/<skill>
        cp -r "$SKILLS_SOURCE/$path" "$dest_dir/"
        if is_global_skill "$skill"; then
            global_count=$((global_count + 1))
            print_verbose "Imported (global): $skill -> $dest_dir/"
        else
            local_count=$((local_count + 1))
            print_verbose "Imported (local): $skill -> $dest_dir/"
        fi
    done

    echo ""
    if [[ "$local_count" -gt 0 ]]; then
        print_success "Imported $local_count skill(s) to $SKILLS_DEST/"
    fi
    if [[ "$global_count" -gt 0 ]]; then
        print_success "Imported $global_count skill(s) globally to $GLOBAL_SKILLS_DEST/"
    fi
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
    print_status "Destination (local): $SKILLS_DEST"
    print_status "Destination (global): $GLOBAL_SKILLS_DEST (${GLOBAL_SKILLS[*]})"
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
