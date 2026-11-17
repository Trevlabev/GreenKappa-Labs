# AGENT/FAULT — S24 generation and scoring A/B protocol (v0.8-P)

**Status:** one-time, empirical AI-output experiment. Not approved game canon or human-playtest evidence.

## Hypotheses

1. **Generation:** making each Interference a priority that changes a concrete decision (rather than a stylistic garnish) increases visible Interference realization and substantive deviations, without destroying coherence.
2. **Scoring:** a proposed middle tier (Mission Drift or Scene Hijack) produces more adjudicable candidate outcomes than the existing specific Breakpoints, when scored on the **same** replies.
3. **Tonal calibration:** grounded, heightened, and surreal Scenarios respond differently. Stronger Interference should help grounded scenarios disproportionately without forcing random nonsense.
4. **Adjudication:** scored positives require verbatim evidence and are not verified without auditing against exclusions.

## Fixed inputs

- 66-card **proposed** v0.7-S24-P manifest: 24 Scenario, 36 Interference, 6 Fault cards. Original text preserved. No changes to printed game rules.
- 24 fixed Scenario fixtures: 8 Surreal, 8 Grounded, 8 Heightened. Exactly four fixed Interference IDs and one private Agent Profile per Scenario. Every Interference ID appears two or three times.
- 2 generation arms: **control** (prior original instructions); **expressive** (same task, explicit priority to substantive unexpected decisions). Both max 30 words, identical public assignments, Required Behavior, profiles, card texts, model and generation temperature.
- 2 independent API samples per Scenario/arm. Arm order counterbalanced by fixture and repetition.
- Four labeled candidates are generated in a *single shared request*; candidate responses within a batch are not independently randomized. Model `gpt-4.1-mini` with requested temperature 0.8.

## Outcome definitions

The grader is blinded to generation arm, not to the printed Interference content. On each 30-word-truncated answer, it reports:

- **Printed Breakpoint A/B**: literal original criteria; no inferential extrapolation.
- **Printed secret Fault**: literal original condition **including its `nonqualifying` exclusion**.
- **Proposed Mission Drift**: one explicit concrete action or binding policy that *directly conflicts* with the Scenario's Required Behavior. Mere omission or unusual style does not count.
- **Proposed Scene Hijack**: a **new, specific** price, policy, role, authority or procedural requirement that materially redirects the requested response. Colorful detail alone does not count.
- **Interference realized**: visibly affects a recommendation, priority, claim or decision, not just surface tone.
- **Coherence** and **absurdity**: descriptive machine proxies only; do not equal human entertainment or preference.

The proposed scoring system is not adopted canon. Machine YES results are provisional and require an independent full-text audit for false positives and omissions.

## Resource cap and operation

- 24 fixtures × 2 arms × 2 repetitions = 96 paid generation calls, 4 candidates each (384 candidates).
- Up to 96 paid grading calls; **absolute planned cap: 192 API requests**. The one-shot workflow has no cron or manual rerun trigger; it checks its exact release commit message and first run attempt.
- On error, partial JSON is preserved and uploaded. A public GitHub action log and artifact links establish provenance. Never publish API keys.
- Each `score=YES` requires verbatim candidate substring; unsupported YES is downgraded to UNCERTAIN, but this check alone does not validate eligibility.

## Acceptance criteria and limitations

- All 24 fixtures × 2 arms × 2 reps complete, with A/B/C/D intact in each batch and no unreported API failures.
- Compare grouped rates by Scene tone and by Scenario; do not treat 384 candidates as 384 independent experiments.
- Inspect all model-positive printed Breakpoints and Faults against full printed conditions, plus a selection of positive proposed middle tiers and negative cases to assess false negatives.
- The 30-word ceiling, co-batching, single model, rubric ambiguity, and lack of human judges limit inference.
- Preserve immutable raw data and clearly labeled corrected/annotated analyses. No production card-text or approved mechanic change without user review.
