#!/bin/bash

# =============================================================================
# Dev-OS Sync Third-Party Skills Script
# Report upstream changes to third-party skills, show them, or merge them in
# =============================================================================
#
# A third-party skill is a skill under skills/ whose SKILL.md frontmatter has
# `metadata.last_synced` (see CONTEXT.md). Its `metadata.source` must be one of:
#
#   https://github.com/OWNER/REPO/tree/REF[/PATH]     the skill directory
#   https://gist.github.com/USER/ID#file-NAME         one file, becomes SKILL.md
#
# Unlike the import scripts, this one always works on the Dev-OS clone itself,
# whatever the current directory.
#
# Merge base: the last upstream commit (or gist revision) touching the skill
# up to 23:59:59 UTC on the `last_synced` day. With only a date this is a
# best guess: if upstream had several commits that day, or got one after the
# copy on the same day, the base may be off. Review the diff before applying.
#
# Default mode: print a status table, pick skills with upstream changes, and
# show the upstream diff (base → upstream now) for each, i.e. what --apply
# would bring in.
#
# --apply: three-way merge per file (ours = local, base, theirs = upstream now):
#
#   base  local      upstream  action
#   yes   yes        yes       git merge-file (conflict markers on conflict)
#   no    -          yes       add (new upstream file; merge if also local)
#   yes   no         any       skip (removed locally on purpose)
#   yes   = base     no        delete
#   yes   changed    no        keep, reported as a conflict
#   no    yes        no        keep (local-only file)
#
# Then `metadata.last_synced` is set to today (UTC), even when there are
# conflicts. A skill with uncommitted changes is refused, so
# `git checkout -- <skill dir>` always undoes an apply. Nothing is committed.
#
# Downloaded upstream files go to a fresh temp dir and are never executed.

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
SELECT_ALL="false"
APPLY="false"

SKILLS_DIR="$BASE_DIR/skills"
TODAY="$(date -u +%Y-%m-%d)"
WORK_DIR=""

GITHUB_SOURCE_RE='^https://github\.com/([^/]+)/([^/]+)/tree/([^/]+)(/(.+))?$'
GIST_SOURCE_RE='^https://gist\.github\.com/([^/]+)/([0-9a-f]+)#file-(.+)$'
DATE_RE='^[0-9]{4}-[0-9]{2}-[0-9]{2}$'

# Parallel arrays (bash 3.2: no associative arrays).
declare -a SKILL_NAMES
declare -a SKILL_DIRS
declare -a SKILL_SYNCED
declare -a SKILL_CHANGES
declare -a UP_KIND      # github | gist
declare -a UP_OWNER     # GitHub owner or gist user
declare -a UP_REPO      # GitHub repo or gist id
declare -a UP_REF       # GitHub branch (empty for gists)
declare -a UP_PATH      # path inside the repo, or the gist #file- anchor
declare -a UP_BASE      # upstream commit/revision at last_synced
declare -a UP_HEAD      # upstream commit/revision now
declare -a UP_PENDING   # number of upstream changes after the base
declare -a UP_LATEST    # date of the newest upstream change
declare -a UP_ERROR     # "true" when the upstream could not be resolved
declare -a STALE_SKILLS
declare -a SELECTED_SKILLS
declare -a CONFLICTS

# -----------------------------------------------------------------------------
# Frontmatter
# -----------------------------------------------------------------------------

# Print the value of `metadata.<key>` from a SKILL.md frontmatter (empty if
# absent). Quotes are stripped; on unquoted values a trailing `# comment` is.
get_metadata_value() {
    local file=$1 key=$2
    awk -v key="$key" '
        NR == 1 { if ($0 != "---") exit; next }
        $0 == "---" { exit }
        /^metadata:[[:space:]]*$/ { inmeta = 1; next }
        inmeta && /^[^[:space:]]/ { inmeta = 0 }
        inmeta {
            line = $0
            sub(/^[[:space:]]+/, "", line)
            if (index(line, key ":") != 1) next
            v = substr(line, length(key) + 2)
            sub(/^[[:space:]]+/, "", v)
            if (v ~ /^"/ && match(v, /^"[^"]*"/)) v = substr(v, 2, RLENGTH - 2)
            else if (v ~ /^'\''/ && match(v, /^'\''[^'\'']*'\''/)) v = substr(v, 2, RLENGTH - 2)
            else { sub(/[[:space:]]+#.*$/, "", v); sub(/[[:space:]]+$/, "", v) }
            print v
            exit
        }
    ' "$file"
}

# Set `metadata.last_synced` in a SKILL.md frontmatter, keeping indentation.
set_last_synced() {
    local file=$1 date=$2
    local tmp
    tmp="$(mktemp)"
    awk -v date="$date" '
        NR == 1 && $0 == "---" { fm = 1; print; next }
        fm && $0 == "---" { fm = 0 }
        fm && /^metadata:[[:space:]]*$/ { inmeta = 1; print; next }
        fm && inmeta && /^[^[:space:]]/ { inmeta = 0 }
        fm && inmeta && /^[[:space:]]+last_synced:/ {
            match($0, /^[[:space:]]+/)
            print substr($0, 1, RLENGTH) "last_synced: \"" date "\""
            next
        }
        { print }
    ' "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
}

# -----------------------------------------------------------------------------
# Skill Discovery
# -----------------------------------------------------------------------------

load_skills() {
    local file dir name synced src
    while IFS= read -r file; do
        # Markers left by a previous --apply hide frontmatter keys.
        if grep -q '^<<<<<<< local' "$file"; then
            print_error "${file#"$BASE_DIR"/}: unresolved merge conflict; resolve it first"
            exit 1
        fi
        synced="$(get_metadata_value "$file" last_synced)"
        [[ -z "$synced" ]] && continue

        dir="$(dirname "$file")"
        name="$(basename "$dir")"
        src="$(get_metadata_value "$file" source)"

        if [[ ! "$synced" =~ $DATE_RE ]]; then
            print_error "$name: metadata.last_synced \"$synced\" is not YYYY-MM-DD"
            exit 1
        fi

        if [[ "$src" =~ $GITHUB_SOURCE_RE ]]; then
            UP_KIND+=("github")
            UP_OWNER+=("${BASH_REMATCH[1]}")
            UP_REPO+=("${BASH_REMATCH[2]}")
            UP_REF+=("${BASH_REMATCH[3]}")
            UP_PATH+=("${BASH_REMATCH[5]%/}")
        elif [[ "$src" =~ $GIST_SOURCE_RE ]]; then
            UP_KIND+=("gist")
            UP_OWNER+=("${BASH_REMATCH[1]}")
            UP_REPO+=("${BASH_REMATCH[2]}")
            UP_REF+=("")
            UP_PATH+=("${BASH_REMATCH[3]}")
        else
            print_error "$name: unsupported metadata.source \"$src\""
            echo "    Expected https://github.com/OWNER/REPO/tree/REF[/PATH]"
            echo "    or https://gist.github.com/USER/ID#file-NAME"
            exit 1
        fi

        SKILL_NAMES+=("$name")
        SKILL_DIRS+=("$dir")
        SKILL_SYNCED+=("$synced")
        SKILL_CHANGES+=("$(get_metadata_value "$file" local_changes)")
    done < <(find "$SKILLS_DIR" -name SKILL.md | sort)

    print_verbose "Found ${#SKILL_NAMES[@]} third-party skills"
    if [[ ${#SKILL_NAMES[@]} -eq 0 ]]; then
        print_error "No third-party skills (metadata.last_synced) found under $SKILLS_DIR"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Upstream Status
# -----------------------------------------------------------------------------

# Sets BASE, HEAD, PENDING and LATEST for skill $1. Returns 1 on API errors.
resolve_github() {
    local i=$1
    local boundary="${SKILL_SYNCED[$i]}T23:59:59Z"
    local args=(-X GET "repos/${UP_OWNER[$i]}/${UP_REPO[$i]}/commits" -f "sha=${UP_REF[$i]}")
    [[ -n "${UP_PATH[$i]}" ]] && args+=(-f "path=${UP_PATH[$i]}")

    HEAD="$(gh api "${args[@]}" -f per_page=1 --jq '.[0].sha // empty')" || return 1
    BASE="$(gh api "${args[@]}" -f per_page=1 -f "until=$boundary" --jq '.[0].sha // empty')" || return 1

    local dates
    dates="$(gh api "${args[@]}" -f per_page=100 -f "since=$boundary" --paginate \
        --jq '.[].commit.committer.date')" || return 1
    PENDING=0
    LATEST=""
    if [[ -n "$dates" ]]; then
        PENDING="$(printf '%s\n' "$dates" | wc -l | tr -d ' ')"
        LATEST="$(printf '%s\n' "$dates" | head -n 1)"
    fi
}

resolve_gist() {
    local i=$1
    local boundary="${SKILL_SYNCED[$i]}T23:59:59Z"
    local history
    history="$(gh api "gists/${UP_REPO[$i]}" \
        --jq '.history[] | [.version, .committed_at] | @tsv')" || return 1

    # History is newest first; ISO-8601 UTC timestamps compare as strings.
    HEAD="" BASE="" PENDING=0 LATEST=""
    local version at
    while IFS=$'\t' read -r version at; do
        [[ -z "$version" ]] && continue
        if [[ -z "$HEAD" ]]; then HEAD="$version"; LATEST="$at"; fi
        if [[ "$at" > "$boundary" ]]; then
            PENDING=$((PENDING + 1))
        elif [[ -z "$BASE" ]]; then
            BASE="$version"
        fi
    done <<< "$history"
    [[ "$PENDING" -eq 0 ]] && LATEST=""
    return 0
}

resolve_upstream() {
    local i=$1
    local name="${SKILL_NAMES[$i]}"
    HEAD="" BASE="" PENDING=0 LATEST=""

    print_verbose "$name: resolving ${UP_KIND[$i]} upstream"
    if ! "resolve_${UP_KIND[$i]}" "$i"; then
        print_error "$name: could not query the upstream"
        return 1
    fi
    if [[ -z "$HEAD" ]]; then
        print_error "$name: upstream path not found"
        return 1
    fi
    if [[ -z "$BASE" ]]; then
        print_error "$name: no upstream change on or before last_synced ${SKILL_SYNCED[$i]}"
        return 1
    fi
}

check_upstreams() {
    local n=${#SKILL_NAMES[@]}
    local i
    for ((i=0; i<n; i++)); do
        if resolve_upstream "$i"; then
            UP_ERROR[$i]="false"
        else
            UP_ERROR[$i]="true"
        fi
        UP_BASE[$i]="$BASE"
        UP_HEAD[$i]="$HEAD"
        UP_PENDING[$i]="$PENDING"
        UP_LATEST[$i]="${LATEST%%T*}"
        if [[ "${UP_ERROR[$i]}" == "false" && "$BASE" != "$HEAD" ]]; then
            STALE_SKILLS+=("$i")
        fi
    done
}

print_status_table() {
    local n=${#SKILL_NAMES[@]}
    local i status
    printf "  %-24s %-12s %s\n" "Skill" "Last synced" "Upstream"
    for ((i=0; i<n; i++)); do
        if [[ "${UP_ERROR[$i]}" == "true" ]]; then
            status="error"
        elif [[ "${UP_BASE[$i]}" == "${UP_HEAD[$i]}" ]]; then
            status="up to date"
        else
            status="${UP_PENDING[$i]} change(s), latest ${UP_LATEST[$i]}"
        fi
        printf "  %-24s %-12s %s\n" "${SKILL_NAMES[$i]}" "${SKILL_SYNCED[$i]}" "$status"
    done
}

# -----------------------------------------------------------------------------
# Upstream Snapshots
# -----------------------------------------------------------------------------

# Write the upstream skill files of skill $1 at commit/revision $2 into $3.
fetch_github() {
    local i=$1 sha=$2 dest=$3
    local repo="repos/${UP_OWNER[$i]}/${UP_REPO[$i]}"
    local treeish="$sha"
    [[ -n "${UP_PATH[$i]}" ]] && treeish="$sha:${UP_PATH[$i]}"

    local entries
    entries="$(gh api "$repo/git/trees/$treeish?recursive=1" \
        --jq '(if .truncated then "TRUNCATED\t" else empty end),
              (.tree[] | select(.type == "blob") | [.sha, .mode, .path] | @tsv)')" || return 1

    local blob mode path
    while IFS=$'\t' read -r blob mode path; do
        [[ -z "$blob" ]] && continue
        if [[ "$blob" == "TRUNCATED" ]]; then
            print_error "${SKILL_NAMES[$i]}: upstream tree listing is truncated"
            return 1
        fi
        case "/$path/" in
            */../*) print_error "${SKILL_NAMES[$i]}: unsafe upstream path $path"; return 1 ;;
        esac
        mkdir -p "$dest/$(dirname "$path")"
        gh api "$repo/git/blobs/$blob" -H "Accept: application/vnd.github.raw" \
            > "$dest/$path" || return 1
        if [[ "$mode" == "100755" ]]; then chmod +x "$dest/$path"; fi
    done <<< "$entries"
}

fetch_gist() {
    local i=$1 version=$2 dest=$3
    local files
    files="$(gh api "gists/${UP_REPO[$i]}/$version" \
        --jq '.files | to_entries[] | [.key, (.value.content | @base64)] | @tsv')" || return 1

    # GitHub's #file- anchor: the file name lowercased, non-alphanumerics → "-".
    local fname content anchor
    while IFS=$'\t' read -r fname content; do
        anchor="$(printf '%s' "$fname" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')"
        if [[ "$anchor" == "${UP_PATH[$i]}" ]]; then
            mkdir -p "$dest"
            printf '%s' "$content" | base64 --decode > "$dest/SKILL.md"
            return 0
        fi
    done <<< "$files"
    print_error "${SKILL_NAMES[$i]}: gist revision ${version:0:7} has no file matching #file-${UP_PATH[$i]}"
    return 1
}

# Fetch base and upstream-now snapshots of skill $1 into $WORK_DIR/<name>/.
fetch_snapshots() {
    local i=$1
    local tmp="$WORK_DIR/${SKILL_NAMES[$i]}"
    mkdir -p "$tmp/base" "$tmp/upstream"
    print_verbose "${SKILL_NAMES[$i]}: fetching ${UP_BASE[$i]:0:7} and ${UP_HEAD[$i]:0:7}"
    "fetch_${UP_KIND[$i]}" "$i" "${UP_BASE[$i]}" "$tmp/base" || return 1
    "fetch_${UP_KIND[$i]}" "$i" "${UP_HEAD[$i]}" "$tmp/upstream" || return 1
}

# -----------------------------------------------------------------------------
# Diff (default mode)
# -----------------------------------------------------------------------------

show_diff() {
    local i=$1
    local name="${SKILL_NAMES[$i]}"
    print_section "$name: upstream ${UP_BASE[$i]:0:7} → ${UP_HEAD[$i]:0:7} (${UP_PENDING[$i]} change(s) since ${SKILL_SYNCED[$i]})"
    fetch_snapshots "$i" || return 1
    (cd "$WORK_DIR/$name" && git diff --no-index --stat --summary -p -- base upstream) || true
}

# -----------------------------------------------------------------------------
# Apply (three-way merge)
# -----------------------------------------------------------------------------

# Merge $3 (upstream) into $1 (local) with base $2; records conflicts.
merge_file() {
    local local_file=$1 base_file=$2 upstream_file=$3 label=$4
    local rc=0
    git merge-file -L local -L base -L upstream "$local_file" "$base_file" "$upstream_file" || rc=$?
    if [[ $rc -eq 0 ]]; then
        echo "    merged    $label"
    elif [[ $rc -gt 0 ]]; then
        echo "    CONFLICT  $label"
        CONFLICTS+=("$label")
    else
        print_error "git merge-file failed on $label"
        return 1
    fi
}

apply_one() {
    local i=$1
    local name="${SKILL_NAMES[$i]}"
    local dir="${SKILL_DIRS[$i]}"
    local rel="${dir#"$BASE_DIR"/}"

    print_section "$name: merging upstream ${UP_BASE[$i]:0:7} → ${UP_HEAD[$i]:0:7}"

    if [[ -n "$(git -C "$BASE_DIR" status --porcelain -- "$rel")" ]]; then
        print_error "$name: $rel has uncommitted changes; commit or stash them first"
        return 1
    fi

    fetch_snapshots "$i" || return 1
    local base="$WORK_DIR/$name/base"
    local upstream="$WORK_DIR/$name/upstream"

    local f in_base in_local in_upstream
    while IFS= read -r f; do
        [[ -z "$f" ]] && continue
        in_base="false"; in_local="false"; in_upstream="false"
        [[ -f "$base/$f" ]] && in_base="true"
        [[ -f "$dir/$f" ]] && in_local="true"
        [[ -f "$upstream/$f" ]] && in_upstream="true"

        if [[ "$in_base" == "true" && "$in_local" == "false" ]]; then
            print_verbose "$f: removed locally, not restored"
        elif [[ "$in_upstream" == "true" && "$in_local" == "false" ]]; then
            mkdir -p "$(dirname "$dir/$f")"
            cp "$upstream/$f" "$dir/$f"
            echo "    added     $rel/$f"
        elif [[ "$in_upstream" == "true" ]]; then
            if cmp -s "$dir/$f" "$upstream/$f"; then
                continue
            elif [[ "$in_base" == "true" ]]; then
                cmp -s "$base/$f" "$upstream/$f" && continue
                merge_file "$dir/$f" "$base/$f" "$upstream/$f" "$rel/$f" || return 1
            else
                merge_file "$dir/$f" /dev/null "$upstream/$f" "$rel/$f" || return 1
            fi
        elif [[ "$in_base" == "true" ]]; then
            # Deleted upstream.
            if cmp -s "$dir/$f" "$base/$f"; then
                rm "$dir/$f"
                echo "    deleted   $rel/$f"
            else
                echo "    CONFLICT  $rel/$f (deleted upstream, changed locally; kept)"
                CONFLICTS+=("$rel/$f")
            fi
        fi
        # Local-only files are kept as they are.
    done < <( { (cd "$base" && find . -type f); (cd "$upstream" && find . -type f);
                (cd "$dir" && find . -type f); } | sed 's|^\./||' | sort -u )

    find "$dir" -mindepth 1 -type d -empty -delete
    set_last_synced "$dir/SKILL.md" "$TODAY"
    print_success "$name: last_synced set to $TODAY"

    local changes="${SKILL_CHANGES[$i]}"
    if [[ -n "$changes" && "$changes" != "None." ]]; then
        print_status "  Local changes to keep: $changes"
    fi
}

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << HELP
Usage: $0 [OPTIONS]

Check third-party skills (metadata.last_synced in SKILL.md) against their
upstream (metadata.source). Without --apply, pick skills with upstream
changes and show the upstream diff since last_synced. With --apply, merge
those changes into the local copy (three-way merge) and set last_synced to
today. Always works on the Dev-OS clone, whatever the current directory.

Options:
    --apply            Merge upstream changes into the selected skills
    --all              Select every skill with upstream changes (skip the picker)
    --verbose          Show detailed progress
    -h, --help         Show this help message

Examples:
    $0
    $0 --all
    $0 --apply

HELP
    exit 0
}

# -----------------------------------------------------------------------------
# Parse Command Line Arguments
# -----------------------------------------------------------------------------

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --apply)
                APPLY="true"
                shift
                ;;
            --all)
                SELECT_ALL="true"
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
    if ! command -v gh >/dev/null 2>&1; then
        print_error "'gh' (GitHub CLI) was not found on PATH."
        exit 1
    fi
    if ! gh auth status >/dev/null 2>&1; then
        print_error "'gh' is not authenticated; run: gh auth login"
        exit 1
    fi
}

# -----------------------------------------------------------------------------
# Selection
# -----------------------------------------------------------------------------

select_skills() {
    if [[ "$SELECT_ALL" == "true" ]]; then
        SELECTED_SKILLS=("${STALE_SKILLS[@]}")
        print_verbose "Selected all ${#SELECTED_SKILLS[@]} skills with upstream changes"
        return
    fi

    # Interactive keyboard picker (shared, in common-functions.sh).
    PICKER_NAMES=()
    PICKER_DESCS=()
    local i
    for i in "${STALE_SKILLS[@]}"; do
        PICKER_NAMES+=("${SKILL_NAMES[$i]}")
        PICKER_DESCS+=("${UP_PENDING[$i]} upstream change(s) since ${SKILL_SYNCED[$i]}")
    done
    PICKER_NOUN="skills"
    select_items

    SELECTED_SKILLS=()
    local p
    for p in "${PICKER_SELECTED[@]}"; do
        SELECTED_SKILLS+=("${STALE_SKILLS[$p]}")
    done
    print_verbose "Selected ${#SELECTED_SKILLS[@]} skills"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Sync Third-Party Skills"

    parse_arguments "$@"
    validate_environment
    load_skills

    print_status "Checking upstream for ${#SKILL_NAMES[@]} third-party skills..."
    echo ""
    check_upstreams
    echo ""
    print_status_table
    echo ""

    local failed=0
    local i
    for i in "${UP_ERROR[@]}"; do
        [[ "$i" == "true" ]] && failed=$((failed + 1))
    done

    if [[ ${#STALE_SKILLS[@]} -eq 0 ]]; then
        print_success "No upstream changes to sync"
        [[ $failed -gt 0 ]] && exit 1
        exit 0
    fi

    select_skills

    # Set after the picker, which installs and clears its own EXIT trap.
    WORK_DIR="$(mktemp -d)"
    trap 'rm -rf "$WORK_DIR"' EXIT

    for i in "${SELECTED_SKILLS[@]}"; do
        if [[ "$APPLY" == "true" ]]; then
            apply_one "$i" || failed=$((failed + 1))
        else
            show_diff "$i" || failed=$((failed + 1))
        fi
    done

    echo ""
    if [[ "$APPLY" == "true" ]]; then
        if [[ ${#CONFLICTS[@]} -gt 0 ]]; then
            print_warning "${#CONFLICTS[@]} conflict(s) to resolve by hand:"
            local c
            for c in "${CONFLICTS[@]}"; do
                echo "    - $c"
            done
        fi
        print_status "Review with: git -C $BASE_DIR diff; undo a skill with: git -C $BASE_DIR checkout -- <skill dir>"
    fi
    if [[ $failed -gt 0 ]]; then
        print_error "$failed skill(s) failed"
    fi
    if [[ $failed -gt 0 || ${#CONFLICTS[@]} -gt 0 ]]; then
        exit 1
    fi
}

# Run main function
main "$@"
