import Link from "next/link";
import { notFound } from "next/navigation";
import { getCapability, getClaim, getClaims, getModel, getSource, getTagLabel } from "@/lib/catalog";
import { ContestedBadge, KindBadge, StanceBadge, StrengthBadge } from "@/components/badges";

export function generateStaticParams() {
  return getClaims().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/claims/[id]">) {
  const { id } = await params;
  const c = getClaim(id);
  return { title: c ? c.statement.slice(0, 60) : "Claim" };
}

export default async function ClaimPage({ params }: PageProps<"/claims/[id]">) {
  const { id } = await params;
  const c = getClaim(id);
  if (!c) notFound();
  const cap = getCapability(c.capability);
  const modelObj = c.observed_on?.model ? getModel(c.observed_on.model) : undefined;
  return (
    <article className="space-y-6 max-w-2xl">
      <header className="space-y-2">
        <div className="text-sm text-neutral-500"><code className="font-mono">{c.id}</code></div>
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={c.kind} />
          <StrengthBadge strength={c.backing_strength} />
          {c.contested && <ContestedBadge />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{c.statement}</h1>
        <p className="text-sm text-neutral-500">
          Capability: <Link href={`/capabilities/${c.capability}`} className="hover:underline">{cap?.label ?? c.capability}</Link>
          {c.tags?.length ? <> &middot; {c.tags.map(getTagLabel).join(", ")}</> : null}
        </p>
      </header>

      {c.observed_on && (c.observed_on.model || c.observed_on.era || c.observed_on.task_type) && (
        <section className="text-sm">
          <h2 className="font-semibold mb-1">Observed on</h2>
          <p className="text-neutral-700 dark:text-neutral-300">
            {modelObj && <>{modelObj.label}. </>}
            {c.observed_on.era && <>{c.observed_on.era}. </>}
            {c.observed_on.task_type && <>{getTagLabel(c.observed_on.task_type)}.</>}
          </p>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Sources</h2>
        <ul className="space-y-3">
          {c.sources.map((s) => {
            const src = getSource(s.source);
            return (
              <li key={s.source} className="text-sm">
                <div className="flex items-center gap-2 mb-0.5">
                  <StanceBadge stance={s.stance} />
                  {src ? (
                    <a href={src.url ?? `#${src.id}`} className="font-medium hover:underline">{src.title}</a>
                  ) : s.source}
                </div>
                <div className="text-neutral-600 dark:text-neutral-400 ml-1">{s.note}</div>
              </li>
            );
          })}
        </ul>
      </section>

      {c.contested && c.disagreement_axis && (
        <section className="rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm">
          <h2 className="font-semibold mb-1">Suspected axis of disagreement{c.disagreement_axis.is_guess && <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-400">(a guess, not verified)</span>}</h2>
          <p className="text-neutral-700 dark:text-neutral-300">{c.disagreement_axis.description}</p>
        </section>
      )}

      <section className="text-sm text-neutral-500 flex flex-wrap gap-x-6 gap-y-1">
        <span>Status: {c.status}</span>
        <span>Last checked: {c.last_checked_at}</span>
        {c.last_new_evidence_at && <span>New evidence: {c.last_new_evidence_at}</span>}
        {c.superseded_by && <span>Superseded by <Link href={`/claims/${c.superseded_by}`} className="hover:underline">{c.superseded_by}</Link></span>}
      </section>

      {c.notes && (
        <section className="text-sm">
          <h2 className="font-semibold mb-1">Notes</h2>
          <p className="text-neutral-700 dark:text-neutral-300">{c.notes}</p>
        </section>
      )}
    </article>
  );
}
