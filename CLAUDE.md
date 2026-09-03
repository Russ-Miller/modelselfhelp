# modelselfhelp — working rules for Claude

## What this is
Primarily a personal study tool for organizing what's actually understood
about LLM capabilities — curiosity-driven, "the neuroscience of LLMs" —
not a contributor platform built for a hypothetical audience. Other
humans, and eventually agents, are hoped-for second-order beneficiaries,
not the v1 design target. Read `docs/spec.md` before touching anything —
it has a status note at the top about the current transitional state
(catalog content vs. schema may be mid-migration; check both).

## Next.js
The installed Next.js is newer than training data. Read `AGENTS.md` and the
bundled docs in `node_modules/next/dist/docs/` before writing app code.

## Layout
- `docs/` — spec, roadmap, decision log. The spec is the source of truth.
- `docs/examples/` — draft schema/content for changes still under review,
  kept separate from `catalog/` so `npm test` never goes red for a draft.
- `catalog/` — the content, as YAML validated by JSON Schema. Git is the
  database for catalog content. See `docs/spec.md` for the entity model.
- `src/` — Next.js app (site, API routes, MCP endpoint — the MCP/API
  surface is later-phase per spec §9, not v1).
- `scripts/` — validation and maintenance scripts (`npm run validate`,
  `npm run verify-papers`).
- `pipeline/` — later-phase automated re-evaluation (spec §6, §9); not
  yet present.

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
- Do not invent papers, arXiv IDs, results, repos, or personal
  observations. Every paper-kind source must pass `npm run verify-papers`
  (title check against arXiv). An observation-kind source records what
  the user actually noticed — never fabricate one on their behalf; if a
  worked example needs an illustrative observation, mark it plainly as a
  placeholder rather than presenting it as something the user said.
- Do not add a dependency for something that takes under fifty lines.
- If an external account, secret, or human decision blocks part of a
  milestone, finish everything else and state the blocker in the report.
- Content wording: plain English, name the mechanism or the finding
  concretely, avoid hype. A claim without its scope condition gets
  misapplied later — always write the scope into the statement itself.

## Catalog conventions
- Slugs are lowercase kebab-case and are permanent once merged.
- A **Capability** (`catalog/capabilities/`) is a topic page: `id`,
  `label`, `summary`, `description`, `tags` (soft, re-assignable — not a
  rigid single `group`), `status` (`active`/`parked`). It lists claims; it
  is not itself scored.
- A **Claim** (`catalog/claims/`) is the primary content unit: a
  directional, scoped statement (`statement`), not a performance number.
  Carries `kind` (`mechanism` = durable / `observation` = perishable,
  tied to a specific model or era — keep these structurally distinct so
  perishable content doesn't contaminate durable knowledge),
  `backing_strength` (`single-paper`/`replicated`/`mechanism-reasoning`/
  `own-observation` — a category, not a score), and `sources` (a list of
  `{source, stance: supports|contests, note}`). A contested claim needs
  sources on both sides plus a `disagreement_axis` explaining the
  suspected reason for disagreement, explicitly flagged `is_guess` when
  it is one — never a bare `contested: true` with nothing backing it.
- A **Source** (`catalog/sources/`) is a paper or the user's own
  observation, same schema, distinguished by `kind`. Claims reference
  sources, not the other way round — fix a source once, every claim
  citing it benefits.
- A **Technique** is not a source; it links to the capabilities it
  improves and should point at runnable code.
