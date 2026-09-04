import Link from "next/link";
import { getCapability, getSource, openQuestions, unmitigatedCapabilities, type OpenKind, type OpenQuestion, type Unmitigated } from "@/lib/catalog";
import { StrengthBadge } from "@/components/badges";

export const metadata = { title: "Open questions" };

const SECTIONS: { kind: OpenKind; heading: string; blurb: string }[] = [
  {
    kind: "searched",
    heading: "Searched, still open",
    blurb:
      "I went looking for a study that isolates this technique and did not find one. Each entry records what was searched for and, where there was one, the nearest paper and why it does not actually support the technique. That is a research brief: the question, the dead end already walked, and what a clean experiment would have to separate.",
  },
  {
    kind: "unsearched",
    heading: "Not yet searched",
    blurb:
      "No efficacy claim filed and no search recorded — so this says nothing about the literature, only about this catalog. Do not read these as unstudied. The first useful move is to look, and to write down the result either way.",
  },
  {
    kind: "asserted-not-measured",
    heading: "Argued, not measured",
    blurb:
      "Backed only by reasoning about how the technique works, with no source measuring the effect. The mechanism may well be right; nobody has put a number on it. A weaker opening than silence, but a real one — and the easiest kind to mistake for settled.",
  },
];

function Entry({ q }: { q: OpenQuestion }) {
  const t = q.technique;
  const search = t.evidence_search;
  return (
    <li className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <Link href={`/techniques/${t.id}`} className="font-medium hover:underline">{t.label}</Link>
        <span className="text-xs text-neutral-500">{t.kind}</span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.summary}</p>
      <p className="mt-1 text-xs text-neutral-500">
        Would bear on{" "}
        {t.addresses.map((a, i) => (
          <span key={a}>
            {i > 0 && ", "}
            <Link href={`/capabilities/${a}`} className="hover:underline">{getCapability(a)?.label ?? a}</Link>
          </span>
        ))}
      </p>

      {search && (
        <div className="mt-3 space-y-2 border-l-2 border-neutral-300 pl-3 dark:border-neutral-700">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{search.note}</p>
          {search.nearest_miss?.map((m, i) => {
            const src = m.source ? getSource(m.source) : undefined;
            const title = src?.title ?? m.title ?? m.source;
            const href = src ? `/sources/${src.id}` : m.url;
            return (
              <div key={i} className="text-sm">
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Nearest miss</div>
                {href ? <a href={href} className="hover:underline">{title}</a> : <span>{title}</span>}
                <p className="text-neutral-600 dark:text-neutral-400">{m.why_it_does_not_fit}</p>
              </div>
            );
          })}
          <p className="text-xs text-neutral-500">searched {search.searched_on}</p>
        </div>
      )}

      {q.claims.length > 0 && (
        <ul className="mt-3 space-y-2 border-l-2 border-neutral-300 pl-3 dark:border-neutral-700">
          {q.claims.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="mb-0.5"><StrengthBadge strength={c.backing_strength} /></div>
              <Link href={`/claims/${c.id}`} className="hover:underline">{c.statement}</Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Unfixed({ u }: { u: Unmitigated }) {
  return (
    <li className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <Link href={`/capabilities/${u.capability.id}`} className="font-medium hover:underline">{u.capability.label}</Link>
        <span className="text-xs text-neutral-500">
          {u.claims.length} claim{u.claims.length === 1 ? "" : "s"} documenting it
        </span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{u.capability.summary}</p>
      <p className="mt-2 text-xs text-neutral-500">
        {u.techniques.length === 0 ? (
          "No technique catalogued against it at all."
        ) : (
          <>
            Catalogued but unmeasured:{" "}
            {u.techniques.map((t, i) => (
              <span key={t.id}>
                {i > 0 && ", "}
                <Link href={`/techniques/${t.id}`} className="hover:underline">{t.label}</Link>
              </span>
            ))}
          </>
        )}
      </p>
    </li>
  );
}

export default function OpenQuestionsPage() {
  const all = openQuestions();
  const unfixed = unmitigatedCapabilities();
  const noTechnique = unfixed.filter((u) => u.kind === "no-technique");
  const noneMeasured = unfixed.filter((u) => u.kind === "none-measured");
  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold">Open questions</h1>
        <p className="text-sm text-neutral-500">
          Where this catalog measures nothing &mdash; capabilities with a documented problem and no
          mitigation anybody has tested, and techniques in use that no claim backs. These are the
          gaps worth someone&rsquo;s time.
        </p>
        <p className="text-sm text-neutral-500">
          Each section says how strong the absence is, because they are not the same absence. A
          recorded search that came up empty is evidence about the literature; a technique nobody
          has looked into is only evidence about this catalog. Advertising the second as the first
          would be the unfalsifiable move this project already deleted once, when techniques carried
          a bare <code className="font-mono text-xs">status: accepted</code> &mdash; just inverted.
        </p>
        <p className="text-xs text-neutral-500">{all.length + unfixed.length} open</p>
      </div>

      <section className="space-y-3">
        <h2 className="border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
          Documented, nothing measured to fix it <span className="text-sm font-normal text-neutral-500">{unfixed.length}</span>
        </h2>
        <p className="max-w-3xl text-sm text-neutral-500">
          The other direction. Above asks whether a given technique works; this asks whether
          <em> anything</em> does. These capabilities carry claims establishing the problem, and no
          technique addressing them has an efficacy claim anybody measured &mdash; so a mitigation
          that held up would be new knowledge, not a replication.
        </p>
        {noTechnique.length > 0 && (
          <>
            <h3 className="pt-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              No technique catalogued <span className="font-normal text-neutral-500">{noTechnique.length}</span>
            </h3>
            <ul className="space-y-3">{noTechnique.map((u) => <Unfixed key={u.capability.id} u={u} />)}</ul>
          </>
        )}
        {noneMeasured.length > 0 && (
          <>
            <h3 className="pt-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Techniques catalogued, none measured <span className="font-normal text-neutral-500">{noneMeasured.length}</span>
            </h3>
            <p className="max-w-3xl text-xs text-neutral-500">
              Something is written down as a mitigation, but no claim in this catalog measures
              whether it moves the capability. The cheapest contribution here is a citation, not an
              experiment.
            </p>
            <ul className="space-y-3">{noneMeasured.map((u) => <Unfixed key={u.capability.id} u={u} />)}</ul>
          </>
        )}
      </section>

      <h2 className="border-b border-neutral-200 pb-1 pt-2 text-lg font-semibold dark:border-neutral-800">
        Techniques nothing measures <span className="text-sm font-normal text-neutral-500">{all.length}</span>
      </h2>

      {SECTIONS.map(({ kind, heading, blurb }) => {
        const items = all.filter((q) => q.kind === kind);
        return (
          <section key={kind} className="space-y-3">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {heading} <span className="font-normal text-neutral-500">{items.length}</span>
            </h3>
            <p className="max-w-3xl text-sm text-neutral-500">{blurb}</p>
            {items.length === 0 ? (
              <p className="text-sm text-neutral-500">Nothing here.</p>
            ) : (
              <ul className="space-y-3">{items.map((q) => <Entry key={q.technique.id} q={q} />)}</ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
