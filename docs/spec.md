# modelselfhelp — product and data specification

Version 0.3, 2026-09-03. This document is the source of truth. Change it in
the same pull request as the code that changes behavior.

**Status note (2026-09-03):** this version is a substantial rewrite — see
`docs/decisions.md`, "Personal-study reframe," for why. The live catalog
under `catalog/` and the deployed site still reflect the *previous* model
(Weakness→Capability with a 1-10 score) as of this writing. A worked
example of the new model lives under `docs/examples/` pending review;
`catalog/` itself gets migrated in the next pass. If the two disagree,
this document describes where the project is headed, not necessarily
what's live right now — check `catalog/schema/` directly to see which
schema is actually in force.

## 1. Purpose

This is primarily a personal study tool: a place to organize what I
actually understand about LLM capabilities as I learn it — "the
neuroscience of LLMs." Curiosity-driven, not built to a spec for a
hypothetical audience. The reasoning: the most useful tools were usually
built because their creator wanted such a tool for themselves; build the
version that's genuinely useful to me, and it will serve others better
than one designed for an imagined user from day one.

Two things follow from that:

1. **v1 optimizes for one reader: me, thinking.** Progressive disclosure
   (capability → claims → backing detail), honest epistemic status on
   every claim, and structure that makes it easy to revise my own mind —
   not conversion funnels or contributor onboarding.
2. **Everyone else is a hoped-for second-order benefit, not the design
   target** — first other humans curious about the same questions, and
   only after that, agentic systems that might use this as an input. Both
   are welcome, neither drives v1 decisions. Concretely: the earlier
   contributor-platform design (accounts, admin CRUD, capability requests,
   an MCP server framed around "what should I as an agent do") is real
   and stays documented (§9), but it's explicitly a later phase, not v1.

## 2. What changed from the first draft, and why

The project's first pass (through 2026-09-02) modeled this as "CWE for
model capabilities" — a contribution platform for agent developers, with
capabilities scored 1-10 per model version. That framing is retired for
v1. Specifics:

- **No numeric score.** A repository that optimizes toward an eval score
  Goodharts, and the degradation is invisible from inside the loop.
  Quantitative capability numbers also aren't portable — they're
  entangled with model version, decoding configuration, and benchmark
  quirks in ways a bare "6/10" hides. Qualitative claims with visible
  provenance are more honest about their own epistemic status.
- **The Claim, not the score, is the unit of content.** A claim is a
  directional statement with its scope condition attached: "chain-of-
  thought degrades performance on tasks where verbalization disrupts an
  otherwise intuitive judgment," never "CoT is sometimes bad." A claim
  written without its scope gets misapplied later — that's the failure
  mode this format exists to prevent.
- **Sources are first-class; claims reference them, not the reverse.** If
  a claim owned its citations directly with no independent source record,
  one flawed paper backing six claims would be six things to find and fix
  later instead of one. My own observations are sources too, under the
  same schema as papers — otherwise a parallel, less-rigorous personal-
  notes system develops, and I'd end up biased toward whichever is easier
  to write into.
- **Ongoing re-evaluation, not one-time cataloging.** The system should
  keep looking for evidence that supports or contests existing claims, not
  just discover new capabilities once. See §6.
- **Contested claims need real structure**, not a boolean. See §5, Claim.
- **Durable and perishable knowledge are structurally separated.**
  Mechanism-level findings (why a phenomenon happens) tend to survive
  model generations; model-specific performance observations don't. Claims
  carry a `kind` for exactly this reason — see §5.
- **Taxonomy is a view, not the primary structure.** Folk categories like
  "reasoning" or "instruction following" probably carve the space badly,
  and re-carving should be a re-tagging exercise, not a migration.

## 3. First users

Me, first. If this becomes useful to other curious humans reading the
site, or later to agents via an API, that's a genuine but secondary goal —
see §9 for what that later phase could look like and why it's deferred.

## 4. Entity model

Content entities live in `catalog/` as YAML, one file per record. Every
content record has an `id` slug that's permanent once merged.

### Capability  (`catalog/capabilities/<id>.yaml`)
A topic — a named area of interest that groups claims for progressive
disclosure. Not scored; the capability page's job is to list its claims,
not to render a verdict.

| field | type | notes |
|---|---|---|
| id | slug | permanent |
| label | string | plain-English name |
| summary | string | one sentence — what this topic is about |
| description | string | a paragraph of context; what's interesting about this area |
| tags | slug[] | soft, freely re-assignable labels — see §7. Not a single required parent group. |
| parent | slug? | optional parent capability, for variants |
| aliases | string[]? | other names used in the literature |
| techniques | slug[]? | techniques relevant to this capability |
| related | slug[]? | other capabilities |
| status | enum | `active` (currently tracked) or `parked` (noted, not being actively studied) |
| submitted_by | string | provenance, see §8 |

### Claim  (`catalog/claims/<id>.yaml`)
The primary content unit: a directional, scoped statement, not a data
point. The `id` is a slug derived from the statement itself (e.g.
`self-repair-needs-external-signal`), not from a model/version/date
combination the way the old Claim id was.

| field | type | notes |
|---|---|---|
| id | slug | derived from the statement |
| capability | slug | the Capability this claim sits under |
| statement | string | the directional, scoped claim itself — see §2 |
| tags | slug[]? | additional soft labels beyond the capability's own |
| kind | enum | `mechanism` (durable — why something happens) or `observation` (perishable — how a specific model/era performs). See §5. |
| backing_strength | enum | `single-paper`, `replicated`, `mechanism-reasoning`, or `own-observation` — categorical, not a score. What kind of support this claim has, overall. |
| observed_on | object? | loose, categorical, not a hard link: `{ model?: slug, era?: string, task_type?: slug }`. Most meaningful for `kind: observation`; often absent for `kind: mechanism`. `model` optionally references `catalog/models/`; `task_type` optionally references a context in `catalog/taxonomy.yaml`. |
| sources | SourceLink[] | see below, minItems 1 |
| contested | boolean | default false — see §5 |
| disagreement_axis | object? | required in spirit (not enforced by schema) when `contested: true` — see §5 |
| status | enum | `active`, `superseded`, or `retired` |
| superseded_by | slug? | a later claim |
| last_checked_at | date | when this claim was last checked against new evidence |
| last_new_evidence_at | date? | when new evidence was last actually found, if ever |
| notes | string? | free-form |
| submitted_by | string | provenance, see §8 |

**SourceLink** (an entry in `sources`):

| field | type | notes |
|---|---|---|
| source | slug | must exist in `catalog/sources/` |
| stance | enum | `supports` or `contests` |
| note | string | what specifically this source shows for *this* claim |

### Source  (`catalog/sources/<id>.yaml`)
A citable thing a claim can point to — a published paper or my own
observation, same schema either way, distinguished only by `kind`. This
is the "first-class, claims reference it" object from §2: fix a source
once here, not once per claim that cites it.

| field | type | notes |
|---|---|---|
| id | slug | `arxiv-<number>` for arXiv papers; a descriptive slug otherwise |
| kind | enum | `paper` or `observation` (room to extend later — a blog post, a benchmark release) |
| title | string | for an observation, a short description of what was noticed |
| authors | string[]? | required in spirit for `paper`, N/A for `observation` |
| year | integer? | |
| date | date? | more precise than `year`; natural for an observation |
| arxiv_id | string? | `paper` only |
| url | string? | an observation may have none |
| venue | string? | |
| summary | string? | the abstract for a paper; the actual content for an observation |
| tags | string[]? | |
| code_url | string? | |

### Model  (`catalog/models/<id>.yaml`)
Unchanged in shape from the previous draft: a model family with versions
(`id`, `label`, `vendor`, `versions: [{id, label, released?}]`, `url?`).
Kept as loose reference vocabulary — a claim's `observed_on.model` may
point here, but nothing requires it to, and there's no exact
version+date+context triple a claim must supply the way the old
score-bearing Claim did.

### Technique  (`catalog/techniques/<id>.yaml`)
Mostly unchanged: `id`, `label`, `summary`, `description`, `addresses`
(capability slugs), `kind` (`prompting`/`retrieval`/`tooling`/`training`/
`decoding`/`architecture`/`process`), `sources` (source slugs — renamed
from `papers`), `repos` (`{url, note, verified_on?}`), `contexts`,
`caveats`, `status`, `submitted_by`.

### Contribution provenance (§8)
Every record still carries `submitted_by`, format `human:<handle>` or
`agent:<agent-name>@<owner-login>`. Kept even though I'm the only author
right now — cheap to keep, and it means the format doesn't have to be
retrofitted if this ever does get other contributors.

## 5. Kind, backing strength, and contested claims

**`kind`: mechanism vs. observation.** A mechanism claim explains *why* —
context poisoning, why self-consistency helps on some task shapes — and
tends to survive model generations. An observation claim describes how a
specific model or era performs, and is expected to rot as models change.
Keeping them structurally distinct (not just tag-filtered) matters so
perishable content doesn't quietly contaminate my sense of what I
actually, durably know.

**`backing_strength` categories**, roughly weakest to strongest as a
*kind* of support, not a numeric scale:
- `own-observation` — I noticed this; not yet checked against literature.
- `single-paper` — one paper reports it; not independently replicated.
- `replicated` — more than one independent source reports the same
  pattern.
- `mechanism-reasoning` — supported by an architectural or theoretical
  argument for *why* it should be true, not (only) an empirical count.

**Contested claims.** A bare `contested: true` gets ignored — it carries
no information about what to do with the disagreement. Instead:
- `sources` already carries `stance: supports | contests` per entry, so a
  contested claim simply has sources on both sides, each with a `note`
  explaining what that source actually shows.
- `disagreement_axis` records the *suspected* reason the sources disagree
  — model scale, task family, how the technique was operationalized, what
  counted as success — as free text, plus an explicit `is_guess: boolean`
  so a real explanation is never confused with a guess dressed up as one.

## 6. Ongoing re-evaluation (schema and views for v1; automation is later)

For v1: add the fields and site views this needs. The actual "scour the
internet daily" job is a later-phase engineering effort (real cost and
API decisions), same as the arXiv pipeline in the first draft was gated
on a key and a measured cost before scaling. What v1 does add:

- `last_checked_at` and `last_new_evidence_at` on every claim.
- A **recent activity** view: claims with new supporting or contesting
  evidence recently, most-recent first.
- A **sources** view, separate from claims — browse everything cited,
  independent of which claims reference it.
- A **stale** view: claims whose `last_checked_at` is 14+ days old,
  worth a manual re-check even absent an automated sweep — evidence from
  an earlier model generation often just becomes settled, considered
  wrong, or irrelevant, and a claim nobody's revisited in two weeks is a
  reasonable place to look first.

## 7. Taxonomy as a view

`catalog/taxonomy.yaml` still holds a starter vocabulary (groups like
reasoning/knowledge/context/behavior/agentic/security/evaluation, and
contexts like coding-agent/math/chat-assistant), but it's now a *soft*,
freely re-assignable set of tags, not a rigid single-parent group a
capability or claim must belong to. Expect to re-carve this at least
twice as real content accumulates; because claims (and capabilities) are
the primary objects and tags are just labels on them, re-carving is a
re-tagging exercise, not a migration.

## 8. Site (progressive disclosure)

- `/` — recent activity first (§6), then browse by capability.
- `/capabilities`, `/capabilities/[id]` — a capability page lists its
  claims (statement + kind + backing_strength badge), click through to a
  claim for full source detail.
- `/claims/[id]` — the claim's statement, its sources (supports/contests,
  with notes), `disagreement_axis` if contested, `last_checked_at`.
- `/sources`, `/sources/[id]` — browse everything cited, independent of
  claims; a source page lists which claims reference it.
- `/recent` — the recent-activity view from §6.
- `/stale` — the 14-day staleness view from §6.
- `/techniques`, `/techniques/[id]` — mostly unchanged from the first
  draft.

Rendered server-side from the catalog at build time, as before. No
database needed for reads.

## 9. Later phase: agent-facing API, accounts, admin (not v1)

Everything below was designed in the first draft and stays documented
because the design thinking is real, but none of it is v1 scope per §1.
Build it if and when the personal-study version is solid and actually
wants agent/contributor traffic.

- **Read API and MCP** (`/api/v1/*`, streamable HTTP MCP at `/api/mcp`):
  `list_capabilities`, `get_capability`, an `advise` call, etc. When this
  phase happens, agent-facing output should be framed as symptom →
  intervention — actions to take — never as a property of the model
  ("this model is bad at X"), since the latter reads to an agent as
  permission to give up rather than something to act on.
- **Accounts and tokens**: GitHub OAuth via Auth.js, `is_admin` boolean
  flag, tokens scoped `read`/`write` with `kind` (`human`/`agent`). No
  agent detection by heuristics — a token earns higher limits and
  attribution.
- **Bootstrap admin ("Captain of the Ship")**: `ADMIN_GITHUB_LOGINS` env
  var allowlist (starts with `Russ-Miller`), checked at login time, not
  tied to email — GitHub OAuth doesn't guarantee an email comes back.
- **Capability requests**: a lightweight record (label, rationale, links,
  status) separate from the git-backed catalog, so a casual suggestion
  doesn't need evidence up front; an admin turns an accepted one into a
  real Capability.
- **Admin CRUD**: direct create/edit/delete on capabilities, bypassing the
  `proposed` review state. Open technical question if this ever gets
  built: does an admin write commit to git (keeping git as the catalog's
  source of truth) or does the catalog move to a database at that point?
- **Importance claims**: `(capability, context)`-scoped, evidence-backed
  salience rating, considered as an alternative to raw up/down voting —
  see decision log, 2026-09-03.
- **Prediction-before-test** as an entry type: record an expectation
  before checking it, since memory quietly edits priors to match outcomes
  after the fact — also later phase, not because it's a bad idea, but
  because it's a refinement once there's already a body of claims to
  predict against.

## 10. Non-goals

Billing, organizations, private content, file hosting, raw up/down
voting, comment threads, detecting unidentified agents, any
roles/permissions system beyond a single `is_admin` flag if that phase
happens, and — for v1 specifically — the entire contributor-platform
surface in §9.
