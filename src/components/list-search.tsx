"use client";

import { useEffect, useRef, useState } from "react";
import { cosine, embedQuery, matchCutoff, unpackAttr } from "@/lib/embed-client";
import { SearchModeToggle, type SearchMode } from "@/components/search-mode";

/**
 * Type-to-filter for a server-rendered list. Rows carry a `data-search`
 * haystack; this marks non-matching ones `data-hit="0"` and a rule in
 * globals.css hides them. Clearing the box restores the full list.
 *
 * Filtering by hiding DOM the server already sent, for the same reason the
 * filter bar does: no second copy of the data ships and the page stays static.
 * The two compose without knowing about each other — a row hidden by either
 * rule stays hidden.
 *
 * Meaning mode: rows also carry `data-vec`, a packed embedding. The query is
 * embedded in the browser, rows below a similarity floor are hidden, and the
 * rest are physically reordered by similarity (rows are <li> on some pages
 * and <tr> on others, and CSS `order` does nothing in a table). The original
 * order is remembered and restored on clear.
 *
 * Only the query and mode are React state. The match count and status are
 * written straight into spans, because they are derived from the DOM the
 * effect just touched, and routing them back through setState is the
 * cascading-render pattern React warns about.
 */
export function ListSearch({ noun = "rows", placeholder }: { noun?: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<SearchMode>("keyword");
  const countRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  // DOM order as the server sent it, captured once, so meaning mode can undo its sorting.
  const originalRef = useRef<HTMLElement[] | null>(null);

  useEffect(() => {
    // Rows live outside this component, so reach for them from the document.
    const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-search]"));
    if (!originalRef.current) originalRef.current = rows.slice();
    const original = originalRef.current;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const setStatus = (m: string) => { if (statusRef.current) statusRef.current.textContent = m; };

    const restoreOrder = () => {
      const parent = original[0]?.parentElement;
      if (!parent) return;
      if (original.every((r, i) => parent.children[i] === r)) return;
      for (const r of original) parent.appendChild(r);
    };

    // The filter pills carry static totals. While a query is active, rewrite
    // each pill's number to how many rows of that cut match the query, so the
    // pills read as "what kinds of thing matched". Cleared query: totals back.
    const updatePills = () => {
      for (const pill of document.querySelectorAll<HTMLElement>("[data-count-for]")) {
        const tag = pill.dataset.countFor ?? "";
        if (!terms.length) { pill.textContent = pill.dataset.count ?? ""; continue; }
        let n = 0;
        for (const r of rows) {
          if (r.getAttribute("data-hit") !== "1") continue;
          if ((r.dataset.tags ?? "").split(/\s+/).includes(tag)) n++;
        }
        pill.textContent = String(n);
      }
    };

    const report = () => {
      updatePills();
      let shown = 0;
      for (const r of rows) if (getComputedStyle(r).display !== "none") shown++;
      if (!countRef.current) return;
      countRef.current.textContent = !terms.length ? ""
        : shown === 0 ? `no ${noun} match`
        : `${shown} of ${rows.length}`;
    };

    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!terms.length) {
      for (const r of rows) r.removeAttribute("data-hit");
      restoreOrder();
      setStatus("");
      report();
    } else if (mode === "keyword") {
      restoreOrder();
      setStatus("");
      for (const r of rows) {
        const hay = r.dataset.search ?? "";
        r.setAttribute("data-hit", terms.every((t) => hay.includes(t)) ? "1" : "0");
      }
      report();
    } else {
      timer = setTimeout(async () => {
        try {
          const qv = await embedQuery(q.trim(), setStatus);
          if (!live) return;
          const scored = rows.map((r) => ({ r, s: (() => { const v = unpackAttr(r.dataset.vec); return v ? cosine(qv, v) : -1; })() }));
          const parent = rows[0]?.parentElement;
          const cut = matchCutoff(scored.map((x) => x.s));
          const ranked = scored.filter((x) => x.s >= cut).sort((a, b) => b.s - a.s);
          for (const x of scored) x.r.setAttribute("data-hit", x.s >= cut ? "1" : "0");
          if (parent) for (const x of ranked) parent.appendChild(x.r);
          setStatus("");
          report();
        } catch {
          if (live) setStatus("meaning search unavailable (model failed to load)");
        }
      }, 250);
    }

    // The filter bar hides rows independently, so the count goes stale when a
    // filter changes and the query does not. Watch the wrapper's attribute and
    // recount.
    const wrapper = document.querySelector("[data-filter]");
    const obs = wrapper ? new MutationObserver(report) : null;
    obs?.observe(wrapper!, { attributes: true, attributeFilter: ["data-filter"] });
    return () => { live = false; if (timer) clearTimeout(timer); obs?.disconnect(); };
  }, [q, mode, noun]);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === "meaning" ? `Describe the ${noun} you want…` : placeholder ?? `Filter ${noun}…`}
          aria-label={`Filter ${noun} on this page`}
          className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
        />
        <SearchModeToggle mode={mode} onChange={setMode} />
        <span ref={countRef} aria-live="polite" className="text-xs text-neutral-500" />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:border-neutral-500 dark:border-neutral-700"
          >
            Clear
          </button>
        )}
      </div>
      <span ref={statusRef} aria-live="polite" className="block text-xs text-neutral-500 empty:hidden" />
    </div>
  );
}
