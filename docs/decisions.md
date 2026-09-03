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

## 2026-09-03 — Capability requests are a separate lightweight record; admin is one boolean flag
A request to add a new capability doesn't require the requester to write
strong/weak anchors or find evidence — that would block casual, valuable
suggestions. So a request is its own small record (label, rationale,
optional links, status pending/accepted/declined/duplicate), not a
`catalog/capabilities/*.yaml` stub; the catalog stays made only of
fully-formed, evidence-backed entries. An admin turns an accepted request
into a real Capability. Admin access is a single `is_admin` boolean on the
account, set by hand for now — explicitly not a roles/permissions system;
that stays a non-goal. Admin write endpoints bypass the `proposed`
moderation state entirely, formalizing the earlier "maintainer" persona
into something with real API access rather than only GitHub PR review.
Open and deliberately unresolved: whether an admin's direct edit commits
to git (keeping git as the catalog's source of truth) or whether
capabilities move to a database once this exists — ties into the earlier
"git as the database... revisit when PR volume outgrows review" decision.

## 2026-09-03 — Bootstrap admin granted by GitHub login, not email
Considered seeding the first admin ("Captain of the Ship") tied to an
email address, rejected because GitHub OAuth only returns an email if the
account exposes one — a private-email setting would silently break the
match even if that email is verified on the account. GitHub login is
always returned and needs no extra scope, so `ADMIN_GITHUB_LOGINS` (an
env var allowlist, starting with `Russ-Miller`) is checked at login time
and upserts `is_admin=true` on match — live, not a pre-seeded row, so it
doesn't depend on seeding order relative to first login.

## 2026-09-03 — Personal-study reframe (major, ~180 degrees on scoring)
The project's purpose was reframed from "CWE for AI model capabilities,
agent-developer-first SaaS" to primarily a personal study tool — curiosity
-driven, "the neuroscience of LLMs," built for the author's own thinking
first. Other humans and eventually agents are hoped-for second-order
beneficiaries, not the v1 design target; the reasoning (the user's own):
the most useful tools were usually built because their creator wanted one
for themselves.

Consequences, each reversing or substantially revising an earlier
decision in this log:
- **Score retired.** The 1-10 capability score (2026-09-02 entry) is
  dropped for v1: scoring invites Goodharting invisibly from inside the
  loop, and quantitative numbers aren't portable across model version,
  decoding config, or benchmark quirks. Replaced by qualitative,
  directional claims with visible provenance.
- **Claim redefined.** A Claim is no longer a (capability, model,
  version, context, date) performance data point — it's a directional,
  scoped statement ("X degrades on tasks where Y"), the primary content
  unit. Capability becomes a topic page that lists claims (progressive
  disclosure), not a scored thing.
- **Sources, not Evidence-on-the-claim.** Renamed Paper → Source,
  generalized to cover the author's own observations under the same
  schema (so a lower-rigor parallel notes system doesn't develop). Claims
  reference sources; a source fixed once fixes every claim citing it.
- **Contested claims get structure**: both-side sourced citations plus a
  suspected disagreement axis (model scale, task family, operationalization,
  success criterion), explicitly flagged when it's a guess — not a bare
  boolean.
- **Durable vs. perishable is now a schema field** (`kind`:
  mechanism/observation), not just a tag, so perishable model-specific
  findings can't quietly contaminate durable mechanism-level knowledge.
- **Taxonomy demoted to a view.** The rigid single `group` field becomes
  soft, re-assignable `tags` — folk categories like "reasoning" probably
  carve the space badly and are expected to be re-carved at least twice.
- **Ongoing re-evaluation designed in** (schema + views only for v1):
  `last_checked_at`/`last_new_evidence_at` on claims, a recent-activity
  view, a sources view, and a 14-day staleness view. The actual daily
  internet-scouring automation is explicitly later-phase, gated on real
  engineering and API-cost decisions — same posture as the original arXiv
  pipeline.
- **The entire contributor-platform surface** (accounts, admin CRUD,
  capability requests, bootstrap-admin-by-GitHub-login, the agent-facing
  MCP/advise API) is preserved in spec.md §9 as later-phase design, not
  deleted — the thinking behind it is still sound, just not v1 priority.
  When it happens, agent-facing framing must be symptom → intervention,
  phrased as actions, never as a property of the model.
- Deferred, explicitly not v1: prediction-before-test as an entry type
  (record expectations before checking, since memory edits priors to
  match outcomes).

Execution note: rather than migrate all ~90 existing catalog files
against a schema that was still being nailed down, this pass rewrote
spec.md and the schemas and produced one fully worked example
(self-repair, under docs/examples/) for review before the bulk migration.
`catalog/` and the deployed site still reflect the pre-reframe model as of
this entry; `npm test` stays green because nothing under catalog/,
scripts/, or src/ was touched this round.
