// Test the catalog against cases where the answer is already known.
//
//   node scripts/backtest.mjs            # scorecard
//   node scripts/backtest.mjs --verbose  # plus per-check detail
//
// docs/known-reversals.yaml holds a held-out set of findings the field later
// overturned or narrowed. For each one this asks two different questions:
//
//   Did the catalog CATCH it?  Is the reversing paper here, cited by a claim
//     with stance "contests", on a claim marked contested with a stated axis?
//   Would the pipeline SURFACE it?  Does the paper's title match some
//     capability's match_terms well enough to have entered the queue?
//
// The second question matters more. A miss in the first is a gap in what has
// been filed by hand, which is expected and fixable in an afternoon. A miss in
// the second means the ingestion would never have shown it, which is a
// standing blind spot no amount of diligence closes.
//
// Free -- reads local files only, no API calls.
import fs from "node:fs";
import YAML from "yaml";
import { loadCatalog } from "./catalog-lib.mjs";
import { matchCapabilities } from "./match-lib.mjs";

const verbose = process.argv.includes("--verbose");
const { reversals } = YAML.parse(fs.readFileSync("docs/known-reversals.yaml", "utf8"));
const catalog = loadCatalog();
const sources = new Map(catalog.sources.map((s) => [s.data.id, s.data]));
const claims = catalog.claims.map((c) => c.data);
const capabilities = catalog.capabilities.map((c) => c.data);

/**
 * Would ingestion have surfaced this paper? Calls the pipeline's own matcher
 * rather than a copy of the rule, because a copy answers a subtly different
 * question -- the first version of this test reimplemented the title rule
 * wrongly and reported a blind spot that was not there.
 *
 * Title-only, since abstracts are not stored in the catalog. That understates
 * reach: the real matcher also accepts two occurrences in an abstract. A hit
 * here is therefore reliable; a miss means "the title alone would not have
 * done it", which is weaker than "ingestion would never see it".
 */
const reachOf = (title) => matchCapabilities({ title, abstract: "" });

const rows = [];
for (const r of reversals) {
  const present = r.reversing.filter((id) => sources.has(id));
  const citing = claims.filter((c) => c.sources.some((s) => r.reversing.includes(s.source)));
  const contesting = claims.filter((c) =>
    c.sources.some((s) => r.reversing.includes(s.source) && s.stance === "contests"));
  const withAxis = contesting.filter((c) => c.contested && c.disagreement_axis);

  const grade = withAxis.length ? "caught"
    : contesting.length ? "partial"
    : citing.length ? "cited-not-contested"
    : present.length ? "source-only"
    : "missed";

  // Ingestion reach, judged from the reversing paper's title alone.
  // Prefer the catalogued title; fall back to the recorded one so a paper we
  // never ingested can still be tested for reach -- which is the case that
  // matters most, since a miss we cannot test is a miss we cannot learn from.
  const titles = r.reversing.map((id) => sources.get(id)?.title).filter(Boolean);
  if (!titles.length && r.reversing_titles?.length) titles.push(...r.reversing_titles);
  const reach = titles.length
    ? [...new Set(titles.flatMap(reachOf))]
    : null;   // not in the catalog, so we have no title to test

  rows.push({ r, grade, present, citing, contesting, withAxis, reach });
}

const WIDTH = Math.max(...rows.map((x) => x.r.id.length));
console.log("Backtest against known reversals\n");
for (const { r, grade, present, citing, contesting, withAxis, reach } of rows) {
  const drift = r.expect && r.expect !== grade ? `  << expected ${r.expect}` : "";
  console.log(`${grade.padEnd(20)} ${r.id.padEnd(WIDTH)}${drift}`);
  if (verbose) {
    console.log(`    reversing sources in catalog: ${present.length}/${r.reversing.length}` +
      (present.length ? ` (${present.join(", ")})` : ""));
    console.log(`    claims citing them: ${citing.length}, contesting: ${contesting.length}, with a stated axis: ${withAxis.length}`);
    console.log(`    ingestion reach: ${reach === null ? "untestable — paper not in catalog, no title to match"
      : reach.length ? `title matches ${reach.join(", ")}` : "title alone would not match any capability"}`);
    if (r.note) console.log(`    note: ${r.note.replace(/\s+/g, " ").trim()}`);
    console.log();
  }
}

const tally = rows.reduce((m, x) => ({ ...m, [x.grade]: (m[x.grade] ?? 0) + 1 }), {});
console.log("\n" + Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(", "));

const drifted = rows.filter((x) => x.r.expect && x.r.expect !== x.grade);
if (drifted.length) {
  console.log(`\n${drifted.length} case(s) no longer grade as recorded:`);
  for (const d of drifted) console.log(`  ${d.r.id}: expected ${d.r.expect}, got ${d.grade}`);
  console.log("Either the catalog improved and `expect` should be updated, or something regressed.");
}

const blind = rows.filter((x) => x.reach !== null && x.reach.length === 0);
if (blind.length) {
  console.log(`\n${blind.length} case(s) whose reversing paper title alone would not match any capability.`);
  for (const b of blind) console.log(`  ${b.r.id}`);
  console.log("Title-only, so this is a weak signal -- the abstract may still carry it.");
}
