import assert from "node:assert/strict";
import test from "node:test";
import { createEvidenceCapsule } from "./capsule.ts";
import { fuseInvestigation } from "./fuse.ts";
import { buildHeuristicLattice } from "./lattice-local.ts";
import type { Investigation, SourceResult } from "./types.ts";

const sources: SourceResult[] = [
  {
    id: "dns",
    name: "DNS",
    ok: true,
    ms: 5,
    data: { Answer: [{ type: 1, data: "203.0.113.10" }] },
  },
  {
    id: "internetdb",
    name: "Shodan InternetDB",
    ok: true,
    ms: 6,
    data: { ip: "203.0.113.10", ports: [443], vulns: [], hostnames: ["example.com"] },
  },
];

function build(id: string, collectedAt: string): Investigation {
  const fused = fuseInvestigation("example.com", "domain", sources);
  return {
    id,
    query: "example.com",
    kind: "domain",
    collectedAt,
    sources,
    ...fused,
    lattice: buildHeuristicLattice(fused.facts, fused.graph),
  };
}

test("fused fact and edge identities are content-addressed across equivalent observations", () => {
  const a = build("inv-a", "2026-10-10T00:00:00.000Z");
  const b = build("inv-b", "2026-10-10T00:10:00.000Z");
  assert.deepEqual(
    a.facts.map((fact) => fact.id),
    b.facts.map((fact) => fact.id),
  );
  assert.deepEqual(
    a.graph.edges.map((edge) => edge.id),
    b.graph.edges.map((edge) => edge.id),
  );
  assert.equal(createEvidenceCapsule(a).evidenceDigest, createEvidenceCapsule(b).evidenceDigest);
  assert.notEqual(createEvidenceCapsule(a).rootDigest, createEvidenceCapsule(b).rootDigest);
});
