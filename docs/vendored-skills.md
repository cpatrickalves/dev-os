# Vendored skills

Third-party skills copied by hand into `skills/` and versioned here as curated
assets. External plugins and skill packages that are installed (not copied)
live in `external-plugins.yaml` and `external-skills.yaml` at the repo root.

## unslop

Source: cursor/plugins, pstack plugin.

```bash
curl -sL https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/unslop/SKILL.md \
  -o ~/dev-os/skills/productivity/unslop/SKILL.md
```

The frontmatter description is rewritten locally to follow the repo's
trigger-phrase convention. Re-apply it after any upstream refresh.

Installed globally: listed in `GLOBAL_SKILLS` in `scripts/import-skills.sh`, so
`import-skills.sh` copies it to `~/.claude/skills/` instead of into the project.

## pr-description

Source: mattpocock/skills, `pr` skill (itself credited to humanlayer's `show-me`).

```bash
curl -sL https://raw.githubusercontent.com/mattpocock/skills/refs/heads/main/skills/engineering/pr/SKILL.md \
  -o ~/dev-os/skills/engineering/code-review/pr-description/SKILL.md
```

Local changes to re-apply after any upstream refresh: `name` is `pr-description`,
the description and a `Title` section cover the PR title, and a note steers away
from Mermaid when the remote is Azure DevOps (it does not render in PR descriptions).

Installed globally: listed in `GLOBAL_SKILLS` in `scripts/import-skills.sh`.
