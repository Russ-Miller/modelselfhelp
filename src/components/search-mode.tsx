"use client";

export type SearchMode = "keyword" | "meaning";

/** Segmented toggle shared by the home search and the list filters. */
export function SearchModeToggle({ mode, onChange }: { mode: SearchMode; onChange: (m: SearchMode) => void }) {
  return (
    <div role="group" aria-label="Search mode" className="inline-flex overflow-hidden rounded border border-neutral-300 text-xs dark:border-neutral-700">
      {(["keyword", "meaning"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
          title={m === "meaning" ? "Rank by what the text means, not the words it uses. Loads a small model in your browser the first time." : "Every word must appear."}
          className={
            mode === m
              ? "bg-neutral-900 px-2.5 py-1 text-white dark:bg-neutral-100 dark:text-neutral-900"
              : "px-2.5 py-1 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          }
        >
          {m === "keyword" ? "Keyword" : "Meaning"}
        </button>
      ))}
    </div>
  );
}
