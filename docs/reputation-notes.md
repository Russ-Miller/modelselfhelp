# Reputation and contribution incentives — notes, not a plan

Captured 2026-09-04. Nothing here is built. This exists because the *idea*
will recur on its own; the *reasoning already done about it* will not.

## What it would be for

Sorting out which claims and techniques actually make models more useful,
accurate, and efficient — by making it worth someone's while to do two
things:

1. Show that a technique genuinely helps a capability.
2. Shoot down a false claim.

## The trap, which we already rejected one level down

The 1-10 capability score was retired (2026-09-03) because a repository that
optimizes toward a score Goodharts, and the degradation is invisible from
inside the loop. **A reputation score is the same failure one layer up:**
instead of gaming the capability rating, contributors game the kudos.

Hugging Face's Daily Papers is the obvious model to copy, and it does drive
real activity. But its upvotes reward *attention*, which is precisely the
organizing principle this index defines itself against (see spec §1, "What
this is, versus a paper feed"). Copying the mechanism risks importing the
thing we refused.

## What makes this version genuinely different

Academia and paper feeds both reward novelty and positive results.
**Refutation is chronically undervalued everywhere.** An index that pays
reputation for shooting down a false claim is counter-cyclical to the whole
field — it would attract exactly the contributions nobody else rewards. That
is a real edge, not a copy of upvotes, and it is the reason the idea is worth
keeping rather than dismissing as gamification.

## The hazard that creates, and the fix

Paying for contests manufactures disputes. Stage-2 classification is already
biased hard toward conservatism because a false "contradicts" is worse than a
missed one — it poisons the signal that makes the index useful. A kudos system
paying per contest would apply adversarial pressure to the most fragile part
of the schema.

**Fix: reward resolution, not contestation.** Credit should land when a
claim's status durably changes and the change *survives* — a contest that
holds up under later evidence, an efficacy claim that gets replicated. Not
for filing a dispute; for being right about it, confirmed over time.

That is hard to game, because it requires surviving the ongoing re-evaluation
loop. It also means the 14-day staleness check (spec §6) is load-bearing for
something well beyond freshness: it is the mechanism that would eventually
settle who was right.

## Why nothing needs building now

Reputation is a **view over provenance**, computable retroactively. The game
does not need designing; the ledger needs to be complete.

- Every record already carries `submitted_by`.
- `SourceLink` gained optional `submitted_by` / `added_at` on 2026-09-04,
  closing the one real gap: adding a *contesting source to an existing claim*
  is the act most worth rewarding, and it was previously unattributable.

Nothing consumes these fields yet. That is fine. The cost of recording them
now is zero; the cost of not recording them is that any future contribution
history begins with a blind spot exactly where the interesting contributions
live.

## Open questions, for whenever this becomes real

- Does reputation attach to a person, or to a claim's track record? A
  contributor whose contests usually hold up is different information from a
  contributor who files many.
- How does an agent contributor earn and display standing? The provenance
  format already distinguishes `human:` from `agent:`.
- Does public reputation change what people submit in ways that hurt? The
  honest answer is that we would not know until it is live, which argues for
  making it observable before making it competitive.
