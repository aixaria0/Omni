# Collectors

OmniTrace collects public-source data server-side and converts every source call into a `SourceResult` containing source identity, success/failure state, latency, response data when available, and an error message when collection fails.

Collector output is evidence input, not a verdict.

## Query classification

`src/lib/osint/classify.ts` currently recognizes:

- IPv4 / IPv6
- ASN (`AS123`, `ASN 123`)
- IPv4 CIDR
- HTTP(S) URL
- email address
- MD5 / SHA-1 / SHA-256-shaped hash
- domain
- username-shaped token
- organization/free text fallback

Classification determines the collector bundle and normalization rules.

## Collector matrix

| Query path                     | Public sources used by the current implementation                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain / URL host / email host | Cloudflare DNS-over-HTTPS, RDAP domain, crt.sh, Wayback CDX, urlscan.io, AlienVault OTX domain, HTTPS header fingerprint, Wikipedia summary; plus a second-hop IPv4 bundle when DNS yields an A record |
| IP                             | RDAP IP, AlienVault OTX IPv4/IPv6, ipwho.is, Shodan InternetDB, BGPView IP, RIPE Stat prefix overview                                                                                                  |
| ASN                            | BGPView ASN metadata, BGPView ASN prefixes                                                                                                                                                             |
| Username                       | GitHub public user endpoint, Wikipedia summary                                                                                                                                                         |
| Organization/free text         | GitHub public user endpoint (best-effort), Wikipedia summary                                                                                                                                           |
| File hash                      | AlienVault OTX file indicator                                                                                                                                                                          |
| CIDR                           | Classified by the query layer, but no dedicated CIDR collector bundle is implemented yet                                                                                                               |

## Domain second hop

When a domain-style query produces an IPv4 A record, OmniTrace performs an additional public infrastructure hop against the first IPv4 address found:

- ipwho.is
- Shodan InternetDB
- RDAP IP
- BGPView IP
- RIPE Stat

This is part of normal domain collection and is distinct from Autopilot's later multi-round pivot loop.

## DNS collection

The Cloudflare DoH collector requests these record types in parallel:

```text
A
AAAA
MX
NS
TXT
CNAME
SOA
CAA
```

Answers and authority records are merged into one normalized DNS result.

## Timeouts and failure behavior

Network calls have explicit request timeouts, generally in the 6–10 second range depending on the source.

A source failure does not automatically abort the investigation. `collectSource` converts failures into a `SourceResult` with `ok: false`, latency, and a compact error string. Fusion and coverage reporting can therefore continue with partial evidence.

Autopilot's policy separately considers live collector coverage when deciding whether the current state is robust enough to stop.

## Response-size controls

Some collectors are bounded in the implementation before fusion:

- crt.sh results are capped to the first 80 parsed rows;
- Wayback CDX requests a maximum of 25 successful captures;
- urlscan.io requests a maximum of 5 results;
- non-JSON fallback response text is truncated before being stored in the parsed `raw` field.

These are operational bounds, not statements that additional remote records do not exist.

## HTTP fingerprinting

For domain-style queries Omni performs a normal HTTPS request with redirects enabled and records a limited header/status fingerprint rather than persisting the response body.

The current header subset includes values such as:

- `server`
- `x-powered-by`
- `cf-ray`
- `via`
- `content-type`
- `strict-transport-security`
- `x-frame-options`
- HTTP status

A fingerprint is contextual infrastructure evidence, not proof of software version or ownership.

## Threat-intelligence handling

AlienVault OTX and Shodan InternetDB can supply threat/vulnerability-adjacent metadata. Omni treats these values as observations and explicitly avoids turning tags into confirmed exploitation claims.

For example, InternetDB CPE/vulnerability correlations may be derived from banners or external enrichment; they should not be read as proof that exploitation occurred.

## Geolocation handling

IP geolocation from ipwho.is is best-effort infrastructure metadata. The UI intentionally describes it as an approximate registry/anycast-style estimate rather than a street-address locator.

## User-Agent

OmniTrace identifies its public-source research requests with an explicit user agent. Collector additions should preserve transparent, non-deceptive network behavior.

## Adding a collector

A new collector should:

1. use an explicit timeout;
2. return public-source data only;
3. fail into a normal `SourceResult` rather than crash the whole investigation when partial progress is possible;
4. use a stable source id;
5. propagate source ids into fused facts that depend on it;
6. avoid embedding credentials or secrets in source URLs or committed configuration;
7. document any response cap, rate-limit assumption, or special trust caveat;
8. include tests when it affects deterministic fusion, Stress provenance, or Autopilot planning.

See [Architecture](ARCHITECTURE.md), [Development](DEVELOPMENT.md), and [Security policy](../SECURITY.md).
