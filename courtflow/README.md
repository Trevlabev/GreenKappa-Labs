# CourtFlow v0.2 — Visual Court Operations Workflow Designer

Public alpha: https://greenkappalabs.art/courtflow/

CourtFlow is a **working, synthetic workflow simulator** for intake, queues, dependent tasks, exceptions and case handoffs. It is a legal-technology portfolio project, **not an operational court case-management product**.

## Functional features

- Five entirely fictional demonstration records, including overdue work, an exception and a completed case.
- Create synthetic intakes using one of three configurable workflow profiles.
- Filter queue by text, workflow, team or computed operational status.
- Complete tasks only when their prerequisites are satisfied. Final handoff requires resolution of open exceptions.
- Add/resolve exceptions; reassign teams and change priority.
- Show fictional calendar-day targets and derived status.
- Visual Workflow Studio: add/remove steps, drag process nodes, draw prerequisite connectors, edit step attributes, auto-arrange and save a validated graph.
- Configure priority-based conditional branches (Routine, Elevated or Urgent). Route conditions are evaluated at synthetic intake only, and cannot be used as jurisdictional or legal rules.
- Preview active and skipped steps for each priority, with a keyboard alternative to dragging (Alt + arrow keys).
- Existing cases retain their original task definitions when the shared profile changes.
- Browser-local storage, validated workspace JSON import/export (including snapshot dependency graphs and closure consistency), Markdown reports and CSV activity export.
- Timestamped local audit events for relevant actions.

## Safety and boundaries

**All included workflows and time offsets are invented for demonstration, not based on real jurisdictions, court procedures or deadlines.** Never use CourtFlow for actual case handling, court filing, statutory deadline calculation or legal advice.

No real litigant data, court records, employer procedures, credentials or integrations are included. Do not enter personal or confidential court information. CourtFlow cannot access or submit to court filing platforms.

State is held in your browser's local storage. The application itself uses first-party static JS/CSS with no API calls or telemetry. Exporting creates local files. Browser storage is **not encrypted, synchronized, tamper-evident or access-controlled** and should never store sensitive case material.

The application is not certified or validated for any live judicial environment. Production work would require proper rules provenance, security and access controls, legal review, records retention, availability and accessibility validation.

## Architecture

- core.mjs — deterministic workflow engine, task dependencies, import validation, simulated status calculations and exports.
- sample.mjs — generated fictional demonstration records.
- app.mjs — browser interface and local state management.
- designer.mjs — dependency graph canvas, inspector, drag interaction, connection editing and route previews.
- index.html and styles.css — responsive user interface.
- tests/core.test.mjs — deterministic Node test coverage.
- tests/browser-smoke.mjs — headless Chromium UI and responsive smoke tests.
- .github/workflows/courtflow-validation.yml — syntax, unit and browser tests.

Profiles define tasks with a stable ID, label, simulated offset from intake, dependency IDs, one final handoff, and optional <code>when: {priority: "Urgent"}</code> route conditions. All three priority projections are validated for a connected directed acyclic graph. A portable <code>layout</code> map saves diagram positions. Conditional paths are projected once at intake, and existing cases retain their saved tasks even if their priority or originating profile later changes.

## Run locally

From the website repository root:

    python3 -m http.server 8000

Open http://localhost:8000/courtflow/ .

## Tests

    node --check courtflow/core.mjs
    node --check courtflow/sample.mjs
    node --check courtflow/app.mjs
    node --check courtflow/designer.mjs
    node --test courtflow/tests/core.test.mjs

## Next development gates

1. Cross-browser accessibility review including Safari and assistive technology.
2. Human-tested workflow reversal and authorization design.
3. Synthetic integration adapters, never actual court credentials.
4. Approved enterprise security, retention and audit integrity design if future real-world use is contemplated.
