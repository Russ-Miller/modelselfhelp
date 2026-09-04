import Link from "next/link";
import { getCapability, getClaims, getSource, isQuietSource } from "@/lib/catalog";
import type { SourceLink } from "@/lib/catalog";
import { CitationBadge, ContestedBadge, KindBadge, StanceBadge, StrengthBadge } from "@/components/badges";

export const metadata = { title: "Claims" };

function SourceRow({ link }: { link: SourceLink }) {
  const src = getSource(link.source);
  return (
    <li className="flex flex-wrap items-center gap-1.5">
      <StanceBadge stance={link.stance} />
      <Link href={`/sources/${link.source}`} className="hover:underline text-neutral-700 dark:text-neutral-300">{src?.title ?? link.source}</Link>
      {src && <CitationBadge source={src} />}
    </li>
  );
}

export default function ClaimsPage() {
  const claims = [...getClaims()].sort((a, b) => a.statement.localeCompare(b.statement));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Claims</h1>
      <p className="text-sm text-neutral-500">
        Directional, scoped statements &mdash; the actual content. Each shows which capability it sits
        under and which sources support or contest it. Sources with no citations in the last 12 months
        and 2+ years old are tucked behind &ldquo;older sources&rdquo;.
      </p>
      <ul className="space-y-4">
        {claims.map((c) => {
          const cap = getCapability(c.capability);
          const active = c.sources.filter((s) => { const src = getSource(s.source); return !src || !isQuietSource(src); });
          const quiet = c.sources.filter((s) => { const src = getSource(s.source); return src && isQuietSource(src); });
          return (
            <li key={c.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <KindBadge kind={c.kind} />
                <StrengthBadge strength={c.backing_strength} />
                {c.contested && <ContestedBadge />}
                <span className="text-xs text-neutral-500">checked {c.last_checked_at}</span>
                {c.status !== "active" && <span className="text-xs text-neutral-500">&middot; {c.status}</span>}
              </div>
              <Link href={`/claims/${c.id}`} className="font-medium hover:underline">{c.statement}</Link>
              <div className="mt-2 text-sm text-neutral-500">
                Capability: <Link href={`/capabilities/${c.capability}`} className="hover:underline">{cap?.label ?? c.capability}</Link>
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {active.map((s) => <SourceRow key={s.source} link={s} />)}
              </ul>
              {quiet.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300">
                    +{quiet.length} older, quieter source{quiet.length > 1 ? "s" : ""}
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {quiet.map((s) => <SourceRow key={s.source} link={s} />)}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
