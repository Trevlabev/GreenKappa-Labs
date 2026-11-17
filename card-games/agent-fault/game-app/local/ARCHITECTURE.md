# Room architecture and state machine

**Routes:** `/` landing; `/host/{code}` TV/host; `/play/{code}` phone; `/demo` simulated walkthrough; `/api/rooms/{code}` authenticated viewer-specific state; `/api/rooms/{code}/action` authenticated server transitions.

**Transitions:** `lobby → setup → submit → generate → spotlight → adjudicate → review → results → setup / finished`.

**Private role gating:** `host_hash` and per-player `token_hash` are SHA-256. Only current Judge sees secret Fault and locked personality during setup, submission, generation, and Spotlight. Host sees only the Fault family until adjudication. Individual hands included only for corresponding player. Submission owner mapping is held server-side until the results stage. Only Judge locks Spotlight and proposes qualifications. Only host submits AI results and finalizes. All players vote yes/no on the proposed qualification; a strict majority of all players is needed to finalize.

**Game invariants:** 24 Scenario cards; 36 unique Interference; six Faults. Every player begins with four. Judge does not submit. Played Interferences discard before replenishment; draw/discard reshuffle is separate by card type. All output replies are capped to 30 words at reveal. A completed round awards exactly 1 Spotlight + zero or one Bonus. The winner is highest total; ties are shared. Four players get eight rounds; 5–8 get one complete circuit.

**Caveats:** This is a local-single-server prototype, not a horizontally scaled, TLS-secured deployment. Browser tokens in localStorage on plain LAN HTTP are susceptible to other parties on a compromised network. The simple 1.3s polling interval is adequate for small party rooms, not large-scale traffic. The current majority vote is on the Judge's overall eligibility proposal; individual target-by-target voting remains a future enhancement.
