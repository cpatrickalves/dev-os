#!/bin/bash
# Logs every Skill invocation with timestamp, user, skill name, and args
# stdin is the hook payload: { tool_name, tool_input: { skill, args }, session_id, ... }
# Source: https://gist.github.com/ThariqS/24defad423d701746e23dc19aace4de5

payload=$(cat)
skill=$(jq -r '.tool_input.skill' <<< "$payload")
args=$(jq -r '.tool_input.args // ""' <<< "$payload")

project_dir=$(jq -r '.cwd // "."' <<< "$payload")
mkdir -p "$project_dir/.claude"
echo "$(date -u '+%Y-%m-%d %H:%M:%S') [$skill] '$args'" >> "$project_dir/.claude/skill-usage.log"
