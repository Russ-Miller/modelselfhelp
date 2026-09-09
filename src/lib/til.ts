// The front page's "recently added" slot, driven by pipeline/til.yaml.
//
// Chosen by a person forwarding a link where possible, and by a catalog
// heuristic otherwise. Never by automated buzz: measured, even SWE-bench and
// Lost in the Middle drew single-digit points on Hacker News, so there is no
// external attention signal to read for individual preprints.
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { getClaim, getSource, type Claim, type Source } from "./catalog";

export interface Til {
  source: Source;
  claims: Claim[];
  why: string;
  forwarded?: boolean;
  picked_at?: string;
  hn_points?: number;
  hn_url?: string;
}

export function getTil(): Til | null {
  const file = path.join(process.cwd(), "pipeline", "til.yaml");
  if (!fs.existsSync(file)) return null;
  const d = YAML.parse(fs.readFileSync(file, "utf8"));
  const source = d?.source ? getSource(d.source) : undefined;
  if (!source) return null;
  return {
    source,
    claims: (d.claims ?? []).map((id: string) => getClaim(id)).filter(Boolean),
    why: d.why ?? "recently added",
    forwarded: d.forwarded,
    picked_at: d.picked_at,
    hn_points: d.hn_points,
    hn_url: d.hn_url,
  };
}
