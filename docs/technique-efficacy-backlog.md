# Efficacy statements removed from technique `caveats` during the
# 2026-09-04 schema split. These are claims: directional statements about
# when a technique does or does not work. They need real sources before
# they can be filed, which is why they are parked here rather than
# invented into the catalog.
#
# Six of the original twelve have been cleared (2026-09-04). Five were
# filed as claims against papers already in the catalog; a sixth was
# already filed. What remains is the set that cannot be cleared from the
# literature: each is practitioner knowledge, so it becomes an
# `own-observation` claim only if Russ has actually observed it, and
# otherwise gets dropped. Nobody should write these on his behalf.

| technique | statement needing a sourced efficacy claim |
|---|---|
| `checklist-decomposition` | Practitioner technique; no controlled study isolates its effect. |
| `dependency-existence-check` | Practitioner technique; no controlled study isolates its effect. |
| `irreversible-action-gate` | Practitioner technique; no controlled study isolates its effect. |
| `reread-before-edit` | Practitioner technique used by several coding agents; no published study isolates its effect. |
| `synthetic-desycophancy-training` | At inference time, hiding the user's opinion or asking for the answer before the opinion is the cheap alternative. |
| `tool-use-fine-tuning` | Gains are largest for open models that start far behind. |

## Cleared

| technique | filed as | backing |
|---|---|---|
| `chain-of-thought` | `chain-of-thought-does-not-fix-digit-level-arithmetic` | replicated, contested |
| `program-aided-computation` | `program-aided-computation-moves-errors-to-translation` | mechanism-reasoning |
| `recursive-summarization` | `recursive-summarization-trades-detail-for-continuity` | mechanism-reasoning |
| `retrieval-augmented-generation` | `retrieval-moves-the-trust-boundary-rather-than-removing-it` | replicated |
| `structured-prompt-separation` | `structured-separation-needs-training-and-reduces-rather-than-eliminates` | replicated |
| `external-feedback-repair` | `external-feedback-repair-works-only-with-real-grounding` | replicated, contested (filed earlier) |

Two of the five were filed as `mechanism-reasoning` rather than
`single-paper` because the sources establish the setup but do not measure
the effect: nothing in the catalog quantifies PAL's residual translation
error rate, and nothing measures how much detail recursive summarization
loses. Both claims say so in their notes. That is the distinction the
backing_strength field exists to carry — "this follows from how the
technique works" is a weaker warrant than "someone measured it," and
collapsing the two would have been the easy, wrong move.
