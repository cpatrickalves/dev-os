#!/bin/bash
# Setup script for Claude Code skill-usage logging hook
# Run this on any new machine to install the hook

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# 1. Install the hook script from the versioned source
HOOK_SOURCE="$BASE_DIR/hooks/log-skill.sh"

if [ ! -f "$HOOK_SOURCE" ]; then
  echo "Error: hook source not found: $HOOK_SOURCE" >&2
  exit 1
fi

mkdir -p ~/.claude/hooks
cp "$HOOK_SOURCE" ~/.claude/hooks/log-skill.sh
chmod +x ~/.claude/hooks/log-skill.sh

# 2. Add hook config to settings.json
SETTINGS=~/.claude/settings.json
HOOK_CONFIG='{"matcher":"Skill","hooks":[{"type":"command","command":"~/.claude/hooks/log-skill.sh"}]}'

if [ ! -f "$SETTINGS" ]; then
  echo "{\"hooks\":{\"PreToolUse\":[$HOOK_CONFIG]}}" | jq . > "$SETTINGS"
  echo "Created $SETTINGS with hook config."
elif jq -e '.hooks.PreToolUse' "$SETTINGS" > /dev/null 2>&1; then
  if jq -e '.hooks.PreToolUse[] | select(.matcher == "Skill")' "$SETTINGS" > /dev/null 2>&1; then
    echo "Hook already configured in $SETTINGS. Skipping."
  else
    jq --argjson hook "$HOOK_CONFIG" '.hooks.PreToolUse += [$hook]' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
    echo "Added hook to existing PreToolUse array."
  fi
else
  jq --argjson hook "$HOOK_CONFIG" '.hooks.PreToolUse = [$hook]' "$SETTINGS" > "$SETTINGS.tmp" && mv "$SETTINGS.tmp" "$SETTINGS"
  echo "Added hooks config to $SETTINGS."
fi

echo "Done! Skill usage will be logged to <project>/.claude/skill-usage.log"
