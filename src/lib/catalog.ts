// Read-only access to the YAML catalog for the site and API.
// Loaded once per process at build/request time; the catalog is small.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export type Stance = "supports" | "counters";
export type Strength = "anecdotal" | "benchmark" | "controlled" | "survey";
export type RecordStatus = "proposed" | "accepted" | "disputed" | "retired";

export interface Evidence { paper: string; stance: Stance; note: string; strength?: Strength }
export interface Weakness {
  id: string; label: string; summary: string; description: string; failure_looks_like: string;
  group: string; parent?: string; aliases?: string[]; contexts: string[]; evidence: Evidence[];
  techniques?: string[]; related?: string[]; status: RecordStatus; submitted_by: string;
}
export interface Paper {
  id: string; title: string; authors: string[]; year: number; arxiv_id?: string; url: string;
  venue?: string; abstract?: string; tags?: string[]; code_url?: string;
}
export interface Repo { url: string; note: string; verified_on?: string }
export interface Technique {
  id: string; label: string; summary: string; description: string; addresses: string[];
  kind: "prompting" | "retrieval" | "tooling" | "training" | "decoding" | "architecture" | "process";
  papers?: string[]; repos?: Repo[]; contexts?: string[]; caveats?: string; status: RecordStatus; submitted_by: string;
}
export interface ModelVersion { id: string; label: string; released?: string }
export interface Model { id: string; label: string; vendor: string; url?: string; versions: ModelVersion[] }
export interface Claim {
  id: string; weakness: string; model: string; version: string; context: string; observed_on: string;
  severity: "minor" | "moderate" | "major" | "blocking";
  status: "open" | "mitigated" | "resolved" | "disputed" | "superseded";
  superseded_by?: string; evidence: Evidence[]; notes?: string; submitted_by: string;
}
export interface TaxonomyEntry { id: string; label: string; description: string }
export interface Taxonomy { groups: TaxonomyEntry[]; contexts: TaxonomyEntry[] }

export interface Catalog {
  taxonomy: Taxonomy;
  weaknesses: Weakness[]; papers: Paper[]; techniques: Technique[]; models: Model[]; claims: Claim[];
}

const CATALOG_DIR = path.join(process.cwd(), "catalog");

function readDir<T>(dir: string): T[] {
  const full = path.join(CATALOG_DIR, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter((f) => /\.ya?ml$/.test(f))
    .sort()
    .map((f) => YAML.parse(fs.readFileSync(path.join(full, f), "utf8")) as T);
}

let cache: Catalog | null = null;

export function loadCatalog(): Catalog {
  if (cache) return cache;
  cache = {
    taxonomy: YAML.parse(fs.readFileSync(path.join(CATALOG_DIR, "taxonomy.yaml"), "utf8")) as Taxonomy,
    weaknesses: readDir<Weakness>("weaknesses"),
    papers: readDir<Paper>("papers"),
    techniques: readDir<Technique>("techniques"),
    models: readDir<Model>("models"),
    claims: readDir<Claim>("claims"),
  };
  return cache;
}

export const getWeaknesses = () => loadCatalog().weaknesses;
export const getWeakness = (id: string) => loadCatalog().weaknesses.find((w) => w.id === id);
export const getTechniques = () => loadCatalog().techniques;
export const getTechnique = (id: string) => loadCatalog().techniques.find((t) => t.id === id);
export const getPaper = (id: string) => loadCatalog().papers.find((p) => p.id === id);
export const getModel = (id: string) => loadCatalog().models.find((m) => m.id === id);
export const getGroup = (id: string) => loadCatalog().taxonomy.groups.find((g) => g.id === id);
export const getContext = (id: string) => loadCatalog().taxonomy.contexts.find((c) => c.id === id);
export const techniquesFor = (weaknessId: string) => loadCatalog().techniques.filter((t) => t.addresses.includes(weaknessId));
export const claimsFor = (weaknessId: string) => loadCatalog().claims.filter((c) => c.weakness === weaknessId);

/** Weaknesses grouped by taxonomy group, in taxonomy order. */
export function weaknessesByGroup(): { group: TaxonomyEntry; weaknesses: Weakness[] }[] {
  const { taxonomy, weaknesses } = loadCatalog();
  return taxonomy.groups
    .map((group) => ({ group, weaknesses: weaknesses.filter((w) => w.group === group.id) }))
    .filter((g) => g.weaknesses.length > 0);
}
