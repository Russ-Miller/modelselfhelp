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

## 2026-09-03 — Citation recency as a visual signal, not an auto-hide rule
Added `citations_total`/`citations_recent_12mo`/`citations_checked_at` to
Source, fetched from Semantic Scholar's free API (`scripts/
fetch-citations.mjs`, no LLM cost, run by hand). This is a much narrower,
cheaper check than the daily-scouring re-evaluation pipeline deferred to
later-phase in spec §6/§9 — one API lookup per paper, not a search/
discovery job — so it didn't need to wait for that automation.

Considered and declined for now: an LLM call to judge whether newer
evidence has substantively superseded an older paper. Recent-citation
count is a proxy for "still discussed," not "still true" — a source can
stay well-cited while being cited critically — so it's used to prioritize
what a human looks at, not to auto-decide relevance. A source is only
ever visually "quiet" (no citations in 12 months, 2+ years old) when
citation data has actually been checked; unchecked sources are never
treated as stale by default, since absence of data isn't evidence of
staleness.

UI: quiet sources are pushed behind a native `<details>` disclosure on
claim pages ("+N older, quieter sources") rather than hidden outright —
the links stay, just deprioritized. The Sources index shows all sources
always, with quiet rows dimmed rather than collapsed, since browsing
everything is that page's job.

## 2026-09-04 — Citation refresh deferred; must be slow and incremental when built
Noted, not built: citation data on Source will go stale like claims do,
and re-evaluating a claim should eventually include re-checking its
sources' citation activity. When this is built, it cannot be a
straightforward re-run of `fetch-citations.mjs` on everything — the
initial fetch already showed this network hits Semantic Scholar's rate
limit hard (many papers needed 6-8 retries with minutes of backoff
each, across three separate runs to get from 0 to 57 of 60 sources
checked). The refresh needs to run as a slow background process, one
source at a time, real delay between requests, resumable, prioritizing
the oldest `citations_checked_at` first — likely tied to the same
later-phase automation as the 14-day claim staleness re-check, not a
naive full re-scan.

## 2026-09-04 — Technique efficacy is a Claim, not a field on the Technique
The core job is a four-stage lifecycle: where systems are weak, what
holds them back, what overcomes it, and whether that actually held up.
Stage 4 is the one most indexes get wrong -- an announced fix may be a
false alarm, or far more often may work only under conditions nobody
stated up front.

So efficacy gets modeled as a Claim with a new optional `technique`
field, not as a property of the Technique record. Technique previously
could express efficacy only through `status: disputed` plus a free-text
`caveats` string -- exactly the bare-boolean failure mode already
rejected for claims on 2026-09-03. Routing efficacy through Claim
inherits sources-with-stance, disagreement_axis, and scope conditions in
the statement for free. A Technique record says what the technique is and
where the code lives; a claim referencing it says what it does, for which
capability, under what conditions.

Validation enforces that an efficacy claim's technique actually lists the
claim's capability in its `addresses`, so the two can't drift apart.
First example filed: external-feedback-repair works only with real
grounding -- genuinely contested, with Reflexion and the self-correction
critique paper supporting from opposite directions and Self-Refine
contesting the scope.

## 2026-09-04 — Nightly ingestion: filter to arXiv, use a trailing window
Stage 1 of ingestion pulls from OpenAlex into pipeline/queue/, never into
catalog/. Two findings from measuring it, both of which changed the
design:

**Filter to the arXiv source.** Unfiltered, a recent window is dominated
by journal domain-application work -- LLMs applied to air traffic
control, pediatrics, nutrition estimation, hospitality marketing -- plus
Zenodo/bioRxiv/Preprints.org noise. Precision was roughly 10-15 percent
and a free keyword heuristic only lifted it to maybe 30. Restricting to
OpenAlex's arXiv source id took the top of the queue to essentially all
genuine capability research. Deduplication also got easier: the
duplicate-record rate fell from about 20 percent to 1 percent, since the
journal/Zenodo layer is where the duplicates live. `--all-sources`
disables the filter when a wider sweep is wanted.

**Use a trailing window, not yesterday.** OpenAlex ingests arXiv with a
lag of several days; a 1-day window returned zero arXiv works while the
same query over a two-week window returned 1261. So the default window is
the trailing 7 days. Combined with the committed seen-ledger this is
self-healing: a paper is picked up whenever it finally lands in the
index, and is never surfaced twice.

The keyword heuristic is kept, but demoted -- it now orders the queue
rather than rescuing precision, and it never discards, since a
domain-flavored paper (a clinical reasoning benchmark, say) can still be
real capability research.

Remaining problem is volume, not precision: about 98 arXiv candidates a
day are genuinely on-topic. That is simply the publication rate of the
field. Stage 2 classification, if built, is therefore about choosing
which of these deserve a claim, not about filtering out garbage.

## 2026-09-04 — Queue grouped by capability; direction deferred to stage 2
The heuristic score turned out to screen rather than rank. Sampling the
queue showed the negative (domain) signals do the real work, while the
positive ones pile up on nearly everything: once the arXiv filter and
domain penalties remove the junk, what remains is a flat field of
genuinely relevant capability research. Papers at the median scored as
well as the top -- a mitigation-with-side-effect paper on sycophancy,
directly on-catalog, sat mid-queue under a pile of higher scores.

So the queue is now grouped by which capability a paper concerns, matched
against vocabulary carried on the capability records themselves (id,
aliases, and a new optional match_terms field) rather than hardcoded in
the crawler. 214 of 689 candidates matched. Score is retained but
demoted to ordering within a group.

The matching is deliberately topical only: it answers what a paper is
about, never whether the paper improves a capability, degrades it, or
merely measures it. That direction is the eventual goal -- it is what
distinguishes a mechanism claim from an efficacy claim, and a supporting
efficacy claim from a contesting one -- but reading it out of an abstract
needs a model, not keywords. Topical pre-matching also narrows what stage
2 has to judge: instead of "is this relevant at all" across every
candidate, the question becomes "for this paper already matched to
sycophancy, does it improve, degrade, or measure?"

## 2026-09-04 — Capability discriminators; topical matching tightened
Two changes to how ingestion candidates get matched to capabilities.

**Matching now weights the title.** A capability term in the title is
strong evidence the paper is about it; a term buried in an abstract is
often a passing mention, since a model technical report will name half a
dozen capabilities it benchmarked without being about any of them. An
abstract-only match now requires two or more occurrences of the
capability's vocabulary. Measured effect on a 689-candidate queue:
matched fell from 214 to 95, and a model technical report that had
matched two capabilities on single passing mentions correctly dropped
out, while a genuinely cross-cutting context-management paper kept its
multiple matches. An earlier, stricter variant (two distinct terms rather
than two occurrences) over-corrected -- 80 matched and cross-cutting
signal nearly gone.

Also removed three over-broad match terms found by tracing false
positives: "vulnerability" from secure-coding (ordinary English in this
literature), "guardrail" from goal-conflict-safety, and "counting" from
arithmetic (was catching visual object counting).

**Capabilities carry a `discriminator`.** Optional prose stating the
inclusion/exclusion boundary, written for whatever decides whether a
paper is really about the capability -- stage 2 eventually, a human
reviewer today. Crucially it records known near-misses, since those are
what a name alone cannot convey: arithmetic excludes visual object
counting, secure-coding excludes the generic word "vulnerability",
goal-conflict-safety excludes content moderation and refusal behavior.
The false positives found while debugging the matcher are exactly the
material these should capture, so they were seeded from real evidence
rather than invented.

Editing these through an admin UI remains deferred with the rest of auth
(spec section 9). Today they are edited as YAML in git, which already has
authentication and an audit trail.

## 2026-09-04 — Stage 2: direction classification against held claims
Built. For each (candidate, matched capability) pair, a model call judges
whether the paper is genuinely about the capability (using that
capability's discriminator), whether it improves/degrades/measures it,
and -- the point of the exercise -- whether it contradicts a claim the
catalog already holds. Verdicts are written back into the queue file, not
into catalog/; nothing is promoted without review.

Model is claude-opus-5 at effort low with structured outputs, the system
prompt cached across the run. Measured on the full queue: 93 pairs for
$0.88, about $0.0095 each. Cost was never the constraint -- the free
topical matcher had already cut 689 candidates to 95, which is where the
7x saving came from.

The prompt is deliberately biased toward conservatism, because a false
"contradicts" is worse than a missed one: it says discussing the same
topic is not contradiction, reserves degrades for real evidence of
regression, and states that an empty claim id beats a wrong one. Result
on 99 verdicts: 37 improves, 20 measures, 7 degrades, 35 judged not
actually about the capability they matched -- that last number is the
keyword matcher's residual false-positive rate, now visible rather than
silent.

Two genuine challenges surfaced against held claims, both checked by
hand and sound. The sycophancy one caught a shared-mechanism argument:
anti-sycophancy training also impairs legitimate belief updating, which
cuts against the held claim that synthetic-data fine-tuning simply
reduces sycophancy.

A /contested view collects it all: incoming challenges from the queue,
and contested claims already in the catalog with their axis of
disagreement. Capability and claim lists carry contested counts, and
claims sort contested-first.

## 2026-09-04 — Technique carries what it is; Claim carries whether it works
The split was only half-implemented. Two fields on Technique were still
making efficacy assertions:

`status` had values accepted/proposed/disputed/retired. Seventeen
techniques were "accepted", which asserts the technique works -- with no
source, no scope, and no way to contest it. Exactly the unfalsifiable
property the design rejects. Replaced with active/superseded, describing
the record's lifecycle rather than any verdict.

`caveats` (on 15 of 21) mixed two different things. "Requires
fine-tuning access" is a prerequisite -- part of what the technique is.
"Without a real external signal the loop tends to make answers worse" is
a scoped directional claim about when it fails, which belongs in a claim
with sources. Split by hand: prerequisites became a new `requires` field,
and the twelve efficacy statements moved to
docs/technique-efficacy-backlog.md rather than being deleted or
invented into claims without sources.

Parking them was the honest option. Several were practitioner knowledge
with no published study ("no controlled study isolates its effect"),
which is a statement about backing strength -- so filing them as claims
needs either a real source or an own-observation source the user
actually made, not one fabricated on their behalf.

## 2026-09-04 — Modality is a field, not a split, except where mechanisms differ
The catalog was implicitly text-only. Rather than declaring that, a
`modality` field now records where a capability is genuinely bound to one
— `text | image | audio | video | action`, optional and multi-valued.

Only six of the nineteen existing capabilities got one. Reversal curse,
arithmetic, code generation, long-context degradation, secure coding and
hallucination are text-bound by construction. The rest — sycophancy,
tool-use, prompt injection, state tracking, procedure following — are the
same capability whatever comes in the input, and tagging them `[text]`
would have asserted a boundary that isn't there. Absent means
modality-agnostic, not unknown.

Four capabilities were added from the stage-2b proposals, all of which
had been blocked on this decision: audio-understanding,
video-temporal-reasoning, visual-grounding, embodied-control.

The interesting one is visual-grounding. It could have been
`hallucination` with `modality: [image]`, since the failure looks the
same — asserting what isn't there. It's separate because the mechanism
and the mitigations differ: text hallucination is addressed with
retrieval and verification, while visual ungroundedness is about whether
the model attends to image evidence at all or falls back on language
priors about what usually appears in such a scene. Same criterion already
used for every other split — different mechanism, different capability —
so a shared surface symptom isn't enough to merge them. They're linked
via `related` instead.

Likewise embodied-control is not tool-use. A tool call succeeds or
returns an error; a knocked-over object stays knocked over.
Irreversibility and continuous partial state are what make it a distinct
problem.

## 2026-09-04 — An unbacked technique is a research brief, but only if someone looked
Clearing the efficacy backlog left one technique — `reread-before-edit` —
with no supporting study, and a supplied citation (FastContext) that was
a real paper on an adjacent subject and would have read as support
without being any. Rejecting it raised the better question: a technique
nobody has measured is an opportunity, and the app should say so.

The trap is that "no efficacy claim" has three causes that look identical
in the data. Genuinely unstudied. Studied, but I haven't found it. Or
argued from mechanism and never quantified. Only the first is a research
opportunity, and a count of zero cannot tell them apart — so a view that
lumped them would assert "nobody has researched this" with nothing behind
it. That is the same unfalsifiable move as the `status: accepted` field
this catalog already deleted, run in reverse.

What makes the absence real is recording the search. New optional
`evidence_search` on Technique: `searched_on`, a `note` saying what was
looked for, and `nearest_miss` entries pairing a paper with why it does
not fit. `reread-before-edit` now carries the FastContext dead end and a
sketch of the experiment that would settle it — rate of silently wrong
edits with and without the read-recency precondition, same task set.

`/open-questions` derives the rest: 1 searched-and-open, 9 not yet
searched, 3 argued-not-measured. Nothing new is stored for sections 2 and
3; they fall out of claims that already exist. The section headings carry
the distinction rather than a tooltip, because the whole value of the
page is that the three states are not the same claim.

This also gives the gamification idea from docs/reputation-notes.md a
unit that resists gaming: an open question with a documented search
behind it is something a person can actually close, and closing one is
checkable in a way that "contributed a citation" is not.

## 2026-09-04 — Asking the open question in the other direction
Three additions, one theme: the catalog knows more about its own gaps
than it was showing.

**Evidence activity per claim.** The sources list already showed citation
recency per paper; a claim rests on several. Aggregated as the *max*
across its sources, not the sum — one paper the field is still citing
means the evidence base is live, and adding counts across papers would
report a number no one measured. Sources never fetched are excluded
rather than counted as zero, and a claim with none checked says so
explicitly. A blank cell reads as "no citations"; it actually meant "not
looked up", and those are different.

**Contested-only filtering** on the capability and claim lists. Done with
a `data-contested` attribute per row and one CSS rule, so the pages stay
fully static and the filter ships no second copy of the data.

**Capabilities with no measured mitigation** on /open-questions. The
existing sections ask "does this technique work"; this asks "does
anything work". A capability qualifies when claims establish the problem
and no technique addressing it has an efficacy claim with measured
backing. Split the same way as the technique sections, because
`no-technique` and `none-measured` invite different work: the second is a
citation away from closing, the first would be new knowledge. Currently 3
and 7, against 9 capabilities that do have a measured fix — a ratio worth
watching, since it is the closest thing here to a map of what is actually
unsolved.

Reusing one `isMeasured` predicate across both views matters more than it
looks. It means "measured" cannot drift between the two pages, and it
puts real weight on the mechanism-reasoning backing strength: a claim
filed that way deliberately does not count as a fix, which is why filing
those honestly earlier today paid off immediately.
