// Fetches citation recency data from Semantic Scholar for every paper-kind
// source and writes citations_total / citations_recent_12mo /
// citations_checked_at back into the source file. Needs network access.
// Run: node scripts/fetch-citations.mjs
import fs from "node:fs";
import { loadCatalog } from "./catalog-lib.mjs";

const UA = "modelselfhelp-citations/0.1 (+https://github.com/Russ-Miller/modelselfhelp)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TODAY = new Date();
const oneYearAgo = new Date(TODAY);
oneYearAgo.setDate(oneYearAgo.getDate() - 365);
const todayStr = TODAY.toISOString().slice(0, 10);

async function fetchJson(url, attempts = 6) {
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    if (res.status === 429) { console.error(`  429, retrying in ${8 * i}s`); await sleep(8000 * i); continue; }
    console.error(`  HTTP ${res.status} for ${url}`);
    return null;
  }
  console.error(`  gave up after ${attempts} attempts: ${url}`);
  return null;
}

const sources = loadCatalog().sources.filter((s) => s.data.kind === "paper" && s.data.arxiv_id);
console.log(`Checking ${sources.length} paper sources...`);

let updated = 0;
for (const rec of sources) {
  const id = rec.data.arxiv_id.replace(/v\d+$/, "");
  console.log(`${rec.data.id} (arXiv:${id})`);

  const total = await fetchJson(`https://api.semanticscholar.org/graph/v1/paper/ArXiv:${id}?fields=citationCount,paperId`);
  await sleep(4000);
  const recent = await fetchJson(`https://api.semanticscholar.org/graph/v1/paper/ArXiv:${id}/citations?fields=publicationDate&limit=1000`);
  await sleep(4000);

  if (total == null || recent == null) { console.error(`  skipped (fetch failed)`); continue; }

  const citationsTotal = total.citationCount ?? (recent.data ?? []).length;
  const recentCount = (recent.data ?? []).filter((c) => {
    const d = c.citingPaper?.publicationDate;
    return d && new Date(d) >= oneYearAgo;
  }).length;

  const path = `catalog/sources/${rec.data.id}.yaml`;
  let text = fs.readFileSync(path, "utf8").replace(/\n?citations_total:.*\ncitations_recent_12mo:.*\ncitations_checked_at:.*\n(semantic_scholar_id:.*\n)?/, "\n");
  const s2Line = total.paperId ? `\nsemantic_scholar_id: ${total.paperId}` : "";
  text = text.trimEnd() + `\ncitations_total: ${citationsTotal}\ncitations_recent_12mo: ${recentCount}\ncitations_checked_at: ${todayStr}${s2Line}\n`;
  fs.writeFileSync(path, text);
  console.log(`  total=${citationsTotal} recent12mo=${recentCount}`);
  updated++;
}
console.log(`\nUpdated ${updated} of ${sources.length} sources.`);
