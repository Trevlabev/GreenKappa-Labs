# AGENT/FAULT Benchmark Lab — GitHub Pages / GitHub Actions edition

**Public dashboard target:** https://greenkappalabs.art/card-games/agent-fault/benchmark/
**GitHub runner:** https://github.com/Trevlabev/GreenKappa-Labs/actions/workflows/agent-fault-benchmark.yml

No local Node installation, PowerShell, Netlify CLI, or server deploy is required for this edition. The dashboard is static; GitHub Actions performs OpenAI API calls with the repository secret. The existing Netlify API key cannot be read/moved by the connector and is not used here.

## One-time credential setup

On GitHub, go to **Trevlabev / GreenKappa-Labs → Settings → Secrets and variables → Actions → New repository secret**.

- Name: `OPENAI_API_KEY`
- Value: the user's existing OpenAI API key (do not paste into this chat or any file tracked in Git).

Set a usage/budget limit in the OpenAI Platform before a full run. GitHub Actions secrets are not embedded in GitHub Pages HTML or in workflow artifacts.

## Run a small real test first

1. Open the [benchmark workflow](https://github.com/Trevlabev/GreenKappa-Labs/actions/workflows/agent-fault-benchmark.yml).
2. Click **Run workflow**; choose `fixture = F01`, `model = gpt-4.1-mini` (two billable API requests).
3. Open the completed run. Download its `agent-fault-results-...` artifact ZIP and extract `agent-fault-results.json`.
4. Open the [benchmark dashboard](https://greenkappalabs.art/card-games/agent-fault/benchmark/), scroll to **Evidence & Export**, and import that JSON. Check two versions' raw 30-word candidate texts, review Breakpoints and Faults, then export your reviewed JSON.
5. Only if the small test works, select `fixture = all` to execute 32 billable calls. Partial results are stored even if the workflow fails partway through; choose artifacts from the completed run.

The workflow runs ONLY when manually dispatched. The website cannot make paid calls, which is deliberate: it needs no public endpoint or browser-held API key. **The research inputs/card texts are publicly hosted**, and imported results/grades live only in your browser until exported. GitHub artifact downloads require appropriate repository access and expire according to the configured retention.

## Validation

Run `node --test card-games/agent-fault/benchmark/tests/benchmark.test.mjs` in a repository clone to test fixtures (optional; automated in GitHub Actions). The validation mocks no real AI provider responses.

## Research caveats

- 16 scenario-personality fixtures x baseline/challenger = 32 batch calls x up to 4 labeled candidates = 128 responses. The first test is one paired fixture = 2 calls.
- Results are actual API generations, not human tabletop playtests or independent model runs for each candidate.
- All candidate answers share one context per version/fixture and can contaminate one another.
- Some Scenario and Interference texts differ simultaneously across versions; the comparison is not a clean single-variable experiment.
- No automated comedy judgments or ground-truth Fault decisions are made. A human should adjudicate each answer in the dashboard.
- This GitHub Pages runner does not use the Netlify BENCHMARK_ACCESS_TOKEN. The existing Netlify project can remain unused.
