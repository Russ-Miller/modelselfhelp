// Read side of catalog/embeddings.json (built by scripts/embed.mjs).
// Vectors are unit length, so cosine similarity is a dot product.
import fs from "node:fs";
import path from "node:path";
import type { Claim } from "./catalog";
import { getClaims } from "./catalog";

export type Kind = "c" | "m" | "t" | "s";
export interface Packed { s: number; q: string }

interface File { model: string; dim: number; records: Record<string, Packed & { h: string }> }

let cache: File | null = null;
function file(): File {
  if (!cache) cache = JSON.parse(fs.readFileSync(path.join(process.cwd(), "catalog", "embeddings.json"), "utf8")) as File;
  return cache;
}

export const EMBED_MODEL = () => file().model;

/** Packed form for shipping to the browser (int8 + scale, base64). */
export function packedFor(kind: Kind, id: string): Packed | undefined {
  const r = file().records[`${kind}:${id}`];
  return r ? { s: r.s, q: r.q } : undefined;
}

/** Attribute form for list rows: "<scale>|<base64>". Undefined when absent. */
export function vecAttr(kind: Kind, id: string): string | undefined {
  const p = packedFor(kind, id);
  return p ? `${p.s}|${p.q}` : undefined;
}

export function unpack(p: Packed): Float32Array {
  const bytes = Buffer.from(p.q, "base64");
  const out = new Float32Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = ((bytes[i] << 24) >> 24) * p.s; // int8
  return out;
}

const vecCache = new Map<string, Float32Array>();
export function vectorFor(kind: Kind, id: string): Float32Array | undefined {
  const key = `${kind}:${id}`;
  const hit = vecCache.get(key);
  if (hit) return hit;
  const p = packedFor(kind, id);
  if (!p) return undefined;
  const v = unpack(p);
  vecCache.set(key, v);
  return v;
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Claims nearest to a given record. Similarity floor keeps the list honest:
 * an empty "related" section beats five unrelated ones. Scores are not shown
 * to readers; ordering is the only thing they carry.
 */
export function relatedClaims(kind: Kind, id: string, opts: { k?: number; floor?: number } = {}): { claim: Claim; sim: number }[] {
  const { k = 5, floor = 0.45 } = opts;
  const v = vectorFor(kind, id);
  if (!v) return [];
  const out: { claim: Claim; sim: number }[] = [];
  for (const c of getClaims()) {
    if (kind === "m" && c.id === id) continue;
    const w = vectorFor("m", c.id);
    if (!w) continue;
    const sim = cosine(v, w);
    if (sim >= floor) out.push({ claim: c, sim });
  }
  return out.sort((a, b) => b.sim - a.sim).slice(0, k);
}
