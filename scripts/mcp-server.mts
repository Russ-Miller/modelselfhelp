// RSI Ratchet as an MCP server, over stdio, for use from Claude Code or any
// MCP client on this machine. Reads the catalog and the committed embeddings
// straight from the repo, so it answers about whatever is checked out.
//
// Register once:
//   claude mcp add rsiratchet -- npx --prefix <repo> tsx <repo>/scripts/mcp-server.mts
// Then ask: "does rsiratchet have a technique for a quorum of several models?"
//
// Meaning search runs the same local model as the site; the first query in a
// process loads it (a few seconds), later ones are fast. No API, no key.
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Type-only, so it is erased and does not load the catalog before chdir.
import type { Adage, Capability, Claim, Source, Technique } from "../src/lib/catalog";

// src/lib reads the catalog relative to cwd; make that the repo root wherever
// the client launched us from, before those modules load.
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
process.chdir(ROOT);

const cat = await import("../src/lib/catalog");
const emb = await import("../src/lib/embeddings");
const { buildSearchIndex } = await import("../src/lib/search-index");

const SITE = "https://rsiratchet.com";
const KIND = { c: "capability", m: "claim", t: "technique", s: "source", a: "adage" } as const;
const PATH = { c: "capabilities", m: "claims", t: "techniques", s: "sources", a: "adages" } as const;
type K = keyof typeof KIND;
const url = (k: K, id: string) => `${SITE}/${PATH[k]}/${id}`;

// ---- meaning search, same model and pooling as scripts/embed.mjs
let extractor: Promise<(t: string, o: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array }>> | null = null;
async function embedQuery(q: string): Promise<Float32Array> {
  if (!extractor) {
    extractor = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.cacheDir = path.join(ROOT, ".cache", "transformers");
      return (await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" })) as never;
    })();
  }
  const out = await (await extractor)(q, { pooling: "mean", normalize: true });
  return out.data instanceof Float32Array ? out.data : new Float32Array(out.data);
}

function keywordScore(text: string, title: string, terms: string[]): number {
  let s = 0;
  for (const t of terms) {
    if (!text.includes(t)) return 0;
    if (title.toLowerCase().includes(t)) s += 10;
    s += 1;
  }
  return s;
}

const index = buildSearchIndex();
const vectors = index.map((r) => (r.v ? emb.unpack({ s: Number(r.v.split("|")[0]), q: r.v.split("|")[1] }) : undefined));

async function search(query: string, kinds: K[] | undefined, limit: number) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const pool = index.map((r, i) => ({ r, i })).filter(({ r }) => !kinds || kinds.includes(r.k as K));
  const kw = pool
    .map(({ r, i }) => ({ r, i, s: keywordScore(r.text, r.title, terms), via: "keyword" as const }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const seen = new Set(kw.map((x) => x.i));
  let extra: { r: typeof index[number]; i: number; s: number; via: "meaning" }[] = [];
  try {
    const qv = await embedQuery(query);
    const scored = pool.map(({ r, i }) => ({ r, i, s: vectors[i] ? emb.cosine(qv, vectors[i]!) : -1, via: "meaning" as const }));
    const top = Math.max(-1, ...scored.map((x) => x.s));
    const cut = Math.max(0.3, top * 0.8);
    extra = scored.filter((x) => x.s >= cut && !seen.has(x.i)).sort((a, b) => b.s - a.s);
  } catch (e) {
    process.stderr.write(`meaning search unavailable: ${(e as Error).message}\n`);
  }
  return [...kw, ...extra].slice(0, limit).map(({ r, via, s }) => ({
    kind: KIND[r.k as K], id: r.id, title: r.title, context: r.sub, via,
    ...(via === "meaning" ? { similarity: Number(s.toFixed(2)) } : {}),
    reviewed: r.k === "m" ? (r.pending ? "AI" : "AI and a person") : undefined,
    url: url(r.k as K, r.id),
  }));
}

// ---- full records, with the derived fields the site shows
function claimView(c: Claim) {
  return {
    id: c.id, statement: c.statement, kind: c.kind, backing_strength: c.backing_strength,
    capability: c.capability, technique: c.technique, contested: c.contested,
    disagreement_axis: c.disagreement_axis, reviewed_by: cat.reviewLabel(c),
    sources: c.sources.map((l: Claim["sources"][number]) => { const s = cat.getSource(l.source); return { id: l.source, title: s?.title, url: s?.url, stance: l.stance, note: l.note }; }),
    adages: cat.adagesForClaim(c.id).map((x) => ({ id: x.adage.id, label: x.adage.label, verdict: x.verdict })),
    notes: c.notes, last_checked_at: c.last_checked_at, url: url("m", c.id),
  };
}
function techniqueView(t: Technique) {
  const st = cat.techniqueStanding(t.id);
  return {
    id: t.id, label: t.label, summary: t.summary, description: t.description, kind: t.kind,
    addresses: t.addresses.map((a) => ({ id: a, label: cat.getCapability(a)?.label })),
    requires: t.requires, repos: t.repos,
    standing: { value: st.standing, label: cat.STANDING_LABEL[st.standing], supporting_sources: st.supporting, contesting_sources: st.contesting, last_moved: st.lastMoved },
    evidence: st.claims.map((c) => ({ id: c.id, statement: c.statement, contested: c.contested, url: url("m", c.id) })),
    evidence_search: t.evidence_search, url: url("t", t.id),
  };
}
function capabilityView(c: Capability) {
  const claims = cat.getClaims().filter((m) => m.capability === c.id);
  return {
    id: c.id, label: c.label, summary: c.summary, description: c.description, status: c.status, tags: c.tags,
    techniques: (c.techniques ?? []).map((t) => ({ id: t, label: cat.getTechnique(t)?.label, standing: cat.STANDING_LABEL[cat.techniqueStanding(t).standing] })),
    claims: claims.map((m) => ({ id: m.id, statement: m.statement, contested: m.contested, reviewed_by: cat.reviewLabel(m), url: url("m", m.id) })),
    url: url("c", c.id),
  };
}
function adageView(a: Adage) {
  return {
    id: a.id, label: a.label, aliases: a.aliases, statement: a.statement, origin: a.origin, transfer: a.transfer,
    standing: cat.ADAGE_STANDING_LABEL[cat.adageStanding(a)],
    evidence: (a.evidence ?? []).map((e) => { const c = cat.getClaim(e.claim); return { claim: e.claim, verdict: e.verdict, note: e.note, statement: c?.statement, reviewed_by: c ? cat.reviewLabel(c) : undefined, url: url("m", e.claim) }; }),
    evidence_search: a.evidence_search, notes: a.notes, url: url("a", a.id),
  };
}
function sourceView(s: Source) {
  const claims = cat.getClaims().filter((m) => m.sources.some((l) => l.source === s.id));
  return {
    id: s.id, title: s.title, kind: s.kind, authors: s.authors, year: s.year, url: s.url, arxiv_id: s.arxiv_id,
    summary: s.summary, brief: s.brief,
    claims: claims.map((m) => ({ id: m.id, statement: m.statement, stance: m.sources.find((l) => l.source === s.id)?.stance, url: url("m", m.id) })),
    catalog_url: url("s", s.id),
  };
}

const text = (v: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(v, null, 2) }] });

const server = new McpServer({ name: "rsiratchet", version: "0.1.0" });

server.registerTool("search", {
  title: "Search the RSI Ratchet catalog",
  description: "Find capabilities, claims, techniques, sources and adages by words or by meaning. Keyword hits come first; entries that matched only on meaning are marked via=meaning with a similarity. Use this first when asked whether the catalog covers something.",
  inputSchema: { query: z.string(), kinds: z.array(z.enum(["capability", "claim", "technique", "source", "adage"])).optional(), limit: z.number().int().min(1).max(50).default(15) },
}, async ({ query, kinds, limit }) => {
  const ks = kinds?.map((k) => (Object.entries(KIND).find(([, v]) => v === k)![0]) as K);
  return text(await search(query, ks, limit));
});

server.registerTool("get", {
  title: "Get one catalog entry in full",
  description: "Full record with derived fields: a technique with its standing and evidence, a claim with its sources and review status, a capability with its claims and techniques, an adage with its verdicts, a source with the claims drawn from it.",
  inputSchema: { kind: z.enum(["capability", "claim", "technique", "source", "adage"]), id: z.string() },
}, async ({ kind, id }) => {
  const rec =
    kind === "claim" ? (cat.getClaim(id) && claimView(cat.getClaim(id)!)) :
    kind === "technique" ? (cat.getTechnique(id) && techniqueView(cat.getTechnique(id)!)) :
    kind === "capability" ? (cat.getCapability(id) && capabilityView(cat.getCapability(id)!)) :
    kind === "adage" ? (cat.getAdage(id) && adageView(cat.getAdage(id)!)) :
    (cat.getSource(id) && sourceView(cat.getSource(id)!));
  return text(rec ?? { error: `no ${kind} with id ${id}` });
});

server.registerTool("technique_standing", {
  title: "Where a technique stands",
  description: "Whether a technique is unmeasured, argued, supported, narrowed or contested, from human-reviewed claims only, with the claims that decide it.",
  inputSchema: { id: z.string() },
}, async ({ id }) => text(cat.getTechnique(id) ? techniqueView(cat.getTechnique(id)!) : { error: `no technique ${id}` }));

server.registerTool("related_claims", {
  title: "Claims nearest in meaning to an entry",
  description: "Nearest claims by embedding similarity to a claim, capability, technique, source or adage.",
  inputSchema: { kind: z.enum(["capability", "claim", "technique", "source", "adage"]), id: z.string(), k: z.number().int().min(1).max(20).default(5) },
}, async ({ kind, id, k }) => {
  const key = (Object.entries(KIND).find(([, v]) => v === kind)![0]) as K;
  return text(emb.relatedClaims(key, id, { k, floor: 0.3 }).map(({ claim, sim }) => ({ id: claim.id, statement: claim.statement, similarity: Number(sim.toFixed(2)), reviewed_by: cat.reviewLabel(claim), url: url("m", claim.id) })));
});

server.registerTool("list", {
  title: "List entries of one kind",
  description: "Ids and labels for every entry of a kind; for techniques includes standing, for adages includes standing, for claims includes review status.",
  inputSchema: { kind: z.enum(["capability", "claim", "technique", "source", "adage"]) },
}, async ({ kind }) => text(
  kind === "capability" ? cat.getCapabilities().map((c) => ({ id: c.id, label: c.label, status: c.status })) :
  kind === "technique" ? cat.getTechniques().map((t) => ({ id: t.id, label: t.label, standing: cat.STANDING_LABEL[cat.techniqueStanding(t.id).standing] })) :
  kind === "adage" ? cat.getAdages().map((a) => ({ id: a.id, label: a.label, standing: cat.ADAGE_STANDING_LABEL[cat.adageStanding(a)] })) :
  kind === "claim" ? cat.getClaims().map((c) => ({ id: c.id, statement: c.statement, reviewed_by: cat.reviewLabel(c) })) :
  cat.getSources().map((s) => ({ id: s.id, title: s.title, kind: s.kind, year: s.year }))
));

server.registerTool("open_questions", {
  title: "What nobody has measured yet",
  description: "Techniques with no measured evidence (searched or not), capabilities with no measured fix, and adages filed untested. These are the research briefs.",
  inputSchema: {},
}, async () => text({
  techniques: cat.openQuestions().map((q) => ({ id: q.technique.id, label: q.technique.label, kind: q.kind, evidence_search: q.technique.evidence_search, url: url("t", q.technique.id) })),
  capabilities: cat.unsolvedCapabilities().map((u) => ({ id: u.capability.id, label: u.capability.label, kind: u.kind, url: url("c", u.capability.id) })),
  adages: cat.getAdages().filter((a) => cat.adageStanding(a) === "untested").map((a) => ({ id: a.id, label: a.label, evidence_search: a.evidence_search, url: url("a", a.id) })),
}));

await server.connect(new StdioServerTransport());
