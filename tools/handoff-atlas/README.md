# Handoff Atlas — Operational Procedure Workbench

**Release:** Browser alpha v0.1.0
**Route:** https://greenkappalabs.art/tools/handoff-atlas/
**Source:** https://github.com/Trevlabev/GreenKappa-Labs/tree/main/tools/handoff-atlas

Handoff Atlas is an implemented local-first procedure builder and step-by-step troubleshooting engine. It is intended as a demonstrable portfolio product, not a production operational or court system.

## What works

- Browse, search and filter included fictional procedures.
- Create, edit, duplicate, and save structured procedures.
- Add/delete steps; choose instruction, branching decision or terminal outcome.
- Connect steps through explicit route targets, designate an entry step, and validate broken destinations, duplicate IDs, unreachable steps and absent terminal outcomes.
- Publish immutable numbered revision snapshots *within this browser* and restore older snapshots into a draft.
- Start a guided run against a published procedure, choose a branch, move backward, add operator notes, and archive a completed trail.
- Export completed handoffs as Markdown or JSON.
- Export/import an entire workspace in JSON, export individual procedures, and restore the sample library.
- Responsive desktop/mobile interface, accessible labels and keyboard-operable controls.

## Run locally

From repository root:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/tools/handoff-atlas/`.

Run core tests with Node 22:

```bash
node --test tools/handoff-atlas/tests/core.test.mjs
```

The GitHub Actions workflow additionally exercises the real UI in Chromium and at a mobile viewport.

## Architecture

- `core.mjs`: pure deterministic schema normalizer, validator, route engine, record serializer.
- `sample.mjs`: three synthetic branching example procedures.
- `app.mjs`: browser event handling, local persistence, view rendering, import/export.
- `index.html` and `styles.css`: semantic layout, responsive styling.
- `tests/`: unit and browser smoke tests.

## Data model

Schema v1 comprises a workspace containing procedures, completed runs, and revision snapshots. Procedures contain typed steps (instruction, decision, terminal). Decisions have explicit `label → target step` choices. Every published revision is normalized and validated. An active run keeps a snapshot of the procedure version at initiation.

JSON file size is capped at approximately 1.2 MB; procedures at 80 per workspace, 100 steps per procedure, 12 choices per decision, and 300 completed runs. These are operational safeguards for the public browser alpha, not a claim of suitability for regulated production workloads.

## Important limitations

- No network backend, team authentication, permissions, simultaneous editing, revision reconciliation, encryption at rest, signed audit logs, or official document integrations.
- `localStorage` is per browser profile and can be cleared. Backups must be exported manually; browser-private sessions and storage restrictions can prevent persistence.
- The exported handoff report is **not** a tamper-proof or identity-verified audit log.
- Do not enter restricted case records, real service tickets, credentials, sensitive personal information or internal operational procedures without authorization.
- Procedures are human-authored. The app does **not** provide legal advice, determine compliance or guarantee a correct operational outcome.

## Next validation gates

1. Human usability testing with fictional procedures, including keyboard and mobile accessibility.
2. Full import fuzzing, recovery scenarios, and performance review with large procedure inventories.
3. Optional authenticated backend with role-based access, revision approvals, encrypted storage, and durable signed audit events before any professional deployment.
