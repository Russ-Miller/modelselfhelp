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
import { loadCatalog } from "./catalog-lib.mjs";

const MAILTO = process.env.OPENALEX_MAILTO || "miller.russ@gmail.com";
const UA = `modelselfhelp/0.1 (mailto:${MAILTO})`;
const QUEUE_DIR = "pipeline/queue";
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

const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const iso = (d) => d.toISOString().slice(0, 10);

let from = arg("from");
let to = arg("to");
if (!from) {
  const days = Number(arg("days") ?? 1);
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

console.log(`Window ${from} .. ${to} — ${QUERIES.length} queries`);
const found = new Map();   // openalex id -> work

for (const query of QUERIES) {
  let cursor = "*";
  let pages = 0;
  let queryCount = 0;
  while (cursor && pages < 10) {
    const params = new URLSearchParams({
      filter: `from_publication_date:${from},to_publication_date:${to},title_and_abstract.search:${query}`,
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

candidates.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || a.title.localeCompare(b.title));

const yamlStr = (s) => JSON.stringify(s ?? "");
fs.mkdirSync(QUEUE_DIR, { recursive: true });
const outPath = path.join(QUEUE_DIR, `${from}_${to}.yaml`);

// Re-running a window appends newly-surfaced candidates rather than replacing
// the file: OpenAlex is a live index, so a later run legitimately turns up
// stragglers, and clobbering would discard everything already queued.
const existing = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
const priorBody = existing ? existing.split("\ncandidates:\n")[1] ?? "" : "";
const priorCount = (priorBody.match(/^  - openalex_id:/gm) ?? []).length;

const lines = [
  `# OpenAlex candidates, ${from} .. ${to}`,
  `# Stage 1 output: NOT reviewed, NOT in the catalog. Triage before promoting.`,
  `# ${priorCount + candidates.length} candidates total (${candidates.length} added by the latest run).`,
  `window: { from: ${from}, to: ${to} }`,
  `generated_at: ${iso(new Date())}`,
  `candidates:`,
];
for (const c of candidates) {
  lines.push(`  - openalex_id: ${c.openalex_id}`);
  lines.push(`    title: ${yamlStr(c.title)}`);
  lines.push(`    date: ${c.date}`);
  if (c.arxiv_id) lines.push(`    arxiv_id: "${c.arxiv_id}"`);
  if (c.doi) lines.push(`    doi: ${c.doi}`);
  if (c.authors.length) lines.push(`    authors: [${c.authors.map(yamlStr).join(", ")}]`);
  if (c.venue) lines.push(`    venue: ${yamlStr(c.venue)}`);
  if (c.topic) lines.push(`    topic: ${yamlStr(c.topic)}`);
  lines.push(`    cited_by_count: ${c.cited_by_count}`);
  if (c.abstract) lines.push(`    abstract: ${yamlStr(c.abstract.slice(0, 1500))}`);
}

const body = (priorBody.trimEnd() ? priorBody.trimEnd() + "\n" : "") + lines.slice(6).join("\n");
fs.writeFileSync(outPath, lines.slice(0, 6).join("\n") + "\n" + body + "\n");

for (const c of candidates) seenIds.add(c.openalex_id);
fs.writeFileSync(SEEN_PATH, JSON.stringify({ openalex_ids: [...seenIds] }, null, 2) + "\n");

console.log(`\n${found.size} unique works fetched`);
console.log(`  -${skippedSeen} already surfaced in a previous run`);
console.log(`  -${skippedHave} already in the catalog`);
console.log(`  -${skippedDupe} duplicate records within this run`);
console.log(`= ${candidates.length} new candidates -> ${outPath} (${priorCount + candidates.length} total in file)`);
