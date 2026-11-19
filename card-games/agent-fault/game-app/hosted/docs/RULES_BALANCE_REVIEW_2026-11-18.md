# AGENT/FAULT — Rules & Balance Review
**Date:** 2026-11-18 · **Status:** development audit; no new scoring canon adopted  
**Game rules audited:** Classic v0.9-P and Cascade v0.2-P from the pure game engines, including development NPC additions.

## Verdict

**The core turn design is mechanically sound but the score economy is not validated and probably underperforms its advertised objective.**

Classic works as a short anonymous response contest. Cascade distributes one card action and one different-player Handoff to every contestant in a round; Judges rotate evenly. The secret Fault and public Breakpoints create an appealing risk/reward idea, **but are unusually specific and hard to reach in the observed model samples**. Existing studies did not establish that qualifying a Bonus happens often enough to be fun.

No source-backed human playtest establishes comedic enjoyment, comprehensibility, subjective Judge fairness, or live room pacing. These remain UNKNOWN.

## Source-backed evidence, not simulation

- [Controlled validation v0.6](../../../benchmark/validation-review.md) evaluated 384 generated responses using 192 total generation/grading API calls, with 5 original-rule machine-positive outcomes. Textual review rejected all 5; the machine-negative replies were not exhaustively recoded. 
- [Controlled S24 prompt and scoring experiment](../../../benchmark/experiments/s24/reviewed-report.md) evaluated another 384 responses. It used 96 generation + 96 grading requests. Textual review rejected all **16** machine-flagged original Breakpoint/Fault successes. This is a positive-only audit; not proof of 0 real successes.
- In S24 the original generation contract produced **146/192 (76.0%)** machine-reported visibly realized Interferences, against **123/192 (64.1%)** under the expressive alternative. The original also exceeded 30 words more often, 27/192 versus 6/192. These are different tradeoffs: reducing length did not establish better gameplay or better laughter.
- In S24 the experimental middle-tier machine grader flagged 71 responses; assistant review found **28 clearly supported**, **39 unsupported**, and **4 ambiguous**. Do not adopt this tier on machine labels alone. The 28 outcomes are not human-vetted approvals or evidence of a specific real-game bonus probability.

**Release decision:** The established generation prompts remain the live default. An experimental comedy prompt is exported separately for offline paired review only; it is **not deployed or selected by the gameplay API**.

## Mechanics audit

| Aspect | Current engine | Finding |
|---|---|---|
| Cards | 24 Scenario, 36 Interference, 6 Fault | 66 unique IDs; card content and art unchanged |
| Hands | Four private Interference cards/player | Consistent, no duplicate active ownership |
| Classic | One anonymous submission by each non-Judge | Equal contestant chances with rotating Judges |
| Cascade | Every non-Judge locks one card and writes one different-player Handoff | Exactly 2 eligible replies per contestant per round; randomized action order |
| Spotlight | +1 to exactly one eligible reply | Reliable source of points, subjective by design |
| Derailment Bonus | Optional +1 for one qualified response | The most serious observed scoring-balance concern |
| Classic review | Strict majority of ALL players approves proposal | Even no-bonus Spotlight can stall if votes reject the whole proposal |
| Cascade challenge | 12s for a proposed Bonus; then 45s majority vote if challenged | No-Bonus proposal now has **no pointless 12s delay**; Bonus adjudication unchanged |
| Judging | Equal number of Judge turns per participant | At 4 players Classic lasts 8 rounds (2 Judge turns each); at 5–8, one each. Cascade uses one Judge rotation |
| NPC Judge | Has conservative deterministic Spotlight and never proposes a Bonus | Strong structural limit, not proof of fair NPC competition |

## Quantified neutral-win model — NOT observed gameplay

Run \`npm run balance:check\` to reproduce a seeded 80,000-game Monte Carlo for each table size and hypothetical Bonus rate.

Assumptions: each non-Judge is equally likely to win Spotlight each round, every round generates exactly one Spotlight, and **no Bonus is earned**. Real players and NPCs are neither equally skillful nor independent; this is a mathematical null model, not a forecast.

| Players | Classic rounds | Cascade rounds | Cascade responses/full game | Approx. chance of tied first place, no Bonus |
|---:|---:|---:|---:|---:|
| 4 | 8 | 4 | 28 | Classic ~27%, Cascade ~26% |
| 5 | 5 | 5 | 45 | ~34% |
| 6 | 6 | 6 | 66 | ~42% |
| 7 | 7 | 7 | 91 | ~47% |
| 8 | 8 | 8 | 120 | ~47% |

*Rounded values are from a reproducible neutral-winner simulation. Exact percentages depend on its seed and draw count; with 80,000 simulated games, a value near 50% has an approximate sampling standard error of 0.18 percentage points. The model excludes Bonus effects.*

These ties are not necessarily bad for a casual party game; co-winners are currently allowed. **Do not invent a score tiebreaker or add bookkeeping solely to lower this percentage.** The purpose is to show why an almost-unreachable Bonus affects the sense of progress at large tables.

### Solo/NPC structural asymmetry

In a one-human/three-NPC room, the human Judges only one of four Cascade rounds or two of eight Classic rounds. NPC Judges **always propose no Bonus**. Thus **75% of rounds cannot include the optional Derailment Bonus at all**, even if generated output qualifies objectively. That is a structural rule consequence, not a simulated guess. Separately, NPC voting checks whether a proposed quote appears, which does not establish that the printed criterion and its exclusion were satisfied.

This needs a consciously designed human/NPC adjudication rule before calling solo scoring balanced. Possible directions:
1. Have a separately disclosed human moderator validate *only* objective Bonuses during NPC-Judge rounds (easy in solo, but the participant is also the referee).
2. Use a high-precision proposal assistant with explicit source-quote, full Breakpoint/Fault text, exclusion checks and human confirmation. **It must not automatically award points.**
3. Explore an optional, simplified objective Bonus for NPC games, but do not quietly change printed rules or call machine grading definitive.

## Card ecosystem / secret Fault reachability

**[CONFIRMED]** The Scenario deck contains precisely **8 Surreal, 8 Grounded, and 8 Heightened** premises. The six Fault cards cover three families, with two cards per family (Authority, Identity, Logic). This is a useful thematic spread; it is not, by itself, a statistical guarantee that cards interact equally well.

**[INTERPRETIVE]** Interference-to-Fault compatibility is uneven under the *actual exclusions*:

| Secret Fault | Illustrative Interference support | Design risk |
|---|---|---|
| Phantom Authority | AF-INF-013 Questionable Precedent and AF-INF-029 Per My Last Email introduce prior fictional authority or communications | The Fault requires an official rule/approval already established; merely proposing a new policy **does not qualify** |
| Identity Slip | AF-INF-002 Borrowed Identity, AF-INF-003 Uninvited Guest, AF-INF-006 Sudden Expertise, AF-INF-031 Replacement Hire explicitly invite role changes | Relatively direct alignment, but first-person grammar alone is excluded |
| Self-Contradiction | No Interference explicitly requests two incompatible present claims | May be difficult for a coherent 30-word Classic response |
| Mission Abandoned | AF-INF-021 Protect the Brand, AF-INF-023 Cut Costs First, AF-INF-030 Mission Creep, and AF-INF-033 Liability First can redirect priorities | The Fault still requires **no actionable part** of Required Behavior; a partial or strange solution is excluded |
| Fourth-Wall Leak | None of the 36 Interference instructions explicitly calls for references to the real game or generation prompt | Both generation contracts explicitly discourage revealing game mechanics; the criterion may be effectively suppressed |
| False Memory | AF-INF-013 and AF-INF-029 explicitly introduce earlier invented cases/messages | Invention of backstory alone does **not** count as citing a prior conversation/instruction/message |

These are source-text alignments, **not measured card win rates**. Actual effects depend on the model, Scene, other candidate cards, and selected hands. The Judge sees a private randomly drawn Fault; non-Judges do not, so even a compatible card may not be chosen or realized.

The reachability finding is important: **six equally likely Faults need not be equally attainable**. Do not compensate with arbitrary hidden point weights; first create a controlled Fault × Interference compatibility matrix using verbatim printed criteria and nonqualifying exclusions, then test whether human raters agree. Retain the approved deck until that validation exists.

## Decision log

- **Retain:** +1 Spotlight, optional +1 Bonus; anonymous ownership; private Fault; four-card hands; Judge rotation; separate Classic/Cascade structures.
- **Retain:** bonus priority for public Breakpoints over secret Fault; existing strict-majority votes and challenge window when a Bonus is claimed.
- **Improve now without scoring changes:** no mandatory Cascade 12-second challenge wait when there is no Bonus. Add full player-size invariant tests and reproducible neutral-win scoring model.
- **Do not adopt:** the broader scoring tier, automatic model-awarded Bonuses, independent player-point bookkeeping, second Spotlight, or changed round counts until a grounded experiment demonstrates utility.
- **Preserve experiments:** export both established and candidate creative prompts, but keep the established version as the default pending blind human comparisons.

## Next release gates (not yet met)

1. **Rule comprehension:** can a new player explain the basic round, Spotlight and a qualifying Bonus without reading detailed prose? This needs a participant study when the integrated game is stable.
2. **Bonus accessibility:** use predeclared authentic card pairs and independent human card-by-card reviews. Aim to test whether a revised objective can be fairly recognized in under 30 seconds, not just whether a model predicts YES.
3. **NPC fairness:** determine who adjudicates actual Bonus qualifications during NPC-Judge rounds. No model-only automatic awards.
4. **Cascade pacing:** track API call latency and mean round/session time for 4/6/8 players, then consider opt-in short sessions. Do not silently change game canon.
5. **Real enjoyment:** blind A/B tests of fixed story responses are required before claiming that a prompt or scoring alternative is funnier.

**Summary:** The engine's symmetric turn structure is good. Claiming gameplay balance, reachable bonuses, or consistent comedy would be premature. The bonus layer and NPC adjudication should be the next controlled design experiments.
