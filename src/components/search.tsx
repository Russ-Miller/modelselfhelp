"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchRecord } from "@/lib/search-index";
import { cosine, embedQuery, matchCutoff, unpackAttr } from "@/lib/embed-client";
import { SearchModeToggle, type SearchMode } from "@/components/search-mode";

const KIND: Record<SearchRecord["k"], { label: string; plural: string; section: string; href: (id: string) => string }> = {
  c: { label: "capability", plural: "capabilities", section: "/capabilities", href: (id) => `/capabilities/${id}` },
  m: { label: "claim", plural: "claims", section: "/claims", href: (id) => `/claims/${id}` },
  t: { label: "technique", plural: "techniques", section: "/techniques", href: (id) => `/techniques/${id}` },
  s: { label: "source", plural: "sources", section: "/sources", href: (id) => `/sources/${id}` },
  a: { label: "adage", plural: "adages", section: "/adages", href: (id) => `/adages/${id}` },
};

/** Display order for the count line: matches the nav. */
const KIND_ORDER: SearchRecord["k"][] = ["c", "m", "s", "t", "a"];

/**
 * Scoring, deliberately simple. Every query term must appear somewhere, then
 * matches in the title outrank matches in the body and shorter titles outrank
 * longer ones. Fifty lines beats a search dependency for a few hundred records,
 * and being wrong here is cheap -- the reader can see every result.
 */
function score(rec: SearchRecord, terms: string[]): number {
  const title = rec.title.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!rec.text.includes(t)) return 0;
    if (title.includes(t)) s += 10;
    if (title.startsWith(t)) s += 5;
    s += 1;
  }
  return s + Math.max(0, 40 - rec.title.length) / 40;
}

export function Search({ index }: { index: SearchRecord[] }) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<SearchMode>("keyword");
  // Meaning mode: the embedded query, and which text it was embedded from.
  const [qvec, setQvec] = useState<{ q: string; v: Float32Array } | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const terms = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);

  // Catalog vectors, decoded once. Cheap: a few hundred short arrays.
  const vectors = useMemo(() => index.map((r) => unpackAttr(r.v)), [index]);

  // Embed the query after a short pause in typing. The model loads on the
  // first call; status text goes straight to a span rather than state.
  useEffect(() => {
    if (mode !== "meaning" || !q.trim()) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        const v = await embedQuery(q.trim(), (m) => { if (statusRef.current) statusRef.current.textContent = m; });
        if (live) setQvec({ q, v });
      } catch {
        if (statusRef.current) statusRef.current.textContent = "meaning search unavailable (model failed to load)";
      }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [mode, q]);

  // All matches, unsliced, so the per-kind counts are true totals.
  const matches = useMemo(() => {
    if (mode === "meaning") {
      if (!q.trim() || !qvec || qvec.q !== q) return [];
      const scored = index.map((r, i) => ({ r, s: vectors[i] ? cosine(qvec.v, vectors[i]!) : 0 }));
      const cut = matchCutoff(scored.map((x) => x.s));
      return scored.filter((x) => x.s >= cut).sort((a, b) => b.s - a.s);
    }
    if (!terms.length) return [];
    return index
      .map((r) => ({ r, s: score(r, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
  }, [index, vectors, terms, mode, q, qvec]);
  const results = matches.slice(0, 40);
  const pendingEmbed = mode === "meaning" && !!q.trim() && (!qvec || qvec.q !== q);

  // With no query the line shows catalog totals; with one, matches per kind.
  const counts = useMemo(() => {
    const pool = terms.length ? matches.map((x) => x.r) : index;
    const n: Record<SearchRecord["k"], number> = { c: 0, m: 0, t: 0, s: 0, a: 0 };
    for (const r of pool) n[r.k]++;
    return n;
  }, [index, matches, terms.length]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === "meaning" ? "Describe what you are looking for…" : "Search claims, capabilities, techniques, sources…"}
          aria-label="Search the catalog"
          className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        />
        <SearchModeToggle mode={mode} onChange={setMode} />
      </div>
      <span ref={statusRef} aria-live="polite" className="block text-xs text-neutral-500 empty:hidden" />

      <dl className="flex flex-wrap gap-6 text-sm" aria-live="polite">
        {KIND_ORDER.map((k) => (
          <div key={k}>
            <dt className="text-neutral-500">{terms.length ? `${KIND[k].plural} matched` : KIND[k].plural}</dt>
            <dd className="text-xl font-medium">
              <Link href={KIND[k].section} className="hover:underline">{counts[k]}</Link>
            </dd>
          </div>
        ))}
      </dl>

      {terms.length > 0 && !pendingEmbed && (
        <p className="text-xs text-neutral-500">
          {matches.length === 0
            ? mode === "meaning" ? "Nothing close enough. Try describing it differently." : "Nothing matched. Every word has to appear somewhere — try fewer."
            : matches.length > 40
              ? `Showing the top 40 of ${matches.length} matches.`
              : `${matches.length} match${matches.length === 1 ? "" : "es"}`}
        </p>
      )}

      <ul className="space-y-2">
        {results.map(({ r }) => (
          <li key={`${r.k}-${r.id}`} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{KIND[r.k].label}</span>
              {r.pending && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">reviewed by AI</span>}
              {r.sub && <span className="truncate">{r.sub}</span>}
            </div>
            <Link href={KIND[r.k].href(r.id)} className="text-sm hover:underline">{r.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
