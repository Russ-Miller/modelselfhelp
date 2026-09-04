# Efficacy statements removed from technique `caveats` during the
# 2026-09-04 schema split. These are claims: directional statements about
# when a technique does or does not work. They need real sources before
# they can be filed, which is why they are parked here rather than
# invented into the catalog.

| technique | statement needing a sourced efficacy claim |
|---|---|
| `chain-of-thought` | Does not fix digit-level errors; the steps can be confidently wrong. Combine with code execution for exact arithmetic. |
| `checklist-decomposition` | Practitioner technique; no controlled study isolates its effect. |
| `dependency-existence-check` | Practitioner technique; no controlled study isolates its effect. |
| `external-feedback-repair` | Without a real external signal the loop tends to make answers worse. (Already filed as external-feedback-repair-works-only-with-real-grounding.) |
| `irreversible-action-gate` | Practitioner technique; no controlled study isolates its effect. |
| `program-aided-computation` | Errors move from arithmetic to problem translation, which still needs checking. |
| `recursive-summarization` | Summaries lose detail; pair with retrieval over archived turns for questions needing specifics. |
| `reread-before-edit` | Practitioner technique used by several coding agents; no published study isolates its effect. |
| `retrieval-augmented-generation` | Retrieval brings its own failure modes: injected instructions and conflicting sources. |
| `structured-prompt-separation` | Prompt-only versions reduce but do not eliminate injection; treat as defense in depth. |
| `synthetic-desycophancy-training` | At inference time, hiding the user's opinion or asking for the answer before the opinion is the cheap alternative. |
| `tool-use-fine-tuning` | Gains are largest for open models that start far behind. |
