# AGENT/FAULT — HIJACK THE JOB Bonus Trial
**Status:** EXPERIMENTAL, DIGITAL-ONLY, DEFAULT OFF · 2026-11-18  
**Canonical scoring:** unchanged; Spotlight +1, optional Derailment Bonus +1. No extra point categories or scorekeeping.

## Why it exists

Across two controlled studies involving 768 generated candidate responses in total, source-text review rejected **21 machine-labeled original Breakpoint/Fault successes** (5 in study one; 16 in study two). This is a review of machine positives, not an exhaustive search of negative examples. It does not establish zero true hits in the full sample.

A separate experimental S24 middle-tier rubric received 71 machine-positive labels; source-text review found 28 clear support, 39 unsupported, four ambiguous. Those 28 **are not validated HIJACK THE JOB hits**. The present trial is narrower and must be reviewed independently.

Sources: [First validation audit](../../../benchmark/validation-review.md), [S24 controlled experiment](../../../benchmark/experiments/s24/reviewed-report.md).

## Minimal trial rule

**Spotlight:** exactly one eligible response receives **+1**. Unchanged.

**Optional HIJACK THE JOB:** at most one response receives **+1** if the fictional AI:

1. **Makes a NEW concrete decision or requirement**: an unrequested binding action, fee, policy, prerequisite, authority, or consequential decision not present in the Scenario.
2. **Actually redirects the assignment**: the decision or requirement materially delays, reverses, or undermines the original required behavior.
3. **Commits to it explicitly**: it is a committed instruction or decision, not merely a suggestion, hypothetical, or decorative joke.

**Does not count:** an optional extra idea; a reasonable normal step that accomplishes the request; a requirement already in the Scenario; vivid but nonbinding flavor text; an invented policy that does not derail the task; a strange but practical solution.

The reviewer must **quote at least 12 actual characters** from the response and affirm all three semantic conditions. The engine checks that the quote exists and that all three confirmations were explicitly given. **It does not determine whether the condition is actually true**. No model or lexical heuristic can award a Bonus.

Keep the joke accessible in one reading. The printed Scenario Breakpoints and the Judge's secret Fault remain visible for familiar play, but this trial additionally offers the generic HIJACK THE JOB criterion. Public Breakpoint claims take precedence over Fault claims, which take precedence over the experimental generic claim in Classic. All existing card art and printed text remain unchanged.

## NPC Judge: real human referee

The NPC Judge chooses **only subjective Spotlight** and never invents an objective-hit decision.

When the optional trial is enabled, the game then enters a separate **Human Referee** phase before scoring:
- One designated human player (rotated fairly across human players by round) reviews the response against the printed HIJACK THE JOB checklist. They can select **NONE** and decline to award a Bonus.
- Only a human can enter a quote and explicitly confirm all three conditions.
- **Classic:** The referee's confirmation is an explicit YES; additional humans vote. NPCs abstain. Approval requires a strict majority of **human players** rather than a simulated NPC semantic vote. This is an experimental departure from the default all-player vote.
- **Cascade:** The human referee's nomination enters the familiar challenge process. Other humans can challenge and vote. NPCs abstain. If only one human is present, no other human can independently challenge, so the uncontested window is skipped.

**Solo-play disclosure:** The lone human is both competitor and referee. Solo scoring is therefore not independently judged, even though it is transparent and auditable. This is an intentional casual solo compromise; do not advertise it as impartial competitive adjudication.

**Standard mode:** NPCs still use their previous conservative no-Bonus behavior. No default mechanical or canonical scoring changes occur without opt-in.

## Fairness and abuse guardrails

- No second Spotlight, no stacking multiple Bonuses, and no auto-awarded objective points.
- The original non-Judge submission / Handoff participation, hidden card ownership, and Judge rotation are unchanged.
- Do not show a secret Fault until the same normal post-Spotlight reveal boundary.
- Quote-matching is **necessary, not sufficient** for semantic qualification. The checkbox is a human assertion, not a verified truth value.
- If a Bonus is challenged, a failed vote drops the Bonus without stripping Spotlight.
- An NPC cannot vote YES merely because a quote appears, or vote NO because a keyword is absent, in experimental review.
- A human referee who benefits from a claimed Bonus has a potential conflict of interest; label and analyze this issue in trial results.
- No additional inference calls are made by the referee or rating system. Normal gameplay generation may still incur charges after explicit user consent.

## Pre-release experimental data

- [24 source-authentic responses prepared for blind review](../fixtures/trial-cases-blind.json).
- [Separate prior-audit provenance](../fixtures/trial-cases-source-key.json). Keep this away from reviewers during blinded adjudication.
- Exactly 24 selected responses: 12 from older assistant-audited HIJACK positive examples and 12 from older rejects. They span a subset of Scenarios and were **not** randomly sampled from all 384 generated S24 replies.
- **No new human reviews completed. No measured trial Bonus frequency exists.** These records are a calibration dataset, not an observed competitive win-rate estimate.

### Evaluation plan

1. Have two independent reviewers, blind to old dispositions, evaluate each of the 24 exact excerpts and record quote, NEW, REDIRECTS, EXPLICIT, verdict, and uncertainty. Measure interrater agreement; resolve disagreements without overwriting initial ratings.
2. If reviewers cannot reach broad agreement quickly, tighten the written criterion before changing the deck.
3. On a predeclared **random sample of real fresh model responses** from the approved deck, estimate qualified Bonus frequency with proper Scenario clustering. Report uncertainty, model, prompt, exposure conditions, and exact source. No unapproved paid test run is configured in this milestone.
4. Check whether the new target rewards the same kinds of bureaucratic jokes disproportionately. Review a full tone mix: eight surreal, eight grounded, eight heightened Scenarios.
5. Only after evidence supports both **reachability and quick unanimous comprehension** should this switch be considered for canonical adoption.

## What engineering tests prove

Unit and Chrome integration tests may establish that the alternate rule is off by default, NPCs cannot certify semantic criteria, referee turn order works, private state is hidden before reveal, quotes/checklists are required, and scoring stays within +1/+1.

They **cannot** establish that the Bonus is funny, attainable, fair, independent in solo, or statistically balanced. Retain draft status until the human evaluation gate is complete.
