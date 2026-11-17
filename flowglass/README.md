# Flowglass / Working Alpha v0.1

**Try it:** https://greenkappalabs.art/flowglass/

Flowglass is a local-first browser application for manually mapped workflow dependencies. It focuses on explainable downstream reachability, directional relationships, graph review findings, and portable audit artifacts.

## Implemented

- Visually browse, pan, zoom, keyboard-nudge and drag component nodes.
- Create, edit, and remove components with type, owner, platform, purpose, and documentation reference.
- Add/remove directional edges with relationship labels.
- Traverse all reachable upstream and downstream components, showing minimum-hop paths.
- Flag undocumented and isolated components and directed cycles (Tarjan SCC, including self-loops).
- Generate Markdown impact reports with dependency paths and a human review checklist.
- Import/export schema-v1 JSON and retain a working copy in the current browser's localStorage.
- Use an explicitly synthetic demonstration with a deliberate approval cycle and documentation gap.

**Not implemented:** Microsoft 365 tenant discovery; Power Automate / SharePoint APIs; live runtime events; permission analysis; workflow execution; cloud accounts; server persistence; multiuser collaboration; PDF exports. Impact represents graph reachability **only**, not verified business impact. Review loops are not automatically failures.

## Run and test

The app is static; serve the repository from its root:

~~~sh
python3 -m http.server 8000
# open http://localhost:8000/flowglass/
node --check flowglass/core.mjs
node --check flowglass/examples.mjs
node --check flowglass/app.mjs
node --test flowglass/tests/core.test.mjs
# Browser smoke tests run in GitHub Actions via Playwright + Chromium
~~~

No npm packages or CDNs are required.

## Data and privacy

The graph is not uploaded by this app. Local state is held in the browser's localStorage under \`gkl-flowglass-project-v1\`. Import reads a JSON file directly in the browser (maximum 2 MB). Exports use browser Blob downloads.

Do not enter confidential operational data on shared computers. Export a backup before resetting the demo, starting a blank graph, clearing browser storage, or switching devices. No authentication or encryption at rest is provided.

## JSON format

~~~json
{
  "schemaVersion": 1,
  "name": "Example workflow",
  "description": "Synthetic example",
  "nodes": [
    {
      "id": "request",
      "label": "Request form",
      "type": "trigger",
      "owner": "Intake",
      "system": "Website",
      "description": "Starts the process",
      "documentation": "SOP-001",
      "x": 80,
      "y": 240
    },
    {
      "id": "flow",
      "label": "Routing flow",
      "type": "automation",
      "owner": "Operations",
      "system": "Power Automate",
      "description": "Routes incoming records",
      "documentation": "",
      "x": 350,
      "y": 240
    }
  ],
  "edges": [
    {"id": "e1", "from": "request", "to": "flow", "label": "on submission"}
  ]
}
~~~

Node types: \`trigger\`, \`automation\`, \`data\`, \`approval\`, \`notification\`, \`report\`, \`external\`, \`other\`. IDs must be unique and begin with a letter. Edge endpoints must exist, and duplicate directional pairs are rejected. Limits: 250 nodes and 1,500 edges.

## Architecture

- \`core.mjs\`: side-effect-free schema validation, normalization, breadth-first graph traversal, Tarjan strongly connected components, impact analysis, Markdown reporting.
- \`examples.mjs\`: self-contained fictional service workflow fixture.
- \`app.mjs\`: browser state, accessible component inventory and inspector, SVG wiring, transforms, pointer interactions, storage and Blob exports.
- \`styles.css\`: standalone responsive design, no external web fonts.

## Next engineering milestones

1. Import read-only exported Power Platform solution metadata (XML / JSON) without tenant access.
2. Add persistent import history and diffable graph snapshots.
3. Add graph layout algorithms and more keyboard-first map controls.
4. Add optional accessible table-first review for large graphs.
5. Validate impact interpretation with reviewed real-world *sanitized* workflows; introduce explicit confidence and verification labels.
