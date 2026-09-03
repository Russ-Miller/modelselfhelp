import Link from "next/link";
import { getCapability, getClaims, getSource } from "@/lib/catalog";
import { ContestedBadge, KindBadge, StanceBadge, StrengthBadge } from "@/components/badges";

export const metadata = { title: "Claims" };

export default function ClaimsPage() {
  const claims = [...getClaims()].sort((a, b) => a.statement.localeCompare(b.statement));
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Claims</h1>
      <p className="text-sm text-neutral-500">
        Directional, scoped statements &mdash; the actual content. Each shows which capability it sits
        under and which sources support or contest it.
      </p>
      <ul className="space-y-4">
        {claims.map((c) => {
          const cap = getCapability(c.capability);
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
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {c.sources.map((s) => {
                  const src = getSource(s.source);
                  return (
                    <li key={s.source} className="flex items-center gap-1.5">
                      <StanceBadge stance={s.stance} />
                      <Link href={`/sources/${s.source}`} className="hover:underline text-neutral-700 dark:text-neutral-300">{src?.title ?? s.source}</Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
