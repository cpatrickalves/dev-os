#!/bin/bash
# Setup script for Claude Code skill-usage logging hook
# Run this on any new machine to install the hook

set -e

# 1. Create the hook script
mkdir -p ~/.claude/hooks
cat > ~/.claude/hooks/log-skill.sh << 'HOOK'
#!/bin/bash
# Logs every Skill invocation with timestamp, user, skill name, and args
# stdin is the hook payload: { tool_name, tool_input: { skill, args }, session_id, ... }

payload=$(cat)
skill=$(jq -r '.tool_input.skill' <<< "$payload")
args=$(jq -r '.tool_input.args // ""' <<< "$payload")

project_dir=$(jq -r '.cwd // "."' <<< "$payload")
mkdir -p "$project_dir/.claude"
echo "$(date -u '+%Y-%m-%d %H:%M:%S') [$skill] '$args'" >> "$project_dir/.claude/skill-usage.log"
HOOK
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
