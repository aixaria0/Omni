import assert from "node:assert/strict";
import test from "node:test";
import { layoutAtlas, projectAtlas } from "./atlas.ts";
import { OBSERVATORY_DEMO } from "./observatory-demo.ts";
import { evaluateScenario } from "./scenario.ts";

test("atlas layout preserves node identity and is independent of collector node ordering", () => {
  const graph = OBSERVATORY_DEMO.graph;
  const before = JSON.stringify(graph);
  assert.deepEqual(
    layoutAtlas(graph),
    layoutAtlas({ ...graph, nodes: [...graph.nodes].reverse() }),
  );
  assert.equal(layoutAtlas(graph).length, graph.nodes.length);
  assert.equal(JSON.stringify(graph), before);
});
test("query is centered and all projected nodes fit the initial mobile and desktop viewport", () => {
  const points = layoutAtlas(OBSERVATORY_DEMO.graph);
  const query = points.find((p) => p.node.kind === "query")!;
  assert.deepEqual([query.x, query.y, query.z], [0, 0, 0]);
  for (const [width, height] of [
    [340, 330],
    [800, 390],
  ]) {
    for (const yaw of [0, 0.4, Math.PI, 2 * Math.PI]) {
      for (const point of points) {
        const projected = projectAtlas(point, yaw, width, height);
        assert.ok(projected.x >= 0 && projected.x <= width);
        assert.ok(projected.y >= 0 && projected.y <= height);
        assert.ok(Number.isFinite(projected.depth));
      }
    }
  }
});
test("synthetic observatory topology has valid edges and no orphan endpoints", () => {
  const ids = new Set(OBSERVATORY_DEMO.graph.nodes.map((n) => n.id));
  assert.equal(ids.size, OBSERVATORY_DEMO.graph.nodes.length);
  for (const edge of OBSERVATORY_DEMO.graph.edges) {
    assert.ok(ids.has(edge.source));
    assert.ok(ids.has(edge.target));
  }
});
test("observatory exercise keeps the original reproducible decision flip", () => {
  const baseline = evaluateScenario(OBSERVATORY_DEMO.lattice, {});
  const changed = evaluateScenario(OBSERVATORY_DEMO.lattice, {
    "CT: shared certificate identity": 0,
  });
  assert.equal(baseline[0].id, "shared");
  assert.equal(changed[0].id, "hosting");
});
