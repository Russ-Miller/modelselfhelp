"use client";

import { useState } from "react";

/**
 * Filters a server-rendered list down to contested rows without duplicating
 * the data client-side. The list stays fully static; this only flips a
 * `data-filter` attribute on a wrapper, and CSS in globals.css hides rows
 * marked `data-contested="false"`. Nothing here needs to know what a row is.
 */
export function ContestedFilter({ count, noun, children }: { count: number; noun: string; children: React.ReactNode }) {
  const [only, setOnly] = useState(false);
  const disabled = count === 0;
  return (
    <>
      <label className={`inline-flex items-center gap-2 text-sm ${disabled ? "text-neutral-400" : "text-neutral-600 dark:text-neutral-400"}`}>
        <input
          type="checkbox"
          className="h-4 w-4 accent-amber-600"
          checked={only}
          disabled={disabled}
          onChange={(e) => setOnly(e.target.checked)}
        />
        Only contested
        <span className="text-xs text-neutral-500">
          {disabled ? `no contested ${noun} yet` : `${count} ${noun}`}
        </span>
      </label>
      <div data-filter={only ? "contested" : "all"}>{children}</div>
    </>
  );
}
