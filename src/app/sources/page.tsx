import Link from "next/link";
import { claimsCiting, isQuietSource, sourcesByRecency } from "@/lib/catalog";
import { CitationSignal, StanceBadge } from "@/components/badges";

export const metadata = { title: "Sources" };

export default function SourcesPage() {
  const sources = sourcesByRecency();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sources</h1>
      <p className="text-sm text-neutral-500">
        Papers and my own observations, same schema either way. Sorted by when each was ingested into
        the catalog, most recent first. The activity bars show how much the field has cited each
        source in the last 12 months &mdash; hover for exact counts. A paper can stay well-cited
        overall while recent activity has moved past it.
      </p>
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-1 pr-4">Source</th>
            <th className="py-1 pr-4 whitespace-nowrap">Created</th>
            <th className="py-1 pr-4 whitespace-nowrap">Ingested</th>
            <th className="py-1 pr-4 whitespace-nowrap">Activity</th>
            <th className="py-1">Cited by</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((s) => {
            const citing = claimsCiting(s.id);
            const quiet = isQuietSource(s);
            return (
              <tr key={s.id} className={`border-t border-neutral-200 dark:border-neutral-800 align-top ${quiet ? "opacity-60" : ""}`}>
                <td className="py-2 pr-4">
                  <Link href={`/sources/${s.id}`} className="font-medium hover:underline">{s.title}</Link>
                  <div className="text-xs text-neutral-500">{s.kind}{s.authors?.length ? ` · ${s.authors[0]}${s.authors.length > 1 ? " et al." : ""}` : ""}</div>
                </td>
                <td className="py-2 pr-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">{s.date ?? s.year ?? "—"}</td>
                <td className="py-2 pr-4 whitespace-nowrap text-neutral-600 dark:text-neutral-400">{s.ingested_at}</td>
                <td className="py-2 pr-4"><CitationSignal source={s} /></td>
                <td className="py-2">
                  {citing.length === 0 ? <span className="text-neutral-400">none yet</span> : (
                    <div className="flex flex-wrap gap-1.5">
                      {citing.map(({ claim, stance }) => (
                        <Link key={claim.id} href={`/claims/${claim.id}`} title={claim.statement}>
                          <StanceBadge stance={stance} />
                        </Link>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
