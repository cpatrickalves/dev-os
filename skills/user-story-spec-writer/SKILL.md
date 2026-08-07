---
name: user-story-spec-writer
description: Transform vague user stories into system-first specifications optimized for AI coding agents. Use when creating new feature specs, improving existing user stories, reviewing specs for ambiguity, or when the user says "write a spec", "improve this story", "spec this out", or "make this AI-ready". Applies the WHAT/WHO/WHY/HOW framework to eliminate ambiguity that causes AI agents to make silent, unreviewed decisions.
---

# Agent Spec Writer

Transform user stories and feature requests into deterministic, system-first specifications that AI coding agents can execute without silent guesswork.

Traditional user stories ("As a user, I want X so that Y") were designed for human empathy, not machine execution. AI agents resolve ambiguity silently by choosing defaults — each default is a decision nobody reviewed. This skill eliminates that ambiguity tax by expanding compressed narratives into explicit system contracts.

## Workflow Decision Tree

```
User provides input
├── New feature idea / vague description → CREATE mode
├── Existing user story / ticket → IMPROVE mode
└── Existing spec to review → AUDIT mode
```

## Interactive Clarification

This skill is inherently collaborative. During CREATE and IMPROVE modes, actively engage the user in conversation to resolve ambiguity before writing the final spec. Never guess when a question can be asked — the whole point of this skill is to surface hidden decisions rather than letting them be made silently.

The process is iterative: analyze the input, identify gaps, ask clarifying questions, incorporate answers, and repeat until all high-risk ambiguities are resolved. Only produce the final spec after sufficient clarification rounds.

## CREATE Mode: From Idea to Spec

To create a spec from a feature idea or vague description:

1. **Extract the core intent** — Identify what the user actually needs to happen, not just what they said. If the intent is unclear or underspecified, ask clarifying questions before proceeding. Do not assume — ask.

2. **Run a clarification round** — Before drafting any spec, present the user with questions about the most critical unknowns. Cover:
   - What are the key entities and what states can they be in?
   - Who are the actors and what can each role do?
   - What business rules constrain the behavior?
   - What is the tech stack and where does state live?

   Follow the rules in "Questioning Strategy" below. Wait for answers before continuing.

3. **Identify entities and states** — Using the user's answers, list every noun (entity) and every verb (state transition). For each entity, determine its possible states and lifecycle. If new ambiguities surface, ask follow-up questions.

4. **Map actors and permissions** — Identify every role that interacts with the feature. For each role, define what they can and cannot do. Confirm assumptions with the user when the permission model is not obvious.

5. **Surface business rules** — Identify preconditions, postconditions, side effects, validation rules, and constraints. Proactively ask about edge cases the user may not have considered (e.g., "What happens if the user retries?", "What if an external service is down?").

6. **Declare technical constraints** — Identify the tech stack, source-of-truth for state, integration points, and non-functional requirements. If unknown, ask the user. Only mark as "TBD — resolve before implementation" if the user explicitly defers the decision.

7. **Draft and review** — Produce a draft spec and present it to the user. Ask if anything is missing, incorrect, or needs adjustment. Incorporate feedback into the final version.

8. **Write acceptance criteria** — Each criterion must be concrete and testable. Avoid subjective language ("should work well"). Every criterion follows the pattern: given [precondition], when [action], then [observable result].

9. **Define out-of-scope** — Explicitly list what this spec does NOT cover to prevent AI agents from adding unrequested features. Confirm with the user that the boundaries are correct.

Produce the spec using the template in `references/spec-template.md`. Include all seven sections: Context, WHAT, WHO, WHY, HOW, Acceptance Criteria, Out of Scope.

## IMPROVE Mode: From User Story to Spec

To improve an existing user story or ticket:

1. **Parse the existing story** — Extract every explicit statement of behavior, constraint, and requirement.

2. **Run the ambiguity checklist** — Use the "Ambiguity Detection Checklist" in `references/spec-template.md` to identify gaps. For each checklist item that is not addressed by the existing story, flag it.

3. **Categorize gaps by risk** — For each gap found:
   - **High risk**: The AI will likely make a wrong default (e.g., delete vs. soft-delete, immediate vs. deferred)
   - **Medium risk**: The AI will make a plausible default that may not match intent (e.g., error message wording, retry behavior)
   - **Low risk**: The default is probably fine but should be stated for completeness

4. **Present gaps and ask clarifying questions** — List the high-risk gaps first. For each gap, explain what the AI would likely assume and why that assumption might be wrong. Ask the user to resolve each gap. This is a conversation, not a one-shot report — continue asking follow-up questions until the high-risk and medium-risk gaps are resolved. Follow the rules in "Questioning Strategy" below.

5. **Rewrite as system-first spec** — Using the user's answers, produce a complete spec in the WHAT/WHO/WHY/HOW format. Present the draft to the user and ask if anything needs correction before finalizing.

When presenting gaps, use this format:

```
## Ambiguity Report

### High Risk (AI will likely guess wrong)
1. **[Topic]**: The story says "[quote]" but does not specify [missing detail].
   An AI agent would likely assume [probable default]. Is that correct, or should it be [alternative]?

### Medium Risk (AI will make a plausible but unreviewed choice)
2. **[Topic]**: ...

### Low Risk (default is probably fine, stating for completeness)
3. **[Topic]**: ...
```

## AUDIT Mode: Review Existing Spec

To audit a spec that already uses the WHAT/WHO/WHY/HOW format:

1. Run every item in the ambiguity checklist from `references/spec-template.md`
2. For each gap, classify as high/medium/low risk
3. Present the ambiguity report
4. Offer to fill gaps interactively

## Questioning Strategy

The clarification process is iterative, not one-shot. Continue asking questions across multiple rounds until all high-risk and medium-risk gaps are resolved. Follow these rules:

- Ask at most 3-5 questions per round to avoid overwhelming the user
- Start with the highest-risk gaps — these are the ones most likely to cause production incidents if left to AI defaults
- Provide a suggested default for each question so the user can simply confirm or correct (e.g., "Does 'archive' mean soft-delete with 90-day retention, or permanent deletion? I'd suggest soft-delete.")
- Group related questions together (e.g., all permission questions in one round)
- After each round of answers, check if the answers revealed new ambiguities and ask about those in the next round
- Do not produce the final spec until the user confirms that all critical questions are resolved, or explicitly asks to proceed with remaining gaps marked as TBD
- If the user says "just pick reasonable defaults," document the chosen defaults explicitly in the spec and mark them with `[DEFAULT]` so they can be reviewed later

## Quality Criteria for Output Specs

A complete spec must satisfy:

- Every entity has its states and transitions listed
- Every actor role has explicit CAN/CANNOT permissions
- Every mutating action has stated preconditions and postconditions
- Source-of-truth for state is declared (database, external service, etc.)
- Acceptance criteria are concrete and testable (no "should work correctly")
- Out-of-scope section prevents scope creep
- No ambiguous terms remain ("archive", "remove", "handle", "process" — each must be defined)

## Language Rules

- Write specs in plain language, not pseudocode or schemas
- Use imperative form ("Cancel the subscription" not "The subscription should be cancelled")
- Define every domain term on first use
- Avoid weasel words: "appropriate", "reasonable", "properly", "correctly", "as needed"
- Each statement must be falsifiable — if it cannot be tested, rewrite it
