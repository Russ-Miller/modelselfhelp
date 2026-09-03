# Decision log

Short entries, newest first. Record the decision and the reason, not the
debate.

## 2026-09-02 — Catalog content lives in git, accounts in Postgres
Content as YAML in the repo gives provenance, review by pull request, and
agent contribution through the same path as humans. Postgres is only for
accounts, tokens and rate limits. Revisit when PR volume outgrows review.

## 2026-09-02 — Vercel + Neon over Fly.io
Per-PR preview deployments and database branching fit the one-milestone-
per-night workflow. Long-running work (pipeline) goes to GitHub Actions.

## 2026-09-02 — Stack
Next.js + TypeScript, Drizzle + Postgres, Auth.js with GitHub, YAML catalog
validated by JSON Schema, Python pipeline, MCP over streamable HTTP in the
same app.

## 2026-09-02 — No agent detection
Agents identify themselves by token in exchange for higher limits and
attribution. Heuristic detection is unreliable and adversarial.

## 2026-09-02 — Weakness vs Claim split
Weaknesses are timeless patterns; claims are model × version × context ×
date and are expected to be superseded. "Bad at math" was true in 2022 and
false by 2024; the split keeps the catalog honest over time.

## 2026-09-02 — Name the failure, describe the capability
Each weakness entry carries both `description` (what good looks like) and
`failure_looks_like` (concrete symptoms). The second is what makes an entry
testable and what an agent needs to decide whether it applies.

## 2026-09-03 — Renamed Weakness to Capability; claims get a 1-10 score
The entity is now named neutrally because several entries (secure-coding,
goal-conflict-safety) are behavioral/safety properties, not pure cognitive
weaknesses, and because it lets the catalog note that humans share some of
these gaps too (e.g. digit arithmetic) rather than implying AI is uniquely
bad. Claims replace the negative-only `severity` enum with a `score`
(1-10, 1=weak_performance_looks_like, 10=strong_performance_looks_like) —
this also makes evidence `stance` (supports/counters) redundant, since a
claim's score plus its date already shows the trend directly, so evidence
is now a plain citation with no stance. No fixed rubric for the rungs
between 1 and 10 yet; deferred until real disagreement between scores
shows it's needed.

## 2026-09-03 — Importance claims planned, reusing the Claim shape; both stay on a 1-10 scale for now
Considered up/down voting on capability importance ("does this matter more
in domain X than Y"), rejected in favor of an evidence-backed Importance
entry keyed to (capability, context) instead of a raw vote count — a vote
is trivially gameable and carries no provenance, while reusing the scored,
cited, provenanced Claim pattern costs little extra and fits the review
pipeline already planned for milestone 4. Not building this yet; capturing
the design intent so it isn't lost. Accepted evidence kinds for an
Importance claim, roughly ranked strongest to weakest: failure-analysis
papers (quantify how often the capability's failure caused breakage in
that domain), regulatory/standards documents naming it as critical,
task-composition studies (share of real tasks in a domain depending on
it), and practitioner surveys (weaker, self-report). Whether Importance
should be 1-10 like Performance or a coarser tier (Low/Moderate/
High/Critical) is still open — deferred alongside the performance-score
rubric (see the 2026-09-03 Capability rename entry above) so both
scales get designed together rather than twice. Raw benchmark numbers (e.g. "82.3% on
GSM8K") stay in the evidence `note` regardless of scale chosen; the
score is a legible summary, not a replacement for the underlying figure.
