export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type QueryKind =
  | "ip"
  | "domain"
  | "url"
  | "asn"
  | "email"
  | "username"
  | "hash"
  | "cidr"
  | "org";

export type SourceResult = {
  id: string;
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
  data?: Json;
};

export type Fact = {
  id: string;
  label: string;
  value: string;
  sourceIds: string[];
  tone?: "neutral" | "ok" | "warn" | "danger";
  hint?: string;
};

export type GraphNode = {
  id: string;
  label: string;
  kind:
    | "query"
    | "ip"
    | "domain"
    | "asn"
    | "org"
    | "cert"
    | "port"
    | "host"
    | "hash"
    | "geo";
  detail?: string;
  hop: number;
  risk?: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  rel: string;
};

export type GraphModel = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type EvidenceCell = "support" | "contradict" | "neutral" | "na";

export type Hypothesis = {
  id: string;
  title: string;
  statement: string;
  prior: number;
  posterior: number;
  supports: { evidence: string; note: string }[];
  contradicts: { evidence: string; note: string }[];
  gaps: string[];
};

export type LatticeResult = {
  engine: "heuristic" | "grok";
  leading: string;
  confidence: "low" | "medium" | "high";
  briefing: string;
  watch: string[];
  hypotheses: Hypothesis[];
  matrix: { evidence: string; cells: Record<string, EvidenceCell> }[];
};

export type TimelineEvent = {
  at: string;
  label: string;
  source: string;
  kind: "cert" | "archive" | "dns" | "other";
};

export type Investigation = {
  id: string;
  query: string;
  kind: QueryKind;
  collectedAt: string;
  sources: SourceResult[];
  facts: Fact[];
  graph: GraphModel;
  timeline: TimelineEvent[];
  lattice: LatticeResult;
  grokLattice?: LatticeResult;
  disagreements: string[];
};
