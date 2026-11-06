#!/bin/bash

# =============================================================================
# Dev-OS Update All Script
# Find every Dev-OS asset already installed on this machine and bring the
# outdated ones up to date with the clone (run it after `git pull`)
# =============================================================================
#
# Nothing is installed that was not there before: each kind is matched by
# name against what this machine already has.
#
#   Copied assets   Compared file by file with the clone, copied when they
#                   differ. Looked for in ~/.claude (global) and in the
#                   .claude/ of every project Claude Code knows about
#                   (~/.claude.json and plugins/installed_plugins.json),
#                   plus any --project given.
#                     skills        <root>/skills/<name>/   (whole folder replaced)
#                     agents        <root>/agents/<name>.md
#                     workflows     ~/.claude/workflows/<name>.js
#                     output styles ~/.claude/output-styles/<name>.md
#                     hook          ~/.claude/hooks/log-skill.sh
#                   A symlinked skill or agents folder is skipped: it already
#                   points somewhere (npx skills packages, this clone).
#   Plugins / mods  Entries of external-plugins.yaml and external-mods.yaml
#                   that are installed, in each scope and project they are
#                   installed in. A dev-os marketplace plugin is outdated when
#                   its installed version differs from plugins/<name>'s
#                   plugin.json; any other marketplace is refreshed and
#                   `claude plugin update` tells whether there was a newer
#                   version. Builtin mods ship with Claude Code: skipped.
#   Skill packages  `npx skills update` globally (when ~/.agents/.skill-lock.json
#                   exists) and in each project with a skills-lock.json.
#   Skins           import-skins.sh, when the skins mod has a store.
#
# The scan changes nothing. The report lists what is outdated; the update
# runs after a confirmation (or --yes). --dry-run stops after the report.
#
# Bash 3.2 compatible (macOS stock bash): no associative arrays or mapfile.

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
DRY_RUN="false"
ASSUME_YES="false"
FILES_ONLY="false"

GLOBAL_ROOT="$HOME/.claude"
SKILLS_SOURCE="$HOME/dev-os/skills"
AGENTS_SOURCE="$HOME/dev-os/agents"
WORKFLOWS_SOURCE="$HOME/dev-os/workflows"
STYLES_SOURCE="$HOME/dev-os/output-styles"
HOOK_SOURCE="$HOME/dev-os/hooks/log-skill.sh"
SKINS_SOURCE="$HOME/dev-os/configs/claude-skins"
SKINS_STORE_PATTERN="$HOME/.claude/plugins/store/skins_hellosverre-mods-*.json"
INSTALLED_PLUGINS="$HOME/.claude/plugins/installed_plugins.json"
SKILL_LOCK_GLOBAL="$HOME/.agents/.skill-lock.json"

declare -a EXTRA_PROJECTS
declare -a PROJECTS          # project dirs whose .claude/ is scanned

# Curated skills in the clone: basename and path, parallel arrays.
declare -a SRC_SKILL_NAMES
declare -a SRC_SKILL_PATHS

# Outdated copied assets, parallel arrays: kind, source, destination.
declare -a COPY_KINDS
declare -a COPY_SRCS
declare -a COPY_DESTS
CURRENT_COPIES=0

# Installed catalog plugins/mods to update, parallel arrays.
declare -a PLUG_REFS         # name@marketplace
declare -a PLUG_SCOPES
declare -a PLUG_PROJECTS     # projectPath for project/local scope, else ""
declare -a PLUG_NOTES        # "0.2.1 -> 0.3.0", or "check" for external marketplaces
CURRENT_PLUGINS=0

# Projects with npx skill packages.
declare -a PACKAGE_PROJECTS
PACKAGE_GLOBAL="false"
SKINS_STORE="false"

# -----------------------------------------------------------------------------
# Help Function
# -----------------------------------------------------------------------------

show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Find the Dev-OS assets already installed on this machine (skills, agents,
workflows, output styles, the skill-usage hook, plugins, mods, npx skill
packages and skins) and update the outdated ones from this clone. Run it
after \`git pull\`. Nothing new is installed.

Projects are found in ~/.claude.json and the plugin registry; add others
with --project.

Options:
    --dry-run          Show what is outdated and stop
    -y, --yes          Update without asking for confirmation
    --project DIR      Also scan DIR's .claude/ (repeatable)
    --files-only       Update only copied files (skills, agents, workflows, output
                       styles, hook) and skins; skip plugins, mods and npx packages
    --verbose          Show command output
    -h, --help         Show this help message

Examples:
    $0 --dry-run
    $0
    $0 --yes --files-only

EOF
    exit "${1:-0}"
}

# -----------------------------------------------------------------------------
# Parse Command Line Arguments
# -----------------------------------------------------------------------------

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            -y|--yes)
                ASSUME_YES="true"
                shift
                ;;
            --project)
                if [[ -z "$2" || ! -d "$2" ]]; then
                    print_error "--project needs an existing directory"
                    show_help 1
                fi
                EXTRA_PROJECTS+=("$(cd "$2" && pwd)")
                shift 2
                ;;
            --files-only)
                FILES_ONLY="true"
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
                show_help 1
                ;;
        esac
    done
}

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

# Run a command, hiding its output unless --verbose.
run_quiet() {
    if [[ "$VERBOSE" == "true" ]]; then
        "$@"
    else
        "$@" >/dev/null 2>&1
    fi
}

# Path for display: $HOME shown as ~.
pretty() {
    local p="$1"
    if [[ "$p" == "$HOME"* ]]; then
        p="~${p#$HOME}"
    fi
    printf '%s' "$p"
}

# Physical path of an existing directory.
real_dir() {
    (cd "$1" 2>/dev/null && pwd -P)
}

# Echo the clone path of the curated skill named $1; fails when there is none.
source_skill_path() {
    local i
    for i in "${!SRC_SKILL_NAMES[@]}"; do
        if [[ "${SRC_SKILL_NAMES[$i]}" == "$1" ]]; then
            echo "$SKILLS_SOURCE/${SRC_SKILL_PATHS[$i]}"
            return 0
        fi
    done
    return 1
}

add_copy() {
    COPY_KINDS+=("$1")
    COPY_SRCS+=("$2")
    COPY_DESTS+=("$3")
}

# Queue $2 -> $3 (kind $1) when the destination differs from the source.
compare_file() {
    if cmp -s "$2" "$3"; then
        CURRENT_COPIES=$((CURRENT_COPIES + 1))
    else
        add_copy "$1" "$2" "$3"
    fi
}

# -----------------------------------------------------------------------------
# Discovery
# -----------------------------------------------------------------------------

discover_source_skills() {
    SRC_SKILL_NAMES=()
    SRC_SKILL_PATHS=()
    local skill_md dir
    while IFS= read -r skill_md; do
        dir="$(dirname "$skill_md")"
        SRC_SKILL_NAMES+=("$(basename "$dir")")
        SRC_SKILL_PATHS+=("${dir#$SKILLS_SOURCE/}")
    done < <(find "$SKILLS_SOURCE" -name SKILL.md -type f | sort)
    print_verbose "Clone has ${#SRC_SKILL_NAMES[@]} curated skills"
}

# Fills PROJECTS: every project Claude Code has opened or installed a plugin
# in, plus --project, that still exists. $HOME is left out (its .claude/ is
# the global root) and duplicates are dropped by physical path.
discover_projects() {
    PROJECTS=()
    local candidates=() p
    if command -v node >/dev/null 2>&1; then
        while IFS= read -r p; do
            [[ -n "$p" ]] && candidates+=("$p")
        done < <(node -e '
const fs = require("fs")
const home = process.env.HOME
const read = file => { try { return JSON.parse(fs.readFileSync(file, "utf8")) } catch { return {} } }
const out = new Set(Object.keys(read(`${home}/.claude.json`).projects || {}))
for (const entries of Object.values(read(`${home}/.claude/plugins/installed_plugins.json`).plugins || {})) {
  for (const entry of entries) if (entry.projectPath) out.add(entry.projectPath)
}
console.log([...out].join("\n"))
')
    else
        print_warning "node not found: only --project directories are scanned"
    fi
    candidates+=("${EXTRA_PROJECTS[@]}")

    local home_real seen=" " real
    home_real="$(real_dir "$HOME")"
    for p in "${candidates[@]}"; do
        [[ -d "$p/.claude" ]] || continue
        real="$(real_dir "$p")" || continue
        [[ "$real" == "$home_real" ]] && continue
        case "$seen" in *" $real "*) continue ;; esac
        seen="$seen$real "
        PROJECTS+=("$p")
    done
    print_verbose "Scanning ${#PROJECTS[@]} project(s)"
}

# -----------------------------------------------------------------------------
# Scan: copied assets
# -----------------------------------------------------------------------------

# Skills and agents in one .claude/ root ($1).
scan_root() {
    local root="$1" dest name src

    for dest in "$root"/skills/*; do
        [[ -d "$dest" && ! -L "$dest" ]] || continue
        name="$(basename "$dest")"
        src="$(source_skill_path "$name")" || continue
        if diff -rq -x .DS_Store "$src" "$dest" >/dev/null 2>&1; then
            CURRENT_COPIES=$((CURRENT_COPIES + 1))
        else
            add_copy skill "$src" "$dest"
        fi
    done

    # A symlinked agents folder (this clone's .claude/agents -> ../agents) is the source itself.
    if [[ -d "$root/agents" && ! -L "$root/agents" ]]; then
        for dest in "$root"/agents/*.md; do
            [[ -f "$dest" && ! -L "$dest" ]] || continue
            src="$AGENTS_SOURCE/$(basename "$dest")"
            [[ -f "$src" ]] || continue
            compare_file agent "$src" "$dest"
        done
    fi
}

# Workflows, output styles and the hook: global only.
scan_global_files() {
    local dest src
    for dest in "$GLOBAL_ROOT"/workflows/*.js; do
        [[ -f "$dest" && ! -L "$dest" ]] || continue
        src="$WORKFLOWS_SOURCE/$(basename "$dest")"
        [[ -f "$src" ]] && compare_file workflow "$src" "$dest"
    done
    for dest in "$GLOBAL_ROOT"/output-styles/*.md; do
        [[ -f "$dest" && ! -L "$dest" ]] || continue
        src="$STYLES_SOURCE/$(basename "$dest")"
        [[ -f "$src" ]] && compare_file output-style "$src" "$dest"
    done
    dest="$GLOBAL_ROOT/hooks/log-skill.sh"
    if [[ -f "$dest" && -f "$HOOK_SOURCE" ]]; then
        compare_file hook "$HOOK_SOURCE" "$dest"
    fi
}

scan_copies() {
    scan_root "$GLOBAL_ROOT"
    local p
    for p in "${PROJECTS[@]}"; do
        scan_root "$p/.claude"
    done
    scan_global_files
}

# -----------------------------------------------------------------------------
# Scan: plugins and mods
# -----------------------------------------------------------------------------

# Version in plugins/<name>/.claude-plugin/plugin.json, or empty.
local_plugin_version() {
    local manifest="$BASE_DIR/plugins/$1/.claude-plugin/plugin.json"
    [[ -f "$manifest" ]] || return 0
    node -e 'try { console.log(require(process.argv[1]).version || "") } catch { console.log("") }' "$manifest"
}

scan_plugins() {
    if ! command -v claude >/dev/null 2>&1; then
        print_warning "The 'claude' CLI was not found: plugins and mods are skipped"
        return
    fi
    if ! command -v node >/dev/null 2>&1 || [[ ! -f "$INSTALLED_PLUGINS" ]]; then
        print_verbose "No plugin registry readable: plugins and mods are skipped"
        return
    fi

    # name@marketplace of every catalog entry, builtin mods left out.
    local refs=" " records name desc marketplace rest
    records="$(load_plugins_catalog "$BASE_DIR/external-plugins.yaml")" || exit 1
    while IFS="$CATALOG_SEP" read -r name desc marketplace rest; do
        [[ -n "$name" ]] && refs="$refs$name@$marketplace "
    done <<< "$records"
    records="$(load_mods_catalog "$BASE_DIR/external-mods.yaml")" || exit 1
    while IFS="$CATALOG_SEP" read -r name desc marketplace rest; do
        [[ -n "$name" && "$marketplace" != "builtin" ]] && refs="$refs$name@$marketplace "
    done <<< "$records"

    local ref scope project version local_version
    while IFS="$CATALOG_SEP" read -r ref scope project version; do
        [[ -n "$ref" ]] || continue
        case "$refs" in *" $ref "*) ;; *) continue ;; esac
        if [[ "$scope" != "user" ]]; then
            [[ -d "$project" ]] || continue
        else
            project=""
        fi
        if [[ "${ref#*@}" == "dev-os" ]]; then
            local_version="$(local_plugin_version "${ref%@*}")"
            if [[ -z "$local_version" || "$local_version" == "$version" ]]; then
                CURRENT_PLUGINS=$((CURRENT_PLUGINS + 1))
                continue
            fi
            PLUG_NOTES+=("$version -> $local_version")
        else
            PLUG_NOTES+=("check")
        fi
        PLUG_REFS+=("$ref")
        PLUG_SCOPES+=("$scope")
        PLUG_PROJECTS+=("$project")
    done < <(node -e '
const data = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))
for (const [ref, entries] of Object.entries(data.plugins || {})) {
  for (const e of entries) console.log([ref, e.scope || "user", e.projectPath || "", e.version || ""].join("\x1f"))
}
' "$INSTALLED_PLUGINS")
}

# -----------------------------------------------------------------------------
# Scan: npx skill packages and skins
# -----------------------------------------------------------------------------

scan_packages() {
    PACKAGE_PROJECTS=()
    if ! command -v npx >/dev/null 2>&1; then
        print_warning "'npx' was not found: npx skill packages are skipped"
        return
    fi
    [[ -f "$SKILL_LOCK_GLOBAL" ]] && PACKAGE_GLOBAL="true"
    local p
    for p in "${PROJECTS[@]}"; do
        [[ -f "$p/skills-lock.json" ]] && PACKAGE_PROJECTS+=("$p")
    done
    return 0
}

scan_skins() {
    local file
    for file in $SKINS_STORE_PATTERN; do
        if [[ -f "$file" && -d "$SKINS_SOURCE" ]]; then
            SKINS_STORE="true"
            return 0
        fi
    done
    return 0
}

# -----------------------------------------------------------------------------
# Report
# -----------------------------------------------------------------------------

pending_count() {
    local n=$(( ${#COPY_KINDS[@]} + ${#PLUG_REFS[@]} + ${#PACKAGE_PROJECTS[@]} ))
    [[ "$PACKAGE_GLOBAL" == "true" ]] && n=$((n + 1))
    [[ "$SKINS_STORE" == "true" ]] && n=$((n + 1))
    echo "$n"
}

print_report() {
    local i
    print_status "Outdated files (${#COPY_KINDS[@]}; $CURRENT_COPIES already current):"
    if [[ ${#COPY_KINDS[@]} -eq 0 ]]; then
        echo "    none"
    fi
    for i in "${!COPY_KINDS[@]}"; do
        printf '    %-13s %s\n' "${COPY_KINDS[$i]}" "$(pretty "${COPY_DESTS[$i]}")"
    done

    if [[ "$FILES_ONLY" == "false" ]]; then
        echo ""
        print_status "Plugins and mods (${#PLUG_REFS[@]} to update or check; $CURRENT_PLUGINS dev-os already current):"
        if [[ ${#PLUG_REFS[@]} -eq 0 ]]; then
            echo "    none"
        fi
        for i in "${!PLUG_REFS[@]}"; do
            local where="${PLUG_SCOPES[$i]}"
            [[ -n "${PLUG_PROJECTS[$i]}" ]] && where="$where, $(pretty "${PLUG_PROJECTS[$i]}")"
            local note="${PLUG_NOTES[$i]}"
            [[ "$note" == "check" ]] && note="check for update"
            printf '    %-45s %s (%s)\n' "${PLUG_REFS[$i]}" "$note" "$where"
        done

        echo ""
        print_status "npx skill packages (checked by \`npx skills update\`):"
        if [[ "$PACKAGE_GLOBAL" == "false" && ${#PACKAGE_PROJECTS[@]} -eq 0 ]]; then
            echo "    none"
        fi
        [[ "$PACKAGE_GLOBAL" == "true" ]] && echo "    global"
        for i in "${!PACKAGE_PROJECTS[@]}"; do
            echo "    $(pretty "${PACKAGE_PROJECTS[$i]}")"
        done
    fi

    echo ""
    if [[ "$SKINS_STORE" == "true" ]]; then
        print_status "Skins: configs/claude-skins will be merged into the mod's store (import-skins.sh)"
    else
        print_status "Skins: the skins mod has no store on this machine; skipped"
    fi
}

confirm() {
    [[ "$ASSUME_YES" == "true" ]] && return 0
    if [[ ! -t 0 ]]; then
        print_error "No interactive terminal; re-run with --yes to update."
        exit 1
    fi
    local answer
    echo ""
    read -r -p "Update now? [y/N] " answer
    case "$answer" in
        y|Y|yes|s|S|sim) return 0 ;;
    esac
    print_status "Cancelled."
    exit 0
}

# -----------------------------------------------------------------------------
# Update Execution
# -----------------------------------------------------------------------------

UPDATED=0
UNCHANGED=0
declare -a FAILED

# A skill folder is replaced whole, so files removed from the clone go too.
apply_copies() {
    local i kind src dest
    for i in "${!COPY_KINDS[@]}"; do
        kind="${COPY_KINDS[$i]}"; src="${COPY_SRCS[$i]}"; dest="${COPY_DESTS[$i]}"
        if [[ "$kind" == "skill" ]]; then
            local tmp="$dest.dev-os-update.$$"
            if cp -R "$src" "$tmp" && rm -rf "$dest" && mv "$tmp" "$dest"; then
                :
            else
                rm -rf "$tmp"
                FAILED+=("$kind $(pretty "$dest")")
                continue
            fi
        elif ! cp "$src" "$dest"; then
            FAILED+=("$kind $(pretty "$dest")")
            continue
        fi
        [[ "$kind" == "hook" ]] && chmod +x "$dest"
        UPDATED=$((UPDATED + 1))
        print_success "$kind $(pretty "$dest")"
    done
}

apply_plugins() {
    [[ ${#PLUG_REFS[@]} -gt 0 ]] || return 0
    local refreshed=" " i ref marketplace scope project output status
    for i in "${!PLUG_REFS[@]}"; do
        ref="${PLUG_REFS[$i]}"; scope="${PLUG_SCOPES[$i]}"; project="${PLUG_PROJECTS[$i]}"
        marketplace="${ref#*@}"
        case "$refreshed" in
            *" $marketplace "*) ;;
            *)
                print_status "→ refreshing marketplace $marketplace..."
                run_quiet claude plugin marketplace update "$marketplace" || true
                refreshed="$refreshed$marketplace "
                ;;
        esac

        status=0
        if [[ -n "$project" ]]; then
            output="$(cd "$project" && claude plugin update "$ref" --scope "$scope" 2>&1)" || status=$?
        else
            output="$(claude plugin update "$ref" --scope "$scope" 2>&1)" || status=$?
        fi
        [[ "$VERBOSE" == "true" ]] && echo "$output"

        local label="$ref ($scope${project:+, $(pretty "$project")})"
        if [[ $status -ne 0 ]]; then
            print_error "$label: update failed"
            echo "$output" | tail -2 | sed 's/^/    /'
            FAILED+=("$label")
        elif echo "$output" | grep -qi "already at the latest"; then
            UNCHANGED=$((UNCHANGED + 1))
            print_status "  $label: already current"
        else
            UPDATED=$((UPDATED + 1))
            PLUGINS_CHANGED="true"
            print_success "$label: updated"
        fi
    done
}

apply_packages() {
    local cmd=(npx --yes skills@latest update --yes)
    if [[ "$PACKAGE_GLOBAL" == "true" ]]; then
        print_status "→ npx skill packages (global)..."
        if run_quiet "${cmd[@]}" --global; then
            UPDATED=$((UPDATED + 1))
            print_success "npx skill packages (global)"
        else
            FAILED+=("npx skill packages (global)")
        fi
    fi
    local p
    for p in "${PACKAGE_PROJECTS[@]}"; do
        print_status "→ npx skill packages in $(pretty "$p")..."
        if (cd "$p" && run_quiet "${cmd[@]}" --project); then
            UPDATED=$((UPDATED + 1))
            print_success "npx skill packages in $(pretty "$p")"
        else
            FAILED+=("npx skill packages in $(pretty "$p")")
        fi
    done
}

apply_skins() {
    [[ "$SKINS_STORE" == "true" ]] || return 0
    local args=()
    [[ "$VERBOSE" == "true" ]] && args+=(--verbose)
    # import-skins.sh reports what it merged; only a failure is counted here.
    if ! "$SCRIPT_DIR/import-skins.sh" "${args[@]}"; then
        FAILED+=("skins (import-skins.sh)")
    fi
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_section "Dev-OS Update All"

    parse_arguments "$@"

    if [[ "$(real_dir "$BASE_DIR")" != "$(real_dir "$HOME/dev-os")" ]]; then
        print_warning "This clone is at $BASE_DIR, but the scripts read from ~/dev-os"
    fi

    discover_source_skills
    discover_projects

    print_status "Scanning ~/.claude and ${#PROJECTS[@]} project(s)..."
    if [[ "$VERBOSE" == "true" ]]; then
        local p
        for p in "${PROJECTS[@]}"; do echo "    $(pretty "$p")"; done
    fi
    echo ""

    scan_copies
    if [[ "$FILES_ONLY" == "false" ]]; then
        scan_plugins
        scan_packages
    fi
    scan_skins

    print_report

    if [[ "$(pending_count)" -eq 0 ]]; then
        echo ""
        print_success "Everything is up to date."
        exit 0
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        echo ""
        print_status "Dry run: nothing was changed."
        exit 0
    fi

    confirm

    PLUGINS_CHANGED="false"
    print_section "Updating"
    apply_copies
    if [[ "$FILES_ONLY" == "false" ]]; then
        apply_plugins
        apply_packages
    fi
    apply_skins

    echo ""
    print_success "$UPDATED updated, $UNCHANGED already current"
    if [[ "$PLUGINS_CHANGED" == "true" ]]; then
        print_status "Run /reload-plugins in open Claude Code sessions to apply."
    fi
    if [[ ${#FAILED[@]} -gt 0 ]]; then
        print_error "${#FAILED[@]} failed:"
        local f
        for f in "${FAILED[@]}"; do
            echo "    - $f"
        done
        exit 1
    fi
    echo ""
}

# Run main function
main "$@"
