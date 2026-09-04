// Reads the stage-1 ingestion queue (pipeline/queue/*.yaml) for the review
// page. Separate from the catalog loader on purpose: these are unreviewed
// candidates, not content, and must never be confused with catalog sources.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export interface QueueCandidate {
  openalex_id: string;
  score?: number;
  signals?: string[];
  title: string;
  date?: string;
  arxiv_id?: string;
  doi?: string;
  authors?: string[];
  venue?: string;
  topic?: string;
  cited_by_count?: number;
  abstract?: string;
  /** Catalogued capabilities this paper is ABOUT. Topical only -- says nothing
   *  about whether the paper improves, degrades, or merely measures them. */
  capabilities?: string[];
  /** Which queue file this came from, e.g. "2026-08-25_2026-09-01". */
  window: string;
}

const QUEUE_DIR = path.join(process.cwd(), "pipeline", "queue");

export function loadQueue(): { candidates: QueueCandidate[]; windows: string[]; generatedAt?: string } {
  if (!fs.existsSync(QUEUE_DIR)) return { candidates: [], windows: [] };
  const files = fs.readdirSync(QUEUE_DIR).filter((f) => /\.ya?ml$/.test(f)).sort();
  const candidates: QueueCandidate[] = [];
  const windows: string[] = [];
  let generatedAt: string | undefined;
  for (const f of files) {
    const parsed = YAML.parse(fs.readFileSync(path.join(QUEUE_DIR, f), "utf8"));
    const window = f.replace(/\.ya?ml$/, "");
    windows.push(window);
    if (parsed?.generated_at) generatedAt = String(parsed.generated_at);
    for (const c of parsed?.candidates ?? []) candidates.push({ ...c, window });
  }
  candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (a.title ?? "").localeCompare(b.title ?? ""));
  return { candidates, windows, generatedAt };
}

/**
 * Group candidates by the capability they concern, largest group first, with
 * unmatched candidates last -- those are the ones suggesting a capability the
 * catalog does not track yet.
 */
export function groupByCapability(candidates: QueueCandidate[]) {
  const groups = new Map<string, QueueCandidate[]>();
  const unmatched: QueueCandidate[] = [];
  for (const c of candidates) {
    if (!c.capabilities?.length) { unmatched.push(c); continue; }
    for (const cap of c.capabilities) {
      if (!groups.has(cap)) groups.set(cap, []);
      groups.get(cap)!.push(c);
    }
  }
  const ordered = [...groups.entries()]
    .map(([id, items]) => ({ id, items: items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) }))
    .sort((a, b) => b.items.length - a.items.length);
  return { groups: ordered, unmatched: unmatched.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) };
}

/** External link for a candidate: arXiv abstract page when we have an id, else the DOI. */
export function candidateUrl(c: QueueCandidate): string | undefined {
  if (c.arxiv_id) return `https://arxiv.org/abs/${c.arxiv_id}`;
  return c.doi ?? undefined;
}
