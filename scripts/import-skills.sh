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
#
# Interactive keyboard-driven multi-select picker. Pure bash, constrained to
# macOS stock bash 3.2.57:
#   - read -rsn1 for single keys; ESC + (read -rsn2 -t 1) for arrow tails.
#     bash 3.2 rejects fractional `read -t`, so the integer 1s timeout is the
#     only viable lone-ESC disambiguation (Esc is the cancel action anyway).
#   - Every picker read uses `|| true` so an expected non-zero (timeout) does
#     not trip the script-wide `set -e`.
#   - Cursor hidden via `tput civis`; restored by `_picker_restore` via an
#     INT/EXIT trap, detached on every normal return path so it does not fire
#     during the later conflict/import prompts.
# Written as a single self-contained function so the deferred extraction into
# common-functions.sh (shared with import-agents.sh) is a move, not a rewrite.

select_skills() {
    # If --all was specified, select all skills
    if [[ "$IMPORT_ALL" == "true" ]]; then
        SELECTED_SKILLS=("${SKILL_DIRS[@]}")
        print_verbose "Selected all ${#SELECTED_SKILLS[@]} skills"
        return
    fi

    # Non-TTY guard: no interactive terminal and not --all is a deterministic
    # error, not a hang in a raw-mode loop that cannot work.
    if [[ ! -t 0 || ! -t 1 ]]; then
        print_error "No interactive terminal; re-run with --all to import all skills."
        exit 1
    fi

    local total=${#SKILL_DIRS[@]}
    local -a selected
    local i

    local cursor=0
    local window_start=0
    local prev_lines=0
    local status_msg=""

    _picker_set_all() {
        local v=$1 j
        for ((j=0; j<total; j++)); do selected[$j]=$v; done
    }
    _picker_set_all 0   # start with everything deselected

    _picker_restore() {
        tput cnorm 2>/dev/null || printf '\033[?25h'
    }

    # Restore terminal on interrupt/exit; detached on every normal return below.
    trap '_picker_restore' INT EXIT

    _picker_read_key() {
        local k="" tail=""
        IFS= read -rsn1 k 2>/dev/null || true
        if [[ $k == $'\e' ]]; then
            # ESC: grab a 2-byte CSI tail with an integer-second timeout.
            # Empty/timeout => lone Esc (cancel).
            IFS= read -rsn2 -t 1 tail 2>/dev/null || true
            # Accept both CSI (ESC [ A) and SS3 (ESC O A) arrow encodings;
            # terminals in application-cursor-keys mode send the latter.
            case $tail in
                '[A'|'OA') printf 'UP' ;;
                '[B'|'OB') printf 'DOWN' ;;
                '')        printf 'ESC' ;;
                *)         printf 'OTHER' ;;
            esac
            return
        fi
        case $k in
            ''|$'\n'|$'\r') printf 'ENTER' ;;
            ' ')            printf 'SPACE' ;;
            a|A)            printf 'ALL' ;;
            n|N)            printf 'NONE' ;;
            q|Q)            printf 'QUIT' ;;
            *)              printf 'OTHER' ;;
        esac
    }

    _picker_render() {
        # Clear exactly what was drawn last frame (window height varies).
        # Cursor up N lines then clear to end of screen: one write, no
        # per-line tput subprocess (same raw-ANSI assumption as civis below).
        if [[ $prev_lines -gt 0 ]]; then
            printf '\033[%dA\033[J' "$prev_lines"
        fi

        # Re-read terminal height every frame so a mid-picker resize is absorbed.
        local term_lines
        term_lines=$(tput lines 2>/dev/null)
        [[ "$term_lines" =~ ^[0-9]+$ ]] || term_lines=24
        # Reserve: header + instruction + 2 scroll markers + count + status.
        local reserved=6
        local window_height=$((term_lines - reserved))
        [[ $window_height -lt 1 ]] && window_height=1
        [[ $window_height -gt $total ]] && window_height=$total

        # Clamp the window so the cursor is always visible.
        if [[ $cursor -lt $window_start ]]; then
            window_start=$cursor
        elif [[ $cursor -ge $((window_start + window_height)) ]]; then
            window_start=$((cursor - window_height + 1))
        fi
        [[ $window_start -lt 0 ]] && window_start=0
        local max_start=$((total - window_height))
        [[ $max_start -lt 0 ]] && max_start=0
        [[ $window_start -gt $max_start ]] && window_start=$max_start

        local n=0
        print_status "Select skills to import:"; ((n++)) || true
        echo "  ↑/↓ navigate   Space toggle   a all   n none   Enter confirm   q quit"; ((n++)) || true

        if [[ $window_start -gt 0 ]]; then
            echo "  ▲ more above"; ((n++)) || true
        fi

        local end=$((window_start + window_height))
        [[ $end -gt $total ]] && end=$total
        local idx
        for ((idx=window_start; idx<end; idx++)); do
            local g=" "; [[ $idx -eq $cursor ]] && g=">"
            local m=" "; [[ ${selected[$idx]} -eq 1 ]] && m="x"
            local desc="${SKILL_DESCRIPTIONS[$idx]}"
            if [[ ${#desc} -gt 60 ]]; then desc="${desc:0:57}..."; fi
            if [[ -n "$desc" ]]; then
                printf '%s [%s] %s — %s\n' "$g" "$m" "${SKILL_NAMES[$idx]}" "$desc"
            else
                printf '%s [%s] %s\n' "$g" "$m" "${SKILL_NAMES[$idx]}"
            fi
            ((n++)) || true
        done

        if [[ $end -lt $total ]]; then
            echo "  ▼ more below"; ((n++)) || true
        fi
        echo "  showing $((window_start + 1))-$end of $total"; ((n++)) || true

        if [[ -n "$status_msg" ]]; then
            print_warning "$status_msg"; ((n++)) || true
        fi

        prev_lines=$n
    }

    tput civis 2>/dev/null || printf '\033[?25l'

    # Redraw only when state changed. Stray bytes, mouse/paste data, and no-op
    # navigation (Up at top, Down at bottom) leave dirty=0 and skip the repaint
    # (and its tput-lines subprocess) entirely.
    local dirty=1
    local key
    while true; do
        if [[ $dirty -eq 1 ]]; then _picker_render; fi
        dirty=0
        status_msg=""
        key=$(_picker_read_key)
        case $key in
            UP)    if [[ $cursor -gt 0 ]]; then cursor=$((cursor - 1)); dirty=1; fi ;;
            DOWN)  if [[ $cursor -lt $((total - 1)) ]]; then cursor=$((cursor + 1)); dirty=1; fi ;;
            SPACE) selected[$cursor]=$((1 - selected[$cursor])); dirty=1 ;;
            ALL)   _picker_set_all 1; dirty=1 ;;
            NONE)  _picker_set_all 0; dirty=1 ;;
            ENTER)
                local any=0
                for ((i=0; i<total; i++)); do
                    if [[ ${selected[$i]} -eq 1 ]]; then any=1; break; fi
                done
                if [[ $any -eq 1 ]]; then break; fi
                status_msg="Select at least one skill, or press q to cancel"
                dirty=1
                ;;
            QUIT|ESC)
                _picker_restore
                trap - INT EXIT
                echo
                print_status "Cancelled."
                exit 0
                ;;
        esac
    done

    _picker_restore
    trap - INT EXIT
    echo

    # Build selected skills array
    SELECTED_SKILLS=()
    for ((i=0; i<total; i++)); do
        if [[ ${selected[$i]} -eq 1 ]]; then
            SELECTED_SKILLS+=("${SKILL_DIRS[$i]}")
        fi
    done

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
