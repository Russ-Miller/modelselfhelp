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
export interface NearestMiss { source?: string; title?: string; url?: string; why_it_does_not_fit: string }
/** A record of having looked for efficacy evidence and come up empty. Absent
 *  means nobody has looked -- a different state from a documented dead end,
 *  and the whole point of the distinction. */
export interface EvidenceSearch { searched_on: string; note: string; nearest_miss?: NearestMiss[] }
export interface Technique {
  id: string; label: string; summary: string; description: string; addresses: string[];
  kind: "prompting" | "retrieval" | "tooling" | "training" | "decoding" | "architecture" | "process";
  sources?: string[]; repos?: Repo[]; contexts?: string[];
  /** Prerequisites and applicability -- what you need to use it. Never efficacy. */
  requires?: string;
  evidence_search?: EvidenceSearch;
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

/**
 * Techniques with no efficacy claim behind them, split by whether anyone has
 * actually looked. The distinction is the point: an empty cell can mean the
 * literature is silent or only that this catalog is. A documented search is a
 * negative result with provenance and reads as a research brief; no search is
 * just an unchecked box, and the view must not advertise the second as the
 * first.
 */
export type OpenKind = "searched" | "unsearched" | "asserted-not-measured";
export interface OpenQuestion { technique: Technique; kind: OpenKind; claims: Claim[] }

export function openQuestions(): OpenQuestion[] {
  const rank: Record<OpenKind, number> = { searched: 0, unsearched: 1, "asserted-not-measured": 2 };
  const out: OpenQuestion[] = [];
  for (const technique of loadCatalog().techniques) {
    if (technique.status !== "active") continue;
    const claims = claimsAboutTechnique(technique.id);
    if (claims.length === 0) {
      out.push({ technique, kind: technique.evidence_search ? "searched" : "unsearched", claims });
    } else if (!claims.some(isMeasured)) {
      // Believed for a structural reason, never measured. A weaker opening
      // than silence, but still an opening.
      out.push({ technique, kind: "asserted-not-measured", claims });
    }
  }
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || a.technique.label.localeCompare(b.technique.label));
}

/** Backing strengths where somebody actually measured the effect, as opposed
 *  to arguing it from how the technique works. */
const MEASURED: BackingStrength[] = ["single-paper", "replicated", "own-observation"];
const isMeasured = (c: Claim) => MEASURED.includes(c.backing_strength);

/**
 * Aggregate citation activity for the sources a claim rests on. Uses the
 * liveliest source rather than a total: one paper the field is still citing
 * means the evidence base is live, and summing across papers would invent a
 * figure nobody reported. Only counts sources whose citations have been
 * checked -- unchecked is not the same as quiet.
 */
export interface ClaimActivity { checked: Source[]; unchecked: number; maxRecent: number; allQuiet: boolean }
export function claimActivity(claim: Claim): ClaimActivity | null {
  const sources = claim.sources.map((s) => getSource(s.source)).filter((s): s is Source => !!s);
  const checked = sources.filter((s) => s.citations_checked_at);
  if (checked.length === 0) return null;
  return {
    checked: [...checked].sort((a, b) => (b.citations_recent_12mo ?? 0) - (a.citations_recent_12mo ?? 0)),
    unchecked: sources.length - checked.length,
    maxRecent: Math.max(...checked.map((s) => s.citations_recent_12mo ?? 0)),
    allQuiet: checked.every(isQuietSource),
  };
}

/**
 * Capabilities where a problem is documented but nothing is known to fix it.
 * The counterpart to openQuestions(): that view asks whether a technique
 * works, this one asks whether anything works at all. Split the same way,
 * because "no technique catalogued" and "techniques catalogued, none measured"
 * are different invitations.
 */
export type UnmitigatedKind = "no-technique" | "none-measured";
export interface Unmitigated { capability: Capability; kind: UnmitigatedKind; claims: Claim[]; techniques: Technique[] }

export function unmitigatedCapabilities(): Unmitigated[] {
  const out: Unmitigated[] = [];
  for (const capability of loadCatalog().capabilities) {
    if (capability.status !== "active") continue;
    const claims = claimsFor(capability.id);
    if (claims.length === 0) continue; // no documented problem yet, so nothing to mitigate
    const techniques = techniquesFor(capability.id).filter((t) => t.status === "active");
    if (techniques.some((t) => claimsAboutTechnique(t.id).some(isMeasured))) continue;
    out.push({
      capability,
      kind: techniques.length === 0 ? "no-technique" : "none-measured",
      claims,
      techniques,
    });
  }
  return out.sort((a, b) => b.claims.length - a.claims.length || a.capability.label.localeCompare(b.capability.label));
}
