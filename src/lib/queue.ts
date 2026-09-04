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

/** External link for a candidate: arXiv abstract page when we have an id, else the DOI. */
export function candidateUrl(c: QueueCandidate): string | undefined {
  if (c.arxiv_id) return `https://arxiv.org/abs/${c.arxiv_id}`;
  return c.doi ?? undefined;
}
