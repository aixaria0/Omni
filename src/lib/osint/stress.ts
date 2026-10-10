import type { EvidenceCell, Investigation, LatticeResult } from "./types";

const SUPPORT_FACTOR = 1.55;
const CONTRADICT_FACTOR = 0.55;
const MAX_FLIP_DEPTH = 4;
const MAX_FLIP_CANDIDATES = 14;

export type StressDistribution = {
  id: string;
  posterior: number;
};

export type EvidenceImpact = {
  evidence: string;
  sourceIds: string[];
  counterfactualLeader: string;
  leaderChanged: boolean;
  posteriorShift: number;
  marginLoss: number;
  impactScore: number;
  coalitionalContribution: number;
};

export type SourceStress = {
  sourceId: string;
  sourceName: string;
  evidenceRows: string[];
  leverageShare: number;
  counterfactualLeader: string;
  leaderChanged: boolean;
  posteriorShift: number;
};

export type RobustnessPoint = {
  removalBudget: number;
  worstSignedMargin: number;
  leaderAfterRemoval: string;
  evidence: string[];
};

export type MinimalFlipSet = {
  evidence: string[];
  leaderAfterRemoval: string;
  signedMarginAfterRemoval: number;
} | null;

export type CollectionPriority = {
  id: string;
  label: string;
  kind: "unresolved-evidence" | "hypothesis-gap" | "watch";
  score: number;
  estimatedInformationGain: number | null;
  rationale: string;
};

export type StressReport = {
  version: "omni-stress/v1";
  engine: LatticeResult["engine"];
  baseline: {
    leader: string;
    runnerUp: string | null;
    margin: number;
    entropy: number;
  };
  stabilityScore: number;
  grade: "fragile" | "sensitive" | "stable" | "resilient";
  evidenceImpacts: EvidenceImpact[];
  sourceStress: SourceStress[];
  minimalFlipSet: MinimalFlipSet;
  robustnessFrontier: RobustnessPoint[];
  dominantSource: SourceStress | null;
  collectionPriorities: CollectionPriority[];
  warnings: string[];
  methodology: string[];
};

function round(value: number, digits = 6) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function factor(cell: EvidenceCell | undefined) {
  if (cell === "support") return SUPPORT_FACTOR;
  if (cell === "contradict") return CONTRADICT_FACTOR;
  return 1;
}

function normalizedDistribution(lattice: LatticeResult): StressDistribution[] {
  const raw = lattice.hypotheses.map((hypothesis) => ({
    id: hypothesis.id,
    posterior: Math.max(1e-9, Number.isFinite(hypothesis.posterior) ? hypothesis.posterior : 0),
  }));
  const sum = raw.reduce((total, item) => total + item.posterior, 0) || 1;
  return raw
    .map((item) => ({ ...item, posterior: item.posterior / sum }))
    .sort((a, b) => b.posterior - a.posterior);
}

function normalizeWeights(weights: StressDistribution[]) {
  const sum = weights.reduce((total, item) => total + item.posterior, 0) || 1;
  return weights
    .map((item) => ({ ...item, posterior: item.posterior / sum }))
    .sort((a, b) => b.posterior - a.posterior);
}

export function simulateEvidenceRemoval(
  lattice: LatticeResult,
  evidence: Iterable<string>,
): StressDistribution[] {
  const removed = new Set(evidence);
  const baseline = normalizedDistribution(lattice);
  const byId = new Map(baseline.map((item) => [item.id, item.posterior]));
  const weights = lattice.hypotheses.map((hypothesis) => {
    let weight = byId.get(hypothesis.id) ?? 1e-9;
    for (const row of lattice.matrix) {
      if (!removed.has(row.evidence)) continue;
      weight /= factor(row.cells[hypothesis.id]);
    }
    return { id: hypothesis.id, posterior: weight };
  });
  return normalizeWeights(weights);
}

function simulateDirectionalEvidence(
  lattice: LatticeResult,
  leadId: string,
  rivalId: string,
  direction: "lead" | "rival",
) {
  const baseline = normalizedDistribution(lattice);
  return normalizeWeights(
    baseline.map((item) => {
      if (item.id === leadId) {
        return {
          ...item,
          posterior: item.posterior * (direction === "lead" ? SUPPORT_FACTOR : CONTRADICT_FACTOR),
        };
      }
      if (item.id === rivalId) {
        return {
          ...item,
          posterior: item.posterior * (direction === "rival" ? SUPPORT_FACTOR : CONTRADICT_FACTOR),
        };
      }
      return item;
    }),
  );
}

function entropy(distribution: StressDistribution[]) {
  return distribution.reduce((sum, item) => {
    if (item.posterior <= 0) return sum;
    return sum - item.posterior * Math.log2(item.posterior);
  }, 0);
}

function totalVariation(a: StressDistribution[], b: StressDistribution[]) {
  const right = new Map(b.map((item) => [item.id, item.posterior]));
  return (
    0.5 * a.reduce((sum, item) => sum + Math.abs(item.posterior - (right.get(item.id) ?? 0)), 0)
  );
}

function signedMargin(distribution: StressDistribution[], leaderId: string) {
  const leader = distribution.find((item) => item.id === leaderId)?.posterior ?? 0;
  const rival = Math.max(
    0,
    ...distribution.filter((item) => item.id !== leaderId).map((item) => item.posterior),
  );
  return leader - rival;
}

function tokenSet(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 4),
  );
}

function overlaps(a: Set<string>, b: Set<string>) {
  for (const token of a) if (b.has(token)) return true;
  return false;
}

const EVIDENCE_SOURCE_RULES: Array<[RegExp, string[]]> = [
  [/internetdb|vuln|cpe|open port|risky port/i, ["internetdb"]],
  [/certificate|\bct\b|cert/i, ["crtsh"]],
  [/archive|wayback|histor/i, ["wayback"]],
  [/otx|pulse|threat intel/i, ["otx"]],
  [/\bdns\b|nameserver|\bmx\b|\btxt\b|cname/i, ["dns"]],
  [/http|header|server fingerprint/i, ["httpfp"]],
  [/urlscan/i, ["urlscan"]],
  [/asn|org binding|registrar|allocation|network owner/i, ["rdap", "bgp"]],
];

export function inferEvidenceSources(inv: Investigation, evidence: string): string[] {
  const normalized = evidence.toLowerCase();
  const evidenceTokens = tokenSet(evidence);
  const matched = new Set<string>();

  for (const source of inv.sources) {
    const haystack = `${source.id} ${source.name}`.toLowerCase();
    if (
      normalized.includes(source.id.toLowerCase()) ||
      normalized.includes(source.name.toLowerCase())
    ) {
      matched.add(source.id);
      continue;
    }
    if (overlaps(evidenceTokens, tokenSet(haystack))) matched.add(source.id);
  }

  for (const fact of inv.facts) {
    if (
      normalized.includes(fact.label.toLowerCase()) ||
      overlaps(evidenceTokens, tokenSet(`${fact.label} ${fact.value}`))
    ) {
      for (const sourceId of fact.sourceIds) matched.add(sourceId);
    }
  }

  for (const [pattern, fragments] of EVIDENCE_SOURCE_RULES) {
    if (!pattern.test(evidence)) continue;
    for (const fragment of fragments) {
      for (const source of inv.sources) {
        if (source.id.toLowerCase().includes(fragment)) matched.add(source.id);
      }
    }
  }

  return matched.size ? [...matched].sort() : ["derived"];
}

function factorial(value: number) {
  let result = 1;
  for (let index = 2; index <= value; index += 1) result *= index;
  return result;
}

function hashSeed(values: string[]) {
  let hash = 2166136261;
  for (const char of values.join("\u241f")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 0x9e3779b9;
}

function shuffledIndices(length: number, random: () => number) {
  const indices = Array.from({ length }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [indices[index], indices[swap]] = [indices[swap], indices[index]];
  }
  return indices;
}

function coalitionalContributions(lattice: LatticeResult, leaderId: string) {
  const rows = lattice.matrix.map((row) => row.evidence);
  const n = rows.length;
  const contributions = new Map(rows.map((row) => [row, 0]));
  if (!n) return contributions;
  const all = new Set(rows);
  const marginForIncluded = (included: Set<string>) => {
    const removed = rows.filter((row) => !included.has(row));
    return signedMargin(simulateEvidenceRemoval(lattice, removed), leaderId);
  };

  if (n <= 9) {
    const nFactorial = factorial(n);
    for (let target = 0; target < n; target += 1) {
      let value = 0;
      const others = rows.filter((_, index) => index !== target);
      for (let mask = 0; mask < 2 ** others.length; mask += 1) {
        const included = new Set<string>();
        let size = 0;
        for (let bit = 0; bit < others.length; bit += 1) {
          if (!(mask & (1 << bit))) continue;
          included.add(others[bit]);
          size += 1;
        }
        const before = marginForIncluded(included);
        included.add(rows[target]);
        const after = marginForIncluded(included);
        const weight = (factorial(size) * factorial(n - size - 1)) / nFactorial;
        value += weight * (after - before);
      }
      contributions.set(rows[target], value);
    }
    return contributions;
  }

  let state = hashSeed(rows);
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const samples = 256;
  for (let sample = 0; sample < samples; sample += 1) {
    const included = new Set<string>();
    let before = marginForIncluded(included);
    for (const index of shuffledIndices(n, random)) {
      const evidence = rows[index];
      included.add(evidence);
      const after = marginForIncluded(included);
      contributions.set(evidence, (contributions.get(evidence) ?? 0) + (after - before) / samples);
      before = after;
    }
  }
  void all;
  return contributions;
}

function combinations<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  const choose = (start: number, picked: T[]) => {
    if (picked.length === size) {
      output.push([...picked]);
      return;
    }
    for (let index = start; index <= items.length - (size - picked.length); index += 1) {
      picked.push(items[index]);
      choose(index + 1, picked);
      picked.pop();
    }
  };
  choose(0, []);
  return output;
}

function buildRobustnessFrontier(
  lattice: LatticeResult,
  evidenceImpacts: EvidenceImpact[],
  leaderId: string,
): RobustnessPoint[] {
  const candidates = evidenceImpacts
    .filter((item) => item.posteriorShift > 1e-9)
    .slice(0, MAX_FLIP_CANDIDATES)
    .map((item) => item.evidence);
  const baseline = normalizedDistribution(lattice);
  let worst: RobustnessPoint = {
    removalBudget: 0,
    worstSignedMargin: round(signedMargin(baseline, leaderId)),
    leaderAfterRemoval: baseline[0]?.id ?? leaderId,
    evidence: [],
  };
  const frontier: RobustnessPoint[] = [worst];

  for (let budget = 1; budget <= MAX_FLIP_DEPTH; budget += 1) {
    let budgetWorst = worst;
    for (let size = 1; size <= Math.min(budget, candidates.length); size += 1) {
      for (const set of combinations(candidates, size)) {
        const distribution = simulateEvidenceRemoval(lattice, set);
        const margin = signedMargin(distribution, leaderId);
        if (margin < budgetWorst.worstSignedMargin) {
          budgetWorst = {
            removalBudget: budget,
            worstSignedMargin: round(margin),
            leaderAfterRemoval: distribution[0]?.id ?? leaderId,
            evidence: set,
          };
        }
      }
    }
    worst = { ...budgetWorst, removalBudget: budget };
    frontier.push(worst);
  }
  return frontier;
}

function flipFromFrontier(frontier: RobustnessPoint[], leaderId: string): MinimalFlipSet {
  for (const point of frontier.slice(1)) {
    if (point.leaderAfterRemoval === leaderId || point.worstSignedMargin >= 0) continue;
    return {
      evidence: point.evidence,
      leaderAfterRemoval: point.leaderAfterRemoval,
      signedMarginAfterRemoval: point.worstSignedMargin,
    };
  }
  return null;
}

function unresolvedBetween(row: LatticeResult["matrix"][number], leadId: string, rivalId: string) {
  const left = row.cells[leadId] ?? "na";
  const right = row.cells[rivalId] ?? "na";
  return (
    left === "na" || right === "na" || left === right || (left === "neutral" && right === "neutral")
  );
}

function buildCollectionPriorities(
  lattice: LatticeResult,
  baseline: StressDistribution[],
): CollectionPriority[] {
  const leader = baseline[0]?.id;
  const rival = baseline[1]?.id;
  if (!leader || !rival) return [];
  const currentEntropy = entropy(baseline);
  const leadOutcome = simulateDirectionalEvidence(lattice, leader, rival, "lead");
  const rivalOutcome = simulateDirectionalEvidence(lattice, leader, rival, "rival");
  const genericGain = Math.max(
    0,
    currentEntropy - (entropy(leadOutcome) + entropy(rivalOutcome)) / 2,
  );
  const priorities: CollectionPriority[] = [];

  for (const row of lattice.matrix) {
    if (!unresolvedBetween(row, leader, rival)) continue;
    const leadCell = row.cells[leader] ?? "na";
    const rivalCell = row.cells[rival] ?? "na";
    const missing = Number(leadCell === "na") + Number(rivalCell === "na");
    const ambiguity = leadCell === rivalCell ? 1 : 0.55;
    const score = Math.min(100, 48 + genericGain * 160 + missing * 8 + ambiguity * 10);
    priorities.push({
      id: `evidence:${row.evidence}`,
      label: `Resolve ${row.evidence}`,
      kind: "unresolved-evidence",
      score: round(score, 2),
      estimatedInformationGain: round(genericGain, 4),
      rationale: `This row does not currently separate ${leader} from ${rival}; a discriminating observation would directly test the closest decision boundary.`,
    });
  }

  const topHypotheses = lattice.hypotheses
    .filter((hypothesis) => hypothesis.id === leader || hypothesis.id === rival)
    .sort((a, b) => (a.id === leader ? -1 : b.id === leader ? 1 : 0));
  for (const hypothesis of topHypotheses) {
    for (const gap of hypothesis.gaps.slice(0, 4)) {
      priorities.push({
        id: `gap:${hypothesis.id}:${gap}`,
        label: `${hypothesis.id} gap · ${gap}`,
        kind: "hypothesis-gap",
        score: round(42 + (1 - Math.min(1, Math.abs(signedMargin(baseline, leader)))) * 18, 2),
        estimatedInformationGain: null,
        rationale: `Closing a stated gap in ${hypothesis.id} can reduce model dependence on indirect evidence.`,
      });
    }
  }

  for (const item of lattice.watch.slice(0, 6)) {
    priorities.push({
      id: `watch:${item}`,
      label: item,
      kind: "watch",
      score: 32,
      estimatedInformationGain: null,
      rationale: "Existing collection requirement from the active hypothesis lattice.",
    });
  }

  const seen = new Set<string>();
  return priorities
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      const key = item.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

export function buildStressReport(inv: Investigation): StressReport {
  const lattice = inv.lattice;
  const baseline = normalizedDistribution(lattice);
  const leader = baseline[0]?.id ?? lattice.leading;
  const runnerUp = baseline[1]?.id ?? null;
  const baselineMargin = runnerUp ? signedMargin(baseline, leader) : 1;

  const coalitional = coalitionalContributions(lattice, leader);
  const evidenceImpacts = lattice.matrix
    .map((row): EvidenceImpact => {
      const counterfactual = simulateEvidenceRemoval(lattice, [row.evidence]);
      const marginAfter = signedMargin(counterfactual, leader);
      const posteriorShift = totalVariation(baseline, counterfactual);
      const leaderChanged = counterfactual[0]?.id !== leader;
      const marginLoss = baselineMargin - marginAfter;
      const impactScore =
        100 *
        clamp01(posteriorShift * 2.2 + Math.max(0, marginLoss) * 1.25 + (leaderChanged ? 0.35 : 0));
      return {
        evidence: row.evidence,
        sourceIds: inferEvidenceSources(inv, row.evidence),
        counterfactualLeader: counterfactual[0]?.id ?? leader,
        leaderChanged,
        posteriorShift: round(posteriorShift),
        marginLoss: round(marginLoss),
        impactScore: round(impactScore, 2),
        coalitionalContribution: round(coalitional.get(row.evidence) ?? 0),
      };
    })
    .sort((a, b) => b.impactScore - a.impactScore);

  const sourceMap = new Map<string, { rows: string[]; weightedImpact: number }>();
  for (const impact of evidenceImpacts) {
    const share = impact.impactScore / Math.max(1, impact.sourceIds.length);
    for (const sourceId of impact.sourceIds) {
      const item = sourceMap.get(sourceId) ?? { rows: [], weightedImpact: 0 };
      item.rows.push(impact.evidence);
      item.weightedImpact += share;
      sourceMap.set(sourceId, item);
    }
  }
  const totalSourceImpact =
    [...sourceMap.values()].reduce((sum, item) => sum + item.weightedImpact, 0) || 1;
  const sourceStress = [...sourceMap.entries()]
    .map(([sourceId, data]): SourceStress => {
      const counterfactual = simulateEvidenceRemoval(lattice, data.rows);
      const source = inv.sources.find((item) => item.id === sourceId);
      return {
        sourceId,
        sourceName: source?.name ?? (sourceId === "derived" ? "Derived / multi-source" : sourceId),
        evidenceRows: [...new Set(data.rows)],
        leverageShare: round(data.weightedImpact / totalSourceImpact),
        counterfactualLeader: counterfactual[0]?.id ?? leader,
        leaderChanged: counterfactual[0]?.id !== leader,
        posteriorShift: round(totalVariation(baseline, counterfactual)),
      };
    })
    .sort((a, b) => b.leverageShare - a.leverageShare);

  const robustnessFrontier = buildRobustnessFrontier(lattice, evidenceImpacts, leader);
  const minimalFlipSet = flipFromFrontier(robustnessFrontier, leader);
  const dominantSource = sourceStress[0] ?? null;
  const concentration = dominantSource?.leverageShare ?? 0;
  const flipComponent = minimalFlipSet
    ? (({ 1: 0.12, 2: 0.34, 3: 0.55, 4: 0.7 } as Record<number, number>)[
        minimalFlipSet.evidence.length
      ] ?? 0.7)
    : 0.92;
  const marginComponent = clamp01(baselineMargin / 0.35);
  const concentrationComponent = clamp01(1 - concentration);
  let stabilityScore = Math.round(
    100 * (marginComponent * 0.42 + flipComponent * 0.38 + concentrationComponent * 0.2),
  );
  if (minimalFlipSet?.evidence.length === 1) stabilityScore = Math.min(stabilityScore, 38);
  if (sourceStress.some((source) => source.leaderChanged))
    stabilityScore = Math.min(stabilityScore, 56);
  const grade: StressReport["grade"] =
    stabilityScore <= 35
      ? "fragile"
      : stabilityScore <= 60
        ? "sensitive"
        : stabilityScore <= 80
          ? "stable"
          : "resilient";

  const warnings: string[] = [];
  if (minimalFlipSet?.evidence.length === 1) {
    warnings.push(
      `Single-point decision fragility: removing “${minimalFlipSet.evidence[0]}” changes the leading hypothesis.`,
    );
  } else if (minimalFlipSet) {
    warnings.push(
      `The leading hypothesis flips after removing ${minimalFlipSet.evidence.length} high-leverage evidence rows.`,
    );
  }
  for (const source of sourceStress.filter((item) => item.leaderChanged).slice(0, 3)) {
    warnings.push(
      `Source knockout: removing evidence associated with ${source.sourceName} changes the leader to ${source.counterfactualLeader}.`,
    );
  }
  if (concentration >= 0.5 && dominantSource) {
    warnings.push(
      `${Math.round(concentration * 100)}% of measured evidence leverage is concentrated in ${dominantSource.sourceName}.`,
    );
  }
  if (lattice.engine === "grok") {
    warnings.push(
      "Grok posteriors are stress-tested with Omni's fixed evidence transfer function; counterfactual percentages are sensitivity estimates, not a model re-run.",
    );
  }

  return {
    version: "omni-stress/v1",
    engine: lattice.engine,
    baseline: {
      leader,
      runnerUp,
      margin: round(baselineMargin),
      entropy: round(entropy(baseline)),
    },
    stabilityScore,
    grade,
    evidenceImpacts,
    sourceStress,
    minimalFlipSet,
    robustnessFrontier,
    dominantSource,
    collectionPriorities: buildCollectionPriorities(lattice, baseline),
    warnings,
    methodology: [
      "Leave-one-evidence-out sensitivity starts from the active posterior and removes each matrix contribution with fixed support/contradiction likelihood factors.",
      `Adversarial robustness frontier is exact over removal budgets up to ${MAX_FLIP_DEPTH} rows among the ${MAX_FLIP_CANDIDATES} highest-leverage candidates.`,
      "Coalitional contribution uses exact Shapley attribution for up to 9 evidence rows and deterministic permutation sampling above that threshold.",
      "Source knockout removes every evidence row mapped to that collector; multi-source rows are conservatively treated as affected.",
      "Collection priorities favor unresolved rows on the closest hypothesis boundary, then explicit hypothesis gaps and existing watch requirements.",
    ],
  };
}
