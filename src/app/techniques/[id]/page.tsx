import Link from "next/link";
import { notFound } from "next/navigation";
import { getSource, getTagLabel, getTechnique, getTechniques, getCapability } from "@/lib/catalog";

export function generateStaticParams() {
  return getTechniques().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/techniques/[id]">) {
  const { id } = await params;
  return { title: getTechnique(id)?.label ?? "Technique" };
}

export default async function TechniquePage({ params }: PageProps<"/techniques/[id]">) {
  const { id } = await params;
  const t = getTechnique(id);
  if (!t) notFound();
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <div className="text-sm text-neutral-500">{t.kind} · <code className="font-mono">{t.id}</code> · {t.status}</div>
        <h1 className="text-3xl font-semibold tracking-tight">{t.label}</h1>
        <p className="text-lg text-neutral-700 dark:text-neutral-300">{t.summary}</p>
      </header>
      <p className="text-sm text-neutral-700 dark:text-neutral-300">{t.description}</p>
      {t.caveats && <p className="text-sm"><span className="font-semibold">Caveats: </span>{t.caveats}</p>}
      <section className="text-sm"><span className="font-semibold">Addresses: </span>
        {t.addresses.map((a, i) => <span key={a}>{i > 0 && ", "}<Link href={`/capabilities/${a}`} className="hover:underline">{getCapability(a)?.label ?? a}</Link></span>)}
      </section>
      {t.contexts?.length ? <p className="text-sm text-neutral-500">Contexts: {t.contexts.map(getTagLabel).join(", ")}</p> : null}
      <section>
        <h2 className="mb-2 font-semibold">Code</h2>
        {t.repos?.length ? (
          <ul className="space-y-1 text-sm">
            {t.repos.map((r) => (
              <li key={r.url}><a href={r.url} className="font-mono hover:underline">{r.url}</a>
                <span className="text-neutral-600 dark:text-neutral-400"> — {r.note}</span>
                {r.verified_on && <span className="ml-1 text-xs text-neutral-500">verified {r.verified_on}</span>}</li>
            ))}
          </ul>
        ) : <p className="text-sm text-neutral-500">No repository linked yet. Contribute one.</p>}
      </section>
      {t.sources?.length ? (
        <section>
          <h2 className="mb-2 font-semibold">Sources</h2>
          <ul className="space-y-1 text-sm">
            {t.sources.map((sid) => { const s = getSource(sid); return s ? <li key={sid}><Link href={`/sources/${sid}`} className="hover:underline">{s.title}</Link> {s.year && <span className="text-neutral-500">({s.year})</span>}</li> : null; })}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
