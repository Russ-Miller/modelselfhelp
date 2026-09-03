import Link from "next/link";
import { notFound } from "next/navigation";
import { claimsCiting, getSource, getSources } from "@/lib/catalog";
import { StanceBadge } from "@/components/badges";

export function generateStaticParams() {
  return getSources().map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/sources/[id]">) {
  const { id } = await params;
  return { title: getSource(id)?.title ?? "Source" };
}

export default async function SourcePage({ params }: PageProps<"/sources/[id]">) {
  const { id } = await params;
  const s = getSource(id);
  if (!s) notFound();
  const citing = claimsCiting(s.id);
  return (
    <article className="space-y-6 max-w-2xl">
      <header className="space-y-2">
        <div className="text-sm text-neutral-500"><code className="font-mono">{s.id}</code> &middot; {s.kind}</div>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        {s.authors?.length ? <p className="text-sm text-neutral-600 dark:text-neutral-400">{s.authors.join(", ")}{s.venue ? ` — ${s.venue}` : ""}</p> : null}
        <p className="text-sm text-neutral-500">
          Created: {s.date ?? s.year ?? "unknown"} &middot; Ingested: {s.ingested_at}
        </p>
        {s.url && <a href={s.url} className="text-sm hover:underline">{s.url}</a>}
      </header>
      {s.summary && <p className="text-sm text-neutral-700 dark:text-neutral-300">{s.summary}</p>}
      <section>
        <h2 className="font-semibold mb-2">Cited by</h2>
        {citing.length === 0 ? <p className="text-sm text-neutral-500">No claims cite this yet.</p> : (
          <ul className="space-y-2">
            {citing.map(({ claim, stance }) => (
              <li key={claim.id} className="text-sm flex items-start gap-2">
                <StanceBadge stance={stance} />
                <Link href={`/claims/${claim.id}`} className="hover:underline">{claim.statement}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
