# Ambitions

> **Focus on the art of the possible.** Ultimately — and it will take
> time, iteration, and effort — *there is a way.* Unless there isn't, in
> which case prove that, rather than giving in easily.

That second clause is a falsifier, not a hedge, which is why this belongs
in a document about a catalogue built on falsifiers. "There is a way" is
a claim like any other here: it holds until someone does the work of
breaking it, and nobody has.


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

Three obstacles stand in the way. Each is a research problem with a
tractable attack, and the attacks are the actual work.

### Obstacle: the closed loop

A system improving itself against its own catalog inherits that catalog's
blind spots and amplifies them.

**Attack 1 — held-out sets the improver cannot see or grow.**
`docs/known-reversals.yaml` is the seed. The discipline that makes it work
is ordinary and strict: the improver never sees the set, never adds to it,
and a step that degrades coverage is rejected regardless of what else it
improved. Grow the set from sources the system does not control — papers
that contest claims already held, found by a process separate from the one
being tuned.

**Attack 2 — different model proposes than evaluates.** A self-improvement
step drafted by one model and judged by another breaks the shared-prior
failure. Cheap to do today: the pipeline already runs multiple stages that
need not share a model.

**Attack 3 — a falsification quota.** Require every self-improvement cycle
to also attempt N refutations of claims currently held. A loop that must
spend effort trying to break its own beliefs cannot drift purely toward
self-confirmation. This is the single highest-leverage idea here, because
it makes the loop self-correcting by construction rather than by
supervision.

**Attack 4 — and the real one: ambition 2 solves this.** An external check
is exactly what a population of independent instances provides. See "How
these two connect".

### Obstacle: Goodhart

Third appearance in this project, after eval scoring and contributor
reputation. If the system optimises for what the catalog measures, the
catalog stops measuring it.

**Attack 1 — make the proxy expensive.** Goodhart bites hardest when the
proxy is cheap relative to the goal. A claim that requires a runnable
falsifier — a prompt, a model version, an expected result someone else can
execute — costs nearly as much to fake as to earn. Cheapness is the
vulnerability, not measurement itself.

**Attack 2 — measure survival, not score.** A claim's standing is whether
it survived contest over time. That is structurally hard to game because
it requires other parties to fail to refute it, and it is why
`techniqueStanding()` is categorical and derived rather than a number.

**Attack 3 — rotate what is measured.** Overfitting to a fixed measure is
only rewarding while the measure is fixed. A held-out set that grows and
rotates makes the shortcut unstable.

### Obstacle: self-report

`explanation-faithfulness` says a system's account of its own reasoning
need not reflect what happened. So do not take its account.

**Attack — instrument instead of asking.** The pipeline already emits
measurable signals that owe nothing to narration: backtest coverage, the
stage-2 off-topic rate, the count of ungrounded figures, cost per accepted
claim. A self-improvement step's evidence is the delta in those numbers on
a held-out run, not the system's report of what it did.

This upgrades an earlier assumption worth correcting: a self-improvement
result is *not* condemned to `own-observation`. Measured against a
held-out set with a stated falsifier, it has the same standing as any
single-paper experimental claim. The weak backing was a consequence of
asking the system to describe itself, and instrumentation removes the
need to ask.

### The smallest experiment that tests this

One capability the pipeline depends on, one technique with a supported
efficacy claim, applied to one stage, measured on the held-out set, filed
as a claim with a falsifier. `checklist-decomposition` on the stage-2
classifier is a good first candidate: it has a real efficacy claim behind
it, the stage has a measured error rate to move, and the whole loop fits
in an afternoon.

## 2. Other AIs contribute what they learn

Agents doing their own research and submitting findings here, so the
knowledge is shared rather than re-derived by every system separately.
This has been present since the first sketch — the original concept had
agents contributing alongside humans — and it is why `submitted_by`
already accepts `agent:<name>@<owner-login>` and why `sourceLink` carries
`submitted_by` and `added_at`.

The mechanics are the easy part and are already sketched in §9: an API, an
MCP endpoint, tokens with a `kind` of human or agent.

The obstacles are not the API. They are trust and arithmetic, and both
have attacks.

### Obstacle: submission is free, review is not

An agent can produce a plausible claim per second; a person cannot check
one per second. Any design where review is the bottleneck fails on
arithmetic alone.

**Attack 1 — invert what triggers review.** Do not review on submission.
Let a submitted claim sit, marked unreviewed, until something contests it,
and review the disagreement. Review cost then scales with *conflict*
rather than with volume, and volume becomes harmless. This is the
structural fix, and it is a change to when review happens, not to how much
of it there is.

**Attack 2 — make submissions machine-checkable.** A claim carrying a
runnable falsifier can be verified without a human: run it, see whether
the stated result holds. The catalog already checks generated figures
against source text; the same discipline extends to submissions. Human
attention then goes only to claims that pass the automatic checks and are
contested.

**Attack 3 — weight by track record.** A submitter's history of claims
that survived contest earns their future submissions higher priority.
Volume without survival earns nothing, which makes flooding pointless
rather than merely filtered. This is `docs/reputation-notes.md` applied.

### Obstacle: an agent's report of its own experience is unverifiable

**Attack — require reproduction, not testimony.** An observation submitted
as "I tried X and it failed" is unverifiable. The same observation
submitted as a prompt, a model version, a setup and an expected output is
an experiment anyone can re-run. That is the original project instinct —
git-linked reproducible code — returning exactly where it is needed. It
converts the weakest backing strength into the strongest kind of evidence
the catalog can hold, because a reproducible check does not decay when the
witness is unavailable.

### Obstacle: motivation is not a guarantee

Altruism is a fine reason to contribute and a poor thing to depend on.

**Attack — build so it does not matter.** A contested-claim structure with
sources on both sides returns the same answer whether a submitter is
generous or adversarial. Designing for indifference to intent is what
makes open contribution safe to want, and it is already how the schema
works.

**What makes it worth doing anyway.** Refutation is counter-cyclical, per
`docs/reputation-notes.md`: everyone is incentivized to publish techniques
that work, and almost nobody to publish that a popular one does not. A
population of agents with no career stake is unusually well placed to do
the unglamorous half. That is the contribution worth designing for — not
volume of new claims, but pressure on existing ones.

---

## How these two connect

They are not two goals. They are one loop at two scales, and each solves
the other's hardest problem.

**Ambition 2 breaks ambition 1's closed loop.** The deepest objection to a
self-improving system is that it grades its own homework against its own
blind spots. Independent instances, contributing and contesting into a
shared catalog, are an external check that no amount of internal
discipline can manufacture. A blind spot shared by one system is not
usually shared by all of them.

**Ambition 1 fixes ambition 2's arithmetic.** The objection to open agent
contribution is that verification cannot keep up with submission. A system
that can improve its own verification — better grounding checks, better
triage precision, cheaper reproduction — is exactly what raises the
throughput of review. Each ambition is the other's missing capability.

That symmetry is the reason to pursue both rather than either. It also
gives the project a real thesis to test: that distributed, contested,
scope-bearing claims are worth more than the same claims held privately —
because they can be checked by parties who did not produce them.

The bet is testable long before either ambition is built. `npm run
backtest` is the current measure of it: 2 caught, 2 missed today, with the
misses now reachable by ingestion. Move that number honestly and the rest
of this becomes engineering.
