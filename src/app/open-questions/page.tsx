import Link from "next/link";
import { getCapability, getSource, openQuestions, unsolvedCapabilities, type OpenKind, type OpenQuestion, type Unsolved } from "@/lib/catalog";
import { StrengthBadge } from "@/components/badges";

export const metadata = { title: "Open questions" };

const SECTIONS: { kind: OpenKind; heading: string; blurb: string[]; filter: string }[] = [
  {
    kind: "searched",
    filter: "searched",
    heading: "Searched, still open",
    blurb: [
      "We went looking for a study that isolates the technique, and did not find one. Each entry records what was searched for. Where there was a nearest paper, it names that paper and why it does not actually support the technique.",
      "That makes each of these a research brief: the question, the dead end already walked, and what a clean experiment would have to separate.",
    ],
  },
  {
    kind: "unsearched",
    filter: "unsearched",
    heading: "Not yet searched",
    blurb: [
      "No efficacy claim is filed for these, and no search is recorded either. That only tells us we have not looked yet. It says nothing about whether the research exists.",
      "The first useful move is to look, and to record the result either way.",
    ],
  },
  {
    kind: "asserted-not-measured",
    filter: "argued",
    heading: "Argued, not measured",
    blurb: [
      "These are backed only by reasoning about how the technique works. No source measures the effect. The mechanism may well be right; nobody has put a number on it.",
      "That is a weaker opening than silence, but a real one. It is also the easiest kind to mistake for settled, which is why we keep it separate.",
    ],
  },
];

/** Same cut of the data, seen among its peers rather than in isolation. The
 *  filter state lives in the query string precisely so this can link to it. */
function InTab({ href, tab }: { href: string; tab: string }) {
  return (
    <Link href={href} className="text-xs font-normal text-neutral-500 hover:text-neutral-800 hover:underline dark:hover:text-neutral-200">
      see in {tab} &rarr;
    </Link>
  );
}

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

function UnsolvedEntry({ u }: { u: Unsolved }) {
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
          "No technique catalogued for it at all."
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
  const unfixed = unsolvedCapabilities();
  const noTechnique = unfixed.filter((u) => u.kind === "no-technique");
  const noneMeasured = unfixed.filter((u) => u.kind === "none-measured");
  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-2">
        <h1 className="text-2xl font-semibold">Open questions</h1>
        <p className="text-sm text-neutral-500">These are the places where we still don&rsquo;t have a good answer.</p>
        <p className="text-sm text-neutral-500">
          Some are weaknesses that have been documented, but no one has shown that a particular
          technique actually works. Others are techniques people use in practice, but we
          couldn&rsquo;t find evidence that they do what people claim they do. Those are the gaps
          most worth investigating.
        </p>
        <p className="text-sm text-neutral-500">
          Not all gaps mean the same thing. If we searched the literature and found nothing, that
          tells us something about the state of the research. If we simply haven&rsquo;t
          investigated a technique yet, that only tells us we haven&rsquo;t looked at it. We keep
          those two cases separate.
        </p>
        <p className="text-xs text-neutral-500">{all.length + unfixed.length} open</p>
      </div>

      <section className="space-y-3">
        <h2 className="border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
          Documented, but nothing measured to fix it <span className="text-sm font-normal text-neutral-500">{unfixed.length}</span>
        </h2>
        <p className="max-w-3xl text-sm text-neutral-500">
          These are weaknesses we know exist, but we couldn&rsquo;t find a technique that has
          actually been tested and shown to work.
        </p>
        <p className="max-w-3xl text-sm text-neutral-500">
          That makes these especially interesting: evidence that a technique works would add
          something genuinely new, rather than just confirming an existing result.
        </p>
        {noTechnique.length > 0 && (
          <>
            <h3 className="flex flex-wrap items-baseline gap-2 pt-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              No technique catalogued <span className="font-normal text-neutral-500">{noTechnique.length}</span>
              <InTab href="/capabilities?filter=no-technique" tab="Capabilities" />
            </h3>
            <p className="max-w-3xl text-xs text-neutral-500">
              No technique has been catalogued for these yet, so there is nothing to measure.
            </p>
            <ul className="space-y-3">{noTechnique.map((u) => <UnsolvedEntry key={u.capability.id} u={u} />)}</ul>
          </>
        )}
        {noneMeasured.length > 0 && (
          <>
            <h3 className="flex flex-wrap items-baseline gap-2 pt-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Techniques catalogued, none measured <span className="font-normal text-neutral-500">{noneMeasured.length}</span>
              <InTab href="/capabilities?filter=none-measured" tab="Capabilities" />
            </h3>
            <p className="max-w-3xl text-xs text-neutral-500">
              A technique is catalogued for these, but no claim measures whether it moves the
              capability. If a study already exists, finding it would close the gap. No new
              experiment needed.
            </p>
            <ul className="space-y-3">{noneMeasured.map((u) => <UnsolvedEntry key={u.capability.id} u={u} />)}</ul>
          </>
        )}
      </section>

      <h2 className="border-b border-neutral-200 pb-1 pt-2 text-lg font-semibold dark:border-neutral-800">
        Techniques nothing measures <span className="text-sm font-normal text-neutral-500">{all.length}</span>
      </h2>

      {SECTIONS.map(({ kind, heading, blurb, filter }) => {
        const items = all.filter((q) => q.kind === kind);
        return (
          <section key={kind} className="space-y-3">
            <h3 className="flex flex-wrap items-baseline gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {heading} <span className="font-normal text-neutral-500">{items.length}</span>
              {items.length > 0 && <InTab href={`/techniques?filter=${filter}`} tab="Techniques" />}
            </h3>
            {blurb.map((para, i) => <p key={i} className="max-w-3xl text-sm text-neutral-500">{para}</p>)}
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
