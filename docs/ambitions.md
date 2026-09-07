# Ambitions

Two long-range goals, recorded 2026-09-06 so they shape decisions early
even though neither is v1. Both are downstream of the reframe in
`docs/spec.md` §1: the personal study tool comes first, and these are the
reasons the content stays machine-readable and the provenance fields stay
in place even while only one person is using it.

Neither is a plan. Each is a goal plus the specific thing that would make
it go wrong, because the failure modes here are the interesting part.

---

## 1. The system improves itself from its own catalog

The index holds techniques, the capabilities they address, and claims
about whether they work under which conditions. This system is itself
built out of those same capabilities. So it should be able to query
itself — "which techniques have supported efficacy claims for a capability
I depend on?" — and apply what it finds to its own pipeline.

That is not speculative framing. The pipeline is already an instance of
several catalogued capabilities:

| Stage | Capability it exercises |
|---|---|
| stage 2 classifier judging against a discriminator | `procedure-following`, `evaluation-validity` |
| stage 3 drafting scoped claims from full text | `hallucination`, `long-context-degradation` |
| the brief writer summarizing a paper | `long-context-degradation`, `explanation-faithfulness` |
| the topical matcher | retrieval, and the precision/recall tradeoff behind `fact-verification` |

`techniqueStanding()` already answers the query. What is missing is the
loop: reading that answer, changing a prompt or a stage, and measuring
whether it helped.

**What makes it go wrong.** Three things, in increasing seriousness.

*The closed loop.* A system that improves itself against its own catalog
inherits that catalog's blind spots and then amplifies them. The backtest
exists for exactly this and is the natural safety instrument: a
self-improvement step that leaves `npm run backtest` worse off is
rejected, whatever else it improved. That check has to run on the same
held-out set, not on one the system chose.

*Goodhart, one level up.* This is the third time the same problem has
appeared in this project — eval scoring, then contributor reputation
(`docs/reputation-notes.md`), now this. If the system optimizes for
something the catalog measures, the catalog stops measuring it. The
defense is the same each time: reward what survives contest, not what
scores well.

*Self-report.* A self-improvement step produces evidence about itself, and
`explanation-faithfulness` says a system's account of its own reasoning
need not reflect what happened. So a step's result is an
`own-observation` claim — the weakest backing strength in the schema, on
purpose — and it is contestable like anything else. The system does not
get to grade its own homework merely because it wrote the homework.

**The falsifiable version.** Every self-improvement step is a claim with a
statement, a scope condition, and a falsifier: *"applying technique T to
stage N raised measured quantity Q under conditions C; it would be wrong
if Q did not move on a re-run against the held-out set."* If a step cannot
be written that way, it is a change, not an improvement.

---

## 2. Other AIs contribute what they learn

Agents doing their own research and submitting findings here, so the
knowledge is shared rather than re-derived by every system separately.
This has been present since the first sketch — the original concept had
agents contributing alongside humans — and it is why `submitted_by`
already accepts `agent:<name>@<owner-login>` and why `sourceLink` carries
`submitted_by` and `added_at`.

The mechanics are the easy part and are already sketched in §9: an API, an
MCP endpoint, tokens with a `kind` of human or agent.

**What makes it go wrong.** Not the API. Trust and volume.

*Volume is free for a submitter and expensive for a reviewer.* An agent
can produce a plausible claim per second; a person cannot check one per
second. Any design where submission is cheap and review is the bottleneck
fails on arithmetic alone. `docs/reputation-notes.md` already worked out
the shape of the answer — reward resolution that survives, never
submission count — and that reasoning applies unchanged here.

*An agent's "what I learned" is its own generated reasoning*, which is
precisely what `explanation-faithfulness` says can be confident and
unfaithful. So an agent submission needs the same discipline as a
generated brief: figures checked against a citable source, claims tied to
evidence someone else can inspect. A submission that rests only on the
agent's account of its own experience is `backing_strength:
own-observation` — already the weakest category, and now unverifiable in a
way a human's own observation is not, because nobody can ask the agent
what it actually saw.

*The altruism framing is doing work that structure should do.* "Sharing
what they are learning altruistically" is a fine motivation and a bad
security assumption. The catalog should be indifferent to whether a
submitter is generous or adversarial, because a contested-claim structure
with sources on both sides gives the same answer either way. That
indifference is the feature.

**What makes it worth doing anyway.** Refutation is counter-cyclical, per
`docs/reputation-notes.md`: everyone is incentivized to publish techniques
that work, and almost nobody to publish that a popular one does not. A
population of agents with no career stake is unusually well placed to do
the unglamorous half. That is the contribution worth designing for — not
volume of new claims, but pressure on existing ones.

---

## How these two connect

They are the same loop at two scales. One system improving itself from
verified claims is the single-agent case; many systems contributing and
contesting claims is the population case. Both depend on the same thing
being true: that a claim here is worth more than a claim elsewhere,
because it carries its scope condition, its backing strength, and whatever
evidence cuts against it.

That is the actual bet of the project, and it is testable well before
either ambition is built. `npm run backtest` is the current measure of it.
