import Link from "next/link";
import { loadCatalog, weaknessesByGroup } from "@/lib/catalog";

export default function Home() {
  const cat = loadCatalog();
  const groups = weaknessesByGroup();
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Where models fall short, and what to do about it</h1>
        <p className="max-w-2xl text-neutral-600 dark:text-neutral-400">
          A catalog of model weaknesses, each tied to the papers that show it, the papers that counter it,
          and techniques with runnable code that mitigate it. Scoped by model version and usage context.
          Readable by humans and by agents.
        </p>
        <dl className="flex flex-wrap gap-6 text-sm">
          {[
            ["weaknesses", cat.weaknesses.length], ["techniques", cat.techniques.length],
            ["papers", cat.papers.length], ["claims", cat.claims.length],
          ].map(([k, n]) => (
            <div key={k}><dt className="text-neutral-500">{k}</dt><dd className="text-xl font-medium">{n}</dd></div>
          ))}
        </dl>
      </section>
      {groups.map(({ group, weaknesses }) => (
        <section key={group.id} className="space-y-2">
          <h2 className="text-lg font-semibold">{group.label}</h2>
          <p className="text-sm text-neutral-500">{group.description}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {weaknesses.map((w) => (
              <li key={w.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-3">
                <Link href={`/weaknesses/${w.id}`} className="font-medium hover:underline">{w.label}</Link>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{w.summary}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
