import assert from "node:assert/strict";
import test from "node:test";
import { buildStressReport, inferEvidenceSources, simulateEvidenceRemoval } from "./stress.ts";
import type { Investigation, LatticeResult } from "./types.ts";

function lattice(
  posterior: [number, number, number],
  rows: LatticeResult["matrix"],
): LatticeResult {
  return {
    engine: "heuristic",
    leading: "H1",
    confidence: "medium",
    briefing: "Synthetic stress fixture",
    watch: ["Re-run later"],
    hypotheses: [
      {
        id: "H1",
        title: "Lead",
        statement: "Lead",
        prior: 0.4,
        posterior: posterior[0],
        supports: [],
        contradicts: [],
        gaps: ["Confirm ownership"],
      },
      {
        id: "H2",
        title: "Rival",
        statement: "Rival",
        prior: 0.35,
        posterior: posterior[1],
        supports: [],
        contradicts: [],
        gaps: ["Confirm archive history"],
      },
      {
        id: "H3",
        title: "Other",
        statement: "Other",
        prior: 0.25,
        posterior: posterior[2],
        supports: [],
        contradicts: [],
        gaps: [],
      },
    ],
    matrix: rows,
  };
}

function investigation(active: LatticeResult): Investigation {
  return {
    id: "inv-1",
    query: "example.com",
    kind: "domain",
    collectedAt: "2026-10-10T00:00:00.000Z",
    sources: [
      { id: "crtsh", name: "Certificate Transparency", ok: true, ms: 10, data: [] },
      { id: "wayback", name: "Wayback CDX", ok: true, ms: 12, data: [] },
    ],
    facts: [
      { id: "f1", label: "CT certificates", value: "12", sourceIds: ["crtsh"] },
      { id: "f2", label: "Archive depth", value: "2020-2026", sourceIds: ["wayback"] },
    ],
    graph: { nodes: [], edges: [] },
    timeline: [],
    lattice: active,
    disagreements: [],
  };
}

test("single evidence removal can expose a fragile leading hypothesis", () => {
  const active = lattice(
    [0.55, 0.35, 0.1],
    [{ evidence: "Certificate volume", cells: { H1: "support", H2: "contradict", H3: "neutral" } }],
  );
  const report = buildStressReport(investigation(active));
  assert.equal(report.evidenceImpacts[0].leaderChanged, true);
  assert.equal(report.evidenceImpacts[0].counterfactualLeader, "H2");
  assert.equal(report.minimalFlipSet?.evidence.length, 1);
  assert.equal(report.grade, "fragile");
});

test("minimal flip search finds a two-row dependency when one removal is insufficient", () => {
  const active = lattice(
    [0.7, 0.22, 0.08],
    [
      { evidence: "Certificate volume", cells: { H1: "support", H2: "contradict", H3: "neutral" } },
      { evidence: "Archive depth", cells: { H1: "support", H2: "contradict", H3: "neutral" } },
    ],
  );
  const report = buildStressReport(investigation(active));
  assert.equal(
    report.evidenceImpacts.some((item) => item.leaderChanged),
    false,
  );
  assert.equal(report.minimalFlipSet?.evidence.length, 2);
  assert.equal(report.minimalFlipSet?.leaderAfterRemoval, "H2");
});

test("source knockout detects correlated evidence dependence", () => {
  const active = lattice(
    [0.7, 0.22, 0.08],
    [
      { evidence: "Certificate volume", cells: { H1: "support", H2: "contradict", H3: "neutral" } },
      {
        evidence: "CT certificate history",
        cells: { H1: "support", H2: "contradict", H3: "neutral" },
      },
    ],
  );
  const report = buildStressReport(investigation(active));
  const ct = report.sourceStress.find((item) => item.sourceId === "crtsh");
  assert.ok(ct);
  assert.equal(ct.leaderChanged, true);
  assert.equal(ct.counterfactualLeader, "H2");
});

test("unresolved evidence becomes a next-best collection priority", () => {
  const active = lattice(
    [0.51, 0.42, 0.07],
    [
      { evidence: "Archive depth", cells: { H1: "na", H2: "na", H3: "neutral" } },
      { evidence: "Certificate volume", cells: { H1: "support", H2: "neutral", H3: "neutral" } },
    ],
  );
  const report = buildStressReport(investigation(active));
  const priority = report.collectionPriorities.find((item) => item.label.includes("Archive depth"));
  assert.ok(priority);
  assert.equal(priority.kind, "unresolved-evidence");
  assert.ok((priority.estimatedInformationGain ?? 0) > 0);
});

test("source inference uses fact provenance instead of only text heuristics", () => {
  const inv = investigation(lattice([0.6, 0.3, 0.1], []));
  assert.deepEqual(inferEvidenceSources(inv, "Archive depth"), ["wayback"]);
});

test("removal simulation preserves a normalized distribution", () => {
  const active = lattice(
    [0.6, 0.3, 0.1],
    [{ evidence: "Certificate volume", cells: { H1: "support", H2: "contradict", H3: "neutral" } }],
  );
  const distribution = simulateEvidenceRemoval(active, ["Certificate volume"]);
  assert.ok(Math.abs(distribution.reduce((sum, item) => sum + item.posterior, 0) - 1) < 1e-12);
});

test("coalitional attribution sums to the evidence-driven change in leader margin", () => {
  const active = lattice(
    [0.7, 0.22, 0.08],
    [
      { evidence: "Certificate volume", cells: { H1: "support", H2: "contradict", H3: "neutral" } },
      { evidence: "Archive depth", cells: { H1: "support", H2: "contradict", H3: "neutral" } },
    ],
  );
  const report = buildStressReport(investigation(active));
  const noEvidence = simulateEvidenceRemoval(
    active,
    active.matrix.map((row) => row.evidence),
  );
  const emptyMargin =
    (noEvidence.find((item) => item.id === "H1")?.posterior ?? 0) -
    Math.max(...noEvidence.filter((item) => item.id !== "H1").map((item) => item.posterior));
  const expectedDelta = report.baseline.margin - emptyMargin;
  const attributed = report.evidenceImpacts.reduce(
    (sum, item) => sum + item.coalitionalContribution,
    0,
  );
  assert.ok(Math.abs(attributed - expectedDelta) < 1e-5);
});

test("robustness frontier tracks the worst decision margin for each removal budget", () => {
  const active = lattice(
    [0.7, 0.22, 0.08],
    [
      { evidence: "Certificate volume", cells: { H1: "support", H2: "contradict", H3: "neutral" } },
      { evidence: "Archive depth", cells: { H1: "support", H2: "contradict", H3: "neutral" } },
    ],
  );
  const report = buildStressReport(investigation(active));
  assert.equal(report.robustnessFrontier[0].removalBudget, 0);
  assert.equal(report.robustnessFrontier[2].leaderAfterRemoval, "H2");
  assert.ok(report.robustnessFrontier[2].worstSignedMargin < 0);
  for (let index = 1; index < report.robustnessFrontier.length; index += 1) {
    assert.ok(
      report.robustnessFrontier[index].worstSignedMargin <=
        report.robustnessFrontier[index - 1].worstSignedMargin + 1e-9,
    );
  }
});
