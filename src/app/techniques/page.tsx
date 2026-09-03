import Link from "next/link";
import { getTechniques, getWeakness } from "@/lib/catalog";

export const metadata = { title: "Techniques" };

export default function TechniquesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Techniques</h1>
      <ul className="space-y-3">
        {getTechniques().map((t) => (
          <li key={t.id} className="rounded border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
            <Link href={`/techniques/${t.id}`} className="font-medium hover:underline">{t.label}</Link>
            <span className="ml-2 text-xs text-neutral-500">{t.kind}{t.repos?.length ? " · has code" : ""}{t.status !== "accepted" ? ` · ${t.status}` : ""}</span>
            <p className="text-neutral-600 dark:text-neutral-400">{t.summary}</p>
            <p className="text-xs text-neutral-500">Addresses: {t.addresses.map((a) => getWeakness(a)?.label ?? a).join(", ")}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
