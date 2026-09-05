// Write a reader-facing digest for each paper source, in the house style
// documented in docs/prompts/paper-summary.md (reverse-engineered from Rohan
// Paul's paper posts). Abstracts are hard to skim; these are not.
//
//   node scripts/summarize-sources.mjs --dry-run     # print a prompt, spend nothing
//   node scripts/summarize-sources.mjs --limit 5     # 5 sources, report cost
//   node scripts/summarize-sources.mjs --id arxiv-2201-11903
//   node scripts/summarize-sources.mjs --all --force # redo everything
//
// THE FABRICATION PROBLEM. The style is built on dense, specific figures, and
// the model is being handed an abstract that often does not contain them. That
// is a direct invitation to invent numbers, in a catalog whose entire value is
// provenance. Two guards: the prompt forbids any figure not present in the
// source text, and every number in the output is then checked against the
// abstract. Anything unmatched is recorded in brief_unverified_figures rather
// than silently kept, so a bad digest is visible instead of plausible.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const MODEL = "claude-opus-5";
const PRICE_IN = 5.0, PRICE_OUT = 25.0;
const SOURCES_DIR = "catalog/sources";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const onlyId = arg("id");
const limit = args.includes("--all") ? Infinity : Number(arg("limit") ?? 5);

const SYSTEM = `You write short digests of AI research papers for practitioners who build
with LLMs. They are technical, short on time, and reading on a phone. Your
digest replaces the abstract: someone should be able to decide from it whether
the paper matters to them, and walk away knowing the one thing it found.

STRUCTURE. Plain text, no markdown, no headings, no bullets. Every paragraph is
one or two sentences, separated by a blank line. 120-200 words total.

1. The finding, first line, no preamble. State what the paper found as a
   consequence the reader can act on, not as a description of the paper.
   Attribute the lab when the source names one: "New DeepMind paper." on its own
   line, or "New MIT paper: <finding>". If no lab is evident, open with the
   finding alone.
2. What the paper actually did. Name the system, the models, the benchmarks.
   Concrete enough that the reader can picture the setup.
3. The results, with figures, where the source gives them.
4. The turn -- the thing more interesting than the headline. Open with a plain
   connective: "That means", "That is the important part:", "<X> is another
   problem:".
5. The boundary. Where the result does not hold: model classes, task types,
   what was not tested. If the source states no limit, say what the evidence
   does not cover rather than inventing a caveat.
6. What the reader should do differently. One sentence.

STYLE.
- Numerals for every number, including small ones: "1 agent", "34 problems",
  "4 benchmarks". Never spell them out.
- Multipliers as x, ranges with en-dashes.
- Short declarative sentences. No "significantly", "notably", "importantly",
  "it is worth noting", "delve", "leverage", "robust", "novel", "we show".
- Second person is allowed in the opening and the closing sentence only.
- Never sell the paper. No "fascinating", "brutal", "wow". The reader decides.

FIGURES -- THIS IS THE HARD RULE. Every number you write must appear in the
source text you were given. If the source has no figures, write the results
paragraph qualitatively and say the abstract reports no numbers. Do not
estimate, round, convert, or infer a figure. An accurate digest with no numbers
is correct; a fluent one with invented numbers is worthless and worse than
nothing. List every figure you used in figures_used, copied exactly as it
appears in the source.`;

const Brief = z.object({
  brief: z.string().describe("The digest itself. Plain text, blank line between paragraphs."),
  figures_used: z.array(z.string())
    .describe("Every numeric figure used in the brief, copied verbatim from the source text. Empty array if the source gave none."),
});

const buildPrompt = (s, abstract) => `Title: ${s.title}
${s.authors?.length ? `Authors: ${s.authors.slice(0, 4).join(", ")}\n` : ""}${s.year ? `Year: ${s.year}\n` : ""}${s.venue ? `Venue: ${s.venue}\n` : ""}
Source text (this is all you have; do not use anything you may recall about this paper):
${abstract}`;

/** Numbers a digest asserts, minus the ones that are safely rhetorical.
 *  The lookbehind matters: without it "GPT-3." yields the figure "3", which
 *  then fails the check and buries a real invention under false positives. */
function figuresIn(text) {
  const nums = text.match(/(?<![A-Za-z-])\d[\d,]*(?:\.\d+)?\s*%?/g) ?? [];
  return [...new Set(nums.map((n) => n.trim()))]
    // "1 model", "2 ways" -- bare small integers are counting words in this
    // style, not claims about results, and checking them produces only noise.
    .filter((n) => !/^\d$/.test(n));
}

const norm = (s) => s.replace(/,/g, "").replace(/\s+/g, "");

/** A figure counts as grounded if it appears in the abstract, ignoring commas
 *  and spacing. Deliberately loose: the goal is catching invention, not
 *  punishing formatting. */
function unverified(brief, abstract) {
  const hay = norm(abstract);
  return figuresIn(brief).filter((f) => !hay.includes(norm(f)));
}

/**
 * Abstracts for many ids in one request. arXiv rate-limits per request, not per
 * id, so fetching 62 papers one at a time spends most of its life in backoff
 * while a handful of batched calls sail through. id_list takes a comma-separated
 * list; max_results has to be raised to match or it silently returns 10.
 */
async function fetchAbstracts(ids, attempt = 0) {
  const url = `https://export.arxiv.org/api/query?id_list=${ids.join(",")}&max_results=${ids.length}`;
  const res = await fetch(url);
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`arXiv ${res.status} after ${attempt} retries`);
    const wait = 5000 * (attempt + 1);
    console.log(`  arXiv ${res.status}, retrying in ${wait / 1000}s`);
    await new Promise((r) => setTimeout(r, wait));
    return fetchAbstracts(ids, attempt + 1);
  }
  if (!res.ok) throw new Error(`arXiv ${res.status}`);
  const xml = await res.text();
  const out = new Map();
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = entry.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<v]+)/)?.[1];
    const abs = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1];
    if (id && abs) out.set(id, abs.replace(/\s+/g, " ").trim());
  }
  return out;
}

// ---------------------------------------------------------------------------

const files = fs.readdirSync(SOURCES_DIR).filter((f) => /\.ya?ml$/.test(f));
const work = [];
for (const f of files) {
  const full = path.join(SOURCES_DIR, f);
  const data = YAML.parse(fs.readFileSync(full, "utf8"));
  if (data.kind !== "paper" || !data.arxiv_id) continue;      // observations are already the user's words
  if (onlyId && data.id !== onlyId) continue;
  if (data.brief && !force) continue;
  work.push({ full, data });
}

console.log(`${work.length} paper source${work.length === 1 ? "" : "s"} without a brief`);
if (!work.length) process.exit(0);

const batch = work.slice(0, limit === Infinity ? work.length : limit);
console.log(`Processing ${batch.length}${batch.length < work.length ? ` of ${work.length}` : ""} with ${MODEL}\n`);

const bare = (id) => String(id).replace(/v\d+$/, "");
const abstracts = new Map();
for (let i = 0; i < batch.length; i += 25) {
  const chunk = batch.slice(i, i + 25).map((b) => bare(b.data.arxiv_id));
  for (const [k, v] of await fetchAbstracts(chunk)) abstracts.set(k, v);
  if (i + 25 < batch.length) await new Promise((r) => setTimeout(r, 3000));
}
console.log(`fetched ${abstracts.size} abstract(s) for ${batch.length} source(s)\n`);

if (dryRun) {
  const { data } = batch[0];
  const abstract = abstracts.get(bare(data.arxiv_id));
  console.log("=== DRY RUN: prompt for the first item, no API call ===\n");
  console.log(SYSTEM);
  console.log("\n--- user ---\n");
  console.log(buildPrompt(data, abstract));
  process.exit(0);
}

const client = new Anthropic();
let inTokens = 0, outTokens = 0, cacheRead = 0, errors = 0, flagged = 0;

for (const [i, item] of batch.entries()) {
  const s = item.data;
  process.stdout.write(`[${i + 1}/${batch.length}] ${s.id} :: ${String(s.title).slice(0, 52)}\n`);
  try {
    const abstract = abstracts.get(bare(s.arxiv_id));
    if (!abstract) { console.log("      no abstract returned by arXiv, skipped"); errors++; continue; }
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(Brief) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildPrompt(s, abstract) }],
    });
    inTokens += res.usage?.input_tokens ?? 0;
    outTokens += res.usage?.output_tokens ?? 0;
    cacheRead += res.usage?.cache_read_input_tokens ?? 0;

    const out = res.parsed_output;
    if (!out?.brief) { console.log("      parse failed, skipped"); errors++; continue; }

    const bad = unverified(out.brief, abstract);
    s.brief = out.brief.trim();
    s.brief_generated_at = new Date().toISOString().slice(0, 10);
    s.brief_model = MODEL;
    if (bad.length) { s.brief_unverified_figures = bad; flagged++; }
    else delete s.brief_unverified_figures;

    fs.writeFileSync(item.full, YAML.stringify(s, { lineWidth: 78 }));
    console.log(bad.length
      ? `      written, ${bad.length} FIGURE(S) NOT IN ABSTRACT: ${bad.join(", ")}`
      : `      written, ${out.figures_used.length} figure(s), all grounded`);
  } catch (err) {
    errors++;
    console.error(`      error: ${err?.message ?? err}`);
  }
}

const cost = (inTokens / 1e6) * PRICE_IN + (outTokens / 1e6) * PRICE_OUT;
console.log(`\ntokens: ${inTokens} in (${cacheRead} cached) / ${outTokens} out`);
console.log(`cost:   $${cost.toFixed(4)} for ${batch.length} ≈ $${(cost / Math.max(batch.length, 1)).toFixed(4)} each`);
if (flagged) console.log(`flagged: ${flagged} brief(s) contain a figure absent from the abstract -- read those before trusting them`);
if (errors) console.log(`errors:  ${errors}`);
