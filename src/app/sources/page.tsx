import Link from "next/link";
import { claimsCiting, isQuietSource, sourcesByRecency } from "@/lib/catalog";
import { CitationBadge, StanceBadge } from "@/components/badges";

export const metadata = { title: "Sources" };

export default function SourcesPage() {
  const sources = sourcesByRecency();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sources</h1>
      <p className="text-sm text-neutral-500">
        Papers and my own observations, same schema either way. Sorted by when each was ingested into
        the catalog, most recent first. The citation badge shows recent activity (last 12 months) over
        total &mdash; a paper can stay well-cited while the field has moved past it.
      </p>
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr><th className="py-1">Source</th><th>Created</th><th>Ingested</th><th>Citations</th><th>Cited by</th></tr>
        </thead>
        <tbody>
          {sources.map((s) => {
            const citing = claimsCiting(s.id);
            const quiet = isQuietSource(s);
            return (
              <tr key={s.id} className={`border-t border-neutral-200 dark:border-neutral-800 align-top ${quiet ? "opacity-60" : ""}`}>
                <td className="py-2">
                  <Link href={`/sources/${s.id}`} className="font-medium hover:underline">{s.title}</Link>
                  <div className="text-xs text-neutral-500">{s.kind}{s.authors?.length ? ` · ${s.authors[0]}${s.authors.length > 1 ? " et al." : ""}` : ""}</div>
                </td>
                <td className="py-2 text-neutral-600 dark:text-neutral-400">{s.date ?? s.year ?? "—"}</td>
                <td className="py-2 text-neutral-600 dark:text-neutral-400">{s.ingested_at}</td>
                <td className="py-2"><CitationBadge source={s} /></td>
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
