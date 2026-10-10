import assert from "node:assert/strict";
import test from "node:test";
import {
  actionKey,
  createAutopilotReceipt,
  createAutopilotRound,
  mergeWorldInvestigations,
  parseAutopilotReceipt,
  planNextAction,
  verifyAutopilotReceipt,
  type AutopilotAction,
} from "./autopilot.ts";
import { buildStressReport } from "./stress.ts";
import type { Investigation, LatticeResult } from "./types.ts";

function lattice(): LatticeResult {
  return {
    engine: "heuristic",
    leading: "H1",
    confidence: "low",
    briefing: "fixture",
    watch: ["Confirm exposure"],
    hypotheses: [
      {
        id: "H1",
        title: "Cloud",
        statement: "Cloud",
        prior: 0.5,
        posterior: 0.53,
        supports: [],
        contradicts: [],
        gaps: ["Confirm ownership"],
      },
      {
        id: "H2",
        title: "Exposed",
        statement: "Exposed",
        prior: 0.4,
        posterior: 0.4,
        supports: [],
        contradicts: [],
        gaps: ["Confirm open ports"],
      },
      {
        id: "H3",
        title: "Other",
        statement: "Other",
        prior: 0.1,
        posterior: 0.07,
        supports: [],
        contradicts: [],
        gaps: [],
      },
    ],
    matrix: [
      {
        evidence: "Risky open ports",
        cells: { H1: "na", H2: "na", H3: "neutral" },
      },
      {
        evidence: "Org binding",
        cells: { H1: "support", H2: "neutral", H3: "neutral" },
      },
    ],
  };
}

function rootInvestigation(): Investigation {
  return {
    id: "inv-root",
    query: "example.com",
    kind: "domain",
    collectedAt: "2026-10-10T00:00:00.000Z",
    sources: [
      { id: "dns", name: "DNS", ok: true, ms: 4, data: { Answer: [] } },
      { id: "crtsh", name: "Certificate Transparency", ok: true, ms: 5, data: [] },
    ],
    facts: [
      { id: "f_org", label: "Organization", value: "Example", sourceIds: ["dns"] },
      { id: "f_ct", label: "CT certificates", value: "2", sourceIds: ["crtsh"] },
    ],
    graph: {
      nodes: [
        { id: "query", label: "example.com", kind: "query", hop: 0 },
        { id: "ip:203.0.113.10", label: "203.0.113.10", kind: "ip", hop: 1, risk: 0.7 },
        { id: "org:Example", label: "Example", kind: "org", hop: 1 },
      ],
      edges: [
        {
          id: "e-root-ip",
          source: "query",
          target: "ip:203.0.113.10",
          rel: "resolves",
        },
      ],
    },
    timeline: [],
    lattice: lattice(),
    disagreements: [],
  };
}

function childInvestigation(): Investigation {
  return {
    id: "inv-child",
    query: "203.0.113.10",
    kind: "ip",
    collectedAt: "2026-10-10T00:01:00.000Z",
    sources: [
      {
        id: "internetdb",
        name: "Shodan InternetDB",
        ok: true,
        ms: 7,
        data: { ports: [22, 3389], vulns: ["CVE-TEST"] },
      },
    ],
    facts: [
      {
        id: "f_ports",
        label: "Advertised ports",
        value: "22, 3389",
        sourceIds: ["internetdb"],
        tone: "danger",
      },
      {
        id: "f_vuln",
        label: "Known CPEs / vulns",
        value: "CVE-TEST",
        sourceIds: ["internetdb"],
        tone: "danger",
      },
    ],
    graph: {
      nodes: [
        { id: "query", label: "203.0.113.10", kind: "query", hop: 0 },
        { id: "ip:203.0.113.10", label: "203.0.113.10", kind: "ip", hop: 1, risk: 0.8 },
        { id: "port:3389", label: "3389", kind: "port", hop: 2, risk: 0.8 },
      ],
      edges: [
        {
          id: "e-child-port",
          source: "ip:203.0.113.10",
          target: "port:3389",
          rel: "exposes",
        },
      ],
    },
    timeline: [],
    lattice: lattice(),
    disagreements: [],
  };
}

test("planner chooses an infrastructure pivot on an unresolved decision boundary", () => {
  const inv = rootInvestigation();
  const stress = buildStressReport(inv);
  const seed: AutopilotAction = {
    kind: "seed",
    target: inv.query,
    targetKind: inv.kind,
    reason: "seed",
    expectedInformationGain: 1,
    estimatedCost: 1,
  };
  const action = planNextAction(inv, stress, new Set([actionKey(seed)]), { maxRounds: 3 }, 1);
  assert.equal(action.kind, "pivot");
  assert.equal(action.target, "203.0.113.10");
  assert.equal(action.targetKind, "ip");
});

test("world merge folds pivot evidence into a namespaced provenance graph", () => {
  const merged = mergeWorldInvestigations(
    rootInvestigation(),
    childInvestigation(),
    "inv-world",
    "2026-10-10T00:01:00.000Z",
  );
  assert.equal(merged.query, "example.com");
  assert.ok(merged.sources.some((source) => source.id.includes(":internetdb")));
  assert.ok(merged.graph.nodes.some((node) => node.id === "port:3389"));
  assert.ok(merged.graph.edges.some((edge) => edge.rel === "autopilot-pivot"));
  assert.ok(merged.facts.some((fact) => fact.label === "Known CPEs / vulns"));
  assert.equal(merged.lattice.engine, "heuristic");
});

test("proof-carrying two-round trace verifies planner, capsules and hash chain", () => {
  const policy = {
    maxRounds: 2,
    targetStability: 98,
    targetMargin: 0.6,
    minimumLiveCoverage: 0.5,
  };
  const root = rootInvestigation();
  const seed: AutopilotAction = {
    kind: "seed",
    target: root.query,
    targetKind: root.kind,
    reason: "Initial full-spectrum public-infrastructure observation.",
    expectedInformationGain: 1,
    estimatedCost: 1,
  };
  const visited = new Set([actionKey(seed)]);
  const next = planNextAction(root, buildStressReport(root), visited, policy, 1);
  assert.equal(next.kind, "pivot");
  const round0 = createAutopilotRound({
    index: 0,
    action: seed,
    nextAction: next,
    investigation: root,
    previousRoundRoot: null,
    sealedAt: "2026-10-10T00:00:01.000Z",
  });

  const world = mergeWorldInvestigations(
    root,
    childInvestigation(),
    "inv-world",
    "2026-10-10T00:01:00.000Z",
  );
  visited.add(actionKey(next));
  const stop = planNextAction(world, buildStressReport(world), visited, policy, 2);
  assert.equal(stop.kind, "stop");
  assert.equal(stop.reason, "round-budget-exhausted");
  const round1 = createAutopilotRound({
    index: 1,
    action: next,
    nextAction: stop,
    investigation: world,
    previousRoundRoot: round0.roundRoot,
    sealedAt: "2026-10-10T00:01:01.000Z",
  });
  const receipt = createAutopilotReceipt({
    runId: "autopilot-test",
    startedAt: "2026-10-10T00:00:00.000Z",
    completedAt: "2026-10-10T00:01:02.000Z",
    policy,
    rounds: [round0, round1],
    finalInvestigation: world,
  });
  const verification = verifyAutopilotReceipt(receipt);
  assert.equal(verification.valid, true, verification.problems.join("; "));
});

test("receipt verification detects planner-trace tampering", () => {
  const root = rootInvestigation();
  const policy = { maxRounds: 1 };
  const seed: AutopilotAction = {
    kind: "seed",
    target: root.query,
    targetKind: root.kind,
    reason: "Initial full-spectrum public-infrastructure observation.",
    expectedInformationGain: 1,
    estimatedCost: 1,
  };
  const stop = planNextAction(root, buildStressReport(root), [actionKey(seed)], policy, 1);
  const round = createAutopilotRound({
    index: 0,
    action: seed,
    nextAction: stop,
    investigation: root,
    previousRoundRoot: null,
    sealedAt: "2026-10-10T00:00:01.000Z",
  });
  const receipt = createAutopilotReceipt({
    runId: "autopilot-tamper",
    startedAt: "2026-10-10T00:00:00.000Z",
    completedAt: "2026-10-10T00:00:02.000Z",
    policy: { ...policy, targetStability: 82, targetMargin: 0.2, minimumLiveCoverage: 0.72 },
    rounds: [round],
    finalInvestigation: root,
  });
  const tampered = structuredClone(receipt);
  tampered.rounds[0].checkpoint.stabilityScore += 1;
  const verification = verifyAutopilotReceipt(tampered);
  assert.equal(verification.valid, false);
  assert.ok(
    verification.problems.some(
      (problem) => problem.includes("checkpoint") || problem.includes("root"),
    ),
  );
});

test("portable receipt parser accepts intact proof and rejects modified proof", () => {
  const root = rootInvestigation();
  const policy = { maxRounds: 1 };
  const seed: AutopilotAction = {
    kind: "seed",
    target: root.query,
    targetKind: root.kind,
    reason: "Initial full-spectrum public-infrastructure observation.",
    expectedInformationGain: 1,
    estimatedCost: 1,
  };
  const stop = planNextAction(root, buildStressReport(root), [actionKey(seed)], policy, 1);
  const round = createAutopilotRound({
    index: 0,
    action: seed,
    nextAction: stop,
    investigation: root,
    previousRoundRoot: null,
    sealedAt: "2026-10-10T00:00:01.000Z",
  });
  const receipt = createAutopilotReceipt({
    runId: "portable",
    startedAt: "2026-10-10T00:00:00.000Z",
    completedAt: "2026-10-10T00:00:02.000Z",
    policy: { maxRounds: 1, targetStability: 82, targetMargin: 0.2, minimumLiveCoverage: 0.72 },
    rounds: [round],
    finalInvestigation: root,
  });
  assert.equal(parseAutopilotReceipt(JSON.stringify(receipt)).runRoot, receipt.runRoot);
  const modified = structuredClone(receipt);
  modified.rounds[0].nextAction.reason = "robustness-target-reached";
  assert.throws(() => parseAutopilotReceipt(JSON.stringify(modified)), /failed verification/);
});

test("round chain binds capsule sealing metadata that is outside the capsule evidence root", () => {
  const root = rootInvestigation();
  const policy = {
    maxRounds: 1,
    targetStability: 82,
    targetMargin: 0.2,
    minimumLiveCoverage: 0.72,
  };
  const seed: AutopilotAction = {
    kind: "seed",
    target: root.query,
    targetKind: root.kind,
    reason: "Initial full-spectrum public-infrastructure observation.",
    expectedInformationGain: 1,
    estimatedCost: 1,
  };
  const stop = planNextAction(root, buildStressReport(root), [actionKey(seed)], policy, 1);
  const round = createAutopilotRound({
    index: 0,
    action: seed,
    nextAction: stop,
    investigation: root,
    previousRoundRoot: null,
    sealedAt: "2026-10-10T00:00:01.000Z",
  });
  const receipt = createAutopilotReceipt({
    runId: "sealed-at-binding",
    startedAt: "2026-10-10T00:00:00.000Z",
    completedAt: "2026-10-10T00:00:02.000Z",
    policy,
    rounds: [round],
    finalInvestigation: root,
  });
  const tampered = structuredClone(receipt);
  tampered.rounds[0].capsule.sealedAt = "2099-01-01T00:00:00.000Z";
  const verification = verifyAutopilotReceipt(tampered);
  assert.equal(verification.valid, false);
  assert.equal(verification.chainIntegrity, false);
});
