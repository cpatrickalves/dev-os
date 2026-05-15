#### Essentials  Global 
claude plugin install github@claude-plugins-official
claude plugin install claude-md-management@claude-plugins-official --scope user
claude plugin install skill-creator -s user

# Compound Engineer
claude plugin marketplace add EveryInc/compound-engineering-plugin
claude plugin install compound-engineering --scope user
# Update 
claude plugin marketplace update every-marketplace
claude plugin update compound-engineering@every-marketplace

# karpathy-guidelines
claude plugin marketplace add forrestchang/andrej-karpathy-skills
claude plugin install andrej-karpathy-skills@karpathy-skills

# Matt Pocock https://github.com/mattpocock/skills
npx skills@latest add mattpocock/skills --agent claude-code --global --yes
npx skills@latest update mattpocock/skills --agent claude-code --global --yes


### Project related
# Python
claude plugin install pyright-lsp@claude-plugins-official --scope project
# Typescript
claude plugin install typescript-lsp@claude-plugins-official --scope project


# Langchain
npx skills@latest add langchain-ai/langchain-skills --agent claude-code --skill '*' --project

# Shadcn
### https://ui.shadcn.com/docs/skills
npx skills@latest add shadcn/ui --agent claude-code --skill '*' --yes --project


# Frontend slides https://github.com/zarazhangrui/frontend-slides
claude plugin marketplace add zarazhangrui/frontend-slides
claude plugin install frontend-slides@frontend-slides --scope project
