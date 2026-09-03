import Link from "next/link";
import { notFound } from "next/navigation";
import { claimsFor, getContext, getGroup, getModel, getPaper, getWeakness, getWeaknesses, techniquesFor } from "@/lib/catalog";
import type { Evidence } from "@/lib/catalog";

export function generateStaticParams() {
  return getWeaknesses().map((w) => ({ id: w.id }));
}

export async function generateMetadata({ params }: PageProps<"/weaknesses/[id]">) {
  const { id } = await params;
  return { title: getWeakness(id)?.label ?? "Weakness" };
}

function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <ul className="space-y-2">
      {evidence.map((e) => {
        const p = getPaper(e.paper);
        return (
          <li key={e.paper} className="text-sm">
            <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${e.stance === "supports" ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200" : "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200"}`}>{e.stance}</span>
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

export default async function WeaknessPage({ params }: PageProps<"/weaknesses/[id]">) {
  const { id } = await params;
  const w = getWeakness(id);
  if (!w) notFound();
  const techniques = techniquesFor(w.id);
  const claims = claimsFor(w.id);
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <div className="text-sm text-neutral-500">{getGroup(w.group)?.label} · <code className="font-mono">{w.id}</code> · {w.status}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{w.label}</h1>
        <p className="text-lg text-neutral-700 dark:text-neutral-300">{w.summary}</p>
        {w.aliases?.length ? <p className="text-sm text-neutral-500">Also called: {w.aliases.join(", ")}</p> : null}
        <p className="text-sm text-neutral-500">Contexts: {w.contexts.map((c) => getContext(c)?.label ?? c).join(", ")}</p>
      </header>
      <section className="grid gap-6 md:grid-cols-2">
        <div><h2 className="mb-1 font-semibold">What good looks like</h2><p className="text-sm text-neutral-700 dark:text-neutral-300">{w.description}</p></div>
        <div><h2 className="mb-1 font-semibold">What the failure looks like</h2><p className="text-sm text-neutral-700 dark:text-neutral-300">{w.failure_looks_like}</p></div>
      </section>
      <section><h2 className="mb-2 font-semibold">Evidence</h2><EvidenceList evidence={w.evidence} /></section>
      <section>
        <h2 className="mb-2 font-semibold">Techniques that address it</h2>
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
            <thead className="text-left text-neutral-500"><tr><th>Model</th><th>Context</th><th>Observed</th><th>Severity</th><th>Status</th></tr></thead>
            <tbody>
              {claims.map((c) => {
                const m = getModel(c.model);
                const v = m?.versions.find((x) => x.id === c.version);
                return (
                  <tr key={c.id} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
                    <td className="py-1">{v?.label ?? c.version}</td>
                    <td className="py-1">{getContext(c.context)?.label ?? c.context}</td>
                    <td className="py-1">{c.observed_on}</td>
                    <td className="py-1">{c.severity}</td>
                    <td className="py-1">{c.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      {w.related?.length ? (
        <section className="text-sm"><span className="font-semibold">Related: </span>
          {w.related.map((r, i) => <span key={r}>{i > 0 && ", "}<Link href={`/weaknesses/${r}`} className="hover:underline">{getWeakness(r)?.label ?? r}</Link></span>)}
        </section>
      ) : null}
    </article>
  );
}
