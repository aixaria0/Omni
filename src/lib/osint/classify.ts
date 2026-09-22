import type { QueryKind } from "./types";

const IPV4 =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6 = /^[0-9a-f:]+$/i;
const ASN = /^(?:as|asn)\s*(\d{1,10})$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HASH = /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i;
const CIDR = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\/(?:[0-9]|[1-2]\d|3[0-2])$/;
const DOMAIN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function classifyQuery(raw: string): {
  kind: QueryKind;
  normalized: string;
  host?: string;
} {
  const q = raw.trim();
  if (!q) return { kind: "org", normalized: "" };

  if (IPV4.test(q)) return { kind: "ip", normalized: q };
  if (q.includes(":") && IPV6.test(q) && q.split(":").length >= 3) {
    return { kind: "ip", normalized: q.toLowerCase() };
  }
  const asn = q.match(ASN);
  if (asn) return { kind: "asn", normalized: `AS${asn[1]}` };
  if (CIDR.test(q)) return { kind: "cidr", normalized: q };

  if (/^https?:\/\//i.test(q)) {
    try {
      const u = new URL(q);
      return { kind: "url", normalized: q, host: u.hostname.replace(/^www\./, "") };
    } catch {
      return { kind: "url", normalized: q };
    }
  }

  if (EMAIL.test(q)) {
    const host = q.split("@")[1]?.toLowerCase();
    return { kind: "email", normalized: q.toLowerCase(), host };
  }

  if (HASH.test(q)) return { kind: "hash", normalized: q.toLowerCase() };

  const host = q.replace(/^www\./i, "").toLowerCase();
  if (DOMAIN.test(host)) return { kind: "domain", normalized: host };

  if (/^[a-z0-9][a-z0-9._-]{1,38}$/i.test(q) && !q.includes(" ")) {
    return { kind: "username", normalized: q };
  }

  return { kind: "org", normalized: q };
}

export const EXAMPLE_QUERIES = [
  { q: "8.8.8.8", label: "Public resolver" },
  { q: "1.1.1.1", label: "Anycast DNS" },
  { q: "x.ai", label: "Corporate domain" },
  { q: "wikipedia.org", label: "Mature origin" },
  { q: "AS13335", label: "Cloudflare ASN" },
  { q: "github.com", label: "Platform surface" },
];
