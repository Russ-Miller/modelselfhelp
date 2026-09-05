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
// ~15k tokens. Enough for method, results and limitations; keeps cost bounded.
const MAX_FULLTEXT_CHARS = 60000;

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const onlyId = arg("id");
// Full text is the default: it is what makes the figures and the evidence-
// quality paragraph worth anything. --abstract-only skips it to save cost.
const abstractOnly = args.includes("--abstract-only");
// arXiv throttles aggressively. Pausing between papers costs nothing anyone
// is waiting on -- the nightly run has all night -- and avoids the retry
// storms that made an earlier pass give up entirely.
const delayMs = Number(arg("delay") ?? 6000);
const limit = args.includes("--all") ? Infinity : Number(arg("limit") ?? 5);

const SYSTEM = `You write short digests of AI research papers for a catalogue that tracks what
language models are good and bad at. Your digest replaces the abstract. Someone
should be able to decide from it whether the paper changes what they believe.

WHAT MATTERS HERE, in order:
- Which capability the paper speaks to, and whether it supports or cuts against
  the usual understanding of it.
- What technique, if any, was used, and what it did to that capability.
- How well the finding is evidenced: measured or argued, on what, how many, and
  whether anything was isolated well enough to attribute the effect.

That a paper is recent is not interesting and must never be the frame. Never
open with "New X paper", "A new paper", "Researchers have", or any variant.
Open on the finding itself. Name the lab only if it is load-bearing.

STRUCTURE. Plain text, no markdown, no headings, no bullets. Every paragraph is
one or two sentences, separated by a blank line. 130-220 words total.

1. The finding, first line, no preamble, stated as what is true of models or of
   a technique rather than as a description of a paper. "Sampling a code model
   many times and filtering beats trying to get 1 correct answer."
2. The setup. Named system, models, benchmarks, concrete enough to picture.
3. The results, with figures.
4. How well it is evidenced. Say plainly whether the effect was measured or
   argued, what the comparison was, and whether the design isolates the cause.
   An ablation, a matched-budget baseline, or an independent replication is
   worth naming. So is their absence: "no baseline at equal token budget", "1
   model family", "self-reported evaluation".
5. The boundary. Where the result does not hold: model classes, task types,
   what was not tested.
6. What it changes for the reader. One sentence.

STYLE.
- Numerals for every number, including small ones: "1 agent", "34 problems",
  "4 benchmarks". Never spell them out.
- Multipliers as x, ranges with en-dashes.
- Short declarative sentences. No "significantly", "notably", "importantly",
  "it is worth noting", "delve", "leverage", "robust", "novel", "we show".
- Second person is allowed in the opening and closing sentence only.
- Never sell the paper. No "fascinating", "brutal", "wow". The reader decides.

FIGURES -- THIS IS THE HARD RULE. Every number you write must appear in the
source text you were given. If the source has no figures, write the results
paragraph qualitatively and say so. Do not estimate, round, convert, or infer a
figure. An accurate digest with no numbers is correct; a fluent one with
invented numbers is worthless and worse than nothing. List every figure you
used in figures_used, copied exactly as it appears in the source.`;

const Brief = z.object({
  brief: z.string().describe("The digest itself. Plain text, blank line between paragraphs."),
  figures_used: z.array(z.string())
    .describe("Every numeric figure used in the brief, copied verbatim from the source text. Empty array if the source gave none."),
});

const buildPrompt = (s, abstract) => `Title: ${s.title}
${s.authors?.length ? `Authors: ${s.authors.slice(0, 4).join(", ")}\n` : ""}${s.year ? `Year: ${s.year}\n` : ""}${s.venue ? `Venue: ${s.venue}\n` : ""}
Source text (this is all you have; do not use anything you may recall about this paper). It is either the abstract alone or the full paper -- work only from what is here:
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

// The style demands numerals, so the model correctly renders a source's "six
// frameworks" as "6". Without this the check calls a grounded figure invented,
// and false positives are what make a checker useless.
const WORD_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100, thousand: 1000, million: 1000000, billion: 1000000000,
};

const norm = (s) => s.replace(/,/g, "").replace(/\s+/g, "");

/** The source text with spelled-out numbers also present as digits. */
function haystack(text) {
  const digits = text.replace(/\b([a-z]+)\b/gi, (m, w) => {
    const n = WORD_NUMBERS[w.toLowerCase()];
    return n === undefined ? m : `${m} ${n}`;
  });
  return norm(text) + "|" + norm(digits);
}

/** A figure counts as grounded if it appears in the abstract, ignoring commas
 *  and spacing. Deliberately loose: the goal is catching invention, not
 *  punishing formatting. */
function unverified(brief, source) {
  const hay = haystack(source);
  return figuresIn(brief).filter((f) => !hay.includes(norm(f)));
}

/**
 * arXiv's LaTeXML HTML rendering, where it exists. Only papers from roughly
 * December 2023 onward have it, which is exactly the set the nightly pipeline
 * ingests -- so new work gets summarized from the paper and the back catalogue
 * falls back to its abstract. A brief records which it got in `brief_source`,
 * because the two are not equally trustworthy and the number check means much
 * more against full text.
 */
async function fetchFullText(arxivId) {
  const res = await fetch(`https://arxiv.org/html/${arxivId}`, { redirect: "follow" });
  if (!res.ok) return null;
  const html = await res.text();
  // A paper without a rendering serves a short placeholder page rather than a 404.
  if (/No HTML for this paper|html is not available/i.test(html)) return null;
  const text = html
    .replace(/<(script|style|nav|footer)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  // Everything after the bibliography is citations, which would flood the
  // figure check with numbers the paper never claimed.
  const cut = text.search(/\b(References|Bibliography)\b/);
  const body = (cut > 2000 ? text.slice(0, cut) : text).slice(0, MAX_FULLTEXT_CHARS);
  return body.length > 4000 ? body : null;
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
    if (attempt >= 8) throw new Error(`arXiv ${res.status} after ${attempt} retries`);
    const wait = Math.min(60000, 8000 * 2 ** attempt);
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
for (let i = 0; i < batch.length; i += 20) {
  const chunk = batch.slice(i, i + 20).map((b) => bare(b.data.arxiv_id));
  for (const [k, v] of await fetchAbstracts(chunk)) abstracts.set(k, v);
  if (i + 20 < batch.length) await new Promise((r) => setTimeout(r, delayMs));
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
    let text = abstract, kind = "abstract";
    if (!abstractOnly) {
      const full = await fetchFullText(bare(s.arxiv_id)).catch(() => null);
      if (full) { text = full; kind = "full-text"; }
    }
    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "low", format: zodOutputFormat(Brief) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildPrompt(s, text) }],
    });
    inTokens += res.usage?.input_tokens ?? 0;
    outTokens += res.usage?.output_tokens ?? 0;
    cacheRead += res.usage?.cache_read_input_tokens ?? 0;

    const out = res.parsed_output;
    if (!out?.brief) { console.log("      parse failed, skipped"); errors++; continue; }

    const bad = unverified(out.brief, text);
    s.brief = out.brief.trim();
    s.brief_generated_at = new Date().toISOString().slice(0, 10);
    s.brief_model = MODEL;
    s.brief_source = kind;
    if (bad.length) { s.brief_unverified_figures = bad; flagged++; }
    else delete s.brief_unverified_figures;

    fs.writeFileSync(item.full, YAML.stringify(s, { lineWidth: 78 }));
    console.log(bad.length
      ? `      written from ${kind}, ${bad.length} UNGROUNDED FIGURE(S): ${bad.join(", ")}`
      : `      written from ${kind}, ${out.figures_used.length} figure(s), all grounded`);
  } catch (err) {
    errors++;
    console.error(`      error: ${err?.message ?? err}`);
  }
  if (i < batch.length - 1) await new Promise((r) => setTimeout(r, delayMs));
}

const cost = (inTokens / 1e6) * PRICE_IN + (outTokens / 1e6) * PRICE_OUT;
console.log(`\ntokens: ${inTokens} in (${cacheRead} cached) / ${outTokens} out`);
console.log(`cost:   $${cost.toFixed(4)} for ${batch.length} ≈ $${(cost / Math.max(batch.length, 1)).toFixed(4)} each`);
if (flagged) console.log(`flagged: ${flagged} brief(s) contain a figure absent from the abstract -- read those before trusting them`);
if (errors) console.log(`errors:  ${errors}`);
