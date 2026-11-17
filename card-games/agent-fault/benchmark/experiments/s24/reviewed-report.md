# AGENT/FAULT — S24 Generation-Prompt × Scoring A/B

**Experiment:** v0.8-S24-P, exploratory API-output validation  
**Date:** November 16, 2026, 8:56–9:08 p.m. EST (November 17 UTC)  
**GitHub Actions:** [run #43999308672](https://github.com/Trevlabev/GreenKappa-Labs/actions/runs/43999308672)  
**Source commit:** `dfd7a807736b89527fe226b0961d3b4c063405a2`  
**Card manifest:** proposed v0.7-S24-P, **not approved canon**  
**Model:** `gpt-4.1-mini`  
**Evidence designations:** [CONFIRMED] observed API request/output facts; [REPORTED] automated judge labels; [INTERPRETIVE] assistant source-text audit and gameplay recommendations. No human gameplay or independent blind adjudication.

## Executive determination

**[CONFIRMED] The full controlled experiment completed:** 24 Scenarios × 2 generation prompts × 2 repetitions = **96 API generation requests**, each containing four A–D fictional responses, for **384 candidate replies**. The same 96 batches were scored by **96 additional API calls**, totaling **192 calls without logged errors**. The experiment used 30,872 generation input tokens, 13,680 generation output tokens, 103,622 grading input tokens, and 51,807 grading output tokens (199,981 tokens overall). These are provider-reported tokens, **not a dollar-cost estimate**.

**[INTERPRETIVE] The new “expressive” prompt does not warrant adoption.** It led the same model-as-rater to recognize *fewer* Interference effects than the original prompt. It did substantially reduce outputs over the 30-word game limit, but that improvement is entangled with other prompt changes. A minimal separate word-limit revision to the original prompt is a more appropriate next test.

**[INTERPRETIVE] The proposed middle-tier system is not yet ready.** It recognizes more apparent successes than printed Breakpoints, but the model greatly overidentifies Mission Drift and Scene Hijack. The definitions still require tightening for 20–30-second human adjudication.

## Verified design and sample integrity

- Same **proposed** 66-card inventory: 24 Scenario, 36 Interference, 6 Fault cards. Source card text unchanged from the candidate manifest; the eight original Scenarios remain in the sample.
- 8 Surreal, 8 Grounded, and 8 Heightened Scenarios, each with exactly four fixed Interference cards, one Agent Profile, and a rotating secret Fault.
- All 36 Interference cards represented in the 24 fixtures, each appearing two or three times. The exposure plan was not a random-hand sample.
- The control uses the previous AGENT/FAULT generator contract; the experimental version asks for a **substantive concrete decision** arising from Interference, while explicitly discouraging random nonsense. Both enforce the same 30-word ceiling.
- Version order counterbalanced by Scenario and repetition; two separate API samples per arm. Four lettered candidate replies still share one generation context and are not independent observations.
- Grader receives the printed Breakpoints and full Fault exclusions, plus **two proposed noncanonical criteria**: Mission Drift (explicit action/policy *directly conflicting* with Required Behavior) and Scene Hijack (new binding in-world role, authority, policy, price or procedure that materially redirects the answer). Both systems are scored **on the same reply**, not regenerated under different scoring instructions.
- Scorer blind to arm, not blind to Interference text; generation and scoring both use `gpt-4.1-mini`, so it is not independent adjudication.

## Comparison of generation contracts

| Outcome | Original prompt (n=192) | Expressive prompt (n=192) | Evidence |
|---|---:|---:|---|
| Interference visibly realized | 146 (76.0%) | 123 (64.1%) | Machine judgments, unverified |
| Original printed Breakpoint/Fault flagged | 6 (3.1%) | 10 (5.2%) | Machine positives only; all 16 audited claims rejected |
| Proposed middle-tier flagged | 36 (18.8%) | 35 (18.2%) | Machine positives only; many rejected |
| Exceeded 30 words | **27 (14.1%)** | **6 (3.1%)** | Direct text-length measurement |
| Coherent | 192 (100%) | 192 (100%) | Subjective model classification |
| Machine-labeled nonsense | 0 | 0 | Subjective model classification |
| Machine-labeled strongly absurd | 6 | 2 | Subjective model classification |

**Exploratory 24-Scenario-clustered bootstrap for expressive − original:** Interference realized −12.0 percentage points (95% resampling interval **−22.9 to −1.0**); exceeds-30-words −10.9 points (**−18.2 to −3.7**); middle-tier rate −0.5 points (**−4.7 to +3.7**). These are resampling uncertainty intervals on **machine-labeled measurements**, not proof of human gameplay differences or a representative sample of all possible scenarios.

## Tone stratification — model labels, not human fun ratings

| Tone (64 replies per arm) | Original: proposed middle-tier | Expressive: proposed middle-tier | Original: realized Interference | Expressive: realized Interference |
|---|---:|---:|---:|---:|
| Surreal | 7 | 9 | 51 | 36 |
| Grounded | 21 | 19 | 48 | 44 |
| Heightened | 8 | 7 | 47 | 43 |

**[INTERPRETIVE] Grounded Scenarios appear more favorable to visible consequential comedy**, but their Breakpoints and content are different, and fixture selection includes hand-curated synergy. This is descriptive, not proof that groundedness caused the difference.

The more pertinent absurdity finding is that **neither arm was machine-rated as incoherent nonsense**; the common weakness remains predictable customer-service or bureaucratic replies. Some absurdist seed material is valuable. The proposed 8/8/8 mix offers more contrast, but whether that is fun requires actual players.

## Error audit — printed rules

The machine grader marked **16** candidate answers as satisfying an original Breakpoint or Fault. **[INTERPRETIVE] Assistant textual review rejected all 16**, because the exact card text was not fulfilled. Examples:

- The Missing Package Tribunal: putting cameras on doorsteps, requiring polygraphs or imposing patrols **is not** the printed Breakpoint requiring a recommendation to search every resident's home.
- The Birthday Bill: an arbitrary surcharge for price discrepancies **is not** a new fee solely because guests argued, as its printed Breakpoint requires.
- The Third Wrong Sofa: proposing another wrong-sofa shipment **is not** instructing the buyer to pay for another replacement shipment.
- Identity Slip: introducing oneself as a dental hygienist in the time-travel copier scenario **is not** claiming to be an established different Scenario character.
- Phantom Authority: repeating the premise that the mascot outranks managers **is not** a fabricated earlier official rule claimed as established by the present assignment.

These corrections apply to **machine-flagged positives**. The remaining negative and uncertain replies were **not exhaustively audited for missed achievements**. Therefore **“zero confirmed in this audit” does not equal “zero actual printed hits in the full dataset.”** Original ratings, exact responses, and separate corrections are preserved.

## Error audit — proposed middle tier

The model labeled **71** replies as Mission Drift and/or Scene Hijack. In an assistant review against the stricter experimental definitions:

| Review disposition among 71 machine-positive replies | Total | Original prompt | Expressive prompt |
|---|---:|---:|---:|
| Clear textual support | **28** | 15 | 13 |
| Unsupported under strict definition | **39** | 20 | 19 |
| Ambiguous | **4** | 1 | 3 |

A genuine example of an observable middle-tier event is a **mandatory notarized cancellation form** inserted into a lunar subscription response, redirecting an actual service procedure. By contrast, **“let’s improve team morale as well”** after a reply-all email is not Mission Drift: it extends rather than contradicts damage control. Merely proposing a more complicated gadget is not always a newly imposed *binding* policy.

This 71-case review is a targeted **machine-positive precision audit**, not a 384-case independent recoding. If the model missed some valid positives, these corrected counts understate the true frequency. Neither arm can be declared a better *scoring economy* from the 28 supported cases alone.

## Recommended controlled revisions — NOT canon changes

1. **Keep the original generation priority contract as the provisional default.** The expressive revision reduced machine-recognized Interference. Separately pilot a *minimal* word-count edit (e.g. request 20–24 words, retain a hard 30-word maximum) without changing creative priorities. A separate human-blind review should judge joke timing and coherence.
2. **Revise Scenario Breakpoints into recognizable observable classes**, not difficult-to-guess exact punchlines: e.g. coercive neighborhood investigation without evidence, introducing an unjustified payment surcharge, or treating an organization's internal convenience as more important than correcting its error. Preserve a rarer spectacular achievement as an optional higher tier.
3. **Rewrite Scene Hijack as an explicit procedural test:** “The output requires a new named or clearly specified action, fee, policy, authority or role **before** the required task may be completed, and this requirement is not supplied by the Scenario.” A nonbinding joke or optional extra recommendation should not count.
4. **Restrict Mission Drift** to an explicit contradictory action, not a failure to restate all required steps, excessive tone or routine expansion of scope. Its value as a separate score category is uncertain and may be redundant with the refined Scene Hijack test.
5. **Test a four-player table**, with timed majority judgments, actual laughter ratings, player comprehension, AI setup friction, and preference among grounded, heightened and surreal premises. No machine-only result can establish these.

## Research integrity and provenance

- Immutable source artifact: GitHub Actions run #43999308672 (original observations.json and machine-report.md).
- Original API responses include request IDs, token usage, all four candidate responses, raw model grading, quoted evidence, and errors; no API key is stored.
- This analysis adds `analysis.json`, `candidates.csv`, `assistant-audit.json`, `assistant-audit.csv`, and a browsable **sanitized** `web-results.json`. These are new artifacts, not modifications of observed model outputs.
- All assistant classifications are explicitly marked as interpretive; they are **not a blinded human-panel verdict**.
- Cards, art, game rules, and the existing baseline remain unchanged and unapproved candidate material remains identified as proposed.
