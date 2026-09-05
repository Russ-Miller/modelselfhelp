import { describe, expect, it } from "vitest";
import { claimsCiting, claimsFor, getCapability, getSource, getTechnique, loadCatalog, claimActivity, openQuestions, techniqueStanding, techniquesFor, unsolvedCapabilities, capabilitiesByGroup } from "./catalog";

describe("catalog loader", () => {
  const cat = loadCatalog();

  it("loads every entity kind", () => {
    expect(cat.capabilities.length).toBeGreaterThan(0);
    expect(cat.claims.length).toBeGreaterThan(0);
    expect(cat.sources.length).toBeGreaterThan(0);
    expect(cat.techniques.length).toBeGreaterThan(0);
    expect(cat.models.length).toBeGreaterThan(0);
  });

  it("resolves every claim's capability and sources", () => {
    for (const c of cat.claims) {
      expect(getCapability(c.capability), `${c.id} -> ${c.capability}`).toBeDefined();
      for (const s of c.sources) expect(getSource(s.source), `${c.id} -> ${s.source}`).toBeDefined();
    }
  });

  it("finds claims by capability", () => {
    const c = getCapability("self-repair");
    expect(c).toBeDefined();
    expect(claimsFor(c!.id).length).toBeGreaterThan(0);
  });

  it("finds claims citing a source, with stance", () => {
    const hits = claimsCiting("arxiv-2310-01798");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.stance === "supports" || h.stance === "contests")).toBe(true);
  });

  it("has at least one contested claim with a disagreement axis", () => {
    const contested = cat.claims.filter((c) => c.contested);
    expect(contested.length).toBeGreaterThan(0);
    for (const c of contested) {
      expect(c.disagreement_axis).toBeDefined();
      expect(c.sources.some((s) => s.stance === "contests")).toBe(true);
    }
  });

  it("groups capabilities by tag without losing any that have a matching tag", () => {
    const grouped = capabilitiesByGroup();
    expect(grouped.length).toBeGreaterThan(0);
  });

  it("finds techniques for a capability", () => {
    expect(techniquesFor("self-repair").map((t) => t.id)).toContain("external-feedback-repair");
  });

  it("separates a documented evidence search from nobody having looked", () => {
    const open = openQuestions();
    const searched = open.filter((q) => q.kind === "searched");
    expect(searched.length).toBeGreaterThan(0);
    // The distinction is the whole point of the view: "searched" must never be
    // inferred from an absence, only from a recorded search.
    for (const q of searched) expect(q.technique.evidence_search).toBeDefined();
    for (const q of open.filter((q) => q.kind === "unsearched")) {
      expect(q.technique.evidence_search).toBeUndefined();
      expect(q.claims).toHaveLength(0);
    }
  });

  it("lists argued-not-measured techniques only when every claim is mechanism-reasoning", () => {
    for (const q of openQuestions().filter((q) => q.kind === "asserted-not-measured")) {
      expect(q.claims.length).toBeGreaterThan(0);
      expect(q.claims.every((c) => c.backing_strength === "mechanism-reasoning")).toBe(true);
    }
  });

  it("never lists a technique that already has a measured efficacy claim", () => {
    const ids = new Set(openQuestions().map((q) => q.technique.id));
    expect(ids.has("irreversible-action-gate")).toBe(false);
    expect(ids.has("reread-before-edit")).toBe(true);
    expect(getTechnique("reread-before-edit")?.evidence_search?.nearest_miss?.length).toBeGreaterThan(0);
  });

  it("reports claim evidence activity from the liveliest source, not a total", () => {
    const claim = cat.claims.find((c) => c.sources.length > 1 && c.sources.every((s) => getSource(s.source)?.citations_checked_at));
    expect(claim, "expected a multi-source claim with checked citations").toBeDefined();
    const a = claimActivity(claim!)!;
    expect(a.maxRecent).toBe(Math.max(...a.checked.map((s) => s.citations_recent_12mo ?? 0)));
    // Unchecked sources are excluded rather than counted as zero -- no data is
    // not the same as no citations.
    expect(a.checked.every((s) => s.citations_checked_at)).toBe(true);
  });

  it("lists a capability as unsolved only when no technique for it has a measured claim", () => {
    const measured = new Set(["single-paper", "replicated", "own-observation"]);
    for (const u of unsolvedCapabilities()) {
      expect(u.claims.length).toBeGreaterThan(0);
      for (const t of u.techniques) {
        expect(cat.claims.filter((c) => c.technique === t.id).some((c) => measured.has(c.backing_strength))).toBe(false);
      }
      expect(u.kind).toBe(u.techniques.length === 0 ? "no-technique" : "none-measured");
    }
    // A capability with a measured technique must not appear.
    expect(unsolvedCapabilities().map((u) => u.capability.id)).not.toContain("prompt-injection");
  });

  it("reads a technique's standing from its claims, not from a stored flag", () => {
    // Filed with sources on both sides and a stated axis.
    expect(techniqueStanding("external-feedback-repair").standing).toBe("contested");
    // No efficacy claim at all.
    expect(techniqueStanding("reread-before-edit").standing).toBe("unmeasured");
    // Backed only by reasoning about how it works.
    expect(techniqueStanding("program-aided-computation").standing).toBe("argued");
    for (const t of cat.techniques) {
      const st = techniqueStanding(t.id);
      expect(st.supporting + st.contesting).toBe(st.claims.reduce((n, c) => n + c.sources.length, 0));
    }
  });
});
