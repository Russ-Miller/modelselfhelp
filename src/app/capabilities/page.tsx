import Link from "next/link";
import { capabilityTags, getCapabilities, claimsFor, unsolvedCapabilities } from "@/lib/catalog";
import { capabilityShortlist } from "@/lib/queue";
import { FilterBar } from "@/components/filter-bar";

export const metadata = { title: "Capabilities" };

export default function CapabilitiesPage() {
  const shortlist = capabilityShortlist();
  const unfixed = unsolvedCapabilities();
  // Counts come from the same helpers the /open-questions sections use, so a
  // filter here and the section of the same name can never disagree.
  const options = [
    { value: "contested", label: "Contested", count: getCapabilities().filter((c) => claimsFor(c.id).some((x) => x.contested)).length },
    { value: "no-technique", label: "No technique catalogued", count: unfixed.filter((u) => u.kind === "no-technique").length },
    { value: "none-measured", label: "Techniques, none measured", count: unfixed.filter((u) => u.kind === "none-measured").length },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Capabilities</h1>
      <p className="text-sm text-neutral-500">Topics, not scores &mdash; each lists the claims filed under it.</p>
      <FilterBar options={options}>
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500">
          <tr>
            <th className="py-1 pr-6">Capability</th>
            <th className="py-1 pr-6">Tags</th>
            <th className="py-1 pr-6 whitespace-nowrap">Claims</th>
            <th className="py-1 pr-6 whitespace-nowrap">Contested</th>
            <th className="py-1 whitespace-nowrap">Status</th>
          </tr>
        </thead>
        <tbody>
          {getCapabilities().map((c) => (
            <tr key={c.id} data-tags={capabilityTags(c)} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
              <td className="py-2 pr-6"><Link href={`/capabilities/${c.id}`} className="font-medium hover:underline">{c.label}</Link>
                <div className="text-neutral-600 dark:text-neutral-400">{c.summary}</div></td>
              <td className="py-2 pr-6">{(c.tags ?? []).join(", ")}</td>
              <td className="py-2 pr-6">{claimsFor(c.id).length}</td>
              <td className="py-2 pr-6">
                {(() => {
                  const n = claimsFor(c.id).filter((x) => x.contested).length;
                  return n ? (
                    <Link href="/contested" className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 hover:underline dark:bg-amber-900/40 dark:text-amber-200">{n}</Link>
                  ) : <span className="text-neutral-400">—</span>;
                })()}
              </td>
              <td className="py-2 whitespace-nowrap">{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </FilterBar>

      {shortlist.length > 0 && (
        <section className="space-y-2 pt-6">
          <h2 className="border-b border-neutral-200 pb-1 text-lg font-semibold dark:border-neutral-800">
            Candidate capabilities <span className="text-sm font-normal text-neutral-500">{shortlist.length}</span>
          </h2>
          <p className="max-w-3xl text-sm text-neutral-500">
            Mined from ingestion candidates that matched nothing above, then consolidated.{" "}
            <strong className="font-medium text-neutral-600 dark:text-neutral-400">Not capabilities</strong> &mdash;
            suggestions awaiting judgment. The paper count is how much recurring evidence
            there is; a name backed by one paper is usually just that author&apos;s framing.
          </p>
          <ul className="space-y-2">
            {shortlist.map((c) => (
              <li key={c.id} className="rounded border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{c.label}</span>
                  <code className="font-mono text-xs text-neutral-500">{c.id}</code>
                  {c.paper_count ? (
                    <span className="text-xs text-neutral-500">{c.paper_count} paper{c.paper_count === 1 ? "" : "s"}</span>
                  ) : null}
                </div>
                {c.scope_note && <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{c.scope_note}</p>}
                {c.note && <p className="mt-1 text-xs text-neutral-500">{c.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
