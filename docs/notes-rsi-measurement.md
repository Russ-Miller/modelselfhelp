# Notes from the RSI discussion, 2026-09-07

Things worth keeping from Cheryl Wu's post, the Elasticity Institute paper
behind it (`catalog/sources/elasticity-2026-economics-of-rsi.yaml`), and the
conversation around them. None is scoped work. Each is here because it will
matter later and would be expensive to reconstruct.

Ordered by how likely we are to act on it.

---

## 1. Their wishlist format is our open-questions page, for measurement

The paper's data section is a table: **model primitive → existing data →
current weakness → ideal new data.** Every row names the quantity, what is
known, why what is known is insufficient, and what would settle it.

That is structurally identical to `/open-questions`, which does the same for
techniques: the gap, what exists, why it does not close it, what would. The
difference is that theirs is about *measurements* and ours is about
*interventions*.

Worth stealing the "current weakness" column. Ours says a thing is
unmeasured; theirs says why the nearest available data does not count. That
distinction is the whole value of a wishlist — "no data" invites nothing,
"headcount does not map to researcher headcount" tells someone what to
collect.

## 2. Self-reported uplift is not the quantity anyone needs

The paper is explicit and it applies to us. Reported productivity gains —
1.4–2× in METR's survey, roughly 4× in a system card — are *the productivity
effect of AI*. The quantity the model needs is total research effort added
per additional unit of capability. Those are different, and the paper says
the survey numbers are "hard to interpret."

This is a filable `evaluation-validity` claim on its own, and it is a
warning about our own schema: `backing_strength: own-observation` covers
exactly this kind of evidence. Someone reporting how much a tool helped them
is measuring a different thing from how much the tool helps, and the gap is
not noise, it is a category difference.

**Trigger to act:** the next time a claim here rests on self-reported uplift.

## 3. "Benchmark questions are not real-life LLM training problems"

Their weakness note under *strength of autonomous R&D*. Models beat humans
on optimization problems at 8–40 hour budgets but show low pass rates on
complex debugging, and the results are "difficult to place on a common
scale."

Directly ours. Stage 2's off-topic rate is a benchmark-shaped measure of
whether a paper is about a capability. The backtest is closer to a real
task. When they disagree, the backtest wins — that is what a held-out set is
for, and this paper is an independent argument for the same ordering.

## 4. Narrow versus broad capability, as a candidate capability record

They treat it as a live possibility that AI improves at optimizing AI R&D
benchmarks without improving at broadly valuable work. That is a real
distinction with a name, and nothing in our index holds it.

It is close to `evaluation-validity` but not the same: that capability is
about a measurement mis-describing a model, this is about a genuine
capability gain failing to generalise. Probably its own record.

**Trigger:** a second independent source. One paper's framing is that
author's framing — the rule the capability-proposal stage already uses.

## 5. Cost share equals elasticity

Their technical box: under cost-minimising input choice, an input's
elasticity equals its share of expenditure. And where firms do not fully
optimise, the equality weakens to a revealed-preference bound — observed
cost shares still reflect the firm's own belief about marginal products.

A measurement trick worth remembering: a hard-to-observe sensitivity can
sometimes be read off an easy-to-observe spend ratio. Speculative for us,
but the shape — *infer the elasticity you cannot measure from the allocation
you can* — is the kind of move that solves a stuck measurement problem.

## 6. Metrics they treat as load-bearing

Named here so we do not have to re-find them:

- **Epoch Capabilities Index (ECI)** — their capability measure, `C = e^ECI`.
- **METR time-horizon metric** — the other headline capability measure.
- **Favaro and Clark (2026)** — lines of code merged per engineer per day
  rose roughly 8× between 2024 and Q2 2026.
- **γ ≈ 0.15–0.3** — returns to scaling capability versus scaling inference
  compute, from Villalobos and Atkinson (2023), which they flag as out of
  date.

## 7. Our own data wishlist

Applying their format to us, honestly. What we cannot currently measure:

| Primitive | What we have | Why it is weak | What would settle it |
|---|---|---|---|
| Does a filed claim survive contest? | nothing | no claim here has been contested by anyone but us | time, plus a second reader |
| Does the catalogue get more accurate? | backtest, 4 cases | 4 is too few to move meaningfully | a larger held-out set, grown from outside |
| Does a technique's standing track reality? | `techniqueStanding()` | derived from what we filed, so it measures our filing | an external check — see ambition 2 |
| Cost per *accepted* claim | cost per draft | drafts are inputs | accepted-claim count over spend |

Every row on the left is red in the sense of the diagram. That is the honest
state.

## 8. Re-check date

Their headline number is a moving one: ~9% against a ~15% threshold, "not
constant and has been increasing." A claim like that goes stale in a
specific, checkable way.

`measured-rd-uplift-is-below-the-self-sustaining-threshold` should be
re-checked when the paper updates — the live version is on GitHub at
`elasticity-ai/elasticity` — or in six months, whichever comes first. If the
figure crosses the threshold, that is not a small edit to a claim. It is the
single most consequential change any claim in this catalogue could undergo.
