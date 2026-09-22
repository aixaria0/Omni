import { n as classifyQuery, o as uid } from "./utils-DMw-ONV5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/collect.server-BwkeJLqV.js
function asRecord(v) {
	return v && typeof v === "object" && !Array.isArray(v) ? v : null;
}
function str(v) {
	if (typeof v === "string" && v.trim()) return v.trim();
	if (typeof v === "number" && Number.isFinite(v)) return String(v);
}
function arr(v) {
	return Array.isArray(v) ? v : [];
}
function source(sources, id) {
	return sources.find((s) => s.id === id);
}
function fuseInvestigation(query, kind, sources) {
	const facts = [];
	const nodes = /* @__PURE__ */ new Map();
	const edges = [];
	const timeline = [];
	const disagreements = [];
	const addNode = (n) => {
		if (!nodes.has(n.id)) nodes.set(n.id, n);
		return n.id;
	};
	const addEdge = (sourceId, targetId, rel) => {
		edges.push({
			id: uid("e"),
			source: sourceId,
			target: targetId,
			rel
		});
	};
	const addFact = (f) => {
		facts.push({
			id: uid("f"),
			...f
		});
	};
	const qid = addNode({
		id: "query",
		label: query,
		kind: kind === "asn" ? "asn" : kind === "hash" ? "hash" : "query",
		hop: 0,
		detail: kind
	});
	const dns = asRecord(source(sources, "dns")?.data);
	const ips = [];
	const domains = [];
	if (kind === "domain" || kind === "url" || kind === "email") domains.push(query.includes("@") ? query.split("@")[1] : query.replace(/^https?:\/\//, "").split("/")[0]);
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
	if (str(ipwho?.ip)) ips.push(String(ipwho.ip));
	const geoCountry = str(ipwho?.country);
	const geoCity = str(ipwho?.city);
	const isp = str(ipwho?.isp) || str(ipwho?.org);
	const asnStr = str(asRecord(ipwho?.connection)?.asn) ? `AS${str(asRecord(ipwho?.connection)?.asn)}` : str(ipwho?.asn);
	const rdapIp = asRecord(source(sources, "rdap_ip")?.data);
	const rdapDom = asRecord(source(sources, "rdap_domain")?.data);
	const bgpData = asRecord(asRecord(source(sources, "bgpview")?.data)?.data);
	const inet = asRecord(source(sources, "internetdb")?.data);
	const inetPorts = arr(inet?.ports).map((p) => Number(p)).filter((n) => Number.isFinite(n));
	const inetHostnames = arr(inet?.hostnames).map(String);
	const inetVulns = arr(inet?.vulns).map(String);
	const inetCpes = arr(inet?.cpes).map(String);
	const otx = asRecord(source(sources, "otx")?.data);
	const pulseCount = Number(asRecord(otx?.pulse_info)?.count ?? otx?.pulse_count ?? 0) || arr(asRecord(otx?.pulse_info)?.pulses).length;
	const ripeAsns = arr(asRecord(asRecord(source(sources, "ripe")?.data)?.data)?.asns).map((a) => {
		const r = asRecord(a);
		return str(r?.asn) ? `AS${r.asn}` : str(a);
	}).filter(Boolean);
	const crt = arr(source(sources, "crtsh")?.data);
	const certNames = /* @__PURE__ */ new Set();
	for (const row of crt.slice(0, 80)) {
		const r = asRecord(row);
		const nv = str(r?.name_value);
		const nb = str(r?.not_before);
		if (nv) for (const name of nv.split(/\n+/)) {
			const n = name.trim().replace(/^\*\./, "").toLowerCase();
			if (n.includes(".")) certNames.add(n);
		}
		if (nb) timeline.push({
			at: nb.replace(" ", "T") + "Z",
			label: `Certificate issued${nv ? ` for ${nv.split("\n")[0]}` : ""}`,
			source: "crt.sh",
			kind: "cert"
		});
	}
	const wayback = arr(source(sources, "wayback")?.data);
	for (const row of wayback.slice(1, 40)) {
		const tuple = arr(row).map(String);
		if (tuple[0] && /^\d{14}$/.test(tuple[0])) timeline.push({
			at: tuple[0],
			label: `Archive ${tuple[2] || ""} ${tuple[1] || ""}`.trim(),
			source: "Wayback",
			kind: "archive"
		});
	}
	const headers = asRecord(source(sources, "httpfp")?.data);
	const github = asRecord(source(sources, "github")?.data);
	const wiki = asRecord(source(sources, "wiki")?.data);
	const urlscan = asRecord(source(sources, "urlscan")?.data);
	const asnInfo = asRecord(source(sources, "asn")?.data);
	const uniqueIps = [...new Set(ips.filter(Boolean))];
	const uniqueDomains = [...new Set([
		...domains,
		...inetHostnames,
		...[...certNames].slice(0, 18)
	].map((d) => d.toLowerCase().replace(/\.$/, "")))].filter((d) => d && d.includes("."));
	for (const ip of uniqueIps.slice(0, 8)) addEdge(qid, addNode({
		id: `ip:${ip}`,
		label: ip,
		kind: "ip",
		hop: 1,
		detail: [geoCity, geoCountry].filter(Boolean).join(", "),
		risk: inetVulns.length ? .7 : inetPorts.length > 10 ? .45 : .15
	}), "resolves");
	for (const d of uniqueDomains.slice(0, 16)) addEdge(qid, addNode({
		id: `dom:${d}`,
		label: d,
		kind: "domain",
		hop: d === query ? 1 : 2
	}), "name");
	const asns = /* @__PURE__ */ new Set();
	if (asnStr) asns.add(asnStr.startsWith("AS") ? asnStr : `AS${asnStr}`);
	for (const a of ripeAsns) asns.add(a);
	const bgpAsns = arr(bgpData?.prefixes);
	for (const p of bgpAsns) {
		const asn = asRecord(asRecord(p)?.asn)?.asn;
		if (asn) asns.add(`AS${asn}`);
	}
	const asnMeta = asRecord(asRecord(asnInfo?.data)?.asn);
	if (str(asnMeta?.asn)) asns.add(`AS${asnMeta.asn}`);
	for (const a of asns) addEdge(qid, addNode({
		id: `asn:${a}`,
		label: a,
		kind: "asn",
		hop: 1,
		detail: isp
	}), "routed");
	const org = str(rdapIp?.name) || str(asRecord(arr(rdapIp?.entities)[0])?.vcardArray ? void 0 : void 0) || isp || str(asRecord(asnMeta)?.name) || str(ipwho?.org);
	let rdapOrg;
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
	if (orgName) addEdge(qid, addNode({
		id: `org:${orgName}`,
		label: orgName,
		kind: "org",
		hop: 2
	}), "operated");
	for (const p of inetPorts.slice(0, 24)) {
		const id = addNode({
			id: `port:${p}`,
			label: String(p),
			kind: "port",
			hop: 2,
			risk: [
				23,
				445,
				3389,
				6379,
				27017,
				9200
			].includes(p) ? .8 : .2
		});
		if (uniqueIps[0]) addEdge(`ip:${uniqueIps[0]}`, id, "exposes");
		else addEdge(qid, id, "exposes");
	}
	if (geoCountry) {
		const label = [geoCity, geoCountry].filter(Boolean).join(", ");
		addEdge(qid, addNode({
			id: `geo:${label}`,
			label,
			kind: "geo",
			hop: 2,
			detail: str(ipwho?.continent)
		}), "geolocates");
	}
	if (crt.length) addEdge(qid, addNode({
		id: "ct",
		label: `${Math.min(crt.length, 80)} certs`,
		kind: "cert",
		hop: 1,
		detail: "Certificate Transparency"
	}), "issued");
	if (geoCountry && str(headers?.country) && str(headers?.country) !== geoCountry) disagreements.push(`Geo disagreement: ipwho.is says ${geoCountry}, HTTP fingerprint notes ${headers?.country}.`);
	addFact({
		label: "Indicator",
		value: `${kind.toUpperCase()} · ${query}`,
		sourceIds: ["classifier"]
	});
	if (orgName) addFact({
		label: "Organization",
		value: orgName,
		sourceIds: [
			"rdap_ip",
			"rdap_domain",
			"ipwho",
			"asn"
		].filter((id) => source(sources, id)?.ok),
		tone: "ok"
	});
	if (geoCountry) addFact({
		label: "Geolocation",
		value: [
			geoCity,
			str(ipwho?.region),
			geoCountry
		].filter(Boolean).join(", "),
		sourceIds: ["ipwho"],
		hint: "IP geolocation is a best-effort registry/anycast estimate — not a street address."
	});
	if (asns.size) addFact({
		label: "ASN",
		value: [...asns].join(", "),
		sourceIds: [
			"bgpview",
			"ripe",
			"ipwho",
			"asn"
		].filter((id) => source(sources, id)?.ok)
	});
	if (isp) addFact({
		label: "Network / ISP",
		value: isp,
		sourceIds: ["ipwho"]
	});
	if (uniqueIps.length) addFact({
		label: "Resolved addresses",
		value: uniqueIps.join(", "),
		sourceIds: [
			"dns",
			"ipwho",
			"internetdb"
		]
	});
	if (inetPorts.length) addFact({
		label: "Advertised ports",
		value: inetPorts.join(", "),
		sourceIds: ["internetdb"],
		tone: inetPorts.some((p) => [
			23,
			445,
			3389,
			6379,
			27017,
			9200
		].includes(p)) ? "danger" : "warn"
	});
	if (inetVulns.length || inetCpes.length) addFact({
		label: "Known CPEs / vulns",
		value: [...inetCpes, ...inetVulns].slice(0, 10).join(" · "),
		sourceIds: ["internetdb"],
		tone: "danger",
		hint: "InternetDB tags are banner/CPE correlations, not confirmed exploitation."
	});
	if (inetHostnames.length) addFact({
		label: "Reverse hostnames",
		value: inetHostnames.slice(0, 8).join(", "),
		sourceIds: ["internetdb"]
	});
	if (crt.length) addFact({
		label: "CT certificates",
		value: String(crt.length >= 80 ? "80+" : crt.length),
		sourceIds: ["crtsh"]
	});
	if (wayback.length > 1) {
		const first = arr(wayback[1]).map(String)[0];
		const last = arr(wayback[wayback.length - 1]).map(String)[0];
		addFact({
			label: "Archive depth",
			value: first ? `${first.slice(0, 4)} → ${last?.slice(0, 4) || first.slice(0, 4)} · ${wayback.length - 1} captures` : `${wayback.length - 1} captures`,
			sourceIds: ["wayback"],
			tone: "ok"
		});
	}
	if (pulseCount) addFact({
		label: "OTX pulse count",
		value: String(pulseCount),
		sourceIds: ["otx"],
		tone: pulseCount > 3 ? "warn" : "neutral",
		hint: "OTX pulses are community submissions — many track scanners, not intrusion."
	});
	const server = str(headers?.server) || str(headers?.Server);
	if (server) addFact({
		label: "HTTP server",
		value: server,
		sourceIds: ["httpfp"]
	});
	const status = str(headers?.status);
	if (status) addFact({
		label: "HTTP status",
		value: status,
		sourceIds: ["httpfp"]
	});
	const scanTotal = Number(urlscan?.total);
	if (scanTotal) addFact({
		label: "urlscan results",
		value: String(scanTotal),
		sourceIds: ["urlscan"]
	});
	if (str(github?.login)) addFact({
		label: "GitHub profile",
		value: `${github?.login} · ${github?.public_repos ?? 0} repos`,
		sourceIds: ["github"],
		hint: "Public developer profile only — not identity confirmation."
	});
	if (str(wiki?.title)) addFact({
		label: "Encyclopedia",
		value: String(wiki?.title),
		sourceIds: ["wiki"],
		tone: "ok"
	});
	const registrar = (() => {
		for (const ent of arr(rdapDom?.entities)) if (arr(asRecord(ent)?.roles).map(String).includes("registrar")) {
			const vcard = arr(asRecord(ent)?.vcardArray)[1];
			for (const row of arr(vcard)) {
				const r = arr(row);
				if (r[0] === "fn") return str(r[3]);
			}
		}
		return str(rdapDom?.ldhName);
	})();
	if (registrar) addFact({
		label: "RDAP name / registrar",
		value: registrar,
		sourceIds: ["rdap_domain"]
	});
	timeline.sort((a, b) => a.at.localeCompare(b.at));
	return {
		facts,
		graph: {
			nodes: [...nodes.values()],
			edges
		},
		timeline: timeline.slice(-40),
		disagreements
	};
}
var CLOUD_ASN = /* @__PURE__ */ new Set([
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
	"AS31898"
]);
var RISKY_PORTS = /* @__PURE__ */ new Set([
	23,
	445,
	3389,
	5900,
	9200,
	9300,
	6379,
	27017,
	11211,
	1433,
	3306,
	5432,
	2375,
	10250,
	5e3,
	8080,
	8888
]);
function factVal(facts, label) {
	return facts.find((f) => f.label === label)?.value ?? "";
}
function has(facts, label) {
	return facts.some((f) => f.label === label);
}
function buildHeuristicLattice(facts, graph) {
	const asns = graph.nodes.filter((n) => n.kind === "asn").map((n) => n.label);
	const ports = graph.nodes.filter((n) => n.kind === "port").map((n) => Number(n.label.replace(":", "")));
	const vulns = factVal(facts, "Known CPEs / vulns");
	const certCount = Number(factVal(facts, "CT certificates") || "0");
	const wayback = factVal(facts, "Archive depth");
	const otx = Number(factVal(facts, "OTX pulse count") || "0");
	const org = factVal(facts, "Organization");
	const cloudish = asns.some((a) => CLOUD_ASN.has(a.toUpperCase()));
	const risky = ports.some((p) => RISKY_PORTS.has(p));
	const manyPorts = ports.length >= 8;
	const mature = /year|decade|20\d\d/.test(wayback) || certCount >= 12;
	const sparse = graph.nodes.length < 6 && certCount < 2 && !has(facts, "HTTP server");
	const hypos = [
		{
			id: "H1",
			title: "Legitimate cloud / CDN surface",
			statement: "The target is a production service on major cloud or CDN infrastructure, operated as intended.",
			prior: .28,
			posterior: .28,
			supports: [],
			contradicts: [],
			gaps: [],
			scores: {}
		},
		{
			id: "H2",
			title: "Exposed or poorly hardened host",
			statement: "Management, database, or known-vulnerable services are reachable from the public internet.",
			prior: .22,
			posterior: .22,
			supports: [],
			contradicts: [],
			gaps: [],
			scores: {}
		},
		{
			id: "H3",
			title: "Mature long-lived origin",
			statement: "Infrastructure has a long public history (certificates, archives) consistent with an established organization.",
			prior: .2,
			posterior: .2,
			supports: [],
			contradicts: [],
			gaps: [],
			scores: {}
		},
		{
			id: "H4",
			title: "Transient / low-attribution node",
			statement: "Thin public record: few certificates, short archive history, weak organizational binding.",
			prior: .18,
			posterior: .18,
			supports: [],
			contradicts: [],
			gaps: [],
			scores: {}
		},
		{
			id: "H5",
			title: "Actively observed in threat intel",
			statement: "Public pulse platforms have correlated this indicator with reported campaigns or scanners.",
			prior: .12,
			posterior: .12,
			supports: [],
			contradicts: [],
			gaps: [],
			scores: {}
		}
	];
	const evidence = [
		{
			id: "Major-cloud ASN",
			apply: (h) => {
				if (!asns.length) return "na";
				if (h.id === "H1") return cloudish ? "support" : "contradict";
				if (h.id === "H4") return cloudish ? "contradict" : "neutral";
				return "neutral";
			},
			note: () => cloudish ? asns.join(", ") : asns.join(", ") || "none"
		},
		{
			id: "Risky open ports",
			apply: (h) => {
				if (!ports.length) return "na";
				if (h.id === "H2") return risky || manyPorts ? "support" : "contradict";
				if (h.id === "H1") return risky ? "contradict" : "neutral";
				return "neutral";
			},
			note: () => ports.slice(0, 12).join(", ") || "none advertised"
		},
		{
			id: "InternetDB vulns/CPE",
			apply: (h) => {
				if (!vulns) return "na";
				if (h.id === "H2" || h.id === "H5") return "support";
				if (h.id === "H1") return "contradict";
				return "neutral";
			},
			note: () => vulns.slice(0, 120) || "none"
		},
		{
			id: "Certificate volume",
			apply: (h) => {
				if (!certCount) return "na";
				if (h.id === "H3") return certCount >= 8 ? "support" : "contradict";
				if (h.id === "H4") return certCount < 3 ? "support" : "contradict";
				return "neutral";
			},
			note: () => `${certCount} CT rows`
		},
		{
			id: "Archive depth",
			apply: (h) => {
				if (!wayback) return "na";
				if (h.id === "H3") return mature ? "support" : "neutral";
				if (h.id === "H4") return mature ? "contradict" : "support";
				return "neutral";
			},
			note: () => wayback || "no CDX hits"
		},
		{
			id: "OTX pulses",
			apply: (h) => {
				if (h.id === "H5") return otx > 0 ? "support" : "contradict";
				if (h.id === "H1" && otx > 5) return "contradict";
				return otx ? "neutral" : "na";
			},
			note: () => `${otx} pulses`
		},
		{
			id: "Org binding",
			apply: (h) => {
				if (!org) return "na";
				if (h.id === "H4") return "contradict";
				if (h.id === "H1" || h.id === "H3") return "support";
				return "neutral";
			},
			note: () => org || "unbound"
		},
		{
			id: "Record sparsity",
			apply: (h) => {
				if (h.id === "H4") return sparse ? "support" : "contradict";
				if (h.id === "H3") return sparse ? "contradict" : "neutral";
				return "neutral";
			},
			note: () => `${graph.nodes.length} graph nodes`
		}
	];
	const matrix = [];
	for (const ev of evidence) {
		const cells = {};
		for (const h of hypos) {
			const cell = ev.apply(h);
			cells[h.id] = cell;
			const note = ev.note(h);
			if (cell === "support") {
				h.supports.push({
					evidence: ev.id,
					note
				});
				h.posterior *= 1.55;
			} else if (cell === "contradict") {
				h.contradicts.push({
					evidence: ev.id,
					note
				});
				h.posterior *= .55;
			}
		}
		matrix.push({
			evidence: ev.id,
			cells
		});
	}
	const sum = hypos.reduce((s, h) => s + h.posterior, 0) || 1;
	for (const h of hypos) h.posterior = h.posterior / sum;
	hypos.sort((a, b) => b.posterior - a.posterior);
	const lead = hypos[0];
	const gap = lead.posterior - (hypos[1]?.posterior ?? 0);
	const confidence = gap > .28 && lead.posterior > .45 ? "high" : gap > .12 ? "medium" : "low";
	for (const h of hypos) {
		if (!h.supports.length) h.gaps.push("No strongly supporting public evidence yet.");
		if (h.id === lead.id && confidence !== "high") h.gaps.push("Rival hypotheses remain close — do not treat as fact.");
	}
	const briefing = [
		`Leading hypothesis ${lead.id} (${lead.title}) at ${(lead.posterior * 100).toFixed(0)}% posterior with ${confidence} separation.`,
		org ? `Public records bind this indicator to “${org}”.` : `No strong organizational binding in RDAP/BGP.`,
		cloudish ? `Routing originates in a major cloud/CDN ASN (${asns.filter((a) => CLOUD_ASN.has(a.toUpperCase())).join(", ")}).` : asns.length ? `ASNs observed: ${asns.join(", ")}.` : `No ASN resolved.`,
		ports.length ? `InternetDB advertises ${ports.length} port(s)${risky ? ", including historically abused services" : ""}.` : `No InternetDB port map (typical for firewalled or IPv6-only edges).`,
		otx ? `AlienVault OTX lists ${otx} pulse(s) — treat as community telemetry, not verdict.` : `No OTX pulses on this indicator.`,
		`This lattice is a heuristic ACH (Heuer) over public sources only. It is not attribution and not a conviction.`
	].join(" ");
	const watch = [
		risky ? "Restrict or monitor historically abused ports if this is your asset." : "",
		!org ? "Seek registrar / ASN abuse-contact confirmation before naming an operator." : "",
		"Re-run after 24h — CT logs and InternetDB lag live changes.",
		"Do not pivot from infrastructure into private individuals."
	].filter(Boolean);
	return {
		engine: "heuristic",
		leading: lead.id,
		confidence,
		briefing,
		watch,
		hypotheses: hypos.map(({ scores: _s, ...rest }) => rest),
		matrix
	};
}
var UA = "OmniTrace/1.0 (defensive public-source research; +https://x.ai)";
async function timedFetch(url, init = {}) {
	const ctrl = new AbortController();
	const timeout = init.timeout ?? 8e3;
	const t = setTimeout(() => ctrl.abort(), timeout);
	try {
		const res = await fetch(url, {
			...init,
			signal: ctrl.signal,
			redirect: init.redirect ?? "follow",
			headers: {
				"User-Agent": UA,
				Accept: "application/json, text/plain, */*",
				...init.headers
			}
		});
		const text = await res.text();
		return {
			ok: res.ok,
			status: res.status,
			text,
			headers: res.headers
		};
	} finally {
		clearTimeout(t);
	}
}
function parseJson(text) {
	const trimmed = text.trim();
	if (!trimmed) return null;
	try {
		return JSON.parse(trimmed);
	} catch {
		const start = trimmed.search(/[\[{]/);
		if (start >= 0) try {
			return JSON.parse(trimmed.slice(start));
		} catch {
			return { raw: trimmed.slice(0, 400) };
		}
		return { raw: trimmed.slice(0, 400) };
	}
}
async function collectSource(id, name, fn) {
	const t0 = Date.now();
	try {
		const data = await fn();
		if (data == null) return {
			id,
			name,
			ok: false,
			ms: Date.now() - t0,
			error: "empty"
		};
		return {
			id,
			name,
			ok: true,
			ms: Date.now() - t0,
			data
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : "failed";
		return {
			id,
			name,
			ok: false,
			ms: Date.now() - t0,
			error: msg
		};
	}
}
async function dnsRecords(name) {
	const results = await Promise.all([
		"A",
		"AAAA",
		"MX",
		"NS",
		"TXT",
		"CNAME",
		"SOA",
		"CAA"
	].map(async (type) => {
		return parseJson((await timedFetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, {
			headers: { Accept: "application/dns-json" },
			timeout: 6e3
		})).text);
	}));
	const Answer = [];
	const Authority = [];
	for (const r of results) {
		if (!r || typeof r !== "object" || Array.isArray(r)) continue;
		if (Array.isArray(r.Answer)) Answer.push(...r.Answer);
		if (Array.isArray(r.Authority)) Authority.push(...r.Authority);
	}
	return {
		Answer,
		Authority,
		Status: 0
	};
}
function firstIpv4(dns) {
	if (!dns || typeof dns !== "object" || Array.isArray(dns)) return void 0;
	const answers = Array.isArray(dns.Answer) ? dns.Answer : [];
	for (const item of answers) {
		if (!item || typeof item !== "object" || Array.isArray(item)) continue;
		if (item.type === 1 && typeof item.data === "string") return item.data;
	}
}
async function collectBundle(query, kind, host) {
	const domain = host || (kind === "domain" ? query : void 0) || (kind === "url" ? query.replace(/^https?:\/\//, "").split("/")[0] : void 0);
	const ip = kind === "ip" ? query : void 0;
	const asnNum = kind === "asn" ? query.replace(/^AS/i, "") : void 0;
	const wikiTitle = kind === "org" || kind === "domain" || kind === "username" ? query : domain;
	const tasks = [];
	if (domain) {
		tasks.push(collectSource("dns", "DNS (Cloudflare DoH)", () => dnsRecords(domain)));
		tasks.push(collectSource("rdap_domain", "RDAP domain", async () => {
			const r = await timedFetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { timeout: 9e3 });
			if (!r.ok) throw new Error(`RDAP ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("crtsh", "Certificate Transparency", async () => {
			const r = await timedFetch(`https://crt.sh/?q=${encodeURIComponent(domain)}&output=json`, { timeout: 1e4 });
			if (!r.ok) throw new Error(`crt.sh ${r.status}`);
			const json = parseJson(r.text);
			return Array.isArray(json) ? json.slice(0, 80) : json;
		}));
		tasks.push(collectSource("wayback", "Wayback CDX", async () => {
			const r = await timedFetch(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&limit=25`, { timeout: 9e3 });
			if (!r.ok) throw new Error(`CDX ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("urlscan", "urlscan.io", async () => {
			const r = await timedFetch(`https://urlscan.io/api/v1/search/?q=domain:${encodeURIComponent(domain)}&size=5`, { timeout: 8e3 });
			if (!r.ok) throw new Error(`urlscan ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("otx", "AlienVault OTX", async () => {
			const r = await timedFetch(`https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(domain)}/general`, { timeout: 8e3 });
			if (!r.ok) throw new Error(`OTX ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("httpfp", "HTTP fingerprint", async () => {
			const r = await timedFetch(`https://${domain}`, {
				timeout: 7e3,
				redirect: "follow",
				headers: { Accept: "text/html" }
			});
			const h = { status: String(r.status) };
			for (const key of [
				"server",
				"x-powered-by",
				"cf-ray",
				"via",
				"content-type",
				"strict-transport-security",
				"x-frame-options"
			]) {
				const val = r.headers.get(key);
				if (val) h[key] = val;
			}
			return h;
		}));
	}
	if (ip) {
		tasks.push(collectSource("rdap_ip", "RDAP IP", async () => {
			const r = await timedFetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`, { timeout: 9e3 });
			if (!r.ok) throw new Error(`RDAP ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("otx", "AlienVault OTX", async () => {
			const r = await timedFetch(`https://otx.alienvault.com/api/v1/indicators/${ip.includes(":") ? "IPv6" : "IPv4"}/${encodeURIComponent(ip)}/general`, { timeout: 8e3 });
			if (!r.ok) throw new Error(`OTX ${r.status}`);
			return parseJson(r.text);
		}));
	}
	if (ip) {
		tasks.push(collectSource("ipwho", "ipwho.is", async () => {
			const r = await timedFetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeout: 7e3 });
			if (!r.ok) throw new Error(`ipwho ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("internetdb", "Shodan InternetDB", async () => {
			const r = await timedFetch(`https://internetdb.shodan.io/${encodeURIComponent(ip)}`, { timeout: 7e3 });
			if (r.status === 404) return {
				ip,
				ports: [],
				vulns: [],
				hostnames: []
			};
			if (!r.ok) throw new Error(`InternetDB ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("bgpview", "BGPView", async () => {
			const r = await timedFetch(`https://api.bgpview.io/ip/${encodeURIComponent(ip)}`, { timeout: 7e3 });
			if (!r.ok) throw new Error(`BGPView ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("ripe", "RIPE Stat", async () => {
			const r = await timedFetch(`https://stat.ripe.net/data/prefix-overview/data.json?resource=${encodeURIComponent(ip)}`, { timeout: 8e3 });
			if (!r.ok) throw new Error(`RIPE ${r.status}`);
			return parseJson(r.text);
		}));
	}
	if (asnNum) {
		tasks.push(collectSource("asn", "BGPView ASN", async () => {
			const r = await timedFetch(`https://api.bgpview.io/asn/${encodeURIComponent(asnNum)}`, { timeout: 8e3 });
			if (!r.ok) throw new Error(`ASN ${r.status}`);
			return parseJson(r.text);
		}));
		tasks.push(collectSource("asn_prefixes", "ASN prefixes", async () => {
			const r = await timedFetch(`https://api.bgpview.io/asn/${encodeURIComponent(asnNum)}/prefixes`, { timeout: 9e3 });
			if (!r.ok) throw new Error(`prefixes ${r.status}`);
			return parseJson(r.text);
		}));
	}
	if (kind === "username" || kind === "org") tasks.push(collectSource("github", "GitHub public", async () => {
		const r = await timedFetch(`https://api.github.com/users/${encodeURIComponent(query)}`, {
			timeout: 7e3,
			headers: { Accept: "application/vnd.github+json" }
		});
		if (!r.ok) throw new Error(`GitHub ${r.status}`);
		return parseJson(r.text);
	}));
	if (kind === "hash") tasks.push(collectSource("otx", "OTX file indicator", async () => {
		const r = await timedFetch(`https://otx.alienvault.com/api/v1/indicators/file/${encodeURIComponent(query)}/general`, { timeout: 8e3 });
		if (!r.ok) throw new Error(`OTX ${r.status}`);
		return parseJson(r.text);
	}));
	if (wikiTitle) tasks.push(collectSource("wiki", "Wikipedia", async () => {
		const r = await timedFetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`, { timeout: 6e3 });
		if (!r.ok) throw new Error(`wiki ${r.status}`);
		return parseJson(r.text);
	}));
	const sources = await Promise.all(tasks);
	if (!ip && domain) {
		const v4 = firstIpv4(sources.find((s) => s.id === "dns")?.data);
		if (v4) {
			const hop = await Promise.all([
				collectSource("ipwho", "ipwho.is", async () => {
					const r = await timedFetch(`https://ipwho.is/${v4}`, { timeout: 7e3 });
					if (!r.ok) throw new Error(`ipwho ${r.status}`);
					return parseJson(r.text);
				}),
				collectSource("internetdb", "Shodan InternetDB", async () => {
					const r = await timedFetch(`https://internetdb.shodan.io/${v4}`, { timeout: 7e3 });
					if (r.status === 404) return {
						ip: v4,
						ports: [],
						vulns: []
					};
					if (!r.ok) throw new Error(`InternetDB ${r.status}`);
					return parseJson(r.text);
				}),
				collectSource("rdap_ip", "RDAP IP", async () => {
					const r = await timedFetch(`https://rdap.org/ip/${v4}`, { timeout: 8e3 });
					if (!r.ok) throw new Error(`RDAP ${r.status}`);
					return parseJson(r.text);
				}),
				collectSource("bgpview", "BGPView", async () => {
					const r = await timedFetch(`https://api.bgpview.io/ip/${v4}`, { timeout: 7e3 });
					if (!r.ok) throw new Error(`BGPView ${r.status}`);
					return parseJson(r.text);
				}),
				collectSource("ripe", "RIPE Stat", async () => {
					const r = await timedFetch(`https://stat.ripe.net/data/prefix-overview/data.json?resource=${v4}`, { timeout: 8e3 });
					if (!r.ok) throw new Error(`RIPE ${r.status}`);
					return parseJson(r.text);
				})
			]);
			sources.push(...hop);
		}
	}
	return sources;
}
async function collectInvestigation(raw) {
	const { kind, normalized, host } = classifyQuery(raw);
	if (!normalized) throw new Error("Enter an IP, domain, ASN, URL, or username.");
	const sources = await collectBundle(normalized, kind, host);
	const fused = fuseInvestigation(normalized, kind, sources);
	const lattice = buildHeuristicLattice(fused.facts, fused.graph);
	return {
		id: uid("inv"),
		query: normalized,
		kind,
		collectedAt: (/* @__PURE__ */ new Date()).toISOString(),
		sources,
		...fused,
		lattice
	};
}
//#endregion
export { collectInvestigation };
