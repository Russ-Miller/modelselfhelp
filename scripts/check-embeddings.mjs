// Fails when catalog/embeddings.json is missing a record or holds a vector
// computed from stale text. Cheap: hashes only, no model. Fix: npm run embed.
import fs from "node:fs";
import { loadCatalog } from "./catalog-lib.mjs";
import { MODEL, recordTexts, textHash } from "./embed-lib.mjs";

const file = "catalog/embeddings.json";
if (!fs.existsSync(file)) { console.error(`${file} missing — run: npm run embed`); process.exit(1); }
const emb = JSON.parse(fs.readFileSync(file, "utf8"));
if (emb.model !== MODEL) { console.error(`embeddings built with ${emb.model}, expected ${MODEL} — run: npm run embed --all`); process.exit(1); }

const texts = recordTexts(loadCatalog());
const stale = texts.filter(({ key, text }) => emb.records[key]?.h !== textHash(text)).map((r) => r.key);
const extra = Object.keys(emb.records).filter((k) => !texts.some((t) => t.key === k));
if (stale.length || extra.length) {
  if (stale.length) console.error(`${stale.length} record(s) missing or stale: ${stale.slice(0, 5).join(", ")}${stale.length > 5 ? "…" : ""}`);
  if (extra.length) console.error(`${extra.length} vector(s) for records that no longer exist`);
  console.error("run: npm run embed");
  process.exit(1);
}
console.log(`embeddings fresh: ${texts.length} records`);
