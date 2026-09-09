// Re-fetch every source that pins a file hash and report what has changed.
//
//   npm run check-sources            # report only
//   npm run check-sources -- --write # record the change on the source record
//
// The problem this solves: arXiv puts a version in the id, so a paper we read
// stays readable. A PDF served from a repository, a preprint on an institute
// site, a doc behind a stable URL -- those change underneath the same address
// with nothing to notice it. The Elasticity RSI paper is revised roughly
// fortnightly, and the figures our claim quotes are exactly the kind that get
// revised.
//
// Companion to the archiving rule for kind: post. That one handles sources
// that vanish; this handles sources that mutate. Both exist so a citation
// cannot quietly stop meaning what it meant when it was made.
//
// Free -- no API key, no LLM.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadCatalog } from "./catalog-lib.mjs";

const write = process.argv.includes("--write");
const today = new Date().toISOString().slice(0, 10);

const catalog = loadCatalog();
const claimsBySource = new Map();
for (const c of catalog.claims) {
  for (const link of c.data.sources ?? []) {
    if (!claimsBySource.has(link.source)) claimsBySource.set(link.source, []);
    claimsBySource.get(link.source).push(c.data.id);
  }
}

/** Article text, chrome stripped. Never perfect, but stable enough to diff. */
function extractText(buf) {
  return buf.toString("utf8")
    .replace(/<(script|style|nav|footer|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .split("\n").map((l) => l.trim()).filter((l) => l.length > 40);
}

/** Sentences, whitespace collapsed. Compared at this granularity because
 *  neither side controls line breaks: the archive is stored wrapped, the live
 *  page wraps however it renders. A first attempt compared lines and reported
 *  10% retention on a page whose article had not changed at all. */
function sentences(text) {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/)
    .map((x) => x.trim()).filter((x) => x.length > 60);
}

/** Share of archived sentences still on the page. Overlap rather than a byte
 *  hash, because a marketing page rewrites its own furniture -- the first
 *  attempt pinned a related-posts carousel and called the article changed
 *  when it was not. A hash is right for a PDF and wrong for a page. */
function retention(archived, live) {
  if (!archived.length) return 1;
  const set = new Set(live);
  return archived.filter((x) => set.has(x)).length / archived.length;
}
// 0.98: with the archive stored unwrapped, a clean page returns ~98-99%, and a
// single revised paragraph drops it below. A looser floor missed exactly the
// case that matters -- a vendor quietly rewording one claim.
const DRIFT_FLOOR = 0.98;

const pinned = catalog.sources.filter((s) => s.data.content_url && (s.data.content_sha256 || s.data.archived_text));
if (!pinned.length) { console.log("No sources pin a content hash yet."); process.exit(0); }
console.log(`Checking ${pinned.length} pinned source${pinned.length === 1 ? "" : "s"}\n`);

let changed = 0, unreachable = 0;

for (const rec of pinned) {
  const s = rec.data;
  process.stdout.write(`${s.id}\n`);
  let buf;
  try {
    const res = await fetch(s.content_url, { redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
  } catch (err) {
    unreachable++;
    console.log(`  unreachable: ${err?.message ?? err} — not treated as a change`);
    continue;
  }
  // Text sources are checked by how much of the archive survives; byte hashes
  // only mean something for a file that is meant to be identical each time.
  if (s.archived_text) {
    const archived = sentences(s.archived_text);
    const keep = retention(archived, sentences(extractText(buf).join(" ")));
    const pct = (keep * 100).toFixed(1);
    if (keep >= DRIFT_FLOOR) { console.log(`  archive intact (${pct}% of archived sentences still present)`); continue; }
    changed++;
    const citing = claimsBySource.get(s.id) ?? [];
    console.log(`  DRIFTED — only ${pct}% of the archived text is still on the page`);
    console.log(`  ${citing.length} claim(s) rest on it${citing.length ? `: ${citing.join(", ")}` : ""}`);
    if (write) {
      const file = path.join("catalog/sources", `${s.id}.yaml`);
      let text = fs.readFileSync(file, "utf8");
      text = text.includes("content_changed_at:")
        ? text.replace(/content_changed_at: .*/, `content_changed_at: ${today}`)
        : text.replace(/(retrieved_at: .*)/, `$1\ncontent_changed_at: ${today}`);
      fs.writeFileSync(file, text);
      console.log(`  recorded content_changed_at: ${today}`);
    }
    continue;
  }

  const now = crypto.createHash("sha256").update(buf).digest("hex");
  if (now === s.content_sha256) {
    console.log(`  unchanged (${buf.length} bytes)`);
    if (write) {
      const file = path.join("catalog/sources", `${s.id}.yaml`);
      const text = fs.readFileSync(file, "utf8");
      fs.writeFileSync(file, text.includes("content_checked_at:")
        ? text.replace(/content_checked_at: .*/, `content_checked_at: ${today}`)
        : text.replace(/(content_sha256: .*)/, `$1\ncontent_checked_at: ${today}`));
    }
    continue;
  }

  changed++;
  const citing = claimsBySource.get(s.id) ?? [];
  console.log(`  CHANGED — recorded ${s.content_sha256.slice(0, 12)}, now ${now.slice(0, 12)}`);
  console.log(`  ${citing.length} claim(s) rest on it${citing.length ? `: ${citing.join(", ")}` : ""}`);
  console.log(`  Re-read before trusting any figure quoted from it.`);

  if (write) {
    const file = path.join("catalog/sources", `${s.id}.yaml`);
    let text = fs.readFileSync(file, "utf8");
    // The recorded hash is deliberately NOT updated. It marks the version the
    // claims were written against; overwriting it would erase the evidence
    // that they now rest on something nobody has read.
    text = text.includes("content_changed_at:")
      ? text.replace(/content_changed_at: .*/, `content_changed_at: ${today}`)
      : text.replace(/(content_sha256: .*)/, `$1\ncontent_changed_at: ${today}`);
    fs.writeFileSync(file, text);
    console.log(`  recorded content_changed_at: ${today}`);
  }
}

console.log(`\n${changed} changed, ${pinned.length - changed - unreachable} unchanged` +
  (unreachable ? `, ${unreachable} unreachable` : ""));
if (changed && !write) console.log("Re-run with --write to record the change on the source records.");
process.exit(changed ? 1 : 0);
