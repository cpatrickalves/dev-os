---
argument-hint: [skill-name] [skill-path]
description: Audit a skill to test, benchmark, optimize or remove it.
---

# Skill Audit to Test, Benchmark, Optimize or Remove it

I want to run a full audit of my skill: $1
Skill path: $2

Do NOT just optimize the description. I want the full evaluation pipeline:

## PHASE 1 — Skill Intake & Classification

Read the skill's SKILL.md and answer:

1. **Type**: Is this a *capability uplift* skill (Claude can't do this well without it) or an *encoded preference* skill (Claude can do it, but this sequences our workflow)?
2. **Staleness risk**: Given current model capabilities, does this skill still seem necessary? Flag any instructions that sound like they're compensating for problems the base model may have already solved.
3. **Scope**: Does the skill description match what the SKILL.md body actually does? Flag drift.

Present this as a brief diagnostic before proceeding.

## PHASE 2 — Eval Design

Based on the skill's intent, create **5–8 realistic test prompts** — the kind of thing I would actually type. Not abstract. Include:

- 2–3 core use cases (should clearly benefit from the skill)
- 1–2 edge cases (tricky inputs, partial matches)
- 1–2 prompts that are *adjacent but shouldn't need the skill* (to test baseline)

Save to `$2-workspace/evals/evals.json`.

Show me the eval set and ask for my approval before running anything. I may add, remove, or edit prompts.

## PHASE 3 — Parallel Execution (Skill vs. Baseline)

Once I approve the evals, **spawn all runs in the same turn** — for each eval:

- **Run A** — with the skill loaded, following SKILL.md
- **Run B** — baseline: same prompt, NO skill (raw Claude)

Save outputs to:
```
$2-workspace/
  iteration-1/
    eval-<id>-<descriptive-name>/
      with_skill/outputs/
      without_skill/outputs/
      eval_metadata.json
      timing.json
```

**While runs are in progress**, draft assertions for each eval. Assertions must be:
- Objectively verifiable (not "looks good")
- Descriptive (readable as a sentence in a benchmark report)
- Focused on what the skill is *supposed to change* vs. baseline

Update `eval_metadata.json` with assertions as you draft them. Explain to me what each assertion checks.

## PHASE 4 — Grade & Aggregate

Once all runs complete:

1. Grade each run against its assertions (use `agents/grader.md` if available via subagent, otherwise grade inline). Save `grading.json` per run using fields: `text`, `passed`, `evidence`.

2. Run the aggregation script:

```bash
python -m scripts.aggregate_benchmark $2-workspace/iteration-1 --skill-name $1
```

3. Generate the eval viewer for me to review outputs side-by-side:

```bash
python eval-viewer/generate_review.py \
  --workspace $2-workspace/iteration-1 \
  --static /tmp/skill-review-$1.html
```

Open the HTML file so I can review it. Wait for my feedback before proceeding.

## PHASE 5 — Verdict & Recommendation

After I review the outputs, synthesize the results into a **verdict** using this framework:

### Removal threshold

If the baseline (no-skill) run passes ≥ 80% of assertions that the with-skill run passes, the skill is likely redundant. In this case:
- State clearly: **"This skill is a candidate for removal."**
- Explain which capabilities the base model already handles
- Recommend: remove entirely, OR keep only as an encoded-preference/workflow skill (if it sequences steps the model does correctly but in the wrong order)

### Keep & improve threshold

If with-skill outperforms baseline by a meaningful margin:
- Identify the specific assertions where the skill made the difference
- Identify the specific assertions the skill *still fails* (improvement opportunities)
- Proceed to Phase 6

### Ambiguous

If results are mixed or inconclusive:
- Flag which evals are too easy (both versions pass trivially)
- Suggest harder evals and ask if I want to rerun with tougher test cases

## PHASE 6 — Improve (if keeping the skill)

Based on benchmark results and my feedback:

1. Revise SKILL.md — focus on:
   - Removing instructions that don't pull weight
   - Adding bundled scripts for repeated patterns across test cases
   - Explaining the *why* behind instructions (not just MUST/NEVER commands)

2. Rerun all evals into `iteration-2/` with the improved skill vs. previous version as baseline
3. Generate updated eval viewer
4. Repeat until: I'm satisfied, feedback is empty, or no meaningful progress

## PHASE 7 — Description Optimization (last step, only if keeping)

Only after the skill body is final:

1. Generate **20 trigger eval queries** (10 should-trigger, 10 should-not-trigger)
   - Make them realistic and specific — include file paths, context, casual phrasing, typos
   - Near-misses for the negatives (not obviously irrelevant)

2. Show me the eval set for review using `assets/eval_review.html`

3. Once I approve, run the optimization loop:

```bash
python -m scripts.run_loop \
  --eval-set $2/trigger-eval.json \
  --skill-path $2 \
  --model <current-model-id> \
  --max-iterations 5 \
  --verbose
```

4. Apply `best_description` to SKILL.md frontmatter. Show me before/after with scores.

## PHASE 8 — Final Report

Produce a summary with:

| Metric | Value |
|--------|-------|
| Skill type | capability-uplift / encoded-preference |
| Verdict | keep / improve / remove |
| With-skill pass rate | X% |
| Baseline pass rate | X% |
| Skill delta | +X% |
| Description trigger improvement | before → after score |
| Iterations run | N |

Include a 2–3 sentence recommendation I can use to justify the decision to my team.

**Important constraints:**

- Do NOT skip Phase 3 (baseline runs). The comparison is the core of this audit.
- Do NOT proceed past Phase 4 without showing me the eval viewer.
- Do NOT run description optimization (Phase 7) before the skill body is stable.
- If I'm in Claude.ai (no subagents), adapt: run evals sequentially, skip blind comparison, show results inline instead of the viewer.
