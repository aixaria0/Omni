import type { Investigation } from "./types";

/** Explicitly synthetic training fixture; no network observation is claimed. */
export const SCENARIO_DEMO: Investigation = {
  id: "synthetic-scenario-training-v1",
  query: "training.example",
  kind: "domain",
  collectedAt: "2026-01-01T00:00:00.000Z",
  sources: [
    { id: "dns", name: "Synthetic DNS", ok: true, ms: 0 },
    { id: "crtsh", name: "Synthetic CT", ok: true, ms: 0 },
    { id: "wayback", name: "Synthetic Archive", ok: true, ms: 0 },
  ],
  facts: [],
  graph: { nodes: [], edges: [] },
  timeline: [],
  disagreements: [],
  lattice: {
    engine: "heuristic",
    leading: "shared",
    confidence: "low",
    briefing:
      "Synthetic exercise: decide whether an apparent infrastructure relationship is meaningful.",
    watch: [],
    hypotheses: [
      {
        id: "shared",
        title: "Shared infrastructure",
        statement: "The entities share an operator.",
        prior: 0.33,
        posterior: 0.52,
        supports: [],
        contradicts: [],
        gaps: [],
      },
      {
        id: "hosting",
        title: "Common hosting provider",
        statement: "The relationship comes from shared hosting.",
        prior: 0.34,
        posterior: 0.34,
        supports: [],
        contradicts: [],
        gaps: [],
      },
      {
        id: "coincidence",
        title: "Incidental overlap",
        statement: "The overlap is incidental.",
        prior: 0.33,
        posterior: 0.14,
        supports: [],
        contradicts: [],
        gaps: [],
      },
    ],
    matrix: [
      {
        evidence: "DNS: shared address",
        cells: { shared: "support", hosting: "support", coincidence: "contradict" },
      },
      {
        evidence: "CT: shared certificate identity",
        cells: { shared: "support", hosting: "contradict", coincidence: "neutral" },
      },
      {
        evidence: "Archive: independent operating histories",
        cells: { shared: "contradict", hosting: "support", coincidence: "support" },
      },
    ],
  },
};
