// Stage 1 of nightly ingestion: pull candidate papers from OpenAlex into a
// review queue. Free, no API key, no LLM cost. Deliberately does NOT write
// into catalog/ -- candidates are reviewed by a human before promotion.
//
//   node scripts/fetch-openalex.mjs                 # yesterday
//   node scripts/fetch-openalex.mjs --days 7        # last 7 days
//   node scripts/fetch-openalex.mjs --from 2026-09-01 --to 2026-09-04
//
// Writes pipeline/queue/<from>_<to>.yaml and records surfaced OpenAlex ids
// in pipeline/seen.json so re-runs never re-surface the same work.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { loadCatalog } from "./catalog-lib.mjs";

const MAILTO = process.env.OPENALEX_MAILTO || "miller.russ@gmail.com";
const UA = `modelselfhelp/0.1 (mailto:${MAILTO})`;
const QUEUE_DIR = "pipeline/queue";
// OpenAlex source id for arXiv. Capability research lives here first, and
// filtering to it lifts precision far more than any keyword heuristic does:
// unfiltered recent windows are dominated by journal domain-application work
// plus Zenodo/bioRxiv/Preprints.org noise.
const ARXIV_SOURCE_ID = "S4306400194";
const SEEN_PATH = "pipeline/seen.json";

// Capability-focused query terms. Each runs as its own title+abstract search;
// results are merged and deduped. Tuned for "says something about a model
// capability", not "applies a model to a domain" -- stage 2 does that call.
const QUERIES = [
  "large language model evaluation",
  "large language model benchmark",
  "large language model reasoning",
  "large language model capability",
  "large language model limitation",
  "large language model failure",
  "language model hallucination",
  "language model agent evaluation",
];


// ---------------------------------------------------------------------------
// Free heuristic relevance scoring. No model calls -- keyword and topic
// signals only. The job is to RANK, never to discard: a medical hallucination
// benchmark is genuinely relevant, so domain terms only push an item down the
// queue rather than out of it.
// ---------------------------------------------------------------------------

// Language that suggests a claim about a model capability itself.
const CAPABILITY_SIGNALS = [
  [/\bbenchmark(s|ing)?\b/i, 3, "benchmark"],
  [/\b(evaluat\w+|assessment)\b/i, 1, "evaluation"],
  [/\bcapabilit(y|ies)\b/i, 3, "capability"],
  [/\b(limitation|shortcoming|weakness)\w*\b/i, 3, "limitation"],
  [/\b(fail(s|ure|ing)?|breaks? down|struggle\w*|cannot)\b/i, 3, "failure"],
  [/\bhallucinat\w+/i, 3, "hallucination"],
  [/\breasoning\b/i, 2, "reasoning"],
  [/\b(contaminat\w+|memoriz\w+|leakage)\b/i, 3, "contamination"],
  [/\b(robustness|generaliz\w+|out-of-distribution)\b/i, 2, "robustness"],
  [/\b(ablation|probing|interpretab\w+|mechanistic)\b/i, 3, "analysis"],
  [/\b(we (find|show|demonstrate)|our (results|analysis) (show|reveal))/i, 2, "finding"],
  [/\b(chain[- ]of[- ]thought|in[- ]context learning|prompt\w* (strategy|technique))\b/i, 2, "technique"],
  [/\b(agent(ic)?|tool[- ]use|tool[- ]calling|long[- ]context)\b/i, 2, "agentic"],
  [/\b(GPT-4|Claude|Llama|Gemini|Mistral|Qwen|frontier model)\b/i, 1, "named-model"],
];

// Markers of "we applied an LLM inside domain X" rather than capability work.
const DOMAIN_SIGNALS = [
  [/\b(patient|clinical|hospital|medical|nurs\w+|diagnos\w+|health\w*)\b/i, -3, "clinical"],
  [/\b(student|classroom|teach\w+|curricul\w+|instructor|pedagog\w+)\b/i, -3, "education"],
  [/\b(marketing|advertis\w+|hospitality|tourism|e-commerce|customer engagement)\b/i, -4, "marketing"],
  [/\b(agricultur\w+|farming|crop|precision agriculture)\b/i, -4, "agriculture"],
  [/\b(legal|court|litigation|contract review)\b/i, -2, "legal"],
  [/\b(air traffic|aviation|manufactur\w+|supply chain|construction)\b/i, -3, "industry"],
  [/\b(recommend\w+ system|recommendation)\b/i, -2, "recsys"],
  [/\b(sentiment analysis|topic model\w*)\b/i, -2, "classic-nlp-task"],
  [/\bcase study\b/i, -2, "case-study"],
];

const DOMAIN_TOPICS = /health|medic|clinic|educat|translat|marketing|agricultur|tourism|nurs|dental|legal|finance|energy|construction/i;

function scoreCandidate(c) {
  const haystack = `${c.title} ${c.abstract ?? ""}`;
  let score = 0;
  const signals = [];
  for (const [re, weight, label] of CAPABILITY_SIGNALS) {
    if (re.test(haystack)) { score += weight; signals.push(`+${label}`); }
  }
  for (const [re, weight, label] of DOMAIN_SIGNALS) {
    if (re.test(haystack)) { score += weight; signals.push(`-${label}`); }
  }
  if (c.topic && DOMAIN_TOPICS.test(c.topic)) { score -= 4; signals.push("-domain-topic"); }
  // Capability research overwhelmingly preprints on arXiv before anywhere else.
  if (c.arxiv_id) { score += 3; signals.push("+arxiv"); }
  if (!c.abstract) { score -= 1; signals.push("-no-abstract"); }
  return { score, signals };
}

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const iso = (d) => d.toISOString().slice(0, 10);

const allSources = args.includes("--all-sources");
let from = arg("from");
let to = arg("to");
if (!from) {
  // Trailing window, not just yesterday: OpenAlex ingests arXiv with a lag of
  // several days, so a 1-day window structurally misses it. A trailing window
  // plus the seen-ledger is self-healing -- papers get picked up whenever they
  // are finally indexed, and are never surfaced twice.
  const days = Number(arg("days") ?? 7);
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  from = iso(start);
  to = to ?? iso(end);
}
to = to ?? iso(new Date());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) { await sleep(2000 * i); continue; }
    console.error(`  HTTP ${res.status} ${url}`);
    return null;
  }
  return null;
}

/** OpenAlex ships abstracts as a word -> positions map; rebuild the text. */
function abstractText(inv) {
  if (!inv) return undefined;
  const words = [];
  for (const [word, positions] of Object.entries(inv)) for (const p of positions) words[p] = word;
  const text = words.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return text || undefined;
}

function arxivIdOf(work) {
  const doi = (work.ids?.doi ?? "").toLowerCase();
  const m = doi.match(/10\.48550\/arxiv\.(\d{4}\.\d{4,5})/);
  if (m) return m[1];
  for (const loc of work.locations ?? []) {
    const u = loc?.landing_page_url ?? "";
    const lm = u.match(/arxiv\.org\/abs\/(\d{4}\.\d{4,5})/);
    if (lm) return lm[1];
  }
  return undefined;
}

const normTitle = (t) => (t ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Never re-surface something already in the catalog or already queued.
const catalog = loadCatalog();
const haveArxiv = new Set(catalog.sources.map((s) => s.data.arxiv_id).filter(Boolean));
const haveTitles = new Set(catalog.sources.map((s) => normTitle(s.data.title)));
const seen = fs.existsSync(SEEN_PATH) ? JSON.parse(fs.readFileSync(SEEN_PATH, "utf8")) : { openalex_ids: [] };
const seenIds = new Set(seen.openalex_ids);

console.log(`Window ${from} .. ${to} — ${QUERIES.length} queries — ${allSources ? "ALL sources" : "arXiv only"}`);
const found = new Map();   // openalex id -> work

for (const query of QUERIES) {
  let cursor = "*";
  let pages = 0;
  let queryCount = 0;
  while (cursor && pages < 10) {
    const params = new URLSearchParams({
      filter: [
        `from_publication_date:${from}`,
        `to_publication_date:${to}`,
        `title_and_abstract.search:${query}`,
        ...(allSources ? [] : [`primary_location.source.id:${ARXIV_SOURCE_ID}`]),
      ].join(","),
      "per-page": "200",
      cursor,
      select: "id,doi,title,publication_date,authorships,primary_location,primary_topic,cited_by_count,abstract_inverted_index,locations,ids,type",
    });
    const data = await getJson(`https://api.openalex.org/works?${params}`);
    if (!data) break;
    for (const w of data.results ?? []) { found.set(w.id, w); queryCount++; }
    cursor = data.meta?.next_cursor;
    pages++;
    if (!data.results?.length) break;
    await sleep(200);
  }
  console.log(`  ${String(queryCount).padStart(4)} raw  ${query}`);
}

// Dedupe and filter
const candidates = [];
const titlesThisRun = new Set();
let skippedSeen = 0, skippedHave = 0, skippedDupe = 0;

for (const w of found.values()) {
  const title = w.title ?? "";
  const nt = normTitle(title);
  const ax = arxivIdOf(w);
  if (seenIds.has(w.id)) { skippedSeen++; continue; }
  if ((ax && haveArxiv.has(ax)) || haveTitles.has(nt)) { skippedHave++; continue; }
  if (titlesThisRun.has(nt)) { skippedDupe++; continue; }   // OpenAlex has duplicate records
  titlesThisRun.add(nt);
  candidates.push({
    openalex_id: w.id,
    title,
    date: w.publication_date,
    arxiv_id: ax,
    doi: w.ids?.doi,
    authors: (w.authorships ?? []).slice(0, 6).map((a) => a.author?.display_name).filter(Boolean),
    venue: w.primary_location?.source?.display_name,
    topic: w.primary_topic?.display_name,
    cited_by_count: w.cited_by_count ?? 0,
    abstract: abstractText(w.abstract_inverted_index),
  });
}

for (const c of candidates) {
  const { score, signals } = scoreCandidate(c);
  c.score = score;
  c.signals = signals;
}

const yamlStr = (s) => JSON.stringify(s ?? "");
fs.mkdirSync(QUEUE_DIR, { recursive: true });
const outPath = path.join(QUEUE_DIR, `${from}_${to}.yaml`);

// Re-running a window merges with what is already queued rather than
// replacing it: OpenAlex is a live index, so a later run legitimately turns
// up stragglers. Parsing the prior file back (instead of blind appending)
// keeps the whole queue sorted by score, not just each run's slice.
let merged = candidates;
if (fs.existsSync(outPath)) {
  const prior = YAML.parse(fs.readFileSync(outPath, "utf8"))?.candidates ?? [];
  const byId = new Map(prior.map((c) => [c.openalex_id, c]));
  for (const c of candidates) byId.set(c.openalex_id, c);
  merged = [...byId.values()];
}
merged.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.title ?? "").localeCompare(b.title ?? ""));

const lines = [
  `# OpenAlex candidates, ${from} .. ${to}`,
  `# Stage 1 output: NOT reviewed, NOT in the catalog. Triage before promoting.`,
  `# ${merged.length} candidates (${candidates.length} added by the latest run).`,
  `# Ranked by a free keyword/topic heuristic -- highest score first. The score`,
  `# only orders the queue; nothing is discarded, since a domain-flavored paper`,
  `# can still be real capability research.`,
  `window: { from: ${from}, to: ${to} }`,
  `generated_at: ${iso(new Date())}`,
  `candidates:`,
];
for (const c of merged) {
  lines.push(`  - openalex_id: ${c.openalex_id}`);
  lines.push(`    score: ${c.score ?? 0}`);
  if (c.signals?.length) lines.push(`    signals: [${c.signals.join(", ")}]`);
  lines.push(`    title: ${yamlStr(c.title)}`);
  lines.push(`    date: ${c.date}`);
  if (c.arxiv_id) lines.push(`    arxiv_id: "${c.arxiv_id}"`);
  if (c.doi) lines.push(`    doi: ${c.doi}`);
  if (c.authors?.length) lines.push(`    authors: [${c.authors.map(yamlStr).join(", ")}]`);
  if (c.venue) lines.push(`    venue: ${yamlStr(c.venue)}`);
  if (c.topic) lines.push(`    topic: ${yamlStr(c.topic)}`);
  lines.push(`    cited_by_count: ${c.cited_by_count ?? 0}`);
  if (c.abstract) lines.push(`    abstract: ${yamlStr(String(c.abstract).slice(0, 1500))}`);
}
fs.writeFileSync(outPath, lines.join("\n") + "\n");

for (const c of candidates) seenIds.add(c.openalex_id);
fs.writeFileSync(SEEN_PATH, JSON.stringify({ openalex_ids: [...seenIds] }, null, 2) + "\n");

console.log(`\n${found.size} unique works fetched`);
console.log(`  -${skippedSeen} already surfaced in a previous run`);
console.log(`  -${skippedHave} already in the catalog`);
console.log(`  -${skippedDupe} duplicate records within this run`);
console.log(`= ${candidates.length} new candidates -> ${outPath} (${merged.length} total in file)`);
const top = merged.slice(0, 10);
if (top.length) {
  console.log(`\nTop ${top.length} by heuristic score:`);
  for (const c of top) console.log(`  ${String(c.score).padStart(3)}  ${String(c.title).slice(0, 88)}`);
}
