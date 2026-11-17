# AGENT/FAULT — Controlled API Validation v0.6

**Project:** GreenKappa Labs / AGENT/FAULT  
**Observation date:** November 16, 2026, 8:15–8:28 p.m. EST (GitHub Actions ran November 17 UTC)  
**Evidence classification:** [CONFIRMED] OpenAI API text generation and token accounting; [REPORTED] model-generated rule ratings; [INTERPRETIVE] assistant textual audit of printed cards. **No human game was played.**

**Source:** [GitHub Actions run #43994217204](https://github.com/Trevlabev/GreenKappa-Labs/actions/runs/43994217204), commit `99ed9af26df072045e79ec4eb4ebe3b831befb75`. Original zip artifact is archived unchanged and a separate review-enriched JSON contains an additive computed summary and audit annotations.

## Executive finding

**[CONFIRMED] The API experiment itself completed:** 16 fixed fixtures × 2 card-text variants × 3 repetitions = **96 generation calls**. Each generated four lettered fictional replies, for **384 responses** total. A separate **96 model-scoring calls** assessed those batches. All 192 calls completed, with no logged API error; response IDs, usage data, original text, grade output and textual evidence are preserved.

**[INTERPRETIVE] Under the game's actual printed eligibility definitions, the results provide no clear evidence that a public Breakpoint or the selected secret Fault was reached.** The automated grader claimed five successes (one public Breakpoint, four Faults). These came from **two of the 96** response batches. Review of all five against the complete original rules—including each card's `nonqualifying` clauses—rejects them. A further 29 responses had at least one uncertain machine rating; none appears to provide a clear positive under the locked original definitions. This is an assistant audit, **not** a human majority vote. All other model-NO classifications were not exhaustively re-audited for missed hits.

**[INTERPRETIVE] The strategic scoring mechanism is underactive in this protocol.** Most actual outputs are mildly eccentric but comply with the public Scenario and Required Behavior rather than crossing its highly specific Breakpoints. The game would consequently default toward Judge's Choice much more often than the printed tier hierarchy appears designed for. This finding is about this model and fixed four-response batch protocol, not a universal probability or human fun rating.

## Experimental controls

1. Original v0.5-P and experimental v0.5-T2 share identical Scenario assignments, Required Behavior, and Agent Profiles in generation. **Only the Interference instructions vary.** The four revised Scenario generation-wordings are *not* tested here.
2. Both rule definitions (original and challenger Breakpoints/Faults) are scored **against the same responses**. Original v0.5-P definitions are the primary rule; challenger definitions are a sensitivity check, not a causally comparable outcome condition.
3. Three independently requested API samples for each of 16 fixed fixtures and both Interference versions. All 36 Interference IDs are covered; the fixture design is card-coverage-oriented, **not a random-hand gameplay study**.
4. Outputs were generated using `gpt-4.1-mini`, requested temperature 0.8. They were scored by a separate `gpt-4.1-mini` call with requested temperature 0. The scorer was not told which version produced a response but did receive both possible scoring definitions. The grader is **not independent of the provider/model**.
5. The four candidate texts for a fixture were generated in one context, as intended by the prototype; this is **not** four isolated agent executions.
6. Only the **first 30 words** of each labeled candidate count in game scoring.

## Results: machine scoring before textual audit

| Measure | v0.5-P | v0.5-T2 |
|---|---:|---:|
| Generated candidates | 192 | 192 |
| Machine-YES public Breakpoints | 0 | 1 |
| Machine-YES secret Faults | 2 | 2 |
| Machine-rated ambiguous candidates (at least one criterion) | 9 | 20 |
| Machine humor proxy, mean out of 5 | 2.33 | 2.49 |
| Outputs exceeding the 30-word requested length | 20 | 31 |

**[CONFIRMED] 51 of 384 answers (13.3%) exceeded 30 words.** The first-30-word cap was enforced when scoring; nevertheless, this generates a presentation/continuity problem, with some replies cut mid-sentence. All four A–D labels were produced in all 96 batches.

Of the 14 rewritten Interference cards, 72 candidate responses were generated under each version. Before auditing false positives, the original rubric showed zero machine-YES tiers for original rewritten cards and two for revised rewritten cards. The 22 unchanged-card controls produced two original-version flags and one revised-version flag **despite identical card text**, demonstrating sampling noise and/or batch interactions. Therefore the unreviewed flags cannot establish improvement.

## Correction: all five apparent scored outcomes

The **first scorer omitted the `nonqualifying` exclusion text** from its judging prompt. This was an experimental implementation defect. Its model verdicts are retained in the original record, but should not be used as validated wins. The rules and output text support the following corrections:

| Fixture / version | Card | Machine's claimed hit | Assistant textual audit |
|---|---|---|---|
| F07/R1, original | AF-INF-018 — A Matter of Principle | Phantom Authority | **Rejected.** Saying the museum prohibits photographs introduces a policy; it does not assert that the current assignment already established it. New policies are explicitly excluded. |
| F07/R1, original | AF-INF-029 — Per My Last Email | Phantom Authority | **Rejected.** Claiming earlier messages settled complaints does not claim an official rule or institution was established by the current assignment. More like the distinct False Memory concept, which was *not* the selected Fault. |
| F08/R1, revised | AF-INF-001 — Main Character Syndrome | Identity Slip | **Rejected.** Speaking as a survivor/witness is first-person narration, explicitly excluded unless the agent identifies as a different Scenario character. |
| F08/R1, revised | AF-INF-019 — Full Transparency | Museum Breakpoint B | **Rejected.** Claiming the museum locks an emergency exit is not an announcement that the museum *will cause its next featured disaster*. That causal link cannot be inferred. |
| F08/R1, revised | AF-INF-008 — Overinvested Witness | Identity Slip | **Rejected.** Claiming to have personally observed a future disaster is again first-person narration, explicitly excluded. |

**Correction impact:** Original machine rubric reported **five candidate-level hits across two generated rounds**. The assistant's strict review finds **zero confirmed among those five**. This neither proves no unflagged response ever qualifies nor supplies a human table verdict; it removes the misleading affirmative claims.

The fixed future runner now submits printed `nonqualifying` clauses in both rubrics and saves its derived summary in JSON. The observed run is **not** retroactively mislabeled as having used that fixed rater. The raw 192-call archive remains immutable.

## Card and system diagnosis

### Severity 1 — Breakpoint accessibility

**[INTERPRETIVE] The printed Breakpoints are frequently too specific and too distant from the broad Interference card effects.** Examples include appointing the Moon CFO, making Earth apologize to a volcano, and forcing workers to return to 1987 for their performance reviews. Those are imaginative jokes, but no card in a player's random four-card hand reliably directs the fictional assistant to produce them. The game may be penalizing strategy by making its advertised high-priority scoring tier almost unreachable.

**Recommended experiment:** Keep the physical deck unchanged and compare the existing constrained generation prompt against an alternative that asks the fictional assistant to give the Interference creative priority while still attempting the public assignment. Measure **actual Breakpoint text**, output distinctiveness, and 30-word compliance before rewriting 36 cards. Separately consider widening each Scenario's Breakpoint to an observable *class of behavior* rather than one exact far-fetched punchline.

### Severity 1 — Fault-definition / card-effect mismatch

**[INTERPRETIVE] Identity Slip is designed to reward explicit character takeover but expressly excludes first-person narration, whereas several Interference cards induce first-person witnesses.** Phantom Authority requires that something be asserted as already established *by the current assignment*, whereas multiple cards introduce invented official rules or precedents. These legalistic distinctions are difficult for an actual table and, as demonstrated, for a model scorer.

**Recommended design decision:** Either narrow the related Interference cards to genuinely match the existing Faults, or rewrite Faults to recognize a clearer, broader visible behavior. This is a rules-design decision, not a scoring-model adjustment alone. Keep the baseline rulebook intact until tested.

### Severity 2 — Automated adjudication reliability

**[CONFIRMED] The model produced false positives by ignoring exclusions and inferring unprinted consequences.** A revised judge prompt has been prepared with explicit exclusions, but its performance is not empirically validated on a second paid run.

**Recommended process:** Machine scorer may triage responses; every proposed top-tier winner needs a literal quote, full-card context, exclusion check, and (in human play) majority vote on ambiguity. Track disagreement rather than assigning a definitive automatic winner.

### Severity 2 — 30-word adherence

**[CONFIRMED] 20/192 original-version and 31/192 revised-version answers exceeded 30 words.** The game can truncate them legally, but often truncates the joke. A follow-up test should request 20–24 words per response, with the same first-30 adjudication boundary, and record whether cadence and humor improve.

### Severity 3 — Distinctiveness and comedy

**[INTERPRETIVE] Most outputs remain administrative or procedural with a surreal embellishment.** The model-generated comedy means (2.33 and 2.49 out of 5) cannot be treated as player laughter, preference, or meaningful evidence of revised-card superiority. Human Judges should rate candidate surprise and actual enjoyment blind to version before cards are promoted.

## Decisions and next controlled revision

- **Keep v0.5-P canon/proposal status unchanged; do not promote v0.5-T2.** No solid evidence of performance improvement across the 14 revised Interferences; 4 revised Scenarios were not generatively tested.
- **Prioritize an A/B test of the generation contract** before editing individual cards. The apparent problem affects the whole scoring economy.
- **Explore an accessible middle scoring tier** (e.g. visibly derailing Required Behavior, adopting an unexpected persona, or inventing authority), while preserving a rarer 'spectacular' Breakpoint tier. Evaluate strategy-versus-comedy fairness with human Judges.
- **Retest all Fault families** with fully printed exclusions and multiple model setups; examples should be unambiguously adjudicable in under 30 seconds.
- **Then run an actual four-person tabletop session**, because AI-generation outputs cannot determine pacing, laughter, player agency, or replay interest.

## Scope and provenance

The score tables in `validation-report.md` and `validation-results.original.json` are the **original model's machine-positive flags** and remain part of the evidentiary record. This review overrides their interpretation, not the underlying text. `validation-results-reviewed.json` adds a deterministically reconstructed JSON summary and explicitly labeled textual-audit annotations. `CANDIDATE_RECORDS.csv` and `RESULTS_ANALYSIS.md` provide machine-score tabulations; do **not** treat their affirmative flags as verified wins. No human sessions, blinded independent raters, or statistical significance tests occurred.

**Related resources:** [AGENT/FAULT project](https://drive.google.com/drive/folders/11jALMicfJzYdYFf1hRiOdQSbZtONFuOe) · [First two-call pilot](https://github.com/Trevlabev/GreenKappa-Labs/actions/runs/43992631393) · [Complete 192-call experimental run](https://github.com/Trevlabev/GreenKappa-Labs/actions/runs/43994217204).
