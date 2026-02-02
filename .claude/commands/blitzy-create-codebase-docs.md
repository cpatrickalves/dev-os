## Codebase Ingestion Prompt Template

Review the codebase and create a documentation file in markdown format in docs/02-codebase.md

**PROJECT OVERVIEW**

- **What's the broader product or company context this codebase belongs to?** *Give a short description of what the product does and who it's for.*
- **What's the primary goal or responsibility of this codebase?** *Describe the main functionality, domain, or feature it supports.*
- **What are 1–2 core workflows or use cases that this codebase powers?** *Think of common user flows, backend jobs, or business processes.*

**ARCHITECTURE + TECH**

- **How is the system architected?** *Is it a monolith, microservices, layered MVC, event-driven, client-server, etc.?*
- **What's the tech stack used across the frontend, backend, database, and infra?** *Languages, frameworks, libraries, cloud services, etc.*
- **What custom patterns, internal frameworks, or architectural decisions are unique to this codebase?** *Include naming conventions, design patterns, or proprietary solutions your team has built.*
- **What external systems does this codebase connect to?** *List APIs, third-party tools, internal services, queues, etc.*

**PRIVATE DEPENDENCIES + RUNNING THE CODE**

- **When building this project, do we need access to any internal dependencies, packages, or libraries?** *If yes, provide those within the repo(s) and reference these in the prompt.*
- **Are there any secrets, environment variables, or configurations required to compile and run the project successfully?** *List all non-sensitive configurations in the repository and reference where these are. For sensitive configurations, reach out to your AI Solutions Consultant directly to share securely.*
- **Do you have a complete, step-by-step set of build instructions that takes a developer from a clean machine to running the project?** *Provide build instructions directly here in the prompt. Additionally, if these instructions exist in documentation within your repo, indicate where this documentation lives.*

**BUSINESS CONTEXT + DOMAIN KNOWLEDGE**

- **What business rules or compliance requirements shape this code?** *GDPR, SOX, industry regulations, business logic that drives technical decisions.*
- **Any industry or domain-specific terminology or acronyms we should understand?** *Define terms that would be confusing to someone new — e.g., "SKU", "TSP", "tenant".*
- **What's the "why" behind major architectural choices?** *Business reasons for tech decisions, trade-offs made, constraints that influenced design.*

**CURRENT STATUS + EVOLUTION**

- **What stage is this codebase in?** *Is it early-stage, in active development, stable and in production, or in maintenance mode?*
- **Have there been any major architectural shifts or technical constraints that shaped the current system?** *Migrations, rewrites, performance bottlenecks, scaling challenges.*
- **Are there any incomplete components, known edge cases, or areas under active refactor?** *Include workarounds, technical debt, or planned improvements.*

**AREAS TO IGNORE**

- **Are there specific file paths or directories that aren't relevant?** *List directories or files that are obsolete, unused, or can be ignored during development or analysis.*