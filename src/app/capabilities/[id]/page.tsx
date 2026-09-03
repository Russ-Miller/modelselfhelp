import Link from "next/link";
import { notFound } from "next/navigation";
import { claimsFor, getCapability, getCapabilities, getContext, getGroup, getModel, getPaper, techniquesFor } from "@/lib/catalog";
import type { Evidence } from "@/lib/catalog";

export function generateStaticParams() {
  return getCapabilities().map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/capabilities/[id]">) {
  const { id } = await params;
  return { title: getCapability(id)?.label ?? "Capability" };
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <ul className="space-y-2">
      {evidence.map((e) => {
        const p = getPaper(e.paper);
        return (
          <li key={e.paper} className="text-sm">
            {p ? <a href={p.url} className="font-medium hover:underline">{p.title}</a> : e.paper}
            {p && <span className="text-neutral-500"> ({p.authors[0]}{p.authors.length > 1 ? " et al." : ""}, {p.year})</span>}
            {e.strength && <span className="ml-2 text-xs text-neutral-500">{e.strength}</span>}
            <div className="text-neutral-600 dark:text-neutral-400">{e.note}</div>
          </li>
        );
      })}
    </ul>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 7 ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"
    : score >= 4 ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
    : "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200";
  return <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${color}`}>{score}/10</span>;
}

export default async function CapabilityPage({ params }: PageProps<"/capabilities/[id]">) {
  const { id } = await params;
  const c = getCapability(id);
  if (!c) notFound();
  const techniques = techniquesFor(c.id);
  const claims = claimsFor(c.id);
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <div className="text-sm text-neutral-500">{getGroup(c.group)?.label} · <code className="font-mono">{c.id}</code> · {c.status}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{c.label}</h1>
        <p className="text-lg text-neutral-700 dark:text-neutral-300">{c.summary}</p>
        {c.aliases?.length ? <p className="text-sm text-neutral-500">Also called: {c.aliases.join(", ")}</p> : null}
        <p className="text-sm text-neutral-500">Contexts: {c.contexts.map((ctx) => getContext(ctx)?.label ?? ctx).join(", ")}</p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        <div><h2 className="mb-1 font-semibold">Strong performance (near 10/10)</h2><p className="text-sm text-neutral-700 dark:text-neutral-300">{c.strong_performance_looks_like}</p></div>
        <div><h2 className="mb-1 font-semibold">Weak performance (near 1/10)</h2><p className="text-sm text-neutral-700 dark:text-neutral-300">{c.weak_performance_looks_like}</p></div>
      </section>
      <section><h2 className="mb-1 font-semibold">What good looks like, generally</h2><p className="text-sm text-neutral-700 dark:text-neutral-300">{c.description}</p></section>
      <section><h2 className="mb-2 font-semibold">Evidence</h2><EvidenceList evidence={c.evidence} /></section>
      <section>
        <h2 className="mb-2 font-semibold">Techniques that improve it</h2>
        {techniques.length === 0 ? <p className="text-sm text-neutral-500">None yet. Contribute one.</p> : (
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
      <section>
        <h2 className="mb-2 font-semibold">Claims by model version and context</h2>
        {claims.length === 0 ? <p className="text-sm text-neutral-500">No claims recorded yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-neutral-500"><tr><th>Model</th><th>Context</th><th>Score</th><th>Observed</th><th>Status</th></tr></thead>
            <tbody>
              {claims.map((claim) => {
                const m = getModel(claim.model);
                const v = m?.versions.find((x) => x.id === claim.version);
                return (
                  <tr key={claim.id} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
                    <td className="py-1">{v?.label ?? claim.version}</td>
                    <td className="py-1">{getContext(claim.context)?.label ?? claim.context}</td>
                    <td className="py-1"><ScoreBadge score={claim.score} /></td>
                    <td className="py-1">{claim.observed_on}</td>
                    <td className="py-1">{claim.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
