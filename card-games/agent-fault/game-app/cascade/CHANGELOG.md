# CASCADE v0.2-P — independent copy

- Exact v0.9-P 66-card deck and original art preserved, no deck edits.
- New sequential turn state machine: setup → baseline → lock_cards → card AI → different-player Handoff → Handoff AI → next card → judging → optional challenge → results.
- Accumulated transcript in each OpenAI prompt; preserve earlier decisions, not separate independent AI runs.
- Secret Fault and profile private until human judgment; card owners and Handoff authors hidden until after scoring.
- Hook must be exact text from the previous AI reply if supplied; Handoff limit 2–25 words.
- One Spotlight and optional one literal Bonus, challenge-only voting; attribution to the action that elicited the winning reply.
- Response validator requires complete sentences, refuses mechanical 30-word truncation.
- Added original animated six-stage branching demo showing card A and a different player's Handoff.
- Independent Netlify app and Postgres tables (`afc_` prefix), no changes to deployed Classic game.
- Includes standalone Node regression tests and QA documentation.
