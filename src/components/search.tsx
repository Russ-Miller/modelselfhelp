"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchRecord } from "@/lib/search-index";

const KIND: Record<SearchRecord["k"], { label: string; href: (id: string) => string }> = {
  c: { label: "capability", href: (id) => `/capabilities/${id}` },
  m: { label: "claim", href: (id) => `/claims/${id}` },
  t: { label: "technique", href: (id) => `/techniques/${id}` },
  s: { label: "source", href: (id) => `/sources/${id}` },
};

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
  const terms = useMemo(() => q.toLowerCase().split(/\s+/).filter(Boolean), [q]);

  const results = useMemo(() => {
    if (!terms.length) return [];
    return index
      .map((r) => ({ r, s: score(r, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40);
  }, [index, terms]);

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search claims, capabilities, techniques, sources…"
        aria-label="Search the catalog"
        className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
      />

      {terms.length > 0 && (
        <p className="text-xs text-neutral-500">
          {results.length === 0
            ? "Nothing matched. Every word has to appear somewhere — try fewer."
            : `${results.length}${results.length === 40 ? "+" : ""} result${results.length === 1 ? "" : "s"}`}
        </p>
      )}

      <ul className="space-y-2">
        {results.map(({ r }) => (
          <li key={`${r.k}-${r.id}`} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{KIND[r.k].label}</span>
              {r.pending && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">unreviewed</span>}
              {r.sub && <span className="truncate">{r.sub}</span>}
            </div>
            <Link href={KIND[r.k].href(r.id)} className="text-sm hover:underline">{r.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
