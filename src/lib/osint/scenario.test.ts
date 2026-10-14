import assert from "node:assert/strict";
import test from "node:test";
import { evaluateScenario } from "./scenario.ts";
import { simulateEvidenceRemoval } from "./stress.ts";
import type { LatticeResult } from "./types.ts";
const lattice: LatticeResult = {
  engine: "heuristic",
  leading: "a",
  confidence: "low",
  briefing: "fixture",
  watch: [],
  hypotheses: [
    {
      id: "a",
      title: "A",
      statement: "A",
      prior: 0.5,
      posterior: 0.6,
      supports: [],
      contradicts: [],
      gaps: [],
    },
    {
      id: "b",
      title: "B",
      statement: "B",
      prior: 0.5,
      posterior: 0.4,
      supports: [],
      contradicts: [],
      gaps: [],
    },
  ],
  matrix: [{ evidence: "ownership", cells: { a: "support", b: "contradict" } }],
};
test("full retention preserves the baseline and scenario evaluation leaves evidence intact", () => {
  const copy = JSON.stringify(lattice);
  assert.ok(Math.abs(evaluateScenario(lattice, {})[0].posterior - 0.6) < 1e-12);
  evaluateScenario(lattice, { ownership: 0.5 });
  assert.equal(JSON.stringify(lattice), copy);
});
test("zero retention agrees with the existing Stress removal engine and flips a fragile decision", () => {
  const result = evaluateScenario(lattice, { ownership: 0 });
  const reference = simulateEvidenceRemoval(lattice, ["ownership"]);
  assert.equal(result[0].id, "b");
  result.forEach((item, i) => assert.ok(Math.abs(item.posterior - reference[i].posterior) < 1e-12));
});
test("partial influence produces a normalized continuous decision between endpoints", () => {
  const weight = (retention: number) =>
    evaluateScenario(lattice, { ownership: retention }).find((h) => h.id === "a")!.posterior;
  assert.ok(weight(0) < weight(0.5) && weight(0.5) < weight(1));
  assert.ok(
    Math.abs(
      evaluateScenario(lattice, { ownership: 0.5 }).reduce((n, h) => n + h.posterior, 0) - 1,
    ) < 1e-12,
  );
});
test("invalid and out-of-range controls cannot poison or amplify the distribution", () => {
  assert.deepEqual(evaluateScenario(lattice, { ownership: NaN }), evaluateScenario(lattice, {}));
  assert.deepEqual(
    evaluateScenario(lattice, { ownership: -8 }),
    evaluateScenario(lattice, { ownership: 0 }),
  );
  assert.deepEqual(evaluateScenario(lattice, { ownership: 8 }), evaluateScenario(lattice, {}));
});
test("large contradictory matrices stay finite in log space", () => {
  const large = {
    ...lattice,
    matrix: Array.from({ length: 3000 }, (_, i) => ({
      evidence: String(i),
      cells: { a: "contradict" as const, b: "support" as const },
    })),
  };
  const result = evaluateScenario(
    large,
    Object.fromEntries(large.matrix.map((r) => [r.evidence, 0])),
  );
  assert.ok(result.every((h) => Number.isFinite(h.posterior)));
  assert.equal(
    result.reduce((n, h) => n + h.posterior, 0),
    1,
  );
});

test("offline training fixture demonstrates a real decision boundary", async () => {
  const { SCENARIO_DEMO } = await import("./scenario-demo.ts");
  assert.equal(evaluateScenario(SCENARIO_DEMO.lattice, {})[0].id, "shared");
  assert.equal(
    evaluateScenario(SCENARIO_DEMO.lattice, { "CT: shared certificate identity": 0 })[0].id,
    "hosting",
  );
});
