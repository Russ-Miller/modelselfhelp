// Pick one recently-filed paper that got attention elsewhere, for the front
// page's "Today I learned" slot.
//
//   node scripts/find-buzz.mjs            # report the ranking
//   node scripts/find-buzz.mjs --write    # also write pipeline/til.yaml
//
// The signal is Hacker News, via the free Algolia search API. That is the whole
// list of options: X's API is paid and restricted, and Reddit now returns 403
// to unauthenticated JSON requests whatever user agent you send. So this is one
// community's attention, not the field's, and the page says so.
//
// Attention is not quality and the front page must not imply it is. What buzz
// buys is a reason to look, and the claims and sources beside it are what let
// someone judge. Papers age a few days first, because discussion peaks after
// publication, not on it.
//
// Free -- no key, no LLM.
import fs from "node:fs";
import YAML from "yaml";
import { loadCatalog } from "./catalog-lib.mjs";

const write = process.argv.includes("--write");
const MIN_AGE_DAYS = 3;    // let discussion accumulate
const MAX_AGE_DAYS = 30;   // after which it is not news
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const catalog = loadCatalog();
const claims = catalog.claims.map((c) => c.data);
const claimsBySource = new Map();
for (const c of claims) for (const l of c.sources ?? []) {
  if (!claimsBySource.has(l.source)) claimsBySource.set(l.source, []);
  claimsBySource.get(l.source).push(c);
}

const days = (d) => (Date.now() - new Date(d).getTime()) / 86400000;

const candidates = catalog.sources.map((s) => s.data).filter((s) => {
  if (s.kind !== "paper" || !s.arxiv_id) return false;
  const age = days(s.date ?? `${s.year}-01-01`);
  if (age < MIN_AGE_DAYS || age > MAX_AGE_DAYS) return false;
  return (claimsBySource.get(s.id) ?? []).length > 0;   // must lead somewhere
});

console.log(`${candidates.length} filed paper(s) aged ${MIN_AGE_DAYS}-${MAX_AGE_DAYS} days with a claim\n`);
if (!candidates.length) { console.log("Nothing eligible. The window may need widening, or ingestion has not caught up."); process.exit(0); }

async function hnRaw(query) {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const d = await res.json();
  return (d.hits ?? []).map((h) => ({
    points: h.points ?? 0, comments: h.num_comments ?? 0,
    title: h.title ?? "", link: h.url ?? "",
    url: `https://news.ycombinator.com/item?id=${h.objectID}`,
  }));
}

const STOP = new Set("a an the of in on for to and or is are with by as at from can into".split(" "));
const tokens = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9\s]/g, " ")
  .split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));

/**
 * Every hit has to be proved to be about THIS paper. Algolia matches loosely --
 * a 60-character title prefix returned a 440-point story about something else
 * entirely, which would have gone onto the front page as buzz. So a hit counts
 * only if its link carries the arXiv id, or its title shares most of its words
 * with ours.
 */
function isAboutPaper(hit, source) {
  if (hit.link && hit.link.includes(source.arxiv_id)) return true;
  const ours = tokens(source.title), theirs = tokens(hit.title);
  if (!ours.size || !theirs.size) return false;
  const shared = [...ours].filter((w) => theirs.has(w)).length;
  return shared / ours.size >= 0.6 && shared / theirs.size >= 0.5;
}

async function hn(source) {
  const byId = await hnRaw(source.arxiv_id);
  await sleep(400);
  const byTitle = await hnRaw(source.title.slice(0, 80));
  return [...byId, ...byTitle].filter((h) => isAboutPaper(h, source));
}

const scored = [];
for (const s of candidates) {
  const hits = await hn(s);
  // Best single submission, not a total: five separate one-point posts are not
  // the same as one that got read.
  const best = hits.sort((a, b) => (b.points + b.comments * 2) - (a.points + a.comments * 2))[0];
  const score = best ? best.points + best.comments * 2 : 0;
  scored.push({ source: s, best, score });
  console.log(`${String(score).padStart(4)}  ${s.arxiv_id}  ${s.title.slice(0, 58)}`);
  await sleep(400);
}

scored.sort((a, b) => b.score - a.score);

/**
 * Buzz first when it exists, which is rarely. Measured: even SWE-bench and
 * Lost in the Middle drew single-digit points on Hacker News. Discussion of
 * individual preprints happens on X, which cannot be queried without a paid
 * key -- so the fallback is not a consolation prize, it is the normal path.
 *
 * Failing buzz, pick on what makes a paper worth someone's attention from
 * inside the catalog: it argues with something already held, or it is the
 * first thing filed under a capability that had nothing.
 */
function interestingness(s) {
  const cs = claimsBySource.get(s.id) ?? [];
  let score = 0, why = "recently filed";
  if (cs.some((c) => c.contested)) { score += 100; why = "it argues with a claim already held here"; }
  else if (cs.some((c) => (c.sources ?? []).some((l) => l.stance === "contests"))) { score += 80; why = "it cuts against something already filed"; }
  const thin = cs.filter((c) => claims.filter((x) => x.capability === c.capability).length <= 3);
  if (thin.length) { score += 40; if (score === 40) why = "it is among the first things filed under this capability"; }
  score += Math.max(0, 30 - days(s.date ?? `${s.year}-01-01`));
  return { score, why };
}

let top = scored.find((x) => x.score > 0);
let why = top ? `it was discussed on Hacker News (${top.best.points} points, ${top.best.comments} comments)` : "";
if (!top) {
  console.log("\nNo Hacker News discussion on any of these. Picking on catalog signal instead.");
  const ranked = candidates.map((s) => ({ source: s, best: null, ...interestingness(s) }))
    .sort((a, b) => b.score - a.score);
  top = ranked[0];
  why = top.why;
}
if (!top) { console.log("Nothing eligible."); process.exit(0); }

const picked = {
  source: top.source.id,
  arxiv_id: top.source.arxiv_id,
  claims: (claimsBySource.get(top.source.id) ?? []).map((c) => c.id),
  why,
  ...(top.best ? { hn_points: top.best.points, hn_comments: top.best.comments, hn_url: top.best.url } : {}),
  picked_at: new Date().toISOString().slice(0, 10),
  note: "Picked as something worth a look, not as something judged correct. Nothing here is vouched for by being featured.",
};

console.log(`\npicked ${picked.source} — ${why}`);
if (write) {
  fs.writeFileSync("pipeline/til.yaml", YAML.stringify(picked, { lineWidth: 78 }));
  console.log("wrote pipeline/til.yaml");
} else {
  console.log("Re-run with --write to record it.");
}
