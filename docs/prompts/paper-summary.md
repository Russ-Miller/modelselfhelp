# Paper-summary prompt (Rohan Paul style)

Reverse-engineered on 2026-09-04 from six paper write-ups across two
issues of Rohan Paul's newsletter (rohan-paul.com). His X posts
(@rohanpaul_ai, 156K followers) are compressed versions of these — same
opening move, truncated at "Show more" — so the newsletter is the better
source for the full shape. X itself is login-walled after ~6 posts.

## What makes the format work

The structure is a funnel: stake → finding → how → numbers → where it
breaks → what you do. Two things carry it. First, the numbers are
specific and comparative, never "significantly improved." Second, every
summary names its own limit, which is what makes the rest believable.

## The prompt

> You are summarizing a research paper for practitioners who build with
> LLMs. They are technical, short on time, and reading on a phone. Write
> 150–250 words in this structure, one blank line between every paragraph.
> No headings, no bullet points unless the paper is a list of findings.
>
> **1. Title line.** `🗞️ "Exact Paper Title"` — quoted verbatim, nothing else.
>
> **2. Hook, one sentence.** Give the reader a reason to care before they
> know anything about the paper. Address them directly. Use a conditional
> or a consequence, not a description. Good: "When an AI agent fails,
> blaming the model can send you to the wrong fix." / "If you're spending
> extra tokens making an LLM critique itself, this paper says a simpler
> move can be better: just let it try again." Bad: "This paper studies
> agent failure modes."
>
> **3. Attribution and finding, one or two sentences.** Name the lab, then
> state the finding plainly: "New Microsoft paper finds that some
> expensive test-time reasoning can be replaced with a small set of rules
> learned from previous agent runs."
>
> **4. Method, one or two sentences.** Concrete enough that a reader could
> picture running it. Include the actual quantities: "collect 35–50 past
> trajectories, have a coding agent extract recurring failure patterns,
> then turn those into a small markdown skill added to the system prompt."
>
> **5. Results, dense with numbers.** Every claim carries a figure and,
> where possible, a comparator: "recovered 55%–100%+ of the gap between
> non-reasoning and reasoning modes across 4 agent benchmarks, while using
> 2.9–4.5× fewer output tokens." Name the benchmarks.
>
> **6. The wrinkle.** One thing that is more interesting than the headline
> result. Open with a phrase like "The useful part is that…" or "The limit
> is equally useful:…"
>
> **7. The boundary.** State plainly where the result does not hold —
> model sizes, task types, what was not tested. "Study boundary matters:
> this is Qwen2.5 on math, not frontier models or open-ended tasks."
> Never omit this, even when the paper undersells its own limits.
>
> **8. The takeaway, one or two sentences.** What the reader should
> actually do differently. Start with "So the practical split is:" or "For
> agent teams, the practical shift is simple:" or similar.
>
> **Style rules**
> - Numerals for every number, including small ones: "1 extra term",
>   "4 judges", "7 test-time reasoning methods".
> - Multipliers as `×`, ranges with en-dashes: `2.9–4.5×`, `55%–100%`.
> - Paragraphs of 1–3 sentences. Blank line between each.
> - Second person in the hook and the takeaway; third person in between.
> - Plain declaratives. No "significantly", "notably", "importantly",
>   "it is worth noting", "delve", "leverage".
> - Never claim a result the paper did not measure. If the paper argues
>   from mechanism rather than measurement, say so.

## Worked example, from the source

> 🗞️ "Sample More, Reflect Less: Self-Refine and Reflexion Lose to
> Repeated Sampling at Equal Token Cost, from 1.5B to 7B"
>
> If you're spending extra tokens making an LLM critique itself, this
> paper says a simpler move can be better: just let it try again.
>
> The study compares 7 test-time reasoning methods on Qwen2.5 models from
> 1.5B to 7B, then asks a fairer question: what happens if repeated
> sampling gets the same token budget?
>
> Repeated sampling means solving the same math problem several times and
> taking the answer that shows up most often. Across 36 comparisons, none
> of the more elaborate methods reliably beat that baseline at equal
> generated-token cost; 10 were significantly worse.
>
> For checkable reasoning, extra tokens may be better spent creating
> independent attempts than asking the model to reconsider its own work.
> Study boundary matters: this is Qwen2.5 on math, not frontier models or
> open-ended tasks.

## Where this fits here

The boundary paragraph is the part worth stealing. It is the same
instinct as `backing_strength` and the scope conditions this catalog
writes into every claim statement — a result without its limit gets
misapplied. If this prompt is ever wired into the ingestion pipeline for
queue summaries, that paragraph is the one that must not be dropped for
length.

Note the mismatch to watch: this format is written to make a paper sound
worth reading, and the catalog exists to judge whether a paper's claim
holds up. Borrow the structure and the numeric density; do not borrow the
enthusiasm.
