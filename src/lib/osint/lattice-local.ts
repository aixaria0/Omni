import type {
  Fact,
  GraphModel,
  Hypothesis,
  LatticeResult,
  EvidenceCell,
} from "./types";

const CLOUD_ASN = new Set([
  "AS16509",
  "AS14618",
  "AS15169",
  "AS396982",
  "AS13335",
  "AS8075",
  "AS14061",
  "AS16276",
  "AS24940",
  "AS20473",
  "AS63949",
  "AS31898",
]);

const RISKY_PORTS = new Set([
  23, 445, 3389, 5900, 9200, 9300, 6379, 27017, 11211, 1433, 3306, 5432, 2375,
  10250, 5000, 8080, 8888,
]);

function factVal(facts: Fact[], label: string) {
  return facts.find((f) => f.label === label)?.value ?? "";
}

function has(facts: Fact[], label: string) {
  return facts.some((f) => f.label === label);
}

export function buildHeuristicLattice(
  facts: Fact[],
  graph: GraphModel,
): LatticeResult {
  const asns = graph.nodes.filter((n) => n.kind === "asn").map((n) => n.label);
  const ports = graph.nodes
    .filter((n) => n.kind === "port")
    .map((n) => Number(n.label.replace(":", "")));
  const vulns = factVal(facts, "Known CPEs / vulns");
  const certCount = Number(factVal(facts, "CT certificates") || "0");
  const wayback = factVal(facts, "Archive depth");
  const otx = Number(factVal(facts, "OTX pulse count") || "0");
  const org = factVal(facts, "Organization");
  const cloudish = asns.some((a) => CLOUD_ASN.has(a.toUpperCase()));
  const risky = ports.some((p) => RISKY_PORTS.has(p));
  const manyPorts = ports.length >= 8;
  const mature = /year|decade|20\d\d/.test(wayback) || certCount >= 12;
  const sparse =
    graph.nodes.length < 6 && certCount < 2 && !has(facts, "HTTP server");

  type H = Hypothesis & { scores: Record<string, number> };
  const hypos: H[] = [
    {
      id: "H1",
      title: "Legitimate cloud / CDN surface",
      statement:
        "The target is a production service on major cloud or CDN infrastructure, operated as intended.",
      prior: 0.28,
      posterior: 0.28,
      supports: [],
      contradicts: [],
      gaps: [],
      scores: {},
    },
    {
      id: "H2",
      title: "Exposed or poorly hardened host",
      statement:
        "Management, database, or known-vulnerable services are reachable from the public internet.",
      prior: 0.22,
      posterior: 0.22,
      supports: [],
      contradicts: [],
      gaps: [],
      scores: {},
    },
    {
      id: "H3",
      title: "Mature long-lived origin",
      statement:
        "Infrastructure has a long public history (certificates, archives) consistent with an established organization.",
      prior: 0.2,
      posterior: 0.2,
      supports: [],
      contradicts: [],
      gaps: [],
      scores: {},
    },
    {
      id: "H4",
      title: "Transient / low-attribution node",
      statement:
        "Thin public record: few certificates, short archive history, weak organizational binding.",
      prior: 0.18,
      posterior: 0.18,
      supports: [],
      contradicts: [],
      gaps: [],
      scores: {},
    },
    {
      id: "H5",
      title: "Actively observed in threat intel",
      statement:
        "Public pulse platforms have correlated this indicator with reported campaigns or scanners.",
      prior: 0.12,
      posterior: 0.12,
      supports: [],
      contradicts: [],
      gaps: [],
      scores: {},
    },
  ];

  const evidence: {
    id: string;
    apply: (h: H) => EvidenceCell;
    note: (h: H) => string;
  }[] = [
    {
      id: "Major-cloud ASN",
      apply: (h) => {
        if (!asns.length) return "na";
        if (h.id === "H1") return cloudish ? "support" : "contradict";
        if (h.id === "H4") return cloudish ? "contradict" : "neutral";
        return "neutral";
      },
      note: () => (cloudish ? asns.join(", ") : asns.join(", ") || "none"),
    },
    {
      id: "Risky open ports",
      apply: (h) => {
        if (!ports.length) return "na";
        if (h.id === "H2") return risky || manyPorts ? "support" : "contradict";
        if (h.id === "H1") return risky ? "contradict" : "neutral";
        return "neutral";
      },
      note: () => ports.slice(0, 12).join(", ") || "none advertised",
    },
    {
      id: "InternetDB vulns/CPE",
      apply: (h) => {
        if (!vulns) return "na";
        if (h.id === "H2" || h.id === "H5") return "support";
        if (h.id === "H1") return "contradict";
        return "neutral";
      },
      note: () => vulns.slice(0, 120) || "none",
    },
    {
      id: "Certificate volume",
      apply: (h) => {
        if (!certCount) return "na";
        if (h.id === "H3") return certCount >= 8 ? "support" : "contradict";
        if (h.id === "H4") return certCount < 3 ? "support" : "contradict";
        return "neutral";
      },
      note: () => `${certCount} CT rows`,
    },
    {
      id: "Archive depth",
      apply: (h) => {
        if (!wayback) return "na";
        if (h.id === "H3") return mature ? "support" : "neutral";
        if (h.id === "H4") return mature ? "contradict" : "support";
        return "neutral";
      },
      note: () => wayback || "no CDX hits",
    },
    {
      id: "OTX pulses",
      apply: (h) => {
        if (h.id === "H5") return otx > 0 ? "support" : "contradict";
        if (h.id === "H1" && otx > 5) return "contradict";
        return otx ? "neutral" : "na";
      },
      note: () => `${otx} pulses`,
    },
    {
      id: "Org binding",
      apply: (h) => {
        if (!org) return "na";
        if (h.id === "H4") return "contradict";
        if (h.id === "H1" || h.id === "H3") return "support";
        return "neutral";
      },
      note: () => org || "unbound",
    },
    {
      id: "Record sparsity",
      apply: (h) => {
        if (h.id === "H4") return sparse ? "support" : "contradict";
        if (h.id === "H3") return sparse ? "contradict" : "neutral";
        return "neutral";
      },
      note: () => `${graph.nodes.length} graph nodes`,
    },
  ];

  const matrix: LatticeResult["matrix"] = [];

  for (const ev of evidence) {
    const cells: Record<string, EvidenceCell> = {};
    for (const h of hypos) {
      const cell = ev.apply(h);
      cells[h.id] = cell;
      const note = ev.note(h);
      if (cell === "support") {
        h.supports.push({ evidence: ev.id, note });
        h.posterior *= 1.55;
      } else if (cell === "contradict") {
        h.contradicts.push({ evidence: ev.id, note });
        h.posterior *= 0.55;
      }
    }
    matrix.push({ evidence: ev.id, cells });
  }

  const sum = hypos.reduce((s, h) => s + h.posterior, 0) || 1;
  for (const h of hypos) h.posterior = h.posterior / sum;

  hypos.sort((a, b) => b.posterior - a.posterior);
  const lead = hypos[0];
  const gap = lead.posterior - (hypos[1]?.posterior ?? 0);

  const confidence: LatticeResult["confidence"] =
    gap > 0.28 && lead.posterior > 0.45
      ? "high"
      : gap > 0.12
        ? "medium"
        : "low";

  for (const h of hypos) {
    if (!h.supports.length)
      h.gaps.push("No strongly supporting public evidence yet.");
    if (h.id === lead.id && confidence !== "high")
      h.gaps.push("Rival hypotheses remain close — do not treat as fact.");
  }

  const briefing = [
    `Leading hypothesis ${lead.id} (${lead.title}) at ${(lead.posterior * 100).toFixed(0)}% posterior with ${confidence} separation.`,
    org ? `Public records bind this indicator to “${org}”.` : `No strong organizational binding in RDAP/BGP.`,
    cloudish
      ? `Routing originates in a major cloud/CDN ASN (${asns.filter((a) => CLOUD_ASN.has(a.toUpperCase())).join(", ")}).`
      : asns.length
        ? `ASNs observed: ${asns.join(", ")}.`
        : `No ASN resolved.`,
    ports.length
      ? `InternetDB advertises ${ports.length} port(s)${risky ? ", including historically abused services" : ""}.`
      : `No InternetDB port map (typical for firewalled or IPv6-only edges).`,
    otx
      ? `AlienVault OTX lists ${otx} pulse(s) — treat as community telemetry, not verdict.`
      : `No OTX pulses on this indicator.`,
    `This lattice is a heuristic ACH (Heuer) over public sources only. It is not attribution and not a conviction.`,
  ].join(" ");

  const watch = [
    risky ? "Restrict or monitor historically abused ports if this is your asset." : "",
    !org ? "Seek registrar / ASN abuse-contact confirmation before naming an operator." : "",
    "Re-run after 24h — CT logs and InternetDB lag live changes.",
    "Do not pivot from infrastructure into private individuals.",
  ].filter(Boolean);

  return {
    engine: "heuristic",
    leading: lead.id,
    confidence,
    briefing,
    watch,
    hypotheses: hypos.map(({ scores: _s, ...rest }) => rest),
    matrix,
  };
}
