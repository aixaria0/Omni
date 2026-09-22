import { uid } from "../utils";
import type {
  Fact,
  GraphEdge,
  GraphModel,
  GraphNode,
  Json,
  QueryKind,
  SourceResult,
  TimelineEvent,
} from "./types";

function asRecord(v: Json | undefined): Record<string, Json> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, Json>)
    : null;
}

function str(v: Json | undefined): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return undefined;
}

function arr(v: Json | undefined): Json[] {
  return Array.isArray(v) ? v : [];
}

function source(sources: SourceResult[], id: string) {
  return sources.find((s) => s.id === id);
}

export function fuseInvestigation(
  query: string,
  kind: QueryKind,
  sources: SourceResult[],
): {
  facts: Fact[];
  graph: GraphModel;
  timeline: TimelineEvent[];
  disagreements: string[];
} {
  const facts: Fact[] = [];
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const timeline: TimelineEvent[] = [];
  const disagreements: string[] = [];

  const addNode = (n: GraphNode) => {
    if (!nodes.has(n.id)) nodes.set(n.id, n);
    return n.id;
  };
  const addEdge = (sourceId: string, targetId: string, rel: string) => {
    edges.push({
      id: uid("e"),
      source: sourceId,
      target: targetId,
      rel,
    });
  };
  const addFact = (f: Omit<Fact, "id">) => {
    facts.push({ id: uid("f"), ...f });
  };

  const qid = addNode({
    id: "query",
    label: query,
    kind: kind === "asn" ? "asn" : kind === "hash" ? "hash" : "query",
    hop: 0,
    detail: kind,
  });

  const dns = asRecord(source(sources, "dns")?.data);
  const ips: string[] = [];
  const domains: string[] = [];

  if (kind === "domain" || kind === "url" || kind === "email") {
    domains.push(query.includes("@") ? query.split("@")[1] : query.replace(/^https?:\/\//, "").split("/")[0]);
  }

  const answers = arr(dns?.Answer);
  for (const a of answers) {
    const rec = asRecord(a);
    const type = rec?.type;
    const data = str(rec?.data);
    if (!data) continue;
    if (type === 1 || type === 28) ips.push(data.replace(/\.$/, ""));
    if (type === 5) domains.push(data.replace(/\.$/, "").toLowerCase());
  }

  const ipwho = asRecord(source(sources, "ipwho")?.data);
  if (str(ipwho?.ip)) ips.push(String(ipwho!.ip));
  const geoCountry = str(ipwho?.country);
  const geoCity = str(ipwho?.city);
  const isp = str(ipwho?.isp) || str(ipwho?.org);
  const asnStr = str(asRecord(ipwho?.connection)?.asn)
    ? `AS${str(asRecord(ipwho?.connection)?.asn)}`
    : str(ipwho?.asn);

  const rdapIp = asRecord(source(sources, "rdap_ip")?.data);
  const rdapDom = asRecord(source(sources, "rdap_domain")?.data);

  const bgp = asRecord(source(sources, "bgpview")?.data);
  const bgpData = asRecord(bgp?.data);


  const inet = asRecord(source(sources, "internetdb")?.data);
  const inetPorts = arr(inet?.ports).map((p) => Number(p)).filter((n) => Number.isFinite(n));
  const inetHostnames = arr(inet?.hostnames).map(String);
  const inetVulns = arr(inet?.vulns).map(String);
  const inetCpes = arr(inet?.cpes).map(String);

  const otx = asRecord(source(sources, "otx")?.data);
  const pulseCount =
    Number(asRecord(otx?.pulse_info)?.count ?? otx?.pulse_count ?? 0) ||
    arr(asRecord(otx?.pulse_info)?.pulses).length;

  const ripe = asRecord(source(sources, "ripe")?.data);
  const ripeData = asRecord(ripe?.data);
  const ripeAsns = arr(ripeData?.asns).map((a) => {
    const r = asRecord(a);
    return str(r?.asn) ? `AS${r!.asn}` : str(a);
  }).filter(Boolean) as string[];

  const crt = arr(source(sources, "crtsh")?.data);
  const certNames = new Set<string>();
  for (const row of crt.slice(0, 80)) {
    const r = asRecord(row);
    const nv = str(r?.name_value);
    const nb = str(r?.not_before);
    if (nv) {
      for (const name of nv.split(/\n+/)) {
        const n = name.trim().replace(/^\*\./, "").toLowerCase();
        if (n.includes(".")) certNames.add(n);
      }
    }
    if (nb) {
      timeline.push({
        at: nb.replace(" ", "T") + "Z",
        label: `Certificate issued${nv ? ` for ${nv.split("\n")[0]}` : ""}`,
        source: "crt.sh",
        kind: "cert",
      });
    }
  }

  const wayback = arr(source(sources, "wayback")?.data);
  for (const row of wayback.slice(1, 40)) {
    const tuple = arr(row).map(String);
    if (tuple[0] && /^\d{14}$/.test(tuple[0])) {
      timeline.push({
        at: tuple[0],
        label: `Archive ${tuple[2] || ""} ${tuple[1] || ""}`.trim(),
        source: "Wayback",
        kind: "archive",
      });
    }
  }

  const headers = asRecord(source(sources, "httpfp")?.data);
  const github = asRecord(source(sources, "github")?.data);
  const wiki = asRecord(source(sources, "wiki")?.data);
  const urlscan = asRecord(source(sources, "urlscan")?.data);
  const asnInfo = asRecord(source(sources, "asn")?.data);

  const uniqueIps = [...new Set(ips.filter(Boolean))];
  const uniqueDomains = [
    ...new Set(
      [...domains, ...inetHostnames, ...[...certNames].slice(0, 18)].map((d) =>
        d.toLowerCase().replace(/\.$/, ""),
      ),
    ),
  ].filter((d) => d && d.includes("."));

  for (const ip of uniqueIps.slice(0, 8)) {
    const id = addNode({
      id: `ip:${ip}`,
      label: ip,
      kind: "ip",
      hop: 1,
      detail: [geoCity, geoCountry].filter(Boolean).join(", "),
      risk: inetVulns.length ? 0.7 : inetPorts.length > 10 ? 0.45 : 0.15,
    });
    addEdge(qid, id, "resolves");
  }

  for (const d of uniqueDomains.slice(0, 16)) {
    const id = addNode({
      id: `dom:${d}`,
      label: d,
      kind: "domain",
      hop: d === query ? 1 : 2,
    });
    addEdge(qid, id, "name");
  }

  const asns = new Set<string>();
  if (asnStr) asns.add(asnStr.startsWith("AS") ? asnStr : `AS${asnStr}`);
  for (const a of ripeAsns) asns.add(a);
  const bgpAsns = arr(bgpData?.prefixes);
  for (const p of bgpAsns) {
    const asn = asRecord(asRecord(p)?.asn)?.asn;
    if (asn) asns.add(`AS${asn}`);
  }
  const asnMeta = asRecord(asRecord(asnInfo?.data)?.asn);
  if (str(asnMeta?.asn)) asns.add(`AS${asnMeta!.asn}`);

  for (const a of asns) {
    const id = addNode({
      id: `asn:${a}`,
      label: a,
      kind: "asn",
      hop: 1,
      detail: isp,
    });
    addEdge(qid, id, "routed");
  }

  const org =
    str(rdapIp?.name) ||
    str(asRecord(arr(rdapIp?.entities)[0])?.vcardArray ? undefined : undefined) ||
    isp ||
    str(asRecord(asnMeta)?.name) ||
    str(ipwho?.org);

  // RDAP org via vcard
  let rdapOrg: string | undefined;
  for (const ent of arr(rdapIp?.entities).concat(arr(rdapDom?.entities))) {
    const e = asRecord(ent);
    const vcard = arr(e?.vcardArray)[1];
    for (const row of arr(vcard)) {
      const r = arr(row);
      if (r[0] === "fn" && str(r[3])) rdapOrg = str(r[3]);
    }
    if (str(e?.handle) && !rdapOrg) rdapOrg = str(e?.handle);
  }
  const orgName = rdapOrg || org;
  if (orgName) {
    const id = addNode({
      id: `org:${orgName}`,
      label: orgName,
      kind: "org",
      hop: 2,
    });
    addEdge(qid, id, "operated");
  }

  for (const p of inetPorts.slice(0, 24)) {
    const id = addNode({
      id: `port:${p}`,
      label: String(p),
      kind: "port",
      hop: 2,
      risk: [23, 445, 3389, 6379, 27017, 9200].includes(p) ? 0.8 : 0.2,
    });
    if (uniqueIps[0]) addEdge(`ip:${uniqueIps[0]}`, id, "exposes");
    else addEdge(qid, id, "exposes");
  }

  if (geoCountry) {
    const label = [geoCity, geoCountry].filter(Boolean).join(", ");
    const id = addNode({
      id: `geo:${label}`,
      label,
      kind: "geo",
      hop: 2,
      detail: str(ipwho?.continent),
    });
    addEdge(qid, id, "geolocates");
  }

  if (crt.length) {
    const id = addNode({
      id: "ct",
      label: `${Math.min(crt.length, 80)} certs`,
      kind: "cert",
      hop: 1,
      detail: "Certificate Transparency",
    });
    addEdge(qid, id, "issued");
  }

  if (geoCountry && str(headers?.country) && str(headers?.country) !== geoCountry) {
    disagreements.push(
      `Geo disagreement: ipwho.is says ${geoCountry}, HTTP fingerprint notes ${headers?.country}.`,
    );
  }

  // Facts
  addFact({
    label: "Indicator",
    value: `${kind.toUpperCase()} · ${query}`,
    sourceIds: ["classifier"],
  });
  if (orgName)
    addFact({
      label: "Organization",
      value: orgName,
      sourceIds: ["rdap_ip", "rdap_domain", "ipwho", "asn"].filter((id) =>
        source(sources, id)?.ok,
      ),
      tone: "ok",
    });
  if (geoCountry)
    addFact({
      label: "Geolocation",
      value: [geoCity, str(ipwho?.region), geoCountry].filter(Boolean).join(", "),
      sourceIds: ["ipwho"],
      hint: "IP geolocation is a best-effort registry/anycast estimate — not a street address.",
    });
  if (asns.size)
    addFact({
      label: "ASN",
      value: [...asns].join(", "),
      sourceIds: ["bgpview", "ripe", "ipwho", "asn"].filter((id) =>
        source(sources, id)?.ok,
      ),
    });
  if (isp)
    addFact({
      label: "Network / ISP",
      value: isp,
      sourceIds: ["ipwho"],
    });
  if (uniqueIps.length)
    addFact({
      label: "Resolved addresses",
      value: uniqueIps.join(", "),
      sourceIds: ["dns", "ipwho", "internetdb"],
    });
  if (inetPorts.length)
    addFact({
      label: "Advertised ports",
      value: inetPorts.join(", "),
      sourceIds: ["internetdb"],
      tone: inetPorts.some((p) => [23, 445, 3389, 6379, 27017, 9200].includes(p))
        ? "danger"
        : "warn",
    });
  if (inetVulns.length || inetCpes.length)
    addFact({
      label: "Known CPEs / vulns",
      value: [...inetCpes, ...inetVulns].slice(0, 10).join(" · "),
      sourceIds: ["internetdb"],
      tone: "danger",
      hint: "InternetDB tags are banner/CPE correlations, not confirmed exploitation.",
    });
  if (inetHostnames.length)
    addFact({
      label: "Reverse hostnames",
      value: inetHostnames.slice(0, 8).join(", "),
      sourceIds: ["internetdb"],
    });
  if (crt.length)
    addFact({
      label: "CT certificates",
      value: String(crt.length >= 80 ? "80+" : crt.length),
      sourceIds: ["crtsh"],
    });
  if (wayback.length > 1) {
    const first = arr(wayback[1]).map(String)[0];
    const last = arr(wayback[wayback.length - 1]).map(String)[0];
    addFact({
      label: "Archive depth",
      value: first
        ? `${first.slice(0, 4)} → ${last?.slice(0, 4) || first.slice(0, 4)} · ${wayback.length - 1} captures`
        : `${wayback.length - 1} captures`,
      sourceIds: ["wayback"],
      tone: "ok",
    });
  }
  if (pulseCount)
    addFact({
      label: "OTX pulse count",
      value: String(pulseCount),
      sourceIds: ["otx"],
      tone: pulseCount > 3 ? "warn" : "neutral",
      hint: "OTX pulses are community submissions — many track scanners, not intrusion.",
    });
  const server = str(headers?.server) || str(headers?.Server);
  if (server)
    addFact({
      label: "HTTP server",
      value: server,
      sourceIds: ["httpfp"],
    });
  const status = str(headers?.status);
  if (status)
    addFact({
      label: "HTTP status",
      value: status,
      sourceIds: ["httpfp"],
    });
  const scanTotal = Number(urlscan?.total);

  if (scanTotal)
    addFact({
      label: "urlscan results",
      value: String(scanTotal),
      sourceIds: ["urlscan"],
    });
  if (str(github?.login))
    addFact({
      label: "GitHub profile",
      value: `${github?.login} · ${github?.public_repos ?? 0} repos`,
      sourceIds: ["github"],
      hint: "Public developer profile only — not identity confirmation.",
    });
  if (str(wiki?.title))
    addFact({
      label: "Encyclopedia",
      value: String(wiki?.title),
      sourceIds: ["wiki"],
      tone: "ok",
    });

  const registrar = (() => {
    for (const ent of arr(rdapDom?.entities)) {
      const roles = arr(asRecord(ent)?.roles).map(String);
      if (roles.includes("registrar")) {
        const vcard = arr(asRecord(ent)?.vcardArray)[1];
        for (const row of arr(vcard)) {
          const r = arr(row);
          if (r[0] === "fn") return str(r[3]);
        }
      }
    }
    return str(rdapDom?.ldhName);
  })();
  if (registrar)
    addFact({
      label: "RDAP name / registrar",
      value: registrar,
      sourceIds: ["rdap_domain"],
    });

  timeline.sort((a, b) => a.at.localeCompare(b.at));

  return {
    facts,
    graph: { nodes: [...nodes.values()], edges },
    timeline: timeline.slice(-40),
    disagreements,
  };
}
