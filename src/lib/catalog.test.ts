import { describe, expect, it } from "vitest";
import { claimsFor, getPaper, getCapability, loadCatalog, techniquesFor, capabilitiesByGroup } from "./catalog";

describe("catalog loader", () => {
  const cat = loadCatalog();

  it("loads every entity kind", () => {
    expect(cat.capabilities.length).toBeGreaterThan(0);
    expect(cat.papers.length).toBeGreaterThan(0);
    expect(cat.techniques.length).toBeGreaterThan(0);
    expect(cat.models.length).toBeGreaterThan(0);
    expect(cat.claims.length).toBeGreaterThan(0);
  });

  it("resolves evidence papers and techniques for every capability", () => {
    for (const c of cat.capabilities) {
      for (const e of c.evidence) expect(getPaper(e.paper), `${c.id} -> ${e.paper}`).toBeDefined();
      for (const t of c.techniques ?? []) expect(techniquesFor(c.id).map((x) => x.id)).toContain(t);
    }
  });

  it("groups capabilities in taxonomy order without losing any", () => {
    const grouped = capabilitiesByGroup();
    const total = grouped.reduce((n, g) => n + g.capabilities.length, 0);
    expect(total).toBe(cat.capabilities.length);
  });

  it("finds claims by capability", () => {
    const c = getCapability("long-context-degradation");
    expect(c).toBeDefined();
    expect(claimsFor(c!.id).length).toBeGreaterThan(0);
  });

  it("scores every claim on a 1-10 scale", () => {
    for (const c of cat.claims) {
      expect(c.score).toBeGreaterThanOrEqual(1);
      expect(c.score).toBeLessThanOrEqual(10);
    }
  });
});
