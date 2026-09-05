# Paper-summary style

Reverse-engineered 2026-09-04 from Rohan Paul (@rohanpaul_ai): four full posts
read from X with the browser extension, plus six longer write-ups from his
newsletter at rohan-paul.com. Implemented in `scripts/summarize-sources.mjs`,
which writes the result to a source's `brief` field.

## Why this format works

It is a funnel — finding, method, figures, turn, boundary, takeaway — and two
things carry it.

Figures are specific and comparative. Not "improved substantially" but "drops
from 69.3 on SWE-Pro with Opus running it to 33.0 when Gemini 3.1 Pro becomes
the executor." The comparator is what makes a number mean something.

Every summary states its own limit. "Study boundary matters: this is Qwen2.5
on math, not frontier models or open-ended tasks." That paragraph is why the
rest reads as credible rather than promotional, and it is the same instinct as
`backing_strength` and the scope conditions written into every claim here.

## Structure

1. **The finding, first line, no preamble.** Stated as a consequence, not a
   description. `New MIT paper: If agents can see and reuse what earlier agents
   built, the whole system gets stronger over time.` Lab attribution when the
   source names one, either inline or as its own line (`New Google DeepMind
   paper.`). Where no lab is evident, the finding stands alone: `LLMs learn a
   narrower set of answers than their training data, even when you sample
   instead of using greedy decoding.`
2. **What the paper did.** Named system, models, benchmarks, concrete enough to
   picture. `HarnessDev starts each creator model from a nearly empty runtime
   and asks it to build the execution loop, tools, context handling, recovery,
   and verification needed for real tasks.`
3. **Results, with figures.** `Codex solves 28.8% of HumanEval problems in a
   single attempt, against 11.4% for GPT-J and 0% for GPT-3.`
4. **The turn** — the thing more interesting than the headline, opened with a
   flat connective: `That means`, `That is the important part:`, `Portability
   is another problem:`.
5. **The boundary.** Where it does not hold.
6. **What to do differently.** One sentence.

Paragraphs are one or two sentences with a blank line between. 120–200 words.

## Style rules

- Numerals for every number, including small ones: `1 agent`, `34 math
  problems`, `24 others`, `4 benchmarks`.
- Multipliers as `×`, ranges with en-dashes.
- Short declaratives. No *significantly*, *notably*, *importantly*, *it is
  worth noting*, *delve*, *leverage*, *robust*, *novel*.
- Second person in the opening and closing sentence only.
- No selling. Rohan's own posts occasionally open "A brutal study." — that is
  the one habit deliberately not copied. This catalog judges whether a claim
  holds; it does not advertise papers.

## X versus the newsletter

The two forms differ and the X one is the model here.

| | X post | Newsletter |
|---|---|---|
| Title | at the **bottom**, `Title: "…"`, often a threaded reply with the arXiv link | at the top, `🗞️ "…"` |
| Emoji | none | `🗞️` per item |
| Length | ~150 words | ~250 words |

## The fabrication problem

The style runs on dense figures, and the generator is handed an abstract that
frequently has none. That is a direct invitation to invent numbers, in a
catalog whose entire value is provenance — the same failure that made a
plausible-but-wrong citation worth rejecting earlier.

Two guards, both in `summarize-sources.mjs`:

1. The prompt forbids any figure not present in the source text, and requires
   the model to list the figures it used, copied verbatim.
2. Every number in the output is then checked against the abstract. Anything
   unmatched lands in `brief_unverified_figures` and renders as a warning on
   the source page, rather than sitting there looking authoritative.

The second guard is the one that counts, because it does not depend on the
model having complied with the first.

One extractor subtlety worth keeping: the number matcher uses a lookbehind to
skip digits attached to a name. Without it, `GPT-3.` yields the figure `3`,
which fails the check and buries real inventions under false positives.

## Worked example

> New OpenAI paper: sampling a code model many times and filtering beats trying
> to get 1 correct answer.
>
> Codex is a GPT model fine-tuned on public GitHub code, evaluated on Python
> program synthesis. The authors release HumanEval, a benchmark that scores
> functional correctness of programs generated from docstrings by running unit
> tests rather than comparing text.
>
> Codex solves 28.8% of HumanEval problems in a single attempt, against 11.4%
> for GPT-J and 0% for GPT-3. With 100 samples per problem, 70.2% of problems
> are solved.
>
> That gap is the important part: most of the model's capability is
> inaccessible from 1 sample, so the useful unit of a code agent is a
> sampling-and-selection loop, not a single generation.
>
> The limits are structural, not fixable by more sampling. Codex struggles with
> docstrings that describe long chains of operations and with binding
> operations to specific variables. Evaluation covers Python synthesis from
> docstrings only; nothing here speaks to other languages, repository-scale
> edits, or how well 100 samples can be filtered without hidden tests.
>
> If you are building a code tool, budget for multiple samples and a verifier
> instead of tuning the prompt for a single shot.

Generated by the script from the arXiv abstract alone, every figure grounded.
