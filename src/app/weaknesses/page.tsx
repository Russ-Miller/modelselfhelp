import Link from "next/link";
import { getGroup, getWeaknesses } from "@/lib/catalog";

export const metadata = { title: "Weaknesses" };

export default function WeaknessesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Weaknesses</h1>
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-500"><tr><th className="py-1">Weakness</th><th>Group</th><th>Contexts</th><th>Status</th></tr></thead>
        <tbody>
          {getWeaknesses().map((w) => (
            <tr key={w.id} className="border-t border-neutral-200 dark:border-neutral-800 align-top">
              <td className="py-2"><Link href={`/weaknesses/${w.id}`} className="font-medium hover:underline">{w.label}</Link>
                <div className="text-neutral-600 dark:text-neutral-400">{w.summary}</div></td>
              <td className="py-2">{getGroup(w.group)?.label}</td>
              <td className="py-2">{w.contexts.join(", ")}</td>
              <td className="py-2">{w.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
