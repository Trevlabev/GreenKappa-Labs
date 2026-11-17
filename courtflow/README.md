# CourtFlow v0.1 — Interactive Court Operations Workflow Simulator

Public alpha: https://greenkappalabs.art/courtflow/

CourtFlow is a **working, synthetic workflow simulator** for intake, queues, dependent tasks, exceptions and case handoffs. It is a legal-technology portfolio project, **not an operational court case-management product**.

## Functional features

- Five entirely fictional demonstration records, including overdue work, an exception and a completed case.
- Create synthetic intakes using one of three configurable workflow profiles.
- Filter queue by text, workflow, team or computed operational status.
- Complete tasks only when their prerequisites are satisfied. Final handoff requires resolution of open exceptions.
- Add/resolve exceptions; reassign teams and change priority.
- Show fictional calendar-day targets and derived status.
- Edit and validate profile JSON: acyclic graph, unique task IDs, exactly one final handoff.
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
- index.html and styles.css — responsive user interface.
- tests/core.test.mjs — deterministic Node test coverage.
- tests/browser-smoke.mjs — headless Chromium UI and responsive smoke tests.
- .github/workflows/courtflow-validation.yml — syntax, unit and browser tests.

Profiles define tasks with an ID, label, simulated offset in days from intake, dependency IDs, and a single final task. Profile revisions apply only to cases created after the revision.

## Run locally

From the website repository root:

    python3 -m http.server 8000

Open http://localhost:8000/courtflow/ .

## Tests

    node --check courtflow/core.mjs
    node --check courtflow/sample.mjs
    node --check courtflow/app.mjs
    node --test courtflow/tests/core.test.mjs

## Next development gates

1. Cross-browser accessibility review including Safari and assistive technology.
2. Human-tested workflow reversal and authorization design.
3. Synthetic integration adapters, never actual court credentials.
4. Approved enterprise security, retention and audit integrity design if future real-world use is contemplated.
