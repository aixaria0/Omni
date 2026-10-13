import type { Investigation, LatticeResult } from "./types";
import { collectInvestigation } from "./collect";
import { buildHeuristicLattice } from "./lattice-local";

type InvestigationArgs = { data: { query: string } };
type LatticeArgs = { data: { investigation: Investigation } };

export async function runInvestigation({ data }: InvestigationArgs): Promise<Investigation> {
  const q = data.query.trim().slice(0, 200);
  if (!q) throw new Error("Query required");
  return collectInvestigation(q);
}

export async function runGrokLattice({ data }: LatticeArgs): Promise<LatticeResult> {
  // GitHub Pages has no secret-bearing server runtime. Keep the action functional
  // by recomputing the deterministic local ACH lattice from the live evidence packet.
  return buildHeuristicLattice(data.investigation.facts, data.investigation.graph);
}
