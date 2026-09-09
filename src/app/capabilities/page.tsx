import Link from "next/link";
import { ListSearch } from "@/components/list-search";
import { capabilityTags, getCapabilities, claimsFor, isProposed, unsolvedCapabilities } from "@/lib/catalog";
import { FilterBar } from "@/components/filter-bar";
import { ProposedBadge } from "@/components/badges";

export const metadata = { title: "Capabilities" };

export default function CapabilitiesPage() {
  const unfixed = unsolvedCapabilities();
  // Counts come from the same helpers the /open-questions sections use, so a
  // filter here and the section of the same name can never disagree.
  const options = [
    { value: "contested", label: "Contested", count: getCapabilities().filter((c) => claimsFor(c.id).some((x) => x.contested)).length },
    { value: "no-technique", label: "No technique catalogued", count: unfixed.filter((u) => u.kind === "no-technique").length },
    { value: "none-measured", label: "Techniques, none measured", count: unfixed.filter((u) => u.kind === "none-measured").length },
    { value: "proposed", label: "Proposed", count: getCapabilities().filter(isProposed).length },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Capabilities</h1>
      <p className="max-w-3xl text-sm text-neutral-500">
        Topics, not scores &mdash; each lists the claims filed under it. Some are marked{" "}
        <strong className="font-medium text-neutral-600 dark:text-neutral-400">proposed</strong>:
        the ingestion pipeline found several papers converging on the same competence and added
        it, without anyone deciding it belongs. Those are here to be argued with.
      </p>
      <ListSearch noun="capabilities" placeholder="Filter capabilities…" />
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
            <tr key={c.id} data-tags={capabilityTags(c)}
              data-search={`${c.label} ${c.summary} ${c.id} ${(c.tags ?? []).join(" ")} ${(c.aliases ?? []).join(" ")}`.toLowerCase()} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
              <td className="py-2 pr-6"><Link href={`/capabilities/${c.id}`} className="font-medium hover:underline">{c.label}</Link>
                <div className="text-neutral-600 dark:text-neutral-400">{c.summary}</div></td>
              <td className="py-2 pr-6">{(c.tags ?? []).join(", ")}</td>
              <td className="py-2 pr-6">
                {(() => {
                  const n = claimsFor(c.id).length;
                  return n ? (
                    // A pill, not bare text: a single digit is a poor click
                    // target, and padding is what makes it hittable.
                    <Link href={`/capabilities/${c.id}`} aria-label={`${n} claim${n === 1 ? "" : "s"} under ${c.label}`}
                      className="inline-flex min-w-8 items-center justify-center rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:border-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-neutral-500 dark:hover:bg-neutral-800">
                      {n}
                    </Link>
                  ) : <span className="text-neutral-400">&mdash;</span>;
                })()}
              </td>
              <td className="py-2 pr-6">
                {(() => {
                  const n = claimsFor(c.id).filter((x) => x.contested).length;
                  return n ? (
                    <Link href="/claims?filter=contested" aria-label={`${n} contested claim${n === 1 ? "" : "s"} under ${c.label}`}
                      className="inline-flex min-w-8 items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 hover:border-amber-500 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{n}</Link>
                  ) : <span className="text-neutral-400">—</span>;
                })()}
              </td>
              <td className="py-2 whitespace-nowrap">{isProposed(c) ? <ProposedBadge /> : c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </FilterBar>

    </div>
  );
}
