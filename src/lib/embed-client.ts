"use client";

// Browser-side embedding of a search query, using the same model and
// quantisation as scripts/embed.mjs so query and catalog vectors agree.
//
// transformers.js is loaded from a CDN on first use rather than bundled: it
// pulls in an ONNX runtime with WASM binaries that Next's bundler handles
// badly, and most visitors never toggle meaning search, so nothing is paid
// until they do. The model itself (about 23 MB) comes from the Hugging Face
// hub and is cached by the browser after the first load.

export const MODEL = "Xenova/all-MiniLM-L6-v2";
const DTYPE = "q8";
const CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

export interface Packed { s: number; q: string }

export function unpack(p: Packed): Float32Array {
  const bin = atob(p.q);
  const out = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    const b = bin.charCodeAt(i);
    out[i] = (b > 127 ? b - 256 : b) * p.s;
  }
  return out;
}

/** Parse the compact `data-vec` attribute form: "<scale>|<base64>". */
export function unpackAttr(attr: string | undefined): Float32Array | undefined {
  if (!attr) return undefined;
  const i = attr.indexOf("|");
  if (i < 0) return undefined;
  return unpack({ s: Number(attr.slice(0, i)), q: attr.slice(i + 1) });
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

type Extractor = (text: string, opts: { pooling: "mean"; normalize: boolean }) => Promise<{ data: Float32Array }>;
let loading: Promise<Extractor> | null = null;

/** Resolves once the model is ready. Call early to warm up. */
export function loadModel(onStatus?: (s: string) => void): Promise<Extractor> {
  if (!loading) {
    loading = (async () => {
      onStatus?.("loading model (about 23 MB, once)…");
      // The comments keep webpack and Turbopack from trying to bundle a URL.
      const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ CDN);
      const extractor = await mod.pipeline("feature-extraction", MODEL, { dtype: DTYPE });
      onStatus?.("");
      return extractor as Extractor;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

export async function embedQuery(text: string, onStatus?: (s: string) => void): Promise<Float32Array> {
  const extract = await loadModel(onStatus);
  const out = await extract(text, { pooling: "mean", normalize: true });
  return out.data instanceof Float32Array ? out.data : new Float32Array(out.data);
}

/**
 * Which similarities count as a match. A fixed floor punishes short queries:
 * one word embeds diffusely, so "math" scores 0.39 against the Arithmetic
 * capability while a full sentence scores 0.6 against its nearest claim. The
 * cutoff is therefore relative to the best hit, with an absolute floor so a
 * query that matches nothing still returns nothing.
 */
export const ABS_FLOOR = 0.3;
export function matchCutoff(scores: number[]): number {
  const top = Math.max(-1, ...scores);
  return Math.max(ABS_FLOOR, top * 0.8);
}
