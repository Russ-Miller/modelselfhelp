"use client";

import { useEffect, useState } from "react";

export interface FilterOption { value: string; label: string; count: number }

/**
 * Segmented filter over a server-rendered list. The list stays fully static:
 * rows carry `data-tags`, this flips `data-filter` on a wrapper, and rules in
 * globals.css hide the rows that do not match. Nothing here knows what a row
 * is, and no copy of the data is shipped for the filter to work over.
 *
 * The active filter is mirrored into the query string so a filtered view is
 * linkable -- which is what lets /open-questions point at the same cut of the
 * data inside the Capabilities and Techniques tabs. Read from
 * window.location on mount rather than useSearchParams(), which would force a
 * Suspense boundary on an otherwise static page.
 */
export function FilterBar({
  options,
  param = "filter",
  children,
}: {
  options: FilterOption[];
  param?: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState("all");

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get(param);
    if (v && options.some((o) => o.value === v && o.count > 0)) setActive(v);
  }, [options, param]);

  function pick(value: string) {
    setActive(value);
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete(param);
    else url.searchParams.set(param, value);
    window.history.replaceState(null, "", url);
  }

  const all: FilterOption[] = [{ value: "all", label: "All", count: 0 }, ...options];

  return (
    <>
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter list">
        {all.map((o) => {
          const isActive = o.value === active;
          const empty = o.value !== "all" && o.count === 0;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              disabled={empty}
              aria-pressed={isActive}
              className={[
                "rounded-full border px-3 py-1 text-xs transition-colors",
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : empty
                    ? "cursor-not-allowed border-neutral-200 text-neutral-400 dark:border-neutral-800 dark:text-neutral-600"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500",
              ].join(" ")}
            >
              {o.label}
              {o.value !== "all" && (
                <span className={isActive ? "ml-1.5 opacity-70" : "ml-1.5 text-neutral-500"}>{o.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div data-filter={active}>{children}</div>
    </>
  );
}
