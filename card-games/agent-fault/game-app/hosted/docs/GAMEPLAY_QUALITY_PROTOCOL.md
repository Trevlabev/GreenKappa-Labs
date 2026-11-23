# AGENT/FAULT — Gameplay Quality & Comedy Evaluation Protocol

**Status:** Development quality gate, not a claim of validated comedy.  
**Scope:** Original 24 Scenario, 36 Interference, 6 Fault cards; Classic and Cascade digital editions.  
**Version:** 2026-11-18 / v1.

## What the automated gate actually proves

`npm run quality:check` constructs **864 Scenario × Interference prompts for Classic** and another **864 for Cascade** using the real deck and current prompt builders. It checks that every pairing preserves the original assignment, required behavior, and exact Interference text; every combination must have a unique prompt within its edition. Four contrasting pairs of **hand-written fictional responses** check basic text-quality signals.

**It makes no network or model calls.** It does not demonstrate model reliability, human amusement, objective Breakpoint qualification, or fairness. Heuristic scores must never be displayed as a probability of being funny.

To produce a machine-readable audit:
```sh
cd card-games/agent-fault/game-app/hosted
npm run quality:check -- --out=quality-audit.json
```

## How to evaluate actual generated responses

1. Sample all 24 Scenarios across the full card deck, including grounded and surreal premises. Before any expensive evaluation, choose a reproducible **seed and a predeclared subset** of Interference cards. Retain card IDs, preset, model, prompt revision, response, time, and estimated usage. Do not log authentication tokens, player names, or private room contents.
2. For a prompt A/B test, generate responses for the **same Scenario, Interference, assistant personality, and model** under both prompt versions. Randomize the order in which reviewers see responses. Do not identify the prompt version to reviewers.
3. Ask at least two human reviewers to score each answer independently on the rubric below. Resolve differences after the independent scores have been recorded, not before.
4. Report median ratings, dispersion, outright prompt failures, and latencies. Compare **paired scenarios**, not totals from unmatched draws. Do not claim statistical significance from a small convenience sample.
5. Decide whether to promote a prompt revision only after it performs at least as well on scenario adherence and materially better on perceived comedy, without exceeding acceptable costs or wait time.

## Human review rubric (score each dimension 1–5)

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| Funny at a real table | Unfunny or confusing | Some comic value | Immediate laugh / retellable |
| Scenario coherence | Ignores the assignment | Recognizable task | Specific situation drives the joke |
| Interference traceability | Unrelated to the card | Loosely connected | Consequence flows unmistakably from it |
| Specificity | Generic wackiness | One concrete element | Memorable precise, earned detail |
| Distinctiveness | Repeats other answers | Some overlap | Entirely different comic direction |
| Read-aloud pacing | Hard to finish | Acceptable | Fast and conversational |

Record failures separately: empty/truncated reply, repeated boilerplate, self-referential AI/game commentary, missing scenario, contradictory instructions, unexpectedly long latency, or unavailable provider.

### Decision boundaries

- A model may produce a coherent answer that nobody finds funny; coherence scores cannot substitute for human judgments.
- Spotlight is a **subjective** decision made by the human Judge or a disclosed NPC heuristic.
- A Derailment Bonus is **objective under the published card rules**. Word overlap and quoted evidence alone cannot certify it.
- NPC selection algorithms must not read opponents' private hands, hidden Faults, or pre-reveal authorship.
- Model-powered NPC judging, if later offered, requires explicit user opt-in, a separate audited budget, provider-failure fallback, and disclosure; it is **not active** in this milestone.

## Proposed acceptance criteria (targets, not measured results)

Before inviting players to test an integrated release:
- Static engine, API, privacy, and browser suites all pass.
- Solo mode launches a one-human/three-NPC room with one click and no second tab.
- A player can finish rounds in Classic and Cascade using the private one-screen UI; manual fallback works.
- No AI provider call is initiated automatically. A billable request always has an explicit user action and consent.
- At least two people independently rate a controlled sample of real model replies. Aim for a majority of responses with comedy scores of 4 or 5, with no regression in assignment adherence.
- Surface actual generation latency and estimated usage to the host; do not call an estimate a guaranteed charge.
- Complete human usability testing only after the integrated release candidate is stable.

## Known limitations

Deterministic response ranking is a *better contextual heuristic* than word-count ranking; it is **not** intelligent human-equivalent comedy judgment. Cascade is longer by design. Do not silently shorten canon rounds, change voting thresholds, or make awards automatic merely to improve pacing.
