import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-DMw-ONV5.js
var IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
var IPV6 = /^[0-9a-f:]+$/i;
var ASN = /^(?:as|asn)\s*(\d{1,10})$/i;
var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var HASH = /^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i;
var CIDR = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\/(?:[0-9]|[1-2]\d|3[0-2])$/;
var DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
function classifyQuery(raw) {
	const q = raw.trim();
	if (!q) return {
		kind: "org",
		normalized: ""
	};
	if (IPV4.test(q)) return {
		kind: "ip",
		normalized: q
	};
	if (q.includes(":") && IPV6.test(q) && q.split(":").length >= 3) return {
		kind: "ip",
		normalized: q.toLowerCase()
	};
	const asn = q.match(ASN);
	if (asn) return {
		kind: "asn",
		normalized: `AS${asn[1]}`
	};
	if (CIDR.test(q)) return {
		kind: "cidr",
		normalized: q
	};
	if (/^https?:\/\//i.test(q)) try {
		return {
			kind: "url",
			normalized: q,
			host: new URL(q).hostname.replace(/^www\./, "")
		};
	} catch {
		return {
			kind: "url",
			normalized: q
		};
	}
	if (EMAIL.test(q)) {
		const host = q.split("@")[1]?.toLowerCase();
		return {
			kind: "email",
			normalized: q.toLowerCase(),
			host
		};
	}
	if (HASH.test(q)) return {
		kind: "hash",
		normalized: q.toLowerCase()
	};
	const host = q.replace(/^www\./i, "").toLowerCase();
	if (DOMAIN.test(host)) return {
		kind: "domain",
		normalized: host
	};
	if (/^[a-z0-9][a-z0-9._-]{1,38}$/i.test(q) && !q.includes(" ")) return {
		kind: "username",
		normalized: q
	};
	return {
		kind: "org",
		normalized: q
	};
}
var EXAMPLE_QUERIES = [
	{
		q: "8.8.8.8",
		label: "Public resolver"
	},
	{
		q: "1.1.1.1",
		label: "Anycast DNS"
	},
	{
		q: "x.ai",
		label: "Corporate domain"
	},
	{
		q: "wikipedia.org",
		label: "Mature origin"
	},
	{
		q: "AS13335",
		label: "Cloudflare ASN"
	},
	{
		q: "github.com",
		label: "Platform surface"
	}
];
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function uid(prefix = "id") {
	return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
function shortDate(iso) {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) {
		if (/^\d{14}$/.test(iso)) return `${iso.slice(0, 4)}-${iso.slice(4, 6)}-${iso.slice(6, 8)}`;
		return iso;
	}
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric"
	});
}
function elapsed(ms) {
	if (ms < 1e3) return `${Math.round(ms)}ms`;
	return `${(ms / 1e3).toFixed(1)}s`;
}
//#endregion
export { shortDate as a, elapsed as i, classifyQuery as n, uid as o, cn as r, EXAMPLE_QUERIES as t };
