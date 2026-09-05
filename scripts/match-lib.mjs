// Topical matching, shared by the ingestion pipeline and scripts/backtest.mjs.
//
// It lives here rather than inside fetch-openalex.mjs because the backtest
// needs to ask "would ingestion have surfaced this paper?" and a second,
// hand-written copy of the rule answers a different question than the real one.
// A first attempt at that reimplementation got the title rule wrong and
// reported a blind spot that did not exist.
import { loadCatalog } from "./catalog-lib.mjs";

export const CAPABILITY_TERMS = loadCatalog().capabilities.map((rec) => {
  const d = rec.data;
  const terms = new Set([
    d.id.replace(/-/g, " "),
    ...(d.aliases ?? []),
    ...(d.match_terms ?? []),
  ].map((t) => String(t).toLowerCase()).filter((t) => t.length > 3));
  return { id: d.id, label: d.label, terms: [...terms] };
});

// A term in the TITLE is strong evidence the paper is about that capability.
// A term buried in the abstract is often just a passing mention -- a model
// technical report will name half a dozen capabilities it benchmarked without
// being about any of them. So an abstract-only match needs corroboration:
// two or more distinct terms for the same capability.
export function matchCapabilities(c) {
  const title = String(c.title ?? "").toLowerCase();
  const abstract = String(c.abstract ?? "").toLowerCase();
  const hits = [];
  for (const cap of CAPABILITY_TERMS) {
    if (cap.terms.some((t) => title.includes(t))) { hits.push(cap.id); continue; }
    // Otherwise require the abstract to actually dwell on it: two or more
    // total occurrences of the capability's vocabulary. A passing mention in
    // a benchmark list appears once; a substantive discussion repeats itself.
    let occurrences = 0;
    for (const t of cap.terms) {
      let i = abstract.indexOf(t);
      while (i !== -1 && occurrences < 2) { occurrences++; i = abstract.indexOf(t, i + t.length); }
      if (occurrences >= 2) break;
    }
    if (occurrences >= 2) hits.push(cap.id);
  }
  return hits;
}

