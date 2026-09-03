// Verifies every paper with an arxiv_id against the arXiv API: the title in
// the catalog must match arXiv's (normalized). Guards against invented
// citations. Run: npm run verify-papers   (needs network)
import { loadCatalog } from "./catalog-lib.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Primary source. Returns Map<arxivId, title> or null if arXiv rate-limits.
async function fetchArxiv(ids) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`https://export.arxiv.org/api/query?id_list=${ids}&max_results=${CHUNK}`, { headers: { "User-Agent": UA } });
    if (res.status === 429) { console.error(`arXiv HTTP 429 (attempt ${attempt})`); await sleep(5000 * attempt); continue; }
    if (!res.ok) { console.error(`arXiv HTTP ${res.status}`); return null; }
    const xml = await res.text();
    const byId = new Map();
    for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const e = m[1];
      const id = (e.match(/<id>https?:\/\/arxiv\.org\/abs\/([^<]+)<\/id>/) ?? [])[1]?.replace(/v\d+$/, "");
      const title = (e.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? "";
      if (id) byId.set(id, title.replace(/\s+/g, " ").trim());
    }
    return byId;
  }
  console.error("arXiv rate-limited; falling back to Semantic Scholar for this batch");
  return null;
}

// Fallback source: Semantic Scholar batch endpoint, which carries arXiv titles.
async function fetchSemanticScholar(batch) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.semanticscholar.org/graph/v1/paper/batch?fields=title,externalIds", {
      method: "POST", headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ ids: batch.map((p) => `ArXiv:${p.data.arxiv_id.replace(/v\d+$/, "")}`) }),
    });
    if (res.ok) {
      const byId = new Map();
      for (const r of await res.json()) if (r?.externalIds?.ArXiv) byId.set(r.externalIds.ArXiv, r.title);
      return byId;
    }
    console.error(`Semantic Scholar HTTP ${res.status} (attempt ${attempt})`);
    await sleep(10000 * attempt);
  }
  return null;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, ""); // ignore punctuation, hyphens, spacing
const papers = loadCatalog().papers.filter((p) => p.data.arxiv_id);
const CHUNK = 5; // arXiv rate-limits aggressively; keep batches small
const UA = "modelselfhelp-verify/0.1 (+https://github.com/Russ-Miller/modelselfhelp)";
let failures = 0;
let unverified = 0;
for (let i = 0; i < papers.length; i += CHUNK) {
  const batch = papers.slice(i, i + CHUNK);
  const ids = batch.map((p) => p.data.arxiv_id.replace(/v\d+$/, "")).join(",");
  const byId = (await fetchArxiv(ids)) ?? (await fetchSemanticScholar(batch));
  if (!byId) { unverified += batch.length; console.error(`UNVERIFIED (both sources unavailable): ${batch.map((p) => p.file).join(", ")}`); continue; }
  for (const p of batch) {
    const want = p.data.arxiv_id.replace(/v\d+$/, "");
    const got = byId.get(want);
    if (!got) { failures++; console.error(`MISSING  ${p.file}: arXiv returned no entry for ${want}`); continue; }
    if (norm(got) !== norm(p.data.title)) { failures++; console.error(`MISMATCH ${p.file}\n  catalog: ${p.data.title}\n  arxiv:   ${got}`); }
  }
  if (i + CHUNK < papers.length) await sleep(6000); // arXiv asks for 3s between requests; be generous
}
if (failures) { console.error(`${failures} of ${papers.length} papers failed verification.`); process.exit(1); }
if (unverified) { console.error(`${unverified} of ${papers.length} papers could not be checked (sources unavailable); rerun later.`); process.exit(2); }
console.log(`All ${papers.length} arXiv papers verified against arXiv titles.`);
