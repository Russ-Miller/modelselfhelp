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

## 2026-09-04 — Open questions became a lens, not a destination
The three /open-questions sections were only visible on /open-questions,
which framed them as a separate list of chores. The interesting reading is
comparative: "seven capabilities have no measured mitigation" means
something only next to the nine that do.

So the same cuts are now filters on the Capabilities, Claims and
Techniques tabs, and each /open-questions section links to its own
filtered view. Checkboxes became a segmented bar — All first, then one
button per cut with its count — because these are alternative views of one
list, not independent booleans to combine, and a row of checkboxes implies
an AND nobody wants.

The part worth keeping honest: the filters call the same helpers the
sections do (`openQuestions`, `unmitigatedCapabilities`), so a button's
count and a section's count cannot disagree. The alternative — a filter
predicate written inline per page — would have been three chances to
define "measured" slightly differently, which is exactly how a catalog
starts lying to itself.

Filter state lives in the query string rather than component state alone.
That is what makes the cross-links work, and it means a filtered view is
something you can send someone.

## 2026-09-04 — UI voice: explain the gap, don't argue about it
Russ rewrote the /open-questions copy and the difference is worth naming,
because it will apply to every page eventually.

The old copy argued with itself. It reached for the project's internal
reasoning ("the same unfalsifiable move as `status: accepted`, just
inverted"), used em-dashes to stack clauses, and wrote from "I". That
reads as a designer defending a decision to another designer.

The new copy explains. Short declarative sentences, one idea each. First
person plural, because a reader looking at a catalog wants to know what
*we* found, not what I did. And the distinction that motivated the whole
page survives in plain words: "If we searched the literature and found
nothing, that tells us something about the state of the research. If we
simply haven't investigated a technique yet, that only tells us we haven't
looked at it."

That is the same argument, and it lands harder without the jargon. The
rule going forward: the reasoning belongs in docs/decisions.md, the
consequence belongs in the UI.

**Style, not vocabulary.** The first pass at this got it wrong by
rewriting the nouns too: "technique" drifted to "mitigation", "nearest
miss" to "closest paper we found", "unmeasured" to "untested". Those are
schema words. Technique, claim, capability, source, measured, contested,
mechanism — a reader who learns them on one page should find the same
words on the next, and `nearest_miss` is a literal field name.

One of the swaps was worse than drift. "Would bear on" became "Would help
with", which asserts the technique helps — the exact claim this catalog
refuses to make about a technique nothing has measured. The copy would
have contradicted the section it sat in.

So: sentence style changed, vocabulary restored. Applied to the Open
Questions tab only for now; the other tabs still carry the older voice.

## 2026-09-04 — Weaknesses looking for techniques, not problems looking for mitigations
Two vocabulary corrections from Russ, both about framing rather than
wording.

**"Mitigation" is out.** It imports risk-management framing: hazards to be
contained. That is not what this is. The work is finding what makes a
capability better — innovation and answers, not damage control. The word
is "technique", which is also the entity name, so the copy now matches the
schema. `unmitigatedCapabilities()` became `unsolvedCapabilities()`.

Kept where it is accurate rather than framing: papers say "mitigate
hallucination", so the ingestion scorer still matches the term, capability
discriminators still describe papers that mitigate something, and the
judge-bias claims still say a bias was mitigated. Those describe the
literature; they are not the site's voice.

**"Problem" became "weakness."** Russ's reasoning: a model not performing
to the level you would expect is not a problem, it is a weakness. That
also restores continuity with the original reframe — Weakness was renamed
to Capability so the axis could stay neutral, and a weakness is a
*position* on that axis rather than an entity. Calling it a problem
quietly re-introduces the thing that rename removed.

Worth noting both corrections came from copy I had written around text
Russ supplied. His paragraphs used "mitigation" too; the difference is he
recognized it as wrong when he saw it rendered. Reading the page as a
reader catches framing errors that reading the diff does not.

## 2026-09-04 — Briefs instead of abstracts, with a number check
Russ finds Rohan Paul's paper posts easier to process than abstracts and
wants one for every paper here. Reverse-engineered the format from four
full X posts (read with the Chrome extension, since X walls the timeline
after ~6 posts logged out) and six longer newsletter write-ups, wrote it
up in docs/prompts/paper-summary.md, and implemented it as
scripts/summarize-sources.mjs writing to a new `brief` field.

Two things make that format work, and only one of them is style. Figures
are comparative rather than adjectival — "drops from 69.3 to 33.0 when
Gemini 3.1 Pro becomes the executor", not "degrades substantially". And
every summary states its own boundary, which is what makes the rest read
as credible instead of promotional. That second habit is the same instinct
as backing_strength and the scope conditions in every claim statement
here, arrived at independently by someone writing for a different reason.

**The risk this creates.** The style runs on dense figures. The generator
is handed an abstract that frequently has none. That is a direct
invitation to invent numbers, inside a catalog whose entire value is
provenance — the same failure mode as the plausible-but-wrong citation
rejected earlier today, except manufactured by us rather than supplied.

So the prompt forbids ungrounded figures and requires the model to list
what it used, and then every number in the output is checked against the
abstract independently. Unmatched figures go to
`brief_unverified_figures` and render as a warning on the source page. The
second guard is the one that counts: it does not depend on the model
having complied with the first. The first run caught one flag immediately
— which turned out to be the extractor reading "3" out of "GPT-3.", fixed
with a lookbehind. Worth noting the failure mode: a checker with false
positives is worse than none, because real inventions get lost among them.

Not done: briefs for queue candidates, which is where papers are actually
triaged. That is ~145 candidates at roughly $0.01 each per run, on a set
that churns nightly, so it is a spending decision rather than a technical
one.

## 2026-09-05 — Testing the catalog against cases where the answer is known
Russ asked whether we can validate any of this: find findings later shown
false or weaker, check whether the papers that overturned them are here,
and whether the catalog reflects them properly.

docs/known-reversals.yaml is a held-out set of four such cases, each with
its reversing paper verified against arXiv. scripts/backtest.mjs asks two
separate questions of each:

1. Did the catalog **catch** it — is the reversing paper here, cited with
   stance `contests`, on a claim marked contested with a stated axis?
2. Would ingestion **surface** it — does the paper's title match a
   capability?

The second matters more. A miss on the first is a filing gap, fixable in
an afternoon. A miss on the second is a standing blind spot no diligence
closes.

Result: 2 caught, 2 missed. Both misses are structural rather than
behind-on-work. Nothing in the index covers whether a measurement choice
manufactures a finding (the emergent-abilities-as-metric-artifact result),
or whether stated reasoning reflects the computation (chain-of-thought
unfaithfulness). Both are failure modes of *evidence*, which this catalog
runs on end to end, so the blind spot is aimed squarely at our own
foundations.

**A mistake worth recording.** The first version of the reach test
reimplemented the matcher by hand, got the title rule wrong, and reported
that neither caught case would have been surfaced — a dramatic finding
that was entirely an artifact of the copy. The matcher now lives in
scripts/match-lib.mjs and both the pipeline and the backtest import it. A
second implementation of a rule answers a subtly different question than
the first, and the difference shows up as a false finding rather than an
error.

**Directional standing.** `techniqueStanding()` reads a technique's
evidence as one of unmeasured / argued / supported / narrowed / contested,
derived from its claims rather than stored. Categorical on purpose: a
number here would be the Goodhart trap the project deleted with eval
scoring, and would invite tuning the catalog to move it.

`narrowed` is the one worth having. It means a contesting source is on
file but the claim was never marked contested — usually because the scope
condition absorbed the objection. That is how a technique quietly gets
weaker without anyone saying so.

## 2026-09-05 — Closing the two blind spots the backtest named
Added `explanation-faithfulness` and `evaluation-validity`, the two
capabilities the backtest showed nothing in the index covered.

The backtest result after adding them is the useful part, because it moved
one thing and not the other. Ingestion reach went from "title alone would
not match any capability" to matching both new capabilities — the pipeline
would now surface those papers. The grade stayed `missed`, because catching
a reversal also requires the paper filed as a source and a claim citing it
with stance `contests`. That split is exactly the distinction the backtest
was built to draw: the matcher gap is closed, the filing gap is not.

`evaluation-validity` sits oddly beside the others and the description says
so. It is not a property of a model. But every claim in this index rests on
some measurement, so it is the one capability whose failures propagate into
all the rest — including into the briefs, whose figures we check precisely
because a measurement can be wrong in ways prose hides.

Also fixed the layout the additions exposed. The capability table's header
cells had no horizontal gutters, so "Claims Contested Status" ran together;
and the nav, at eight links, overflowed a phone viewport and pushed the
whole page sideways. The nav bug was mine, from adding Open questions. A nav
that overflows breaks every screen, not just its own, so it now wraps.

## 2026-09-06 — Two ambitions recorded, with their failure modes
Russ named two long-range goals: the system improving itself by querying
its own catalog for techniques with supported claims, and other AIs
contributing research findings altruistically. Written up in
docs/ambitions.md rather than the roadmap, because neither is scoped work
— they are recorded to explain why provenance fields, machine-readable
content and the backtest earn their keep now, while one person uses this.

The second is not new. Agents contributing was in the first sketch, which
is why submitted_by already accepts agent:<name>@<owner> and sourceLink
carries submitted_by and added_at. Worth recording that the current schema
anticipated it.

What the write-up adds is the failure mode for each, since that is the
part that shapes decisions.

**Self-improvement is a closed loop.** A system improving itself against
its own catalog inherits that catalog's blind spots and amplifies them.
The backtest is the natural check: a step that leaves `npm run backtest`
worse off is rejected whatever else it improved, and it must run against
the same held-out set rather than one the system picked. Also the third
appearance of Goodhart in this project — after eval scoring and
contributor reputation — with the same answer each time: reward what
survives contest, not what scores well. And a self-improvement result is
an own-observation claim, the weakest backing strength, on purpose.

**Agent contribution fails on arithmetic, not on API design.** Submission
is free for an agent and expensive for a reviewer, so any design where
review is the bottleneck loses. The reputation notes already reached the
answer that applies here unchanged: reward resolution that survives, never
submission count.

The sharper point is that "altruistically" is a motivation, not a security
assumption. A contested-claim structure with sources on both sides gives
the same answer whether a submitter is generous or adversarial, and that
indifference is the feature. What makes agent contribution worth wanting
is narrower and better than volume: refutation is counter-cyclical —
everyone is incentivised to publish techniques that work and almost nobody
to publish that a popular one does not — and agents with no career stake
are well placed to do that unglamorous half.

Both ambitions are the same loop at different scales, and both rest on one
bet: that a claim here is worth more than a claim elsewhere because it
carries its scope condition, its backing strength, and whatever cuts
against it. That bet is testable now, and the backtest is the measure.

**Revised the same day, on Russ's push.** The first draft catalogued
obstacles without proposing ways through them, which is the wrong posture
for a research project — the obstacles are why the research is necessary,
not arguments against it. Rewritten so every obstacle carries an attack.

Three of those attacks are worth more than the rest.

*A falsification quota.* Require each self-improvement cycle to also
attempt N refutations of claims currently held. A loop that must spend
effort trying to break its own beliefs is self-correcting by construction
rather than by supervision.

*Invert what triggers review.* Do not review agent submissions on
submission. Let a claim sit marked unreviewed until something contests it,
then review the disagreement. Review cost scales with conflict instead of
volume, which dissolves the arithmetic objection rather than mitigating
it.

*Instrument rather than ask.* This corrects yesterday's claim that a
self-improvement result is condemned to `own-observation`. The pipeline
already emits signals that owe nothing to narration — backtest coverage,
off-topic rate, ungrounded-figure count, cost per accepted claim. Measured
against a held-out set with a stated falsifier, a self-improvement result
has the same standing as any single-paper experimental claim. The weak
backing was a consequence of asking the system to describe itself, and
instrumentation removes the need to ask.

And the structural point the first draft missed: the two ambitions solve
each other. Independent instances contributing and contesting are the
external check that breaks the self-improvement loop's closed circle, and
a system that improves its own verification is what raises review
throughput enough to accept open contribution. Each is the other's missing
capability, which is the argument for pursuing both rather than either.

## 2026-09-06 — The sign on the wall
Russ asked for a metaphorical sign somewhere in the project: *focus on the
art of the possible — ultimately, and it will take time, iteration and
effort, there is a way. Unless there isn't, but let's prove that rather
than give in easily.*

Put in three places, deliberately. At the top of CLAUDE.md, because that
is the wall actually looked at while working here. As the epigraph of
docs/ambitions.md, because that document exists to hold things not yet
possible. And at the foot of /open-questions, because that page is
literally a list of gaps nobody has closed, and a list of gaps needs to
say what it is for.

The second clause is the one that earns it a place in this project. It is
a falsifier, not a hedge. "There is a way" is a claim, and this catalogue
holds that a claim is worth having only when someone could show it wrong —
so the honest response is to try hard to break it, not to assume it and
not to abandon it. That makes the sign consistent with the schema rather
than merely motivational, which matters, because a slogan that contradicted
the epistemics would corrode them.

The operational form: when something looks blocked, say what would have to
be true for it to be possible, and go test that. "This cannot work because
X" is unfinished until X has been checked.

## 2026-09-07 — File the incumbent, then contest it
Russ and I independently drafted records for the same two papers. We agreed
on almost everything — capability, kind, backing strength, the technique,
the core finding. We disagreed twice on `stance_on_existing`, and both
disagreements were the same disagreement.

He marked both papers `contests` and left `related_claim_id` blank, because
what each contests is not in this index: single-factor prompt evaluation in
one case, position-shuffling heuristics and context-aware decoding in the
other. I marked one `supports` and one `neither`, because I was answering
"stance on a claim we hold" while he was answering "stance on what is
currently believed."

His reading is the more useful one, and the gap is structural. The catalog
only ever filed claims it endorsed, so contesting evidence had nothing to
attach to. That is also why the backtest grades known reversals as missed
even when the reversing paper is on file: nothing records the position
being reversed.

So the rule, demonstrated here: **when a paper contests something, file the
incumbent claim first, with its own source, then attach the contest.** The
catalog should hold positions it does not endorse. That is what makes
`contested: true` with sources on both sides mean anything at all, and it
is what the disagreement_axis field is for.

Filed: `putting-relevant-passages-first-mitigates-position-effects` under
long-context-degradation, supported by Lost in the Middle and contested by
the new knowledge-conflicts paper, with a guessed axis — that the
supporting result places one relevant passage among distractors while the
contesting one places several incompatible passages of equal legitimacy, so
ordering may be a remedy for distraction and not for conflict. Separately,
`first-evidence-dominance-is-representational-not-decoding` holds the new
paper's own positive finding, because where a bias lives and whether a
remedy works are different assertions.

`reorder-context-by-relevance` moved from "nothing measured" to
"contested" as a result, which is the first time a technique's standing has
changed from evidence rather than from filing.

Also worth recording: the confidence field has no stated definition, and we
diverged on it both times — he weighted replication breadth, I weighted
dataset realism. Two data points is enough to say the field needs a rule.
