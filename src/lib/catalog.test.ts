import { describe, expect, it } from "vitest";
import { claimsFor, getPaper, getWeakness, loadCatalog, techniquesFor, weaknessesByGroup } from "./catalog";

describe("catalog loader", () => {
  const cat = loadCatalog();

  it("loads every entity kind", () => {
    expect(cat.weaknesses.length).toBeGreaterThan(0);
    expect(cat.papers.length).toBeGreaterThan(0);
    expect(cat.techniques.length).toBeGreaterThan(0);
    expect(cat.models.length).toBeGreaterThan(0);
    expect(cat.claims.length).toBeGreaterThan(0);
  });

  it("resolves evidence papers and techniques for every weakness", () => {
    for (const w of cat.weaknesses) {
      for (const e of w.evidence) expect(getPaper(e.paper), `${w.id} -> ${e.paper}`).toBeDefined();
      for (const t of w.techniques ?? []) expect(techniquesFor(w.id).map((x) => x.id)).toContain(t);
    }
  });

  it("groups weaknesses in taxonomy order without losing any", () => {
    const grouped = weaknessesByGroup();
    const total = grouped.reduce((n, g) => n + g.weaknesses.length, 0);
    expect(total).toBe(cat.weaknesses.length);
  });

  it("finds claims by weakness", () => {
    const w = getWeakness("long-context-degradation");
    expect(w).toBeDefined();
    expect(claimsFor(w!.id).length).toBeGreaterThan(0);
  });
});
