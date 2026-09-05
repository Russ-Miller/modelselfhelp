# Efficacy statements removed from technique `caveats` during the
# 2026-09-04 schema split. These are claims: directional statements about
# when a technique does or does not work. They need real sources before
# they can be filed, which is why they are parked here rather than
# invented into the catalog.
#
# Eleven of the original twelve are cleared. One remains.

| technique | statement needing a sourced efficacy claim |
|---|---|
| `reread-before-edit` | Practitioner technique used by several coding agents; no published study isolates its effect. |

The FastContext paper (arXiv 2606.14066) was offered for this one and
does not fit. It is about separating repository *exploration* from
solving to save token budget and keep the solver's context clean;
reread-before-edit is a harness rule that rejects an edit unless the file
was read after its last modification. Adjacent subject, different
mechanism, no measurement of stale-state edits. Filing it would have
been a citation that looks like support and isn't — which is the exact
failure this catalog exists to make visible. It stays open until either
a study isolates stale-read edit failures or Russ files it as an
own-observation.

## Cleared

| technique | filed as | backing |
|---|---|---|
| `chain-of-thought` | `chain-of-thought-does-not-fix-digit-level-arithmetic` | replicated, contested |
| `program-aided-computation` | `program-aided-computation-moves-errors-to-translation` | mechanism-reasoning |
| `recursive-summarization` | `recursive-summarization-trades-detail-for-continuity` | mechanism-reasoning |
| `retrieval-augmented-generation` | `retrieval-moves-the-trust-boundary-rather-than-removing-it` | replicated |
| `structured-prompt-separation` | `structured-separation-needs-training-and-reduces-rather-than-eliminates` | replicated |
| `external-feedback-repair` | `external-feedback-repair-works-only-with-real-grounding` | replicated, contested (filed earlier) |
| `checklist-decomposition` | `generated-checklists-make-instruction-requirements-individually-checkable` | single-paper |
| `dependency-existence-check` | `declared-dependencies-are-not-the-set-the-code-needs` | single-paper, observation |
| `irreversible-action-gate` | `an-approval-gate-holds-only-under-complete-mediation` | single-paper |
| `tool-use-fine-tuning` | `tool-use-fine-tuning-closes-a-gap-rather-than-extending-a-frontier` | single-paper, observation |
| `synthetic-desycophancy-training` | `withholding-the-users-opinion-is-the-no-training-alternative` | mechanism-reasoning |

Four are `mechanism-reasoning` or scope-limited rather than
`single-paper`, because the source establishes the setup without
measuring the effect: nothing quantifies PAL's residual translation-error
rate, nothing measures how much detail recursive summarization loses,
nobody has tested answer-before-opinion ordering as a deliberate
intervention, and FireAct reports a large gain for a weak model without
ablating starting strength. Each claim says so in its notes. Collapsing
those into "a paper says so" would have been the easy, wrong move.

Two of the six citations supplied on 2026-09-04 carried titles that did
not match their arXiv IDs — 2607.14166 is "Stop Means Stop: Measuring and
Repairing the Enforcement Gap in Agent-Framework Control Primitives"
(SOUNDGATE is the artifact it proposes, not the title), and 2606.14066 is
"FastContext: Training Efficient Repository Explorer for Coding Agents".
Both were checked against the arXiv API before use. `npm run
verify-papers` exists for exactly this and now covers 64 papers.
