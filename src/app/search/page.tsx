import { buildSearchIndex } from "@/lib/search-index";
import { Search } from "@/components/search";

export const metadata = { title: "Search" };

export default function SearchPage() {
  const index = buildSearchIndex();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Search</h1>
      <p className="text-sm text-neutral-500">
        Everything in the catalog &mdash; {index.length} records across capabilities, claims,
        techniques and sources. Runs in your browser; nothing is sent anywhere.
      </p>
      <Search index={index} />
    </div>
  );
}
