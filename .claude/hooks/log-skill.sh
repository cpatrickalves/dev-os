#!/bin/bash
# Logs every Skill invocation with timestamp, user, skill name, and args
# stdin is the hook payload: { tool_name, tool_input: { skill, args }, session_id, ... }

payload=$(cat)
skill=$(jq -r '.tool_input.skill' <<< "$payload")
args=$(jq -r '.tool_input.args // ""' <<< "$payload" | cut -c1-100)

project_dir=$(jq -r '.cwd // "."' <<< "$payload")
mkdir -p "$project_dir/.claude"
echo "$(date -u '+%Y-%m-%d %H:%M:%S') [$skill] '$args'" >> "$project_dir/.claude/skill-usage.log"
