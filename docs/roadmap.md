# Roadmap

Each milestone is one branch, one pull request, one report in
`docs/reports/`. Definition of done must be checkable without a human.

Re-sequenced 2026-09-03 for the personal-study reframe (see decision log).
Milestones 1r-4r below supersede the old 2-5; the old 2-5 content is kept
as "Later phase" since the design still stands, just deprioritized.

| # | milestone | done when |
|---|---|---|
| 1 | Spec, schemas, seed catalog, validation, scaffold (superseded, see 1r) | `npm test` green; ≥10 capabilities with verified citations; CI runs on PRs — **done, but content model has since changed** |
| 1r | Reframe: new schema + one worked example | spec.md v0.3 in place (done); `docs/examples/` has a fully worked capability+claims+sources under the new model, reviewed |
| 2r | Bulk migration | all existing capabilities/claims/sources/techniques migrated to the new schema; `catalog/schema/` is the new schema; `npm test` green again |
| 3r | Site rebuilt around the new model | routes in spec §8 (capability→claim progressive disclosure, sources view, recent-activity view, stale view); deployed |
| 4r | Manual re-check workflow | a way to mark a claim checked and record `last_checked_at`/`last_new_evidence_at` by hand; no automation yet |
| 5r+ | Catalog growth | claims and sources added as genuinely studied, at whatever pace that happens |

## Later phase (design preserved in spec.md §9, not scheduled)

| milestone | done when |
|---|---|
| Read API and MCP server | spec §9 read endpoints and MCP tools work; example agent script runs the `advise` call |
| Accounts, tokens, writes | GitHub login; `is_admin` via `ADMIN_GITHUB_LOGINS`; write endpoints; capability requests; admin CRUD |
| Automated re-evaluation pipeline | daily sweep for new evidence on existing claims; 14-day staleness re-checks; cost measured on a sample before scaling |
| Prediction-before-test | a way to record an expectation before checking it |

External prerequisites, when each phase is actually picked up:
- Site deploy: Vercel account linked to the repo (already done).
- Accounts/writes: GitHub OAuth app, database, secrets in `.env`.
- Automated pipeline: Anthropic API key in `.env` and as a GitHub Actions
  secret.
