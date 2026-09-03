import Link from "next/link";
import { notFound } from "next/navigation";
import { claimsFor, getCapabilities, getCapability, techniquesFor } from "@/lib/catalog";
import { ContestedBadge, KindBadge, StrengthBadge } from "@/components/badges";

export function generateStaticParams() {
  return getCapabilities().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/capabilities/[id]">) {
  const { id } = await params;
  return { title: getCapability(id)?.label ?? "Capability" };
}

export default async function CapabilityPage({ params }: PageProps<"/capabilities/[id]">) {
  const { id } = await params;
  const c = getCapability(id);
  if (!c) notFound();
  const claims = claimsFor(c.id);
  const techniques = techniquesFor(c.id);
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <div className="text-sm text-neutral-500"><code className="font-mono">{c.id}</code> &middot; {c.status}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{c.label}</h1>
        <p className="text-lg text-neutral-700 dark:text-neutral-300">{c.summary}</p>
        {c.aliases?.length ? <p className="text-sm text-neutral-500">Also called: {c.aliases.join(", ")}</p> : null}
        {c.tags?.length ? <p className="text-sm text-neutral-500">Tags: {c.tags.join(", ")}</p> : null}
      </header>
      <p className="text-sm text-neutral-700 dark:text-neutral-300 max-w-2xl">{c.description}</p>
      <section>
        <h2 className="mb-2 font-semibold">Claims</h2>
        {claims.length === 0 ? <p className="text-sm text-neutral-500">No claims filed yet.</p> : (
          <ul className="space-y-3">
            {claims.map((claim) => (
              <li key={claim.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <KindBadge kind={claim.kind} />
                  <StrengthBadge strength={claim.backing_strength} />
                  {claim.contested && <ContestedBadge />}
                </div>
                <Link href={`/claims/${claim.id}`} className="text-sm hover:underline">{claim.statement}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Techniques</h2>
        {techniques.length === 0 ? <p className="text-sm text-neutral-500">None yet.</p> : (
          <ul className="space-y-2">
            {techniques.map((t) => (
              <li key={t.id} className="text-sm">
                <Link href={`/techniques/${t.id}`} className="font-medium hover:underline">{t.label}</Link>
                <span className="ml-2 text-xs text-neutral-500">{t.kind}{t.status !== "accepted" ? ` · ${t.status}` : ""}</span>
                <div className="text-neutral-600 dark:text-neutral-400">{t.summary}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {c.related?.length ? (
        <section className="text-sm"><span className="font-semibold">Related: </span>
          {c.related.map((r, i) => <span key={r}>{i > 0 && ", "}<Link href={`/capabilities/${r}`} className="hover:underline">{getCapability(r)?.label ?? r}</Link></span>)}
        </section>
      ) : null}
    </article>
  );
}
