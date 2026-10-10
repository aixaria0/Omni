import { sha3_512Hex } from "../quantum/sha3.ts";
import { createEvidenceCapsule, verifyEvidenceCapsule, type EvidenceCapsule } from "./capsule.ts";
import { buildHeuristicLattice } from "./lattice-local.ts";
import { buildStressReport, type StressReport } from "./stress.ts";
import type {
  Fact,
  GraphEdge,
  GraphNode,
  Investigation,
  QueryKind,
  SourceResult,
  TimelineEvent,
} from "./types";

export type AutopilotPolicy = {
  maxRounds: number;
  targetStability: number;
  targetMargin: number;
  minimumLiveCoverage: number;
};

export const DEFAULT_AUTOPILOT_POLICY: AutopilotPolicy = {
  maxRounds: 4,
  targetStability: 82,
  targetMargin: 0.2,
  minimumLiveCoverage: 0.72,
};

export type AutopilotAction =
  | {
      kind: "seed";
      target: string;
      targetKind: QueryKind;
      reason: string;
      expectedInformationGain: number;
      estimatedCost: number;
    }
  | {
      kind: "pivot";
      target: string;
      targetKind: "ip" | "domain" | "asn";
      reason: string;
      expectedInformationGain: number;
      estimatedCost: number;
      score: number;
    }
  | {
      kind: "refresh-root";
      target: string;
      targetKind: QueryKind;
      reason: string;
      expectedInformationGain: number;
      estimatedCost: number;
    }
  | {
      kind: "stop";
      target: string;
      targetKind: QueryKind;
      reason: AutopilotStopReason;
      expectedInformationGain: 0;
      estimatedCost: 0;
    };

export type AutopilotStopReason =
  "robustness-target-reached" | "no-actionable-infrastructure-pivots" | "round-budget-exhausted";

export type AutopilotCheckpoint = {
  leader: string;
  runnerUp: string | null;
  margin: number;
  entropy: number;
  stabilityScore: number;
  grade: StressReport["grade"];
  minimalFlipSize: number | null;
  dominantSource: string | null;
  dominantSourceShare: number;
  topPriority: string | null;
};

export type AutopilotRound = {
  index: number;
  action: AutopilotAction;
  nextAction: AutopilotAction;
  capsule: EvidenceCapsule;
  checkpoint: AutopilotCheckpoint;
  stressDigest: string;
  previousRoundRoot: string | null;
  roundRoot: string;
};

export type AutopilotReceipt = {
  schema: "omnitrace.autopilot-receipt";
  version: 1;
  runId: string;
  query: string;
  kind: QueryKind;
  startedAt: string;
  completedAt: string;
  policy: AutopilotPolicy;
  rounds: AutopilotRound[];
  stopReason: AutopilotStopReason;
  final: {
    investigationId: string;
    evidenceDigest: string;
    capsuleRoot: string;
    leader: string;
    stabilityScore: number;
  };
  runRoot: string;
};

export type AutopilotRun = AutopilotReceipt & {
  finalInvestigation: Investigation;
};

export type AutopilotVerification = {
  valid: boolean;
  capsuleIntegrity: boolean;
  chainIntegrity: boolean;
  plannerIntegrity: boolean;
  runRootIntegrity: boolean;
  problems: string[];
};

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(object[key])}`)
    .join(",")}}`;
}

function digest(value: unknown) {
  return sha3_512Hex(stable(value));
}

function roundNumber(value: number, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function sanitizeAutopilotPolicy(input: Partial<AutopilotPolicy> = {}): AutopilotPolicy {
  return {
    maxRounds: Math.max(
      1,
      Math.min(6, Math.floor(input.maxRounds ?? DEFAULT_AUTOPILOT_POLICY.maxRounds)),
    ),
    targetStability: Math.max(
      45,
      Math.min(98, Math.floor(input.targetStability ?? DEFAULT_AUTOPILOT_POLICY.targetStability)),
    ),
    targetMargin: Math.max(
      0.05,
      Math.min(0.6, input.targetMargin ?? DEFAULT_AUTOPILOT_POLICY.targetMargin),
    ),
    minimumLiveCoverage: Math.max(
      0.4,
      Math.min(1, input.minimumLiveCoverage ?? DEFAULT_AUTOPILOT_POLICY.minimumLiveCoverage),
    ),
  };
}

function infrastructureNodeKind(node: GraphNode): "ip" | "domain" | "asn" | null {
  if (node.kind === "ip" || node.kind === "domain" || node.kind === "asn") return node.kind;
  return null;
}

function normalizeTarget(kind: QueryKind, target: string) {
  const value = target.trim();
  if (kind === "domain") return value.toLowerCase().replace(/\.$/, "");
  if (kind === "asn")
    return value.toUpperCase().startsWith("AS") ? value.toUpperCase() : `AS${value}`;
  return value;
}

export function actionKey(action: Pick<AutopilotAction, "kind" | "target" | "targetKind">) {
  if (action.kind === "refresh-root")
    return `refresh:${normalizeTarget(action.targetKind, action.target)}`;
  return `${action.targetKind}:${normalizeTarget(action.targetKind, action.target)}`;
}

function targetNodeId(kind: QueryKind, target: string) {
  const normalized = normalizeTarget(kind, target);
  if (kind === "ip") return `ip:${normalized}`;
  if (kind === "domain") return `dom:${normalized}`;
  if (kind === "asn") return `asn:${normalized}`;
  return `pivot:${digest([kind, normalized]).slice(0, 20)}`;
}

function edgeId(source: string, target: string, rel: string) {
  return `e_${digest([source, target, rel]).slice(0, 20)}`;
}

function mapChildSourceId(namespace: string, sourceId: string) {
  return `${namespace}:${sourceId}`;
}

function mergeFacts(base: Fact[], child: Fact[], sourceMap: Map<string, string>) {
  const combined = new Map<string, Fact>();
  const add = (fact: Fact, mapped = false) => {
    const sourceIds = mapped
      ? fact.sourceIds.map((sourceId) => sourceMap.get(sourceId) ?? sourceId)
      : fact.sourceIds;
    const key = `${fact.label}\u241f${fact.value}`;
    const previous = combined.get(key);
    if (previous) {
      previous.sourceIds = [...new Set([...previous.sourceIds, ...sourceIds])].sort();
      if (!previous.hint && fact.hint) previous.hint = fact.hint;
      if (!previous.tone && fact.tone) previous.tone = fact.tone;
      return;
    }
    combined.set(key, { ...fact, sourceIds: [...new Set(sourceIds)].sort() });
  };
  base.forEach((fact) => add({ ...fact }));
  child.forEach((fact) => add({ ...fact }, true));

  const facts = [...combined.values()];
  const aggregateLabels = new Set([
    "Organization",
    "ASN",
    "Resolved addresses",
    "Advertised ports",
    "Known CPEs / vulns",
    "Reverse hostnames",
    "CT certificates",
    "Archive depth",
    "OTX pulse count",
  ]);

  for (const label of aggregateLabels) {
    const group = facts.filter((fact) => fact.label === label);
    if (group.length <= 1) continue;
    let value: string;
    if (label === "CT certificates" || label === "OTX pulse count") {
      const total = group.reduce((sum, fact) => {
        const parsed = Number(fact.value.replace(/[^0-9.]/g, ""));
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0);
      value = String(total);
    } else {
      const pieces = group.flatMap((fact) =>
        fact.value
          .split(label === "Known CPEs / vulns" ? /\s*·\s*/ : /\s*[,|/]\s*/)
          .map((item) => item.trim())
          .filter(Boolean),
      );
      value = [...new Set(pieces)].slice(0, 24).join(label === "Known CPEs / vulns" ? " · " : ", ");
    }
    const sourceIds = [...new Set(group.flatMap((fact) => fact.sourceIds))].sort();
    const aggregate: Fact = {
      ...group[0],
      id: `f_${digest([label, value]).slice(0, 20)}`,
      value,
      sourceIds,
    };
    for (let index = facts.length - 1; index >= 0; index -= 1) {
      if (facts[index].label === label) facts.splice(index, 1);
    }
    facts.unshift(aggregate);
  }
  return facts;
}

function mergeGraph(base: Investigation["graph"], child: Investigation, namespace: string) {
  const queryReplacement = targetNodeId(child.kind, child.query);
  const remap = (id: string) => (id === "query" ? queryReplacement : id);
  const nodes = new Map(base.nodes.map((node) => [node.id, { ...node }]));

  for (const node of child.graph.nodes) {
    const id = remap(node.id);
    const mapped: GraphNode = {
      ...node,
      id,
      hop: id === queryReplacement ? Math.min(2, node.hop + 1) : Math.min(3, node.hop + 1),
      detail: node.detail ? `${child.query} · ${node.detail}` : node.detail,
    };
    const existing = nodes.get(id);
    if (!existing) nodes.set(id, mapped);
    else {
      existing.hop = Math.min(existing.hop, mapped.hop);
      existing.risk = Math.max(existing.risk ?? 0, mapped.risk ?? 0) || undefined;
      if (!existing.detail && mapped.detail) existing.detail = mapped.detail;
    }
  }

  if (!nodes.has(queryReplacement)) {
    nodes.set(queryReplacement, {
      id: queryReplacement,
      label: child.query,
      kind:
        child.kind === "ip" || child.kind === "domain" || child.kind === "asn"
          ? child.kind
          : "host",
      hop: 1,
      detail: `Autopilot pivot ${namespace}`,
    });
  }

  const edgeMap = new Map<string, GraphEdge>();
  for (const edge of base.edges) {
    const key = `${edge.source}\u241f${edge.target}\u241f${edge.rel}`;
    edgeMap.set(key, edge);
  }
  for (const edge of child.graph.edges) {
    const source = remap(edge.source);
    const target = remap(edge.target);
    if (source === target) continue;
    const key = `${source}\u241f${target}\u241f${edge.rel}`;
    if (!edgeMap.has(key))
      edgeMap.set(key, { id: edgeId(source, target, edge.rel), source, target, rel: edge.rel });
  }
  if (queryReplacement !== "query") {
    const linkKey = `query\u241f${queryReplacement}\u241fautopilot-pivot`;
    if (!edgeMap.has(linkKey)) {
      edgeMap.set(linkKey, {
        id: edgeId("query", queryReplacement, "autopilot-pivot"),
        source: "query",
        target: queryReplacement,
        rel: "autopilot-pivot",
      });
    }
  }
  return { nodes: [...nodes.values()], edges: [...edgeMap.values()] };
}

function mergeTimeline(base: TimelineEvent[], child: TimelineEvent[]) {
  const map = new Map<string, TimelineEvent>();
  for (const event of [...base, ...child]) {
    map.set(`${event.at}\u241f${event.label}\u241f${event.source}`, event);
  }
  return [...map.values()].sort((a, b) => a.at.localeCompare(b.at)).slice(-80);
}

export function mergeWorldInvestigations(
  base: Investigation,
  child: Investigation,
  mergedId: string,
  collectedAt = child.collectedAt,
): Investigation {
  const namespace = `pivot_${digest([child.kind, child.query]).slice(0, 10)}`;
  const sourceMap = new Map<string, string>();
  const childSources: SourceResult[] = child.sources.map((source) => {
    const id = mapChildSourceId(namespace, source.id);
    sourceMap.set(source.id, id);
    return { ...source, id, name: `${child.query} · ${source.name}` };
  });
  const sourceById = new Map<string, SourceResult>();
  for (const source of [...base.sources, ...childSources]) sourceById.set(source.id, source);
  const facts = mergeFacts(base.facts, child.facts, sourceMap);
  const graph = mergeGraph(base.graph, child, namespace);
  const lattice = buildHeuristicLattice(facts, graph);
  return {
    id: mergedId,
    query: base.query,
    kind: base.kind,
    collectedAt,
    sources: [...sourceById.values()],
    facts,
    graph,
    timeline: mergeTimeline(base.timeline, child.timeline),
    lattice,
    disagreements: [
      ...new Set([
        ...base.disagreements,
        ...child.disagreements.map((item) => `${child.query}: ${item}`),
      ]),
    ],
  };
}

function priorityAffinity(kind: "ip" | "domain" | "asn", text: string) {
  if (kind === "ip" && /port|vuln|cpe|internetdb|threat|otx|host/i.test(text)) return 24;
  if (kind === "domain" && /cert|archive|dns|http|domain|registrar/i.test(text)) return 22;
  if (kind === "asn" && /asn|org|network|allocation|owner|rdap/i.test(text)) return 24;
  return 4;
}

function candidateAllowed(root: Investigation, node: GraphNode) {
  const kind = infrastructureNodeKind(node);
  if (!kind) return false;
  const target = normalizeTarget(kind, node.label);
  if (target === normalizeTarget(root.kind, root.query)) return false;
  if (node.hop > 2) return false;
  if (kind === "domain" && root.kind === "domain") {
    const rootDomain = normalizeTarget("domain", root.query);
    if (target !== rootDomain && !target.endsWith(`.${rootDomain}`)) return false;
  }
  return true;
}

export function planNextAction(
  inv: Investigation,
  report: StressReport,
  visited: Iterable<string>,
  policyInput: Partial<AutopilotPolicy> = DEFAULT_AUTOPILOT_POLICY,
  roundsCompleted = 1,
): AutopilotAction {
  const policy = sanitizeAutopilotPolicy(policyInput);
  const visitedSet = new Set(visited);
  const sourceFlip = report.sourceStress.some((source) => source.leaderChanged);
  const robust =
    report.stabilityScore >= policy.targetStability &&
    report.baseline.margin >= policy.targetMargin &&
    !sourceFlip &&
    (!report.minimalFlipSet || report.minimalFlipSet.evidence.length >= 3);
  if (robust) {
    return {
      kind: "stop",
      target: inv.query,
      targetKind: inv.kind,
      reason: "robustness-target-reached",
      expectedInformationGain: 0,
      estimatedCost: 0,
    };
  }
  if (roundsCompleted >= policy.maxRounds) {
    return {
      kind: "stop",
      target: inv.query,
      targetKind: inv.kind,
      reason: "round-budget-exhausted",
      expectedInformationGain: 0,
      estimatedCost: 0,
    };
  }

  const priorityText = report.collectionPriorities
    .slice(0, 5)
    .map((item) => `${item.label} ${item.rationale}`)
    .join(" ");
  const entropyPressure = Math.min(24, report.baseline.entropy * 11);
  const dominant = report.dominantSource?.sourceId ?? "";
  const candidates = inv.graph.nodes
    .filter((node) => candidateAllowed(inv, node))
    .map((node) => {
      const kind = infrastructureNodeKind(node)!;
      const target = normalizeTarget(kind, node.label);
      const key = `${kind}:${target}`;
      if (visitedSet.has(key)) return null;
      const estimatedCost = kind === "domain" ? 3 : kind === "ip" ? 2 : 1;
      const dominantBonus =
        (kind === "ip" && /internetdb|ipwho|otx|bgp|ripe/i.test(dominant)) ||
        (kind === "domain" && /crt|dns|wayback|http|urlscan|rdap_domain/i.test(dominant)) ||
        (kind === "asn" && /asn|bgp|ripe|rdap/i.test(dominant))
          ? 12
          : 0;
      const score =
        26 +
        priorityAffinity(kind, priorityText) +
        entropyPressure +
        (node.risk ?? 0) * 20 +
        Math.max(0, 12 - node.hop * 4) +
        dominantBonus -
        estimatedCost * 3;
      const expectedInformationGain = Math.min(
        1,
        Math.max(
          report.collectionPriorities[0]?.estimatedInformationGain ?? 0,
          (100 - report.stabilityScore) / 140 + score / 500,
        ),
      );
      return { node, kind, target, estimatedCost, score, expectedInformationGain };
    })
    .filter(Boolean)
    .sort((a, b) => b!.score / b!.estimatedCost - a!.score / a!.estimatedCost);

  const best = candidates[0];
  if (best) {
    return {
      kind: "pivot",
      target: best.target,
      targetKind: best.kind,
      reason: `Highest-value infrastructure pivot: score ${Math.round(best.score)} from uncertainty, decision-boundary priorities, graph risk and collector concentration.`,
      expectedInformationGain: roundNumber(best.expectedInformationGain, 4),
      estimatedCost: best.estimatedCost,
      score: roundNumber(best.score, 2),
    };
  }

  const liveCoverage = inv.sources.length
    ? inv.sources.filter((source) => source.ok).length / inv.sources.length
    : 0;
  const refreshKey = `refresh:${normalizeTarget(inv.kind, inv.query)}`;
  if (liveCoverage < policy.minimumLiveCoverage && !visitedSet.has(refreshKey)) {
    return {
      kind: "refresh-root",
      target: inv.query,
      targetKind: inv.kind,
      reason: `Live collector coverage is ${Math.round(liveCoverage * 100)}%, below the ${Math.round(policy.minimumLiveCoverage * 100)}% policy floor.`,
      expectedInformationGain: roundNumber(Math.min(0.45, 1 - liveCoverage), 4),
      estimatedCost: 2,
    };
  }

  return {
    kind: "stop",
    target: inv.query,
    targetKind: inv.kind,
    reason: "no-actionable-infrastructure-pivots",
    expectedInformationGain: 0,
    estimatedCost: 0,
  };
}

export function checkpointFromStress(report: StressReport): AutopilotCheckpoint {
  return {
    leader: report.baseline.leader,
    runnerUp: report.baseline.runnerUp,
    margin: report.baseline.margin,
    entropy: report.baseline.entropy,
    stabilityScore: report.stabilityScore,
    grade: report.grade,
    minimalFlipSize: report.minimalFlipSet?.evidence.length ?? null,
    dominantSource: report.dominantSource?.sourceName ?? null,
    dominantSourceShare: report.dominantSource?.leverageShare ?? 0,
    topPriority: report.collectionPriorities[0]?.label ?? null,
  };
}

function capsuleToInvestigation(capsule: EvidenceCapsule): Investigation {
  return {
    id: capsule.subject.investigationId,
    query: capsule.subject.query,
    kind: capsule.subject.kind,
    collectedAt: capsule.observedAt,
    sources: capsule.sections.sources.map((source) => ({
      id: source.id,
      name: source.name,
      ok: source.ok,
      ms: 0,
      ...(source.error ? { error: source.error } : {}),
    })),
    facts: capsule.sections.facts.map((fact) => ({
      ...fact,
      tone: fact.tone as Fact["tone"],
    })),
    graph: capsule.sections.graph,
    timeline: capsule.sections.timeline,
    lattice: capsule.sections.lattice,
    disagreements: capsule.sections.disagreements,
  };
}

function stressDigestFor(report: StressReport) {
  return digest(report);
}

function roundRootFor(round: Omit<AutopilotRound, "roundRoot">) {
  return digest({
    index: round.index,
    action: round.action,
    nextAction: round.nextAction,
    capsuleRoot: round.capsule.rootDigest,
    capsuleSealedAt: round.capsule.sealedAt,
    evidenceDigest: round.capsule.evidenceDigest,
    checkpoint: round.checkpoint,
    stressDigest: round.stressDigest,
    previousRoundRoot: round.previousRoundRoot,
  });
}

export function createAutopilotRound(input: {
  index: number;
  action: AutopilotAction;
  nextAction: AutopilotAction;
  investigation: Investigation;
  previousRoundRoot: string | null;
  sealedAt?: string;
}): AutopilotRound {
  const capsule = createEvidenceCapsule(input.investigation, input.sealedAt);
  const report = buildStressReport(input.investigation);
  const base: Omit<AutopilotRound, "roundRoot"> = {
    index: input.index,
    action: input.action,
    nextAction: input.nextAction,
    capsule,
    checkpoint: checkpointFromStress(report),
    stressDigest: stressDigestFor(report),
    previousRoundRoot: input.previousRoundRoot,
  };
  return { ...base, roundRoot: roundRootFor(base) };
}

function runRootFor(receipt: Omit<AutopilotReceipt, "runRoot">) {
  return digest({
    schema: receipt.schema,
    version: receipt.version,
    runId: receipt.runId,
    query: receipt.query,
    kind: receipt.kind,
    startedAt: receipt.startedAt,
    completedAt: receipt.completedAt,
    policy: receipt.policy,
    roundRoots: receipt.rounds.map((round) => round.roundRoot),
    stopReason: receipt.stopReason,
    final: receipt.final,
  });
}

export function createAutopilotReceipt(input: {
  runId: string;
  startedAt: string;
  completedAt: string;
  policy: AutopilotPolicy;
  rounds: AutopilotRound[];
  finalInvestigation: Investigation;
}): AutopilotReceipt {
  if (!input.rounds.length) throw new Error("Autopilot receipt requires at least one round");
  const last = input.rounds[input.rounds.length - 1];
  if (last.nextAction.kind !== "stop")
    throw new Error("Autopilot receipt requires a terminal stop action");
  const base: Omit<AutopilotReceipt, "runRoot"> = {
    schema: "omnitrace.autopilot-receipt",
    version: 1,
    runId: input.runId,
    query: input.finalInvestigation.query,
    kind: input.finalInvestigation.kind,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    policy: sanitizeAutopilotPolicy(input.policy),
    rounds: input.rounds,
    stopReason: last.nextAction.reason,
    final: {
      investigationId: input.finalInvestigation.id,
      evidenceDigest: last.capsule.evidenceDigest,
      capsuleRoot: last.capsule.rootDigest,
      leader: last.checkpoint.leader,
      stabilityScore: last.checkpoint.stabilityScore,
    },
  };
  return { ...base, runRoot: runRootFor(base) };
}

function sameAction(a: AutopilotAction, b: AutopilotAction) {
  return stable(a) === stable(b);
}

export function verifyAutopilotReceipt(receipt: AutopilotReceipt): AutopilotVerification {
  const problems: string[] = [];
  let capsuleIntegrity = true;
  let chainIntegrity = true;
  let plannerIntegrity = true;
  const visited = new Set<string>();
  let previousRoot: string | null = null;
  const first = receipt.rounds[0];
  if (
    !first ||
    first.action.kind !== "seed" ||
    first.action.target !== receipt.query ||
    first.action.targetKind !== receipt.kind ||
    first.capsule.subject.query !== receipt.query ||
    first.capsule.subject.kind !== receipt.kind
  ) {
    plannerIntegrity = false;
    problems.push("seed action or root subject mismatch");
  }

  for (let index = 0; index < receipt.rounds.length; index += 1) {
    const round = receipt.rounds[index];
    if (round.index !== index) {
      chainIntegrity = false;
      problems.push(`round ${index}: index mismatch`);
    }
    const capsuleCheck = verifyEvidenceCapsule(round.capsule);
    if (!capsuleCheck.valid) {
      capsuleIntegrity = false;
      problems.push(`round ${index}: capsule integrity failed`);
    }
    if (round.previousRoundRoot !== previousRoot) {
      chainIntegrity = false;
      problems.push(`round ${index}: previous root mismatch`);
    }
    const expectedRoundRoot = roundRootFor({
      index: round.index,
      action: round.action,
      nextAction: round.nextAction,
      capsule: round.capsule,
      checkpoint: round.checkpoint,
      stressDigest: round.stressDigest,
      previousRoundRoot: round.previousRoundRoot,
    });
    if (expectedRoundRoot !== round.roundRoot) {
      chainIntegrity = false;
      problems.push(`round ${index}: round root mismatch`);
    }

    const inv = capsuleToInvestigation(round.capsule);
    const stress = buildStressReport(inv);
    if (
      stressDigestFor(stress) !== round.stressDigest ||
      stable(checkpointFromStress(stress)) !== stable(round.checkpoint)
    ) {
      plannerIntegrity = false;
      problems.push(`round ${index}: stress checkpoint mismatch`);
    }
    visited.add(actionKey(round.action));
    const expectedNext = planNextAction(inv, stress, visited, receipt.policy, index + 1);
    if (!sameAction(expectedNext, round.nextAction)) {
      plannerIntegrity = false;
      problems.push(`round ${index}: planner decision mismatch`);
    }
    if (index > 0 && !sameAction(receipt.rounds[index - 1].nextAction, round.action)) {
      plannerIntegrity = false;
      problems.push(`round ${index}: action does not match previous planner decision`);
    }
    previousRoot = round.roundRoot;
  }

  const { runRoot: _runRoot, ...withoutRoot } = receipt;
  const expectedRunRoot = runRootFor(withoutRoot);
  const runRootIntegrity = expectedRunRoot === receipt.runRoot;
  if (!runRootIntegrity) problems.push("run root mismatch");
  const last = receipt.rounds.at(-1);
  if (!last || last.nextAction.kind !== "stop" || last.nextAction.reason !== receipt.stopReason) {
    plannerIntegrity = false;
    problems.push("terminal stop reason mismatch");
  }
  if (
    last &&
    (last.capsule.rootDigest !== receipt.final.capsuleRoot ||
      last.capsule.evidenceDigest !== receipt.final.evidenceDigest ||
      last.capsule.subject.investigationId !== receipt.final.investigationId ||
      last.checkpoint.leader !== receipt.final.leader ||
      last.checkpoint.stabilityScore !== receipt.final.stabilityScore)
  ) {
    chainIntegrity = false;
    problems.push("final evidence binding mismatch");
  }

  return {
    valid: capsuleIntegrity && chainIntegrity && plannerIntegrity && runRootIntegrity,
    capsuleIntegrity,
    chainIntegrity,
    plannerIntegrity,
    runRootIntegrity,
    problems,
  };
}

export function parseAutopilotReceipt(text: string): AutopilotReceipt {
  const value = JSON.parse(text) as Partial<AutopilotReceipt>;
  if (
    value.schema !== "omnitrace.autopilot-receipt" ||
    value.version !== 1 ||
    typeof value.runId !== "string" ||
    typeof value.query !== "string" ||
    typeof value.kind !== "string" ||
    typeof value.runRoot !== "string" ||
    !value.policy ||
    !Array.isArray(value.rounds) ||
    !value.rounds.length ||
    !value.final
  ) {
    throw new Error("Unsupported or malformed Autopilot receipt");
  }
  const receipt = value as AutopilotReceipt;
  const verification = verifyAutopilotReceipt(receipt);
  if (!verification.valid) {
    throw new Error(`Autopilot receipt failed verification: ${verification.problems.join(", ")}`);
  }
  return receipt;
}
