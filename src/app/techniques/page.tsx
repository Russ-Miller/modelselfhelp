import Link from "next/link";
import { getTechniques, getCapability, openQuestions, techniqueTags } from "@/lib/catalog";
import { FilterBar } from "@/components/filter-bar";

export const metadata = { title: "Techniques" };

export default function TechniquesPage() {
  const open = openQuestions();
  const count = (k: string) => open.filter((q) => q.kind === k).length;
  const options = [
    { value: "searched", label: "Searched, still open", count: count("searched") },
    { value: "unsearched", label: "Not yet searched", count: count("unsearched") },
    { value: "argued", label: "Argued, not measured", count: count("asserted-not-measured") },
  ];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Techniques</h1>
      <p className="max-w-3xl text-sm text-neutral-500">
        What a technique <em>is</em>, never whether it works &mdash; that lives in claims that
        reference it. The filters are the cuts from{" "}
        <Link href="/open-questions" className="hover:underline">open questions</Link>: which of
        these nothing has measured, and whether anyone has looked.
      </p>
      <FilterBar options={options}>
      <ul className="space-y-3">
        {getTechniques().map((t) => (
          <li key={t.id} data-tags={techniqueTags(t)} className="rounded border border-neutral-200 dark:border-neutral-800 p-3 text-sm">
            <Link href={`/techniques/${t.id}`} className="font-medium hover:underline">{t.label}</Link>
            <span className="ml-2 text-xs text-neutral-500">{t.kind}{t.repos?.length ? " · has code" : ""}{t.status === "superseded" ? " · superseded" : ""}</span>
            <p className="text-neutral-600 dark:text-neutral-400">{t.summary}</p>
            <p className="text-xs text-neutral-500">Addresses: {t.addresses.map((a) => getCapability(a)?.label ?? a).join(", ")}</p>
          </li>
        ))}
      </ul>
      </FilterBar>
    </div>
  );
}
