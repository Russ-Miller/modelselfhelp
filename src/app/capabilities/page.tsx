import Link from "next/link";
import { getCapabilities, claimsFor } from "@/lib/catalog";
import { capabilityShortlist } from "@/lib/queue";

export const metadata = { title: "Capabilities" };

export default function CapabilitiesPage() {
  const shortlist = capabilityShortlist();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Capabilities</h1>
      <p className="text-sm text-neutral-500">Topics, not scores &mdash; each lists the claims filed under it.</p>
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500"><tr><th className="py-1">Capability</th><th>Tags</th><th>Claims</th><th>Contested</th><th>Status</th></tr></thead>
        <tbody>
          {getCapabilities().map((c) => (
            <tr key={c.id} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
              <td className="py-2"><Link href={`/capabilities/${c.id}`} className="font-medium hover:underline">{c.label}</Link>
                <div className="text-neutral-600 dark:text-neutral-400">{c.summary}</div></td>
              <td className="py-2">{(c.tags ?? []).join(", ")}</td>
              <td className="py-2">{claimsFor(c.id).length}</td>
              <td className="py-2">
                {(() => {
                  const n = claimsFor(c.id).filter((x) => x.contested).length;
                  return n ? (
                    <Link href="/contested" className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900 hover:underline dark:bg-amber-900/40 dark:text-amber-200">{n}</Link>
                  ) : <span className="text-neutral-400">—</span>;
                })()}
              </td>
              <td className="py-2">{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

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
