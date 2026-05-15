#!/bin/bash

# =============================================================================
# Dev-OS Common Functions
# Shared utilities for Dev-OS scripts
# =============================================================================

# Colors for output
RED='\033[38;2;255;32;86m'
GREEN='\033[38;2;0;234;179m'
YELLOW='\033[38;2;255;185;0m'
BLUE='\033[38;2;0;208;255m'
PURPLE='\033[38;2;142;81;255m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Output Functions
# -----------------------------------------------------------------------------

# Print colored output
print_color() {
    local color=$1
    shift
    echo -e "${color}$@${NC}"
}

# Print section header
print_section() {
    echo ""
    print_color "$BLUE" "=== $1 ==="
    echo ""
}

# Print status message
print_status() {
    print_color "$BLUE" "$1"
}

# Print success message
print_success() {
    print_color "$GREEN" "✓ $1"
}

# Print warning message
print_warning() {
    print_color "$YELLOW" "⚠️  $1"
}

# Print error message
print_error() {
    print_color "$RED" "✗ $1"
}

# Print verbose message (only in verbose mode)
print_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[VERBOSE] $1" >&2
    fi
}

# -----------------------------------------------------------------------------
# YAML Parsing (Simple)
# -----------------------------------------------------------------------------

# Get a simple value from YAML (key: value format)
get_yaml_value() {
    local file=$1
    local key=$2
    local default=$3

    if [[ ! -f "$file" ]]; then
        echo "$default"
        return
    fi

    local value=$(grep "^${key}:" "$file" | sed "s/^${key}:[[:space:]]*//" | sed 's/[[:space:]]*$//')

    if [[ -n "$value" ]]; then
        echo "$value"
    else
        echo "$default"
    fi
}

# Get inherits_from value for a profile from config.yml
# Returns empty string if profile has no inheritance defined
get_profile_inherits_from() {
    local config_file=$1
    local profile_name=$2

    if [[ ! -f "$config_file" ]]; then
        echo ""
        return
    fi

    # Use awk to find the inherits_from value for the given profile
    # Format:
    # profiles:
    #   profile-name:
    #     inherits_from: parent-profile
    local value=$(awk -v profile="$profile_name" '
        /^profiles:/ { in_profiles=1; next }
        /^[a-zA-Z]/ && !/^[[:space:]]/ { in_profiles=0 }
        in_profiles && $0 ~ "^  "profile":$" { in_target=1; next }
        in_profiles && in_target && /^  [a-zA-Z0-9_-]+:$/ { in_target=0 }
        in_profiles && in_target && /inherits_from:/ {
            sub(/^[[:space:]]*inherits_from:[[:space:]]*/, "")
            gsub(/[[:space:]]*$/, "")
            print
            exit
        }
    ' "$config_file")

    echo "$value"
}

# Build the profile inheritance chain (from base to requested profile)
# Returns newline-separated list of profiles, base first
# Exits with error if circular dependency detected
get_profile_inheritance_chain() {
    local config_file=$1
    local profile_name=$2
    local profiles_dir=$3

    local chain=""
    local visited=""
    local current="$profile_name"

    # Build chain by following inherits_from links
    while [[ -n "$current" ]]; do
        # Check for circular dependency
        if echo "$visited" | grep -q "^${current}$"; then
            # Build the cycle path for error message
            local cycle_path="$current"
            local trace="$profile_name"
            while [[ "$trace" != "$current" ]] || [[ -z "$cycle_path" || "$cycle_path" == "$current" ]]; do
                local parent=$(get_profile_inherits_from "$config_file" "$trace")
                if [[ "$trace" == "$profile_name" ]]; then
                    cycle_path="$trace"
                else
                    cycle_path="$cycle_path → $trace"
                fi
                if [[ "$parent" == "$current" ]]; then
                    cycle_path="$cycle_path → $current"
                    break
                fi
                trace="$parent"
            done
            echo "CIRCULAR:$cycle_path"
            return 1
        fi

        # Check that profile directory exists
        if [[ ! -d "$profiles_dir/$current" ]]; then
            echo "NOTFOUND:$current"
            return 1
        fi

        # Add to visited list
        if [[ -n "$visited" ]]; then
            visited="$visited"$'\n'"$current"
        else
            visited="$current"
        fi

        # Add to chain (prepend so base ends up first)
        if [[ -n "$chain" ]]; then
            chain="$current"$'\n'"$chain"
        else
            chain="$current"
        fi

        # Get parent profile
        current=$(get_profile_inherits_from "$config_file" "$current")
    done

    echo "$chain"
}

# -----------------------------------------------------------------------------
# File Operations
# -----------------------------------------------------------------------------

# Create directory if it doesn't exist
ensure_dir() {
    local dir=$1
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        print_verbose "Created directory: $dir"
    fi
}

# Copy file with directory creation
copy_file() {
    local source=$1
    local dest=$2

    ensure_dir "$(dirname "$dest")"
    cp "$source" "$dest"
    print_verbose "Copied: $source -> $dest"
}

# Copy directory contents recursively (excluding .backups/)
copy_standards() {
    local source_dir=$1
    local dest_dir=$2
    local count=0

    if [[ ! -d "$source_dir" ]]; then
        return 0
    fi

    ensure_dir "$dest_dir"

    # Find all .md files, excluding .backups directory
    while IFS= read -r -d '' file; do
        local relative_path="${file#$source_dir/}"
        local dest_file="$dest_dir/$relative_path"

        ensure_dir "$(dirname "$dest_file")"
        cp "$file" "$dest_file"
        ((count++))
    done < <(find "$source_dir" -name "*.md" -type f ! -path "*/.backups/*" -print0 2>/dev/null)

    echo "$count"
}

# -----------------------------------------------------------------------------
# Interactive Multi-Select Picker
# -----------------------------------------------------------------------------
#
# Reusable keyboard-driven picker shared by the import-* scripts. Pure bash,
# constrained to macOS stock bash 3.2.57:
#   - read -rsn1 for single keys; ESC + (read -rsn2 -t 1) for arrow tails.
#     bash 3.2 rejects fractional `read -t`, so the integer 1s timeout is the
#     only viable lone-Esc disambiguation (Esc is the cancel action anyway).
#   - Every picker read uses `|| true` so an expected non-zero (timeout) does
#     not trip a caller's `set -e`.
#   - Cursor hidden via `tput civis`; restored by `_pk_restore` via an
#     INT/EXIT trap, detached on every normal return path so it does not fire
#     during a caller's later prompts.
#
# bash 3.2 lacks namerefs, so the calling convention is global arrays:
#   Caller sets : PICKER_NAMES[]  (display names, parallel to PICKER_DESCS)
#                 PICKER_DESCS[]  (descriptions, "" allowed)
#                 PICKER_NOUN     (e.g. "skills" — used in copy + non-TTY hint)
#   Returns     : PICKER_SELECTED[]  (0-based indices the user chose; >=1)
#   Exits       : 0 on q/Esc cancel; 1 when there is no interactive terminal.

_pk_set_all() {
    local v=$1 j
    for ((j=0; j<_PK_total; j++)); do _PK_sel[$j]=$v; done
}

_pk_restore() {
    tput cnorm 2>/dev/null || printf '\033[?25h'
}

_pk_read_key() {
    local k="" tail=""
    IFS= read -rsn1 k 2>/dev/null || true
    if [[ $k == $'\e' ]]; then
        # ESC: grab a 2-byte tail with an integer-second timeout.
        # Empty/timeout => lone Esc (cancel). Accept CSI and SS3 arrows.
        IFS= read -rsn2 -t 1 tail 2>/dev/null || true
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

_pk_render() {
    # Clear exactly what was drawn last frame (window height varies).
    # Cursor up N lines then clear to end of screen: one write, no
    # per-line tput subprocess (same raw-ANSI assumption as civis below).
    if [[ $_PK_prev_lines -gt 0 ]]; then
        printf '\033[%dA\033[J' "$_PK_prev_lines"
    fi

    # Re-read terminal height every frame so a mid-picker resize is absorbed.
    local term_lines
    term_lines=$(tput lines 2>/dev/null)
    [[ "$term_lines" =~ ^[0-9]+$ ]] || term_lines=24
    # Reserve: header + instruction + 2 scroll markers + count + status.
    local reserved=6
    local window_height=$((term_lines - reserved))
    [[ $window_height -lt 1 ]] && window_height=1
    [[ $window_height -gt $_PK_total ]] && window_height=$_PK_total

    # Clamp the window so the cursor is always visible.
    if [[ $_PK_cursor -lt $_PK_window_start ]]; then
        _PK_window_start=$_PK_cursor
    elif [[ $_PK_cursor -ge $((_PK_window_start + window_height)) ]]; then
        _PK_window_start=$((_PK_cursor - window_height + 1))
    fi
    [[ $_PK_window_start -lt 0 ]] && _PK_window_start=0
    local max_start=$((_PK_total - window_height))
    [[ $max_start -lt 0 ]] && max_start=0
    [[ $_PK_window_start -gt $max_start ]] && _PK_window_start=$max_start

    local n=0
    print_status "Select ${PICKER_NOUN} to import:"; ((n++)) || true
    echo "  ↑/↓ navigate   Space toggle   a all   n none   Enter confirm   q quit"; ((n++)) || true

    if [[ $_PK_window_start -gt 0 ]]; then
        echo "  ▲ more above"; ((n++)) || true
    fi

    local end=$((_PK_window_start + window_height))
    [[ $end -gt $_PK_total ]] && end=$_PK_total
    local idx
    for ((idx=_PK_window_start; idx<end; idx++)); do
        local g=" "; [[ $idx -eq $_PK_cursor ]] && g=">"
        local m=" "; [[ ${_PK_sel[$idx]} -eq 1 ]] && m="x"
        local desc="${PICKER_DESCS[$idx]}"
        if [[ ${#desc} -gt 60 ]]; then desc="${desc:0:57}..."; fi
        if [[ -n "$desc" ]]; then
            printf '%s [%s] %s — %s\n' "$g" "$m" "${PICKER_NAMES[$idx]}" "$desc"
        else
            printf '%s [%s] %s\n' "$g" "$m" "${PICKER_NAMES[$idx]}"
        fi
        ((n++)) || true
    done

    if [[ $end -lt $_PK_total ]]; then
        echo "  ▼ more below"; ((n++)) || true
    fi
    echo "  showing $((_PK_window_start + 1))-$end of $_PK_total"; ((n++)) || true

    if [[ -n "$_PK_status" ]]; then
        print_warning "$_PK_status"; ((n++)) || true
    fi

    _PK_prev_lines=$n
}

select_items() {
    PICKER_SELECTED=()

    # Non-TTY guard: no interactive terminal is a deterministic error,
    # not a hang in a raw-mode loop that cannot work.
    if [[ ! -t 0 || ! -t 1 ]]; then
        print_error "No interactive terminal; re-run with --all to import all ${PICKER_NOUN}."
        exit 1
    fi

    _PK_total=${#PICKER_NAMES[@]}
    _PK_cursor=0
    _PK_window_start=0
    _PK_prev_lines=0
    _PK_status=""
    _PK_sel=()
    _pk_set_all 0

    # Restore terminal on interrupt/exit; detached on every normal return.
    trap '_pk_restore' INT EXIT
    tput civis 2>/dev/null || printf '\033[?25l'

    # Redraw only when state changed. Stray bytes, mouse/paste data, and no-op
    # navigation (Up at top, Down at bottom) leave dirty=0 and skip the repaint
    # (and its tput-lines subprocess) entirely.
    local dirty=1
    local key i
    while true; do
        if [[ $dirty -eq 1 ]]; then _pk_render; fi
        dirty=0
        _PK_status=""
        key=$(_pk_read_key)
        case $key in
            UP)    if [[ $_PK_cursor -gt 0 ]]; then _PK_cursor=$((_PK_cursor - 1)); dirty=1; fi ;;
            DOWN)  if [[ $_PK_cursor -lt $((_PK_total - 1)) ]]; then _PK_cursor=$((_PK_cursor + 1)); dirty=1; fi ;;
            SPACE) _PK_sel[$_PK_cursor]=$((1 - _PK_sel[$_PK_cursor])); dirty=1 ;;
            ALL)   _pk_set_all 1; dirty=1 ;;
            NONE)  _pk_set_all 0; dirty=1 ;;
            ENTER)
                local any=0
                for ((i=0; i<_PK_total; i++)); do
                    if [[ ${_PK_sel[$i]} -eq 1 ]]; then any=1; break; fi
                done
                if [[ $any -eq 1 ]]; then break; fi
                _PK_status="Select at least one ${PICKER_NOUN%s}, or press q to cancel"
                dirty=1
                ;;
            QUIT|ESC)
                _pk_restore
                trap - INT EXIT
                echo
                print_status "Cancelled."
                exit 0
                ;;
        esac
    done

    _pk_restore
    trap - INT EXIT
    echo

    for ((i=0; i<_PK_total; i++)); do
        if [[ ${_PK_sel[$i]} -eq 1 ]]; then
            PICKER_SELECTED+=("$i")
        fi
    done
}
