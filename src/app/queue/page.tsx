import { candidateUrl, loadQueue } from "@/lib/queue";

export const metadata = { title: "Review queue" };

function ScorePill({ score }: { score: number }) {
  const tone = score >= 15
    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
    : score >= 8
      ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400";
  return <span className={`inline-flex min-w-8 justify-center rounded px-1.5 py-0.5 text-xs font-medium tabular-nums ${tone}`}>{score}</span>;
}

export default function QueuePage() {
  const { candidates, windows, generatedAt } = loadQueue();

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Review queue</h1>
        <p className="max-w-3xl text-sm text-neutral-500">
          Stage-1 ingestion candidates from OpenAlex, filtered to arXiv and ranked by a free
          keyword heuristic. <strong className="font-medium text-neutral-600 dark:text-neutral-400">Nothing
          here is in the catalog</strong> &mdash; these are unreviewed papers awaiting triage, and
          the score only orders the list. A low score is not a rejection.
        </p>
        <p className="text-xs text-neutral-500">
          {candidates.length} candidates · window{windows.length > 1 ? "s" : ""} {windows.join(", ")}
          {generatedAt ? ` · generated ${generatedAt}` : ""}
        </p>
      </div>

      {candidates.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Queue is empty. Run <code className="font-mono">node scripts/fetch-openalex.mjs</code> to populate it.
        </p>
      ) : (
        <ul className="space-y-3">
          {candidates.map((c) => {
            const url = candidateUrl(c);
            return (
              <li key={c.openalex_id} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-start gap-3">
                  <ScorePill score={c.score ?? 0} />
                  <div className="min-w-0 flex-1">
                    {url ? (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{c.title}</a>
                    ) : (
                      <span className="font-medium">{c.title}</span>
                    )}
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {c.date}
                      {c.authors?.length ? ` · ${c.authors[0]}${c.authors.length > 1 ? " et al." : ""}` : ""}
                      {c.arxiv_id ? ` · arXiv:${c.arxiv_id}` : ""}
                      {c.topic ? ` · ${c.topic}` : ""}
                    </div>
                    {c.signals?.length ? (
                      <div className="mt-1 font-mono text-[11px] text-neutral-400 dark:text-neutral-600">{c.signals.join(" ")}</div>
                    ) : null}
                    {c.abstract ? (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">Abstract</summary>
                        <p className="mt-1 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{c.abstract}</p>
                      </details>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
