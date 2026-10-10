import { sha3_512Hex } from "../quantum/sha3.ts";
import type { Investigation, Json } from "./types";

export type CapsuleSeverity = "none" | "minor" | "major";

export type EvidenceCapsule = {
  schema: "omnitrace.evidence-capsule";
  version: 1;
  capsuleId: string;
  sealedAt: string;
  observedAt: string;
  subject: {
    query: string;
    kind: Investigation["kind"];
    investigationId: string;
  };
  coverage: {
    sourcesTotal: number;
    sourcesLive: number;
    rawPayloads: number;
  };
  sections: {
    sources: Array<{
      id: string;
      name: string;
      ok: boolean;
      error?: string;
      dataDigest: string;
    }>;
    facts: Array<{
      id: string;
      label: string;
      value: string;
      sourceIds: string[];
      tone?: string;
      hint?: string;
    }>;
    graph: Investigation["graph"];
    timeline: Investigation["timeline"];
    lattice: Investigation["lattice"];
    disagreements: string[];
  };
  sectionDigests: {
    sources: string;
    facts: string;
    graph: string;
    timeline: string;
    lattice: string;
    disagreements: string;
  };
  evidenceDigest: string;
  rootDigest: string;
};

export type CapsuleVerification = {
  valid: boolean;
  evidenceValid: boolean;
  rootValid: boolean;
  sectionValidity: Record<keyof EvidenceCapsule["sectionDigests"], boolean>;
  problems: string[];
};

export type CapsuleDrift = {
  severity: CapsuleSeverity;
  changed: boolean;
  summary: string;
  sourceChanges: string[];
  factChanges: string[];
  graphChanges: string[];
  latticeChanges: string[];
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

function sourcePayload(source: Investigation["sources"][number]): Json | { error: string | null } {
  return source.data ?? { error: source.error ?? null };
}

function buildSections(inv: Investigation): EvidenceCapsule["sections"] {
  return {
    sources: inv.sources
      .map((source) => ({
        id: source.id,
        name: source.name,
        ok: source.ok,
        ...(source.error ? { error: source.error } : {}),
        dataDigest: digest(sourcePayload(source)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    facts: inv.facts
      .map((fact) => ({
        id: fact.id,
        label: fact.label,
        value: fact.value,
        sourceIds: [...fact.sourceIds].sort(),
        ...(fact.tone ? { tone: fact.tone } : {}),
        ...(fact.hint ? { hint: fact.hint } : {}),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    graph: {
      nodes: [...inv.graph.nodes].sort((a, b) => a.id.localeCompare(b.id)),
      edges: [...inv.graph.edges].sort((a, b) => a.id.localeCompare(b.id)),
    },
    timeline: [...inv.timeline].sort((a, b) => {
      const byTime = a.at.localeCompare(b.at);
      return byTime || a.label.localeCompare(b.label);
    }),
    lattice: inv.lattice,
    disagreements: [...inv.disagreements].sort(),
  };
}

function sectionDigests(sections: EvidenceCapsule["sections"]): EvidenceCapsule["sectionDigests"] {
  return {
    sources: digest(sections.sources),
    facts: digest(sections.facts),
    graph: digest(sections.graph),
    timeline: digest(sections.timeline),
    lattice: digest(sections.lattice),
    disagreements: digest(sections.disagreements),
  };
}

function evidenceDigestFor(
  subject: Pick<EvidenceCapsule["subject"], "query" | "kind">,
  hashes: EvidenceCapsule["sectionDigests"],
) {
  return digest({ subject: { query: subject.query, kind: subject.kind }, sectionDigests: hashes });
}

function rootDigestFor(
  capsule: Pick<
    EvidenceCapsule,
    | "schema"
    | "version"
    | "observedAt"
    | "subject"
    | "coverage"
    | "sectionDigests"
    | "evidenceDigest"
  >,
) {
  return digest(capsule);
}

export function createEvidenceCapsule(
  inv: Investigation,
  sealedAt = new Date().toISOString(),
): EvidenceCapsule {
  const sections = buildSections(inv);
  const hashes = sectionDigests(sections);
  const subject = { query: inv.query, kind: inv.kind, investigationId: inv.id };
  const coverage = {
    sourcesTotal: inv.sources.length,
    sourcesLive: inv.sources.filter((source) => source.ok).length,
    rawPayloads: inv.sources.filter((source) => source.data !== undefined).length,
  };
  const evidenceDigest = evidenceDigestFor(subject, hashes);
  const base = {
    schema: "omnitrace.evidence-capsule" as const,
    version: 1 as const,
    observedAt: inv.collectedAt,
    subject,
    coverage,
    sectionDigests: hashes,
    evidenceDigest,
  };
  const rootDigest = rootDigestFor(base);
  return {
    ...base,
    capsuleId: rootDigest.slice(0, 32),
    sealedAt,
    sections,
    rootDigest,
  };
}

export function verifyEvidenceCapsule(capsule: EvidenceCapsule): CapsuleVerification {
  const actualSections = sectionDigests(capsule.sections);
  const keys = Object.keys(actualSections) as Array<keyof typeof actualSections>;
  const sectionValidity = Object.fromEntries(
    keys.map((key) => [key, actualSections[key] === capsule.sectionDigests[key]]),
  ) as CapsuleVerification["sectionValidity"];
  const expectedEvidence = evidenceDigestFor(capsule.subject, actualSections);
  const evidenceValid =
    expectedEvidence === capsule.evidenceDigest && keys.every((key) => sectionValidity[key]);
  const expectedRoot = rootDigestFor({
    schema: capsule.schema,
    version: capsule.version,
    observedAt: capsule.observedAt,
    subject: capsule.subject,
    coverage: capsule.coverage,
    sectionDigests: actualSections,
    evidenceDigest: expectedEvidence,
  });
  const rootValid =
    expectedRoot === capsule.rootDigest && capsule.capsuleId === expectedRoot.slice(0, 32);
  const problems = keys
    .filter((key) => !sectionValidity[key])
    .map((key) => `${key} section digest mismatch`);
  if (expectedEvidence !== capsule.evidenceDigest) problems.push("evidence digest mismatch");
  if (!rootValid) problems.push("root digest mismatch");
  return { valid: evidenceValid && rootValid, evidenceValid, rootValid, sectionValidity, problems };
}

function mapById<T extends { id: string }>(items: T[]) {
  return new Map(items.map((item) => [item.id, item]));
}

export function compareEvidenceCapsules(
  previous: EvidenceCapsule,
  next: EvidenceCapsule,
): CapsuleDrift {
  if (previous.evidenceDigest === next.evidenceDigest) {
    return {
      severity: "none",
      changed: false,
      summary: "No semantic evidence drift detected.",
      sourceChanges: [],
      factChanges: [],
      graphChanges: [],
      latticeChanges: [],
    };
  }

  const sourceChanges: string[] = [];
  const beforeSources = mapById(previous.sections.sources);
  const afterSources = mapById(next.sections.sources);
  for (const id of new Set([...beforeSources.keys(), ...afterSources.keys()])) {
    const before = beforeSources.get(id);
    const after = afterSources.get(id);
    if (!before) sourceChanges.push(`Source added: ${after?.name ?? id}`);
    else if (!after) sourceChanges.push(`Source removed: ${before.name}`);
    else if (before.ok !== after.ok)
      sourceChanges.push(
        `${after.name}: ${before.ok ? "live" : "silent"} → ${after.ok ? "live" : "silent"}`,
      );
    else if (before.dataDigest !== after.dataDigest)
      sourceChanges.push(`${after.name}: payload changed`);
  }

  const factChanges: string[] = [];
  const beforeFacts = mapById(previous.sections.facts);
  const afterFacts = mapById(next.sections.facts);
  for (const id of new Set([...beforeFacts.keys(), ...afterFacts.keys()])) {
    const before = beforeFacts.get(id);
    const after = afterFacts.get(id);
    if (!before) factChanges.push(`Fact added: ${after?.label ?? id}`);
    else if (!after) factChanges.push(`Fact removed: ${before.label}`);
    else if (before.value !== after.value)
      factChanges.push(`${after.label}: ${before.value} → ${after.value}`);
  }

  const nodeDelta = next.sections.graph.nodes.length - previous.sections.graph.nodes.length;
  const edgeDelta = next.sections.graph.edges.length - previous.sections.graph.edges.length;
  const graphChanges = [
    ...(nodeDelta ? [`Entity count ${nodeDelta > 0 ? "+" : ""}${nodeDelta}`] : []),
    ...(edgeDelta ? [`Relationship count ${edgeDelta > 0 ? "+" : ""}${edgeDelta}`] : []),
  ];
  if (previous.sectionDigests.graph !== next.sectionDigests.graph && graphChanges.length === 0) {
    graphChanges.push("Graph topology or entity metadata changed");
  }

  const latticeChanges: string[] = [];
  if (previous.sections.lattice.leading !== next.sections.lattice.leading) {
    latticeChanges.push(
      `Leading hypothesis: ${previous.sections.lattice.leading} → ${next.sections.lattice.leading}`,
    );
  }
  if (previous.sections.lattice.confidence !== next.sections.lattice.confidence) {
    latticeChanges.push(
      `Confidence: ${previous.sections.lattice.confidence} → ${next.sections.lattice.confidence}`,
    );
  }
  if (
    previous.sectionDigests.lattice !== next.sectionDigests.lattice &&
    latticeChanges.length === 0
  ) {
    latticeChanges.push("Hypothesis weights or evidence matrix changed");
  }

  const major =
    latticeChanges.length > 0 || sourceChanges.some((change) => change.includes("live → silent"));
  const total =
    sourceChanges.length + factChanges.length + graphChanges.length + latticeChanges.length;
  return {
    severity: major ? "major" : "minor",
    changed: true,
    summary: `${total} semantic change${total === 1 ? "" : "s"} detected since the previous sealed observation.`,
    sourceChanges,
    factChanges,
    graphChanges,
    latticeChanges,
  };
}

export function parseEvidenceCapsule(text: string): EvidenceCapsule {
  const value = JSON.parse(text) as Partial<EvidenceCapsule>;
  if (
    value.schema !== "omnitrace.evidence-capsule" ||
    value.version !== 1 ||
    typeof value.rootDigest !== "string" ||
    typeof value.evidenceDigest !== "string" ||
    typeof value.capsuleId !== "string" ||
    !value.subject ||
    !value.sections ||
    !value.sectionDigests ||
    !value.coverage
  ) {
    throw new Error("Unsupported or malformed Evidence Capsule");
  }
  const capsule = value as EvidenceCapsule;
  const verification = verifyEvidenceCapsule(capsule);
  if (!verification.valid) {
    throw new Error(
      `Evidence Capsule failed integrity verification: ${verification.problems.join(", ")}`,
    );
  }
  return capsule;
}
