import assert from "node:assert/strict";
import test from "node:test";
import {
  compareEvidenceCapsules,
  createEvidenceCapsule,
  parseEvidenceCapsule,
  verifyEvidenceCapsule,
} from "./capsule.ts";
import type { Investigation } from "./types.ts";

function investigation(overrides: Partial<Investigation> = {}): Investigation {
  return {
    id: "case-1",
    query: "example.com",
    kind: "domain",
    collectedAt: "2026-10-10T10:00:00.000Z",
    sources: [
      { id: "dns", name: "DNS", ok: true, ms: 10, data: { a: ["203.0.113.10"] } },
      { id: "rdap", name: "RDAP", ok: true, ms: 20, data: { registrar: "Example" } },
    ],
    facts: [{ id: "ip", label: "Address", value: "203.0.113.10", sourceIds: ["dns"] }],
    graph: {
      nodes: [{ id: "q", label: "example.com", kind: "query", hop: 0 }],
      edges: [],
    },
    timeline: [],
    lattice: {
      engine: "heuristic",
      leading: "h1",
      confidence: "medium",
      briefing: "Stable infrastructure",
      watch: [],
      hypotheses: [
        {
          id: "h1",
          title: "Stable",
          statement: "Infrastructure is stable",
          prior: 0.5,
          posterior: 0.8,
          supports: [],
          contradicts: [],
          gaps: [],
        },
      ],
      matrix: [],
    },
    disagreements: [],
    ...overrides,
  };
}

test("capsule verifies and binds every evidence section", () => {
  const capsule = createEvidenceCapsule(investigation(), "2026-10-10T10:01:00.000Z");
  const verification = verifyEvidenceCapsule(capsule);
  assert.equal(verification.valid, true);
  assert.equal(capsule.rootDigest.length, 128);
  assert.equal(capsule.evidenceDigest.length, 128);
  assert.equal(capsule.coverage.rawPayloads, 2);
});

test("evidence digest is stable across observation metadata but root remains unique", () => {
  const first = createEvidenceCapsule(investigation(), "2026-10-10T10:01:00.000Z");
  const second = createEvidenceCapsule(
    investigation({
      id: "case-2",
      collectedAt: "2026-10-10T11:00:00.000Z",
    }),
    "2026-10-10T11:01:00.000Z",
  );
  assert.equal(first.evidenceDigest, second.evidenceDigest);
  assert.notEqual(first.rootDigest, second.rootDigest);
});

test("tampering with facts is detected", () => {
  const capsule = createEvidenceCapsule(investigation());
  const tampered = structuredClone(capsule);
  tampered.sections.facts[0].value = "198.51.100.7";
  const verification = verifyEvidenceCapsule(tampered);
  assert.equal(verification.valid, false);
  assert.equal(verification.sectionValidity.facts, false);
});

test("drift radar distinguishes fact and lattice changes", () => {
  const first = createEvidenceCapsule(investigation());
  const next = createEvidenceCapsule(
    investigation({
      id: "case-2",
      collectedAt: "2026-10-10T11:00:00.000Z",
      facts: [{ id: "ip", label: "Address", value: "198.51.100.7", sourceIds: ["dns"] }],
      lattice: {
        ...investigation().lattice,
        leading: "h2",
        confidence: "high",
      },
    }),
  );
  const drift = compareEvidenceCapsules(first, next);
  assert.equal(drift.changed, true);
  assert.equal(drift.severity, "major");
  assert.ok(drift.factChanges.some((item) => item.includes("203.0.113.10")));
  assert.ok(drift.latticeChanges.some((item) => item.includes("Leading hypothesis")));
});

test("exported capsule round-trips only when integrity is intact", () => {
  const capsule = createEvidenceCapsule(investigation());
  assert.equal(parseEvidenceCapsule(JSON.stringify(capsule)).rootDigest, capsule.rootDigest);
  const tampered = JSON.parse(JSON.stringify(capsule));
  tampered.sections.sources[0].ok = false;
  assert.throws(() => parseEvidenceCapsule(JSON.stringify(tampered)), /integrity verification/);
});
