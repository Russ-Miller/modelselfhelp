import type { BackingStrength, ClaimKind, Source, Stance } from "@/lib/catalog";

const base = "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium";

export function StanceBadge({ stance }: { stance: Stance }) {
  return stance === "supports" ? (
    <span className={`${base} bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200`}>
      <span aria-hidden>&uarr;</span> supports
    </span>
  ) : (
    <span className={`${base} bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200`}>
      <span aria-hidden>&darr;</span> contests
    </span>
  );
}

export function KindBadge({ kind }: { kind: ClaimKind }) {
  return kind === "mechanism" ? (
    <span className={`${base} bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-200`}>mechanism</span>
  ) : (
    <span className={`${base} bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200`}>observation</span>
  );
}

const STRENGTH_LABEL: Record<BackingStrength, string> = {
  "single-paper": "single paper",
  replicated: "replicated",
  "mechanism-reasoning": "mechanism reasoning",
  "own-observation": "own observation",
};

export function StrengthBadge({ strength }: { strength: BackingStrength }) {
  return <span className={`${base} bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300`}>{STRENGTH_LABEL[strength]}</span>;
}

export function ContestedBadge() {
  return <span className={`${base} bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200`}>contested</span>;
}

/**
 * Compact citation-activity + age signal for a source: recent citation
 * count, total, and publication year, colored by how actively the field
 * is still citing it. Renders nothing if we haven't checked yet.
 */
export function CitationBadge({ source }: { source: Source }) {
  if (!source.citations_checked_at) return null;
  const recent = source.citations_recent_12mo ?? 0;
  const total = source.citations_total ?? 0;
  const year = source.year ?? (source.date ? source.date.slice(0, 4) : undefined);
  const tone = recent > 0
    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
    : total > 0
      ? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
      : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500";
  const title = `${total} citation${total === 1 ? "" : "s"} total, ${recent} in the last 12 months` + (year ? `, published ${year}` : "") + ` (checked ${source.citations_checked_at})` + (source.semantic_scholar_id ? " — via Semantic Scholar, click to view" : "");
  const content = <>{recent}/12mo &middot; {total} total{year ? ` · ${year}` : ""}</>;
  return source.semantic_scholar_id ? (
    <a href={`https://www.semanticscholar.org/paper/${source.semantic_scholar_id}`} target="_blank" rel="noopener noreferrer" className={`${base} ${tone} hover:underline`} title={title}>
      {content}
    </a>
  ) : (
    <span className={`${base} ${tone}`} title={title}>{content}</span>
  );
}
