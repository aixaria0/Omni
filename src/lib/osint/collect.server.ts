import { classifyQuery } from "./classify";
import { fuseInvestigation } from "./fuse";
import { buildHeuristicLattice } from "./lattice-local";
import type { Investigation, Json, QueryKind, SourceResult } from "./types";
import { uid } from "../utils";

const UA =
  "OmniTrace/1.0 (defensive public-source research; +https://x.ai)";

async function timedFetch(
  url: string,
  init: RequestInit & { timeout?: number } = {},
): Promise<{ ok: boolean; status: number; text: string; headers: Headers }> {
  const ctrl = new AbortController();
  const timeout = init.timeout ?? 8000;
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: init.redirect ?? "follow",
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, headers: res.headers };
  } finally {
    clearTimeout(t);
  }
}

function parseJson(text: string): Json {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Json;
  } catch {
    const start = trimmed.search(/[\[{]/);
    if (start >= 0) {
      try {
        return JSON.parse(trimmed.slice(start)) as Json;
      } catch {
        return { raw: trimmed.slice(0, 400) };
      }
    }
    return { raw: trimmed.slice(0, 400) };
  }
}

async function collectSource(
  id: string,
  name: string,
  fn: () => Promise<Json>,
): Promise<SourceResult> {
  const t0 = Date.now();
  try {
    const data = await fn();
    if (data == null)
      return { id, name, ok: false, ms: Date.now() - t0, error: "empty" };
    return { id, name, ok: true, ms: Date.now() - t0, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "failed";
    return { id, name, ok: false, ms: Date.now() - t0, error: msg };
  }
}

async function dnsRecords(name: string): Promise<Json> {
  const types = ["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "CAA"];
  const results = await Promise.all(
    types.map(async (type) => {
      const r = await timedFetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
        { headers: { Accept: "application/dns-json" }, timeout: 6000 },
      );
      return parseJson(r.text);
    }),
  );
  const Answer: Json[] = [];
  const Authority: Json[] = [];
  for (const r of results) {
    if (!r || typeof r !== "object" || Array.isArray(r)) continue;
    if (Array.isArray(r.Answer)) Answer.push(...r.Answer);
    if (Array.isArray(r.Authority)) Authority.push(...r.Authority);
  }
  return { Answer, Authority, Status: 0 };
}

function firstIpv4(dns: Json | undefined): string | undefined {
  if (!dns || typeof dns !== "object" || Array.isArray(dns)) return undefined;
  const answers = Array.isArray(dns.Answer) ? dns.Answer : [];
  for (const item of answers) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    if (item.type === 1 && typeof item.data === "string") return item.data;
  }
  return undefined;
}


async function collectBundle(query: string, kind: QueryKind, host?: string) {
  const domain =
    host ||
    (kind === "domain" ? query : undefined) ||
    (kind === "url"
      ? query.replace(/^https?:\/\//, "").split("/")[0]
      : undefined);
  const ip = kind === "ip" ? query : undefined;

  const asnNum = kind === "asn" ? query.replace(/^AS/i, "") : undefined;

  const wikiTitle =
    kind === "org" || kind === "domain" || kind === "username"
      ? query
      : domain;

  const tasks: Promise<SourceResult>[] = [];

  if (domain) {
    tasks.push(
      collectSource("dns", "DNS (Cloudflare DoH)", () => dnsRecords(domain)),
    );
    tasks.push(
      collectSource("rdap_domain", "RDAP domain", async () => {
        const r = await timedFetch(
          `https://rdap.org/domain/${encodeURIComponent(domain)}`,
          { timeout: 9000 },
        );
        if (!r.ok) throw new Error(`RDAP ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("crtsh", "Certificate Transparency", async () => {
        const r = await timedFetch(
          `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`,
          { timeout: 10000 },
        );
        if (!r.ok) throw new Error(`crt.sh ${r.status}`);
        const json = parseJson(r.text);
        return Array.isArray(json) ? json.slice(0, 80) : json;
      }),
    );
    tasks.push(
      collectSource("wayback", "Wayback CDX", async () => {
        const r = await timedFetch(
          `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&limit=25`,
          { timeout: 9000 },
        );
        if (!r.ok) throw new Error(`CDX ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("urlscan", "urlscan.io", async () => {
        const r = await timedFetch(
          `https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(domain)}&size=5`,
          { timeout: 8000 },
        );
        if (!r.ok) throw new Error(`urlscan ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("otx", "AlienVault OTX", async () => {
        const r = await timedFetch(
          `https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(domain)}/general`,
          { timeout: 8000 },
        );
        if (!r.ok) throw new Error(`OTX ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("httpfp", "HTTP fingerprint", async () => {
        const r = await timedFetch(`https://${domain}`, {
          timeout: 7000,
          redirect: "follow",
          headers: { Accept: "text/html" },
        });
        const h: Record<string, string> = { status: String(r.status) };
        for (const key of [
          "server",
          "x-powered-by",
          "cf-ray",
          "via",
          "content-type",
          "strict-transport-security",
          "x-frame-options",
        ]) {
          const val = r.headers.get(key);
          if (val) h[key] = val;
        }
        return h;
      }),
    );
  }

  if (ip) {
    tasks.push(
      collectSource("rdap_ip", "RDAP IP", async () => {
        const r = await timedFetch(
          `https://rdap.org/ip/${encodeURIComponent(ip)}`,
          { timeout: 9000 },
        );
        if (!r.ok) throw new Error(`RDAP ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("otx", "AlienVault OTX", async () => {
        const path = ip.includes(":") ? "IPv6" : "IPv4";
        const r = await timedFetch(
          `https://otx.alienvault.com/api/v1/indicators/${path}/${encodeURIComponent(ip)}/general`,
          { timeout: 8000 },
        );
        if (!r.ok) throw new Error(`OTX ${r.status}`);
        return parseJson(r.text);
      }),
    );
  }

  if (ip) {
    tasks.push(
      collectSource("ipwho", "ipwho.is", async () => {
        const r = await timedFetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
          timeout: 7000,
        });
        if (!r.ok) throw new Error(`ipwho ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("internetdb", "Shodan InternetDB", async () => {
        const r = await timedFetch(
          `https://internetdb.shodan.io/${encodeURIComponent(ip)}`,
          { timeout: 7000 },
        );
        if (r.status === 404) return { ip, ports: [], vulns: [], hostnames: [] };
        if (!r.ok) throw new Error(`InternetDB ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("bgpview", "BGPView", async () => {
        const r = await timedFetch(
          `https://api.bgpview.io/ip/${encodeURIComponent(ip)}`,
          { timeout: 7000 },
        );
        if (!r.ok) throw new Error(`BGPView ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("ripe", "RIPE Stat", async () => {
        const r = await timedFetch(
          `https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent(ip)}`,
          { timeout: 8000 },
        );
        if (!r.ok) throw new Error(`RIPE ${r.status}`);
        return parseJson(r.text);
      }),
    );
  }

  if (asnNum) {
    tasks.push(
      collectSource("asn", "BGPView ASN", async () => {
        const r = await timedFetch(
          `https://api.bgpview.io/asn/${encodeURIComponent(asnNum)}`,
          { timeout: 8000 },
        );
        if (!r.ok) throw new Error(`ASN ${r.status}`);
        return parseJson(r.text);
      }),
    );
    tasks.push(
      collectSource("asn_prefixes", "ASN prefixes", async () => {
        const r = await timedFetch(
          `https://api.bgpview.io/asn/${encodeURIComponent(asnNum)}/prefixes`,
          { timeout: 9000 },
        );
        if (!r.ok) throw new Error(`prefixes ${r.status}`);
        return parseJson(r.text);
      }),
    );
  }

  if (kind === "username" || kind === "org") {
    tasks.push(
      collectSource("github", "GitHub public", async () => {
        const r = await timedFetch(
          `https://api.github.com/users/${encodeURIComponent(query)}`,
          {
            timeout: 7000,
            headers: { Accept: "application/vnd.github+json" },
          },
        );
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        return parseJson(r.text);
      }),
    );
  }

  if (kind === "hash") {
    tasks.push(
      collectSource("otx", "OTX file indicator", async () => {
        const r = await timedFetch(
          `https://otx.alienvault.com/api/v1/indicators/file/${encodeURIComponent(query)}/general`,
          { timeout: 8000 },
        );
        if (!r.ok) throw new Error(`OTX ${r.status}`);
        return parseJson(r.text);
      }),
    );
  }

  if (wikiTitle) {
    tasks.push(
      collectSource("wiki", "Wikipedia", async () => {
        const r = await timedFetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`,
          { timeout: 6000 },
        );
        if (!r.ok) throw new Error(`wiki ${r.status}`);
        return parseJson(r.text);
      }),
    );
  }

  const sources = await Promise.all(tasks);

  // Second hop: resolve domain → IPv4 → InternetDB / geo / RDAP IP
  if (!ip && domain) {
    const dnsSrc = sources.find((s) => s.id === "dns");
    const v4 = firstIpv4(dnsSrc?.data);
    if (v4) {
      const hop = await Promise.all([
        collectSource("ipwho", "ipwho.is", async () => {
          const r = await timedFetch(`https://ipwho.is/${v4}`, { timeout: 7000 });
          if (!r.ok) throw new Error(`ipwho ${r.status}`);
          return parseJson(r.text);
        }),
        collectSource("internetdb", "Shodan InternetDB", async () => {
          const r = await timedFetch(`https://internetdb.shodan.io/${v4}`, {
            timeout: 7000,
          });
          if (r.status === 404) return { ip: v4, ports: [], vulns: [] };
          if (!r.ok) throw new Error(`InternetDB ${r.status}`);
          return parseJson(r.text);
        }),
        collectSource("rdap_ip", "RDAP IP", async () => {
          const r = await timedFetch(`https://rdap.org/ip/${v4}`, {
            timeout: 8000,
          });
          if (!r.ok) throw new Error(`RDAP ${r.status}`);
          return parseJson(r.text);
        }),
        collectSource("bgpview", "BGPView", async () => {
          const r = await timedFetch(`https://api.bgpview.io/ip/${v4}`, {
            timeout: 7000,
          });
          if (!r.ok) throw new Error(`BGPView ${r.status}`);
          return parseJson(r.text);
        }),
        collectSource("ripe", "RIPE Stat", async () => {
          const r = await timedFetch(
            `https://stat.ripe.net/data/prefix-overview/data.json?resource=${v4}`,
            { timeout: 8000 },
          );
          if (!r.ok) throw new Error(`RIPE ${r.status}`);
          return parseJson(r.text);
        }),
      ]);
      sources.push(...hop);
    }
  }

  return sources;
}

export async function collectInvestigation(raw: string): Promise<Investigation> {
  const { kind, normalized, host } = classifyQuery(raw);
  if (!normalized) throw new Error("Enter an IP, domain, ASN, URL, or username.");

  const sources = await collectBundle(normalized, kind, host);
  const fused = fuseInvestigation(normalized, kind, sources);
  const lattice = buildHeuristicLattice(fused.facts, fused.graph);

  return {
    id: uid("inv"),
    query: normalized,
    kind,
    collectedAt: new Date().toISOString(),
    sources,
    ...fused,
    lattice,
  };
}
