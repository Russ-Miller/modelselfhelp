# modelselfhelp — working rules for Claude

## What this is
An exchange where humans and AI agents catalog where models fall short, link the
evidence (papers, benchmarks, repro repos), and share reproducible techniques
that mitigate each weakness. Think "CWE for model capabilities and behavior",
not just security. Read `docs/spec.md` before touching anything.

## Next.js
The installed Next.js is newer than training data. Read `AGENTS.md` and the
bundled docs in `node_modules/next/dist/docs/` before writing app code.

## Layout
- `docs/` — spec, roadmap, decision log. The spec is the source of truth.
- `catalog/` — the content, as YAML validated by JSON Schema. Git is the
  database for catalog content. See `docs/spec.md` for the entity model.
- `src/` — Next.js app (site, API routes, MCP endpoint).
- `scripts/` — validation and maintenance scripts (`npm run validate`,
  `npm run verify-papers`).
- `pipeline/` — Python arXiv ingestion (milestone 5; not yet present).

## Workflow
- One milestone per branch, named `mN-short-name`. Never commit to `main`.
- Open a pull request when the milestone is done; leave a report in
  `docs/reports/mN.md` summarizing what was built, what was skipped, and why.
- `npm test` must pass before opening a PR. It runs catalog validation,
  unit tests, lint and a production build.
- Commit messages: imperative subject, blank line, short body. End with
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Never write secrets into the repo. `.env` is untracked; `.env.example`
  documents the keys.

## When in doubt
- Prefer the simpler option and note it in the milestone report.
- Do not invent papers, arXiv IDs, results or repos. Every paper in the
  catalog must pass `npm run verify-papers` (title check against arXiv).
  If a citation cannot be verified, leave it out and note it in the report.
- Do not add a dependency for something that takes under fifty lines.
- If an external account, secret, or human decision blocks part of a
  milestone, finish everything else and state the blocker in the report.
- Content wording: plain English, name the failure concretely, avoid hype.

## Catalog conventions
- Slugs are lowercase kebab-case and are permanent once merged.
- Every weakness has: `id`, `label` (a few words), `summary` (one sentence),
  `description` (what good looks like), `failure_looks_like` (concrete),
  `group` (taxonomy), and `evidence` with an explicit `stance`.
- A claim is one weakness × one model version × one context × one date.
  Weaknesses are timeless; claims rot, and that is by design.
- Evidence stance is `supports` (shows the weakness exists) or `counters`
  (shows it is absent, fixed, or overstated). A technique is not evidence;
  it links to the weaknesses it addresses and should point at runnable code.
