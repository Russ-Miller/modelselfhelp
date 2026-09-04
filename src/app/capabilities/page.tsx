import Link from "next/link";
import { getCapabilities, claimsFor } from "@/lib/catalog";

export const metadata = { title: "Capabilities" };

export default function CapabilitiesPage() {
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
    </div>
  );
}
