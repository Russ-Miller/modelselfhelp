"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

type Verdict = "" | "accept" | "edit" | "reject";
const KEY = "msh-draft-verdicts";

type Store = Record<string, { v: Verdict; note: string }>;

function load(): Store {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}
function save(all: Store) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* private window, ignore */ }
  for (const l of listeners) l();
}

// localStorage as an external store, so nothing has to be mirrored into state
// and synced back in an effect -- the cascading-render pattern React warns
// about. getSnapshot must return a stable reference or it loops, hence the
// cached raw string.
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedParsed: Store = {};

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => { listeners.delete(cb); window.removeEventListener("storage", cb); };
}
function snapshot(): Store {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (raw !== cachedRaw) { cachedRaw = raw; cachedParsed = load(); }
  return cachedParsed;
}
const EMPTY: Store = {};
const useVerdicts = () => useSyncExternalStore(subscribe, snapshot, () => EMPTY);

const CHOICES: { v: Verdict; label: string; hint: string }[] = [
  { v: "accept", label: "Accept", hint: "File it as written" },
  { v: "edit", label: "Edit", hint: "Right paper, wrong wording — say what to change" },
  { v: "reject", label: "Reject", hint: "Do not file" },
];

/**
 * The site is static and has no write path, so a verdict cannot be POSTed
 * anywhere. It is kept in this browser and exported as text to paste back into
 * the conversation. That is the honest design for a read-only site, and it
 * keeps the review itself — which is the actual bottleneck — down to three
 * clicks per draft.
 */
export function DraftVerdict({ id }: { id: string }) {
  const all = useVerdicts();
  const { v = "", note = "" } = all[id] ?? {};

  const persist = useCallback((nv: Verdict, nn: string) => {
    const next = { ...load() };
    next[id] = { v: nv, note: nn };
    save(next);
  }, [id]);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3 dark:border-neutral-800">
      {CHOICES.map((c) => (
        <button
          key={c.v}
          type="button"
          title={c.hint}
          aria-pressed={v === c.v}
          onClick={() => persist(v === c.v ? "" : c.v, note)}
          className={[
            "rounded-full border px-3 py-1 text-xs transition-colors",
            v === c.v
              ? c.v === "reject"
                ? "border-red-600 bg-red-600 text-white"
                : c.v === "edit"
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-emerald-600 bg-emerald-600 text-white"
              : "border-neutral-300 text-neutral-700 hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-300",
          ].join(" ")}
        >
          {c.label}
        </button>
      ))}
      <input
        value={note}
        onChange={(e) => persist(v, e.target.value)}
        placeholder="note — what to change, or why not"
        className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
      />
    </div>
  );
}

/** Collects every verdict in this browser into text to paste back. */
export function VerdictExport({ ids }: { ids: string[] }) {
  const [out, setOut] = useState("");

  function build() {
    const all = load();
    const lines = ids
      .map((id) => ({ id, ...(all[id] ?? { v: "", note: "" }) }))
      .filter((r) => r.v)
      .map((r) => `${r.id}: ${r.v}${r.note ? ` — ${r.note}` : ""}`);
    const undecided = ids.filter((id) => !all[id]?.v);
    setOut(
      (lines.length ? lines.join("\n") : "(nothing marked yet)") +
      (undecided.length ? `\n\nundecided: ${undecided.join(", ")}` : "")
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={build}
          className="rounded-full border border-neutral-900 bg-neutral-900 px-3 py-1 text-xs text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900">
          Collect verdicts
        </button>
        {out && (
          <button type="button" onClick={() => navigator.clipboard?.writeText(out)}
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs dark:border-neutral-700">
            Copy
          </button>
        )}
      </div>
      {out && (
        <pre className="overflow-x-auto whitespace-pre-wrap rounded border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-900">{out}</pre>
      )}
    </div>
  );
}
