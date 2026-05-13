# Essentials 
claude plugin install github@claude-plugins-official
claude plugin install claude-md-management@claude-plugins-official --scope project
claude plugin install skill-creator -s project

# Python
claude plugin install pyright-lsp@claude-plugins-official --scope project

# Typescript
claude plugin install typescript-lsp@claude-plugins-official --scope project

# Compound Engineer
claude plugin marketplace add EveryInc/compound-engineering-plugin
claude plugin install compound-engineering --scope project

## Update 
claude plugin marketplace update every-marketplace
claude plugin update compound-engineering@every-marketplace

# Langchain
npx skills add langchain-ai/langchain-skills --agent claude-code --skill '*' --yes --project

# Shadcn
### https://ui.shadcn.com/docs/skills
npx skills add shadcn/ui --agent claude-code --skill '*' --yes --project

# karpathy-guidelines
claude plugin marketplace add forrestchang/andrej-karpathy-skills
claude plugin install andrej-karpathy-skills@karpathy-skills

# Frontend slides https://github.com/zarazhangrui/frontend-slides
claude plugin marketplace add zarazhangrui/frontend-slides
claude plugin install frontend-slides@frontend-slides
