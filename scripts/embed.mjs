// Build-time embeddings for every catalog record, committed to
// catalog/embeddings.json. Incremental: a record is re-embedded only when the
// text it is embedded from changes. No API, no key; the model runs locally.
//
//   node scripts/embed.mjs          # update what changed
//   node scripts/embed.mjs --all    # recompute everything
import fs from "node:fs";
import { loadCatalog } from "./catalog-lib.mjs";
import { MODEL, DTYPE, DIM, recordTexts, textHash, pack } from "./embed-lib.mjs";

const OUT = "catalog/embeddings.json";
const all = process.argv.includes("--all");

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
const keep = prev && prev.model === MODEL && prev.dtype === DTYPE && !all ? prev.records : {};

const texts = recordTexts(loadCatalog());
const todo = texts.filter(({ key, text }) => keep[key]?.h !== textHash(text));
console.log(`${texts.length} records, ${todo.length} to embed`);

const records = {};
for (const { key } of texts) if (keep[key]) records[key] = keep[key];

if (todo.length) {
  const { pipeline, env } = await import("@huggingface/transformers");
  env.cacheDir = ".cache/transformers";
  const extract = await pipeline("feature-extraction", MODEL, { dtype: DTYPE });
  const BATCH = 32;
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const out = await extract(chunk.map((r) => r.text), { pooling: "mean", normalize: true });
    const vecs = out.tolist();
    chunk.forEach((r, j) => {
      if (vecs[j].length !== DIM) throw new Error(`unexpected dim ${vecs[j].length}`);
      records[r.key] = { h: textHash(r.text), ...pack(vecs[j]) };
    });
    process.stdout.write(`  ${Math.min(i + BATCH, todo.length)}/${todo.length}\r`);
  }
  console.log();
}

// Stable key order so diffs stay small.
const sorted = Object.fromEntries(Object.keys(records).sort().map((k) => [k, records[k]]));
fs.writeFileSync(OUT, JSON.stringify({ model: MODEL, dtype: DTYPE, dim: DIM, pooling: "mean", records: sorted }, null, 0) + "\n");
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
