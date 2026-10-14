import type { LatticeResult } from "./types";

/** Fractional removal under the existing Stress transfer model, in log space. */
export function evaluateScenario(lattice: LatticeResult, retention: Record<string, number>) {
  const scores = lattice.hypotheses.map((hypothesis) => {
    let score = Math.log(
      Math.max(1e-9, Number.isFinite(hypothesis.posterior) ? hypothesis.posterior : 0),
    );
    for (const row of lattice.matrix) {
      const requested = retention[row.evidence];
      const kept = Number.isFinite(requested) ? Math.max(0, Math.min(1, requested)) : 1;
      const cell = row.cells[hypothesis.id];
      const factor = cell === "support" ? 1.55 : cell === "contradict" ? 0.55 : 1;
      score -= (1 - kept) * Math.log(factor);
    }
    return { id: hypothesis.id, score };
  });
  const max = Math.max(...scores.map((item) => item.score));
  const total = scores.reduce((sum, item) => sum + Math.exp(item.score - max), 0);
  return scores
    .map((item) => ({ id: item.id, posterior: Math.exp(item.score - max) / total }))
    .sort((a, b) => b.posterior - a.posterior || a.id.localeCompare(b.id));
}
