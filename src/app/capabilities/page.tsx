import Link from "next/link";
import { getCapabilities, getGroup } from "@/lib/catalog";

export const metadata = { title: "Capabilities" };

export default function CapabilitiesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Capabilities</h1>
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500"><tr><th className="py-1">Capability</th><th>Group</th><th>Contexts</th><th>Status</th></tr></thead>
        <tbody>
          {getCapabilities().map((c) => (
            <tr key={c.id} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
              <td className="py-2"><Link href={`/capabilities/${c.id}`} className="font-medium hover:underline">{c.label}</Link>
                <div className="text-neutral-600 dark:text-neutral-400">{c.summary}</div></td>
              <td className="py-2">{getGroup(c.group)?.label}</td>
              <td className="py-2">{c.contexts.join(", ")}</td>
              <td className="py-2">{c.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
