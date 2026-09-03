# Roadmap

Each milestone is one branch, one pull request, one report in
`docs/reports/`. Definition of done must be checkable without a human.

| # | milestone | done when |
|---|---|---|
| 1 | Spec, schemas, seed catalog, validation, scaffold | `npm test` green; ≥10 capabilities with verified citations; CI runs on PRs |
| 2 | Browsable site | all routes in spec §7 render from the catalog; deployed preview on Vercel |
| 3 | Read API and MCP server | spec §8 read endpoints and MCP tools work; example agent script runs the `advise` call |
| 4 | Accounts, tokens, writes | GitHub login; tokens with scopes; write endpoints create `proposed` records with provenance shown on pages; capability requests; admin CRUD on capabilities behind `is_admin` |
| 5 | arXiv pipeline sample | one month of metadata processed; review queue populated; measured cost recorded in report |
| 6+ | Catalog growth | +20 capabilities per milestone with mitigations and repos; pipeline scaled incrementally |

External prerequisites by milestone:
- M2: Vercel account linked to the repo.
- M4: GitHub OAuth app (local callback `http://localhost:3000/api/auth/callback/github`), Neon database, secrets in `.env`.
- M5: Anthropic API key in `.env` and as a GitHub Actions secret.
