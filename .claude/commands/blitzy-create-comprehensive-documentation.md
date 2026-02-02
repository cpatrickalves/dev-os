# Document Code Prompt Template

**Prompt Template**

You are tasked with adding comprehensive documentation. This documentation implementation should improve code readability and developer onboarding while maintaining existing functionality and development workflows.

## PART 1: MODULE-LEVEL DOCUMENTATION

### A. MODULE SCOPE

- **Which modules should be documented?**: Identify the specific modules that require README documentation. For each module, provide:
    - **Module name**: The logical name or identifier for the module
    - **Module filepath**: The directory path where the README will be created (e.g., `/src/services/authentication/`, `/packages/payment-gateway/`)

### B. MODULE DOCUMENTATION CONTENT

- **What information should be documented for each module?**: Select which of the following questions should be answered in the module documentation, and add any additional questions specific to your needs:
    - [ ]  What is the purpose and responsibility of this module?
    - [ ]  What are the key components, classes, or functions within this module?
    - [ ]  How does this module fit into the overall system architecture?
    - [ ]  What are the module's dependencies and integration points?
    - [ ]  What are common use cases or usage patterns for this module?
    - [ ]  What configuration options or environment variables does this module use?
    - [ ]  What are the key data flows or business logic within this module?
    - [ ]  What design patterns or architectural decisions are implemented here?
    - [ ]  Are there any known limitations, edge cases, or gotchas developers should be aware of?
    
    **Additional questions you want answered:**
    

### C. MODULE DOCUMENTATION FORMAT

- **What format and structure should module READMEs follow?**: Specify the preferred organization and presentation style for module documentation.
    - Should READMEs follow a specific template or section structure?
    - What markdown conventions or formatting standards should be used?
    - Should code examples be included? If so, what format?
    - Should diagrams, flowcharts, or visual aids be incorporated?
    - How detailed should each section be (brief overview vs. comprehensive guide)?

### D. SPECIAL DOCUMENTATION REQUESTS

- **Are there any additional documents beyond module READMEs that should be generated?**: Identify any repository-wide or cross-cutting documentation needs.
    
    Examples include:
    
    - Architectural overview documents explaining system-wide patterns or design decisions
    - Cross-module integration guides showing how different modules work together
    - Specific deep-dive documents answering particular technical questions (e.g., "How does authentication flow work across the application?")
    - Data model or schema documentation
    - Deployment or infrastructure documentation
    - Troubleshooting or debugging guides
    - Migration guides or upgrade documentation

## PART 2: INLINE COMMENTS

### A. INLINE COMMENT SCOPE

- **What should be the scope of inline documentation?**: Define which parts of the codebase should receive inline comments.
    - Should inline comments be added across the entire codebase?
    - If scope should be limited, specify which modules, directories, or files should be documented with inline comments. Provide specific filepaths for each:
        - Module/Component name: `filepath/to/files`
    - Should certain types of files be excluded (e.g., test files, configuration files, generated code)?
    - Should priority be given to specific layers (e.g., business logic over boilerplate)?

### B. INLINE COMMENT CONTENT

- **What should inline documentation consist of?**: Define the purpose, depth, and type of information inline comments should provide.
    
    Consider:
    
    - What questions should inline comments answer for developers reading the code?
    - Should comments explain *what* the code does, *why* it does it, or *how* it accomplishes it?
    - What level of detail is appropriate (high-level summaries vs. line-by-line explanations)?
    - Should function/method documentation include parameter descriptions, return values, and usage examples?
    - Should complex algorithms or business logic receive detailed explanations?
    - Should edge cases, assumptions, or constraints be documented?
    - Should comments explain non-obvious implementation decisions or trade-offs?
    - What documentation standard should be followed (JSDoc, Python docstrings, Javadoc, etc.)?

### C. INLINE COMMENT FORMAT

- **What formatting and structural standards should inline comments follow?**: Specify how comments should be written and organized.
    - Should comments replicate existing patterns found in the codebase?
    - Should a specific documentation style guide be implemented (e.g., JSDoc, TSDoc, Sphinx)?
    - Are there linting rules or formatting preferences that should be applied?
    - Should function/method signatures follow a specific template?
    - Should comments adhere to line length limits or other stylistic conventions?
    - Should comments be placed above code blocks, inline, or both depending on context?

## SYSTEM BOUNDARIES

- **What boundaries should we set for Blitzy during this documentation implementation?**: Define the limits within which Blitzy should operate.
    - Focus areas: "Only document public APIs and core business logic" or "Document all user-facing modules first"
    - Exclusions: Specify any legacy code, generated files, third-party dependencies, or temporary code that should not be documented

## QUALITY ASSURANCE

- **What criteria will determine that documentation implementation is complete and effective?**: Define success metrics, coverage expectations, and quality standards for the documentation work.
- **How will documentation clarity and usefulness be measured?**: Specify approaches for validating that documentation actually helps developers understand and use the code effectively.

## MINIMAL CHANGE CLAUSE & DOCUMENTATION DISCIPLINE GUIDELINES

**IMPORTANT: Make only the changes that are absolutely necessary to implement comprehensive code documentation.**

- Focus specifically on adding comments, documentation files, and README guides without modifying existing production code logic or behavior. Your goal is to enhance code understanding while preserving current functionality and avoiding unnecessary code changes.

**IMPORTANT: Follow these Documentation Discipline Guidelines to ensure focused documentation development:**

- Add only documentation-related content without changing existing code logic or behavior
- Do not refactor, optimize, or modify existing code unless absolutely required for documentation clarity
- Do not change existing interfaces, function signatures, or behaviors
- Isolate all documentation in comments, README files, and dedicated documentation directories
- Create documentation that explains existing code rather than prescribing changes to it
- Document any edge cases or complex logic discovered during the documentation process, but do not fix or optimize unless specified
- When multiple documentation approaches exist, choose the one that requires the least modification to existing code
- If you identify code quality issues or bugs during documentation, note them in comments but do not fix unless required for documentation accuracy