// Read-only access to the YAML catalog for the site.
// Loaded once per process at build/request time; the catalog is small.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export type SourceKind = "paper" | "observation";
export type Stance = "supports" | "contests";
export type ClaimKind = "mechanism" | "observation";
export type BackingStrength = "single-paper" | "replicated" | "mechanism-reasoning" | "own-observation";
export type CapabilityStatus = "active" | "parked";
export type ClaimStatus = "active" | "superseded" | "retired";
/** Record lifecycle, deliberately NOT a verdict on whether the technique works.
 *  Efficacy lives in claims that reference the technique. */
export type TechniqueStatus = "active" | "superseded";

export interface SourceLink {
  source: string; stance: Stance; note: string;
  /** Who added this citation and when. Optional, but the only record of the
   *  single most creditworthy act in the index: adding a contesting source to
   *  a claim someone else made. See docs/reputation-notes.md. */
  submitted_by?: string; added_at?: string;
}
export interface DisagreementAxis { description: string; is_guess: boolean }
export interface ObservedOn { model?: string; era?: string; task_type?: string }

export interface Capability {
  id: string; label: string; summary: string; description: string;
  tags?: string[]; parent?: string; aliases?: string[]; techniques?: string[]; related?: string[];
  /** Vocabulary used to topically match ingestion candidates to this capability. */
  match_terms?: string[];
  /** Inclusion/exclusion boundary for this capability, including known
   *  near-misses. Written for a classifier deciding whether a paper is really
   *  about this capability, and useful to a human reviewer for the same call. */
  discriminator?: string;
  status: CapabilityStatus; submitted_by: string;
}
export interface Source {
  id: string; kind: SourceKind; title: string; authors?: string[]; year?: number; date?: string;
  arxiv_id?: string; url?: string; venue?: string; summary?: string; tags?: string[]; code_url?: string;
  ingested_at: string;
  citations_total?: number; citations_recent_12mo?: number; citations_checked_at?: string;
  semantic_scholar_id?: string;
}
export interface Claim {
  id: string; capability: string; statement: string; tags?: string[];
  /** Set when this claim asserts a technique moves the capability, and under what conditions. */
  technique?: string;
  kind: ClaimKind; backing_strength: BackingStrength; observed_on?: ObservedOn;
  sources: SourceLink[]; contested: boolean; disagreement_axis?: DisagreementAxis;
  status: ClaimStatus; superseded_by?: string;
  last_checked_at: string; last_new_evidence_at?: string; notes?: string; submitted_by: string;
}
export interface Repo { url: string; note: string; verified_on?: string }
export interface Technique {
  id: string; label: string; summary: string; description: string; addresses: string[];
  kind: "prompting" | "retrieval" | "tooling" | "training" | "decoding" | "architecture" | "process";
  sources?: string[]; repos?: Repo[]; contexts?: string[];
  /** Prerequisites and applicability -- what you need to use it. Never efficacy. */
  requires?: string;
  status: TechniqueStatus; submitted_by: string;
}
export interface ModelVersion { id: string; label: string; released?: string }
export interface Model { id: string; label: string; vendor: string; url?: string; versions: ModelVersion[] }
export interface TaxonomyEntry { id: string; label: string; description: string }
export interface Taxonomy { groups: TaxonomyEntry[]; contexts: TaxonomyEntry[] }

export interface Catalog {
  taxonomy: Taxonomy;
  capabilities: Capability[]; claims: Claim[]; sources: Source[]; techniques: Technique[]; models: Model[];
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
    capabilities: readDir<Capability>("capabilities"),
    claims: readDir<Claim>("claims"),
    sources: readDir<Source>("sources"),
    techniques: readDir<Technique>("techniques"),
    models: readDir<Model>("models"),
  };
  return cache;
}

export const getCapabilities = () => loadCatalog().capabilities;
export const getCapability = (id: string) => loadCatalog().capabilities.find((c) => c.id === id);
export const getClaims = () => loadCatalog().claims;
export const getClaim = (id: string) => loadCatalog().claims.find((c) => c.id === id);
export const getSources = () => loadCatalog().sources;
export const getSource = (id: string) => loadCatalog().sources.find((s) => s.id === id);
export const getTechniques = () => loadCatalog().techniques;
export const getTechnique = (id: string) => loadCatalog().techniques.find((t) => t.id === id);
export const getModel = (id: string) => loadCatalog().models.find((m) => m.id === id);
export const getTagLabel = (id: string) => {
  const t = loadCatalog().taxonomy;
  return t.groups.find((g) => g.id === id)?.label ?? t.contexts.find((c) => c.id === id)?.label ?? id;
};

export const claimsFor = (capabilityId: string) => loadCatalog().claims.filter((c) => c.capability === capabilityId);
/** Efficacy claims: assertions that this technique moves some capability. */
export const claimsAboutTechnique = (techniqueId: string) => loadCatalog().claims.filter((c) => c.technique === techniqueId);
export const techniquesFor = (capabilityId: string) => loadCatalog().techniques.filter((t) => t.addresses.includes(capabilityId));

/** Every claim that cites a given source, alongside the stance that claim's citation carries. */
export function claimsCiting(sourceId: string): { claim: Claim; stance: Stance }[] {
  const out: { claim: Claim; stance: Stance }[] = [];
  for (const claim of loadCatalog().claims) {
    const link = claim.sources.find((s) => s.source === sourceId);
    if (link) out.push({ claim, stance: link.stance });
  }
  return out;
}

/** Capabilities grouped by their first tag (loose grouping — tags are soft, see spec §7). */
export function capabilitiesByGroup(): { group: TaxonomyEntry; capabilities: Capability[] }[] {
  const { taxonomy, capabilities } = loadCatalog();
  return taxonomy.groups
    .map((group) => ({ group, capabilities: capabilities.filter((c) => c.tags?.includes(group.id)) }))
    .filter((g) => g.capabilities.length > 0);
}

/** Claims marked contested, i.e. carrying sources on both sides. */
export const contestedClaims = () => loadCatalog().claims.filter((c) => c.contested);

/** Capabilities that hold at least one contested claim, with those claims. */
export function capabilitiesWithDispute(): { capability: Capability; claims: Claim[] }[] {
  const byCapability = new Map<string, Claim[]>();
  for (const c of contestedClaims()) {
    if (!byCapability.has(c.capability)) byCapability.set(c.capability, []);
    byCapability.get(c.capability)!.push(c);
  }
  return [...byCapability.entries()]
    .map(([id, claims]) => ({ capability: getCapability(id)!, claims }))
    .filter((x) => x.capability)
    .sort((a, b) => b.claims.length - a.claims.length);
}

/** Claims sorted by most-recently-checked first, for a recent-activity-style view. */
export function claimsByRecency(): Claim[] {
  return [...loadCatalog().claims].sort((a, b) => (b.last_checked_at || "").localeCompare(a.last_checked_at || ""));
}

/** Sources sorted by most-recently-ingested first. */
export function sourcesByRecency(): Source[] {
  return [...loadCatalog().sources].sort((a, b) => (b.ingested_at || "").localeCompare(a.ingested_at || ""));
}

/**
 * A source is "quiet" when we've checked its citation activity, it's had
 * no citations in the last 12 months, and it's at least 2 years old. Only
 * ever true when citations_checked_at is present — a source we haven't
 * checked yet is never treated as quiet, since absence of data isn't
 * evidence of staleness.
 */
export function isQuietSource(s: Source): boolean {
  if (!s.citations_checked_at) return false;
  const pubYear = s.year ?? (s.date ? Number(s.date.slice(0, 4)) : undefined);
  const age = pubYear ? new Date().getFullYear() - pubYear : 0;
  return (s.citations_recent_12mo ?? 0) === 0 && age >= 2;
}
