import Link from "next/link";
import { loadCatalog, capabilitiesByGroup, claimsByRecency, getCapability } from "@/lib/catalog";
import { KindBadge, StrengthBadge, ContestedBadge } from "@/components/badges";

export default function Home() {
  const cat = loadCatalog();
  const groups = capabilitiesByGroup();
  const recent = claimsByRecency().slice(0, 6);
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">A personal study of what LLMs are actually good and bad at</h1>
        <p className="max-w-2xl text-neutral-600 dark:text-neutral-400">
          Not a scoreboard &mdash; a set of directional, scoped claims, each tied to the sources that
          support or contest it. Capabilities are topics; claims are the actual findings.
        </p>
        <dl className="flex flex-wrap gap-6 text-sm">
          {[
            ["capabilities", cat.capabilities.length], ["claims", cat.claims.length],
            ["sources", cat.sources.length], ["techniques", cat.techniques.length],
          ].map(([k, n]) => (
            <div key={k}><dt className="text-neutral-500">{k}</dt><dd className="text-xl font-medium">{n}</dd></div>
          ))}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Most recently checked claims</h2>
        <ul className="space-y-2">
          {recent.map((c) => (
            <li key={c.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-3">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <KindBadge kind={c.kind} />
                <StrengthBadge strength={c.backing_strength} />
                {c.contested && <ContestedBadge />}
                <span className="text-xs text-neutral-500">checked {c.last_checked_at}</span>
              </div>
              <Link href={`/claims/${c.id}`} className="hover:underline">{c.statement}</Link>
              <div className="text-xs text-neutral-500 mt-1">
                <Link href={`/capabilities/${c.capability}`} className="hover:underline">{getCapability(c.capability)?.label ?? c.capability}</Link>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/claims" className="text-sm hover:underline">All claims &rarr;</Link>
      </section>

      {groups.map(({ group, capabilities }) => (
        <section key={group.id} className="space-y-2">
          <h2 className="text-lg font-semibold">{group.label}</h2>
          <p className="text-sm text-neutral-500">{group.description}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {capabilities.map((c) => (
              <li key={c.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-3">
                <Link href={`/capabilities/${c.id}`} className="font-medium hover:underline">{c.label}</Link>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{c.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
