// Stage 3 of ingestion: turn a triaged candidate into DRAFT catalog records.
//
//   node --env-file=.env scripts/draft-claims.mjs --id 2609.03148
//   node --env-file=.env scripts/draft-claims.mjs --limit 5
//
// Stage 2 tags a paper (about_capability, direction, contradicts/supports).
// This writes what those tags imply: a proposed claim statement with its scope
// condition, the technique it uses, and a stance toward a specific existing
// claim with the reason.
//
// DRAFTS ONLY. Output goes to pipeline/drafts/, never to catalog/. Filing is a
// human act, and this exists to remove the typing from it, not the judgment.
//
// Why the caution is not decorative: stage 2's own numbers put its
// about_capability false-positive rate between 35% and 57%. A wrong tag is
// something you skim past. A drafted sentence asserting that a paper contests
// a claim you hold reads as authoritative and could become catalog content by
// inattention. So the prompt defaults to "neither", demands the contradiction
// be direct, and every draft has to say what would falsify it.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { loadCatalog } from "./catalog-lib.mjs";
import { fetchFullText, fetchAbstracts, unverified } from "./paper-text-lib.mjs";

const MODEL = "claude-opus-5";
const PRICE_IN = 5.0, PRICE_OUT = 25.0;
const QUEUE_DIR = "pipeline/queue";
const OUT_DIR = "pipeline/drafts";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const onlyId = arg("id");
const limit = Number(arg("limit") ?? 3);
const dryRun = args.includes("--dry-run");

const Draft = z.object({
  capability: z.string().describe("Slug of the existing capability this belongs under. Must be one of the ids listed."),
  statement: z.string().describe("The claim: one directional, scoped sentence about what is true of models or of a technique. The scope condition — model class, task family, setup — must be inside the sentence, not appended. Not a description of the paper."),
  kind: z.enum(["mechanism", "observation"]).describe("mechanism: explains WHY, expected to outlive model generations. observation: how a specific model or era behaves, expected to rot."),
  backing_strength: z.enum(["single-paper", "replicated", "mechanism-reasoning"])
    .describe("What warrants it. single-paper unless this paper itself replicates an independent result. Never own-observation — that requires an observation the catalog's owner personally made."),
  scope_condition: z.string().describe("Conditions under which the finding holds, stated plainly. Empty string if the paper states none, which is itself worth knowing."),
  technique: z.string().describe("Slug of an existing technique this claim is about, or empty string. Only when the claim is about whether that technique works."),
  proposed_technique: z.string().describe("If the paper introduces a technique not in the catalog, a short plain-English name for it. Empty string otherwise."),
  stance_on_existing: z.enum(["supports", "contests", "neither"])
    .describe("Whether this paper's finding bears on a claim already held. Default to neither. 'contests' only when the finding genuinely cuts against what the claim asserts — discussing the same topic is not contesting, and neither is finding a limit the claim already scopes for."),
  related_claim_id: z.string().describe("Id of that existing claim, or empty string when stance is neither."),
  stance_reason: z.string().describe("One sentence saying exactly what in the paper bears on that claim. Empty when stance is neither."),
  falsifier: z.string().describe("What result would show this claim is wrong. A claim with no answer here is not yet a claim."),
  evidence_note: z.string().describe("How well evidenced: measured or argued, on what, how many, what the baseline was, and what the design does or does not isolate."),
  confidence: z.enum(["high", "medium", "low"]),
});

const SYSTEM = `You draft candidate records for a catalogue of what language models are good
and bad at. A human files them; you remove the typing, never the judgment.

The catalogue's unit is a CLAIM: a directional, scoped statement, not a
description of a paper and not a benchmark number. "Accuracy drops as inputs
grow, and worst for information in the middle of the context" is a claim.
"This paper studies long-context performance" is not.

Rules that matter more than fluency:

1. The scope condition goes INSIDE the statement. A claim without it gets
   misapplied later, which is the failure this format exists to prevent.
2. Distinguish mechanism from observation. A mechanism claim explains why and
   outlives a model generation. An observation describes how some model or era
   behaves and is expected to rot. Getting this wrong contaminates durable
   knowledge with perishable content.
3. Be conservative about contesting. Default to "neither". A paper contests a
   held claim only when its finding genuinely cuts against what that claim
   asserts. Working on the same topic is not contesting. Finding a limit the
   claim already scopes for is not contesting. An empty answer is better than
   a wrong one.
4. Never assert a number that is not in the source text you were given.
5. Every claim needs a falsifier. If you cannot say what result would show it
   wrong, you have written a topic, not a claim.

Write plainly. Short declarative sentences. No "significantly", "notably",
"novel", "robust", "we show".`;

function buildPrompt(cand, capabilities, techniques, claims, text) {
  const capList = capabilities.map((c) => `- ${c.id}: ${c.label} — ${c.summary}${c.discriminator ? `\n    scope: ${c.discriminator.replace(/\s+/g, " ").trim()}` : ""}`).join("\n");
  const techList = techniques.map((t) => `- ${t.id}: ${t.label}`).join("\n");
  const claimList = claims.map((c) => `- ${c.id} [${c.capability}] ${c.statement.replace(/\s+/g, " ").trim()}`).join("\n");
  return `## Capabilities in the catalogue
${capList}

## Techniques in the catalogue
${techList}

## Claims already held
${claimList}

## Paper
Title: ${cand.title}
${cand.arxiv_id ? `arXiv: ${cand.arxiv_id}\n` : ""}${(cand.verdicts ?? []).map((v) => `Stage-2 triage: ${v.capability} / ${v.direction} — ${v.rationale}`).join("\n")}

Source text (all you have; do not use anything you may recall about this paper):
${text}

Draft one claim from this paper.`;
}

// ---------------------------------------------------------------------------

const catalog = loadCatalog();
const capabilities = catalog.capabilities.map((c) => c.data).filter((c) => c.status === "active");
const techniques = catalog.techniques.map((t) => t.data);
const claims = catalog.claims.map((c) => c.data);
const capIds = new Set(capabilities.map((c) => c.id));
const claimIds = new Set(claims.map((c) => c.id));

const files = fs.existsSync(QUEUE_DIR) ? fs.readdirSync(QUEUE_DIR).filter((f) => /\.ya?ml$/.test(f)) : [];
const work = [];
for (const f of files) {
  const parsed = YAML.parse(fs.readFileSync(path.join(QUEUE_DIR, f), "utf8"));
  for (const c of parsed?.candidates ?? []) {
    if (onlyId) { if (c.arxiv_id === onlyId) work.push(c); continue; }
    if ((c.verdicts ?? []).some((v) => v.about_capability)) work.push(c);
  }
}
if (!work.length) { console.log(onlyId ? `No queue candidate with arxiv_id ${onlyId}` : "No triaged candidates."); process.exit(0); }

const batch = work.slice(0, limit);
console.log(`Drafting ${batch.length} of ${work.length} candidate(s) with ${MODEL}\n`);
fs.mkdirSync(OUT_DIR, { recursive: true });

const client = new Anthropic();
let inTokens = 0, outTokens = 0, errors = 0;

for (const cand of batch) {
  const id = cand.arxiv_id;
  process.stdout.write(`${id} :: ${String(cand.title).slice(0, 58)}\n`);
  try {
    let text = await fetchFullText(id).catch(() => null);
    let kind = "full-text";
    if (!text) { text = (await fetchAbstracts([id])).get(id); kind = "abstract"; }
    if (!text) { console.log("  no text available, skipped"); errors++; continue; }

    if (dryRun) {
      console.log(SYSTEM + "\n--- user ---\n" + buildPrompt(cand, capabilities, techniques, claims, text).slice(0, 4000));
      process.exit(0);
    }

    const res = await client.messages.parse({
      model: MODEL,
      max_tokens: 3000,
      output_config: { effort: "low", format: zodOutputFormat(Draft) },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildPrompt(cand, capabilities, techniques, claims, text) }],
    });
    inTokens += res.usage?.input_tokens ?? 0;
    outTokens += res.usage?.output_tokens ?? 0;
    const d = res.parsed_output;
    if (!d) { console.log("  parse failed"); errors++; continue; }

    // Checks the model cannot mark its own homework on.
    const problems = [];
    if (!capIds.has(d.capability)) problems.push(`capability "${d.capability}" is not in the catalogue`);
    if (d.related_claim_id && !claimIds.has(d.related_claim_id)) problems.push(`related_claim_id "${d.related_claim_id}" does not exist`);
    if (d.stance_on_existing !== "neither" && !d.related_claim_id) problems.push(`stance is ${d.stance_on_existing} but no claim named`);
    if (!d.falsifier?.trim()) problems.push("no falsifier");
    const ungrounded = unverified(`${d.statement} ${d.evidence_note}`, text);
    if (ungrounded.length) problems.push(`figures not in the source: ${ungrounded.join(", ")}`);

    const out = {
      arxiv_id: id, title: cand.title, url: cand.url ?? `https://arxiv.org/abs/${id}`,
      drafted_at: new Date().toISOString().slice(0, 10), drafted_from: kind, model: MODEL,
      status: "draft — not filed. Review, edit, then move into catalog/ by hand.",
      ...d,
      problems: problems.length ? problems : undefined,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${id}.yaml`), YAML.stringify(out, { lineWidth: 78 }));
    console.log(`  drafted from ${kind} -> ${OUT_DIR}/${id}.yaml` + (problems.length ? `  [${problems.length} problem(s)]` : ""));
  } catch (err) {
    errors++;
    console.error(`  error: ${err?.message ?? err}`);
  }
}

const cost = (inTokens / 1e6) * PRICE_IN + (outTokens / 1e6) * PRICE_OUT;
console.log(`\ntokens: ${inTokens} in / ${outTokens} out   cost: $${cost.toFixed(4)}`);
if (errors) console.log(`errors: ${errors}`);
console.log(`\nDrafts are NOT catalog content. Read ${OUT_DIR}/, edit, then file by hand.`);
