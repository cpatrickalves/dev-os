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
