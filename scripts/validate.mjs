// Validates every catalog record against its schema and checks referential
// integrity. Exit code 1 on any problem. Run: npm run validate
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { loadCatalog, loadSchema, KINDS } from "./catalog-lib.mjs";

const SCHEMA_FOR = { capabilities: "capability", papers: "paper", techniques: "technique", models: "model", claims: "claim" };
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(loadSchema("common"));
const validators = Object.fromEntries(Object.entries(SCHEMA_FOR).map(([k, s]) => [k, ajv.compile(loadSchema(s))]));

const cat = loadCatalog();
const problems = [];
const problem = (file, msg) => problems.push(`${file}: ${msg}`);

// 1. schema + id/filename agreement + duplicates
const ids = {};
for (const kind of KINDS) {
  ids[kind] = new Set();
  for (const rec of cat[kind]) {
    const ok = validators[kind](rec.data);
    if (!ok) for (const e of validators[kind].errors) problem(rec.file, `${e.instancePath || "/"} ${e.message}`);
    if (!rec.data || typeof rec.data !== "object") continue;
    if (rec.data.id !== rec.stem) problem(rec.file, `id "${rec.data.id}" does not match filename`);
    if (ids[kind].has(rec.data.id)) problem(rec.file, `duplicate id ${rec.data.id}`);
    ids[kind].add(rec.data.id);
  }
}

// 2. taxonomy
const groups = new Set((cat.taxonomy.groups ?? []).map((g) => g.id));
const contexts = new Set((cat.taxonomy.contexts ?? []).map((c) => c.id));
for (const g of cat.taxonomy.groups ?? []) if (!SLUG.test(g.id)) problem("taxonomy.yaml", `bad group id ${g.id}`);
for (const c of cat.taxonomy.contexts ?? []) if (!SLUG.test(c.id)) problem("taxonomy.yaml", `bad context id ${c.id}`);

const versionsOf = new Map(cat.models.map((m) => [m.data.id, new Set((m.data.versions ?? []).map((v) => v.id))]));
const checkRef = (file, set, id, what) => { if (!set.has(id)) problem(file, `unknown ${what} "${id}"`); };
const checkEvidence = (file, ev) => { for (const e of ev ?? []) checkRef(file, ids.papers, e.paper, "paper"); };

// 3. references
for (const cap of cat.capabilities) {
  const d = cap.data;
  checkRef(cap.file, groups, d.group, "group");
  for (const c of d.contexts ?? []) checkRef(cap.file, contexts, c, "context");
  for (const t of d.techniques ?? []) checkRef(cap.file, ids.techniques, t, "technique");
  for (const r of d.related ?? []) checkRef(cap.file, ids.capabilities, r, "capability");
  if (d.parent) checkRef(cap.file, ids.capabilities, d.parent, "parent capability");
  checkEvidence(cap.file, d.evidence);
}
for (const t of cat.techniques) {
  const d = t.data;
  for (const a of d.addresses ?? []) checkRef(t.file, ids.capabilities, a, "capability");
  for (const p of d.papers ?? []) checkRef(t.file, ids.papers, p, "paper");
  for (const c of d.contexts ?? []) checkRef(t.file, contexts, c, "context");
}
const today = new Date().toISOString().slice(0, 10);
for (const c of cat.claims) {
  const d = c.data;
  checkRef(c.file, ids.capabilities, d.capability, "capability");
  checkRef(c.file, ids.models, d.model, "model");
  if (versionsOf.has(d.model)) checkRef(c.file, versionsOf.get(d.model), d.version, `version of ${d.model}`);
  checkRef(c.file, contexts, d.context, "context");
  if (d.superseded_by) checkRef(c.file, ids.claims, d.superseded_by, "claim");
  if (d.observed_on && (isNaN(Date.parse(d.observed_on)) || d.observed_on > today)) problem(c.file, `observed_on ${d.observed_on} is invalid or in the future`);
  checkEvidence(c.file, d.evidence);
}
// technique back-links: a capability listing a technique must be in that technique's `addresses`
const addressed = new Map(cat.techniques.map((t) => [t.data.id, new Set(t.data.addresses ?? [])]));
for (const cap of cat.capabilities) for (const t of cap.data.techniques ?? []) if (addressed.has(t) && !addressed.get(t).has(cap.data.id)) problem(cap.file, `technique ${t} does not list ${cap.data.id} in addresses`);

const counts = KINDS.map((k) => `${cat[k].length} ${k}`).join(", ");
if (problems.length) {
  console.error(`Catalog validation failed (${problems.length} problem${problems.length > 1 ? "s" : ""}):`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}
console.log(`Catalog OK: ${counts}, ${groups.size} groups, ${contexts.size} contexts.`);
