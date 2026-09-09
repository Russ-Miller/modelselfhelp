"use client";

import { useEffect, useRef, useState } from "react";

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
 * Only the query is React state. The match count is written straight into a
 * span, because it is derived from the DOM the effect just touched, and
 * routing it back through setState is the cascading-render pattern React warns
 * about. An effect that updates an external system and reports what it did is
 * what effects are actually for.
 */
export function ListSearch({ noun = "rows", placeholder }: { noun?: string; placeholder?: string }) {
  const [q, setQ] = useState("");
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Rows live outside this component, so reach for them from the document.
    const rows = document.querySelectorAll<HTMLElement>("[data-search]");
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);

    for (const r of rows) {
      if (!terms.length) { r.removeAttribute("data-hit"); continue; }
      const hay = r.dataset.search ?? "";
      r.setAttribute("data-hit", terms.every((t) => hay.includes(t)) ? "1" : "0");
    }

    // Count what is actually on screen, not what matched the text. The filter
    // bar hides rows too, and reporting "6 of 160" above an empty list is
    // worse than reporting nothing.
    report();

    function report() {
      let shown = 0;
      for (const r of rows) if (getComputedStyle(r).display !== "none") shown++;
      if (!countRef.current) return;
      countRef.current.textContent = !terms.length ? ""
        : shown === 0 ? `no ${noun} match`
        : `${shown} of ${rows.length}`;
    }

    // The filter bar hides rows independently, so the count goes stale when a
    // filter changes and the query does not. Watch the wrapper's attribute and
    // recount.
    const wrapper = document.querySelector("[data-filter]");
    if (!wrapper) return;
    const obs = new MutationObserver(report);
    obs.observe(wrapper, { attributes: true, attributeFilter: ["data-filter"] });
    return () => obs.disconnect();
  }, [q, noun]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder ?? `Filter ${noun}…`}
        aria-label={`Filter ${noun} on this page`}
        className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-3 py-1.5 text-sm dark:border-neutral-700"
      />
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
  );
}
