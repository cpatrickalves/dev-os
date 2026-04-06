claude plugin install feature-dev@claude-plugins-official --scope project
claude plugin install claude-md-management@claude-plugins-official --scope project
claude plugin install pr-review-toolkit@claude-plugins-official --scope project
claude plugin install skill-creator -s project

# Python
claude plugin install pyright-lsp@claude-plugins-official --scope project

# Typescript
claude plugin install typescript-lsp@claude-plugins-official --scope project

# Compound Engineer
claude plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin
claude plugin install compound-engineering --scope project

## Update 
claude plugin marketplace update every-marketplace
claude plugin update compound-engineering@every-marketplace

# Skills
npx skills add langchain-ai/langchain-skills --agent claude-code --skill '*' --yes --project

### https://ui.shadcn.com/docs/skills
npx skills add shadcn/ui --agent claude-code --skill '*' --yes --project