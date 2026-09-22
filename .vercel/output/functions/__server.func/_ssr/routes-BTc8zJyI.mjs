import { i as __toESM } from "../_runtime.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { a as shortDate, i as elapsed, r as cn, t as EXAMPLE_QUERIES } from "./utils-DMw-ONV5.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { r as require_jsx_runtime, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { a as LoaderCircle, c as BookmarkCheck, i as Printer, l as Activity, n as Shield, o as Crosshair, r as Radar, s as Bookmark } from "../_libs/lucide-react.mjs";
import { t as Slot } from "../_libs/radix-ui__react-slot.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BTc8zJyI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[opacity,transform,background-color,color,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]", {
	variants: {
		variant: {
			default: "bg-accent text-accent-fg hover:opacity-90",
			secondary: "bg-elevated text-fg border border-border hover:bg-surface",
			ghost: "text-muted hover:text-fg hover:bg-elevated",
			danger: "bg-danger text-fg hover:opacity-90"
		},
		size: {
			default: "h-11 px-4",
			sm: "h-9 px-3 text-xs",
			lg: "h-12 px-5",
			icon: "size-11"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		className: cn("h-12 w-full rounded-xl border border-border bg-elevated px-4 text-sm text-fg placeholder:text-subtle", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40", className),
		...props
	});
}
function Badge({ className, tone = "neutral", children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide", tone === "neutral" && "border-border text-muted", tone === "ok" && "border-ok/30 text-ok", tone === "warn" && "border-warn/30 text-warn", tone === "danger" && "border-danger/30 text-danger", tone === "accent" && "border-accent/30 text-accent", className),
		children
	});
}
var CELL = {
	support: "+",
	contradict: "−",
	neutral: "o",
	na: "·"
};
function LatticeBoard({ lattice, onUpgrade, upgrading }) {
	const lead = lattice.hypotheses.find((h) => h.id === lattice.leading);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							tone: lattice.engine === "grok" ? "accent" : "neutral",
							children: lattice.engine === "grok" ? "Grok ACH" : "Heuristic ACH"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
							tone: lattice.confidence === "high" ? "ok" : lattice.confidence === "medium" ? "warn" : "neutral",
							children: [lattice.confidence, " confidence"]
						}),
						lead ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm text-muted",
							children: [
								"Leading ",
								lead.id,
								" · ",
								(lead.posterior * 100).toFixed(0),
								"%"
							]
						}) : null
					]
				}), onUpgrade ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onUpgrade,
					disabled: upgrading,
					className: "h-11 rounded-lg border border-border bg-elevated px-4 text-sm text-fg hover:bg-surface disabled:opacity-40",
					children: upgrading ? "Scoring with Grok…" : "Upgrade with Grok"
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-3xl text-sm leading-relaxed text-muted",
				children: lattice.briefing
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-3 md:grid-cols-2 xl:grid-cols-3",
				children: lattice.hypotheses.map((h) => {
					const isLead = h.id === lattice.leading;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: cn("rounded-xl border bg-elevated p-4", isLead ? "border-accent/40" : "border-border"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-mono text-xs text-subtle",
									children: h.id
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "tabular font-mono text-sm text-fg",
									children: [(h.posterior * 100).toFixed(0), "%"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "mt-1 text-sm font-medium text-fg",
								children: h.title
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs leading-relaxed text-muted",
								children: h.statement
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 h-1 overflow-hidden rounded-full bg-surface",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full bg-accent",
									style: { width: `${Math.round(h.posterior * 100)}%` }
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-3 text-[11px] text-ok",
								children: [
									"+ ",
									h.supports.length,
									" supporting"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-danger",
								children: [
									"− ",
									h.contradicts.length,
									" contradicting"
								]
							})
						]
					}, h.id);
				})
			}),
			lattice.matrix.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto rounded-xl border border-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "min-w-full text-left text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-elevated text-subtle",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-medium",
							children: "Evidence"
						}), lattice.hypotheses.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2 font-mono font-medium",
							children: h.id
						}, h.id))] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: lattice.matrix.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2 text-muted",
							children: row.evidence
						}), lattice.hypotheses.map((h) => {
							const cell = row.cells[h.id] || "na";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: cn("px-3 py-2 font-mono", cell === "support" && "text-ok", cell === "contradict" && "text-danger", cell === "neutral" && "text-subtle"),
								children: CELL[cell] ?? "·"
							}, h.id);
						})]
					}, row.evidence)) })]
				})
			}) : null,
			lattice.watch.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] uppercase tracking-[0.14em] text-subtle",
				children: "Collection requirements"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 space-y-1 text-sm text-muted",
				children: lattice.watch.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["— ", w] }, w))
			})] }) : null
		]
	});
}
var KIND_COLOR = {
	query: "var(--color-accent)",
	ip: "#8aa4c4",
	domain: "#a8b4c4",
	asn: "#7d9b86",
	org: "#c4a35a",
	cert: "#9aa3b5",
	port: "#c45c4a",
	host: "#8b93a1",
	hash: "#c45c4a",
	geo: "#7d9b86"
};
function PrismGraph({ graph }) {
	const [sel, setSel] = (0, import_react.useState)("query");
	const { pos, w, h } = (0, import_react.useMemo)(() => {
		const w = 720;
		const h = 460;
		const cx = w / 2;
		const cy = h / 2;
		const byHop = /* @__PURE__ */ new Map();
		for (const n of graph.nodes) {
			const hop = n.hop ?? 1;
			byHop.set(hop, [...byHop.get(hop) ?? [], n]);
		}
		const pos = /* @__PURE__ */ new Map();
		for (const [hop, list] of byHop) {
			const r = hop === 0 ? 0 : 70 + hop * 78;
			list.forEach((n, i) => {
				const a = Math.PI * 2 * i / Math.max(list.length, 1) - Math.PI / 2;
				pos.set(n.id, {
					x: cx + r * Math.cos(a),
					y: cy + r * Math.sin(a)
				});
			});
		}
		return {
			pos,
			w,
			h
		};
	}, [graph]);
	const selected = graph.nodes.find((n) => n.id === sel);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-[1fr_220px]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-hidden rounded-xl border border-border bg-bg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: `0 0 ${w} ${h}`,
				className: "h-[320px] w-full sm:h-[420px]",
				role: "img",
				"aria-label": "Entity prism graph",
				children: [
					[
						1,
						2,
						3
					].map((ring) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: w / 2,
						cy: h / 2,
						r: 70 + ring * 78,
						fill: "none",
						stroke: "var(--color-border)",
						strokeDasharray: "2 6"
					}, ring)),
					graph.edges.map((e) => {
						const a = pos.get(e.source);
						const b = pos.get(e.target);
						if (!a || !b) return null;
						const hot = e.source === sel || e.target === sel;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: a.x,
							y1: a.y,
							x2: b.x,
							y2: b.y,
							stroke: hot ? "var(--color-accent)" : "var(--color-border)",
							strokeWidth: hot ? 1.4 : 1,
							opacity: hot ? .9 : .55
						}, e.id);
					}),
					graph.nodes.map((n) => {
						const p = pos.get(n.id);
						if (!p) return null;
						const active = n.id === sel;
						const fill = KIND_COLOR[n.kind];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
							transform: `translate(${p.x},${p.y})`,
							className: "cursor-pointer",
							onClick: () => setSel(n.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								r: active ? 11 : 8,
								fill,
								opacity: active ? 1 : .85
							}), n.kind !== "port" || active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
								y: 22,
								textAnchor: "middle",
								fill: "var(--color-muted)",
								fontSize: "9",
								fontFamily: "IBM Plex Mono, ui-monospace, monospace",
								children: n.label.length > 18 ? `${n.label.slice(0, 16)}…` : n.label
							}) : null]
						}, n.id);
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
			className: "rounded-xl border border-border bg-elevated p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] uppercase tracking-[0.14em] text-subtle",
					children: "Node"
				}),
				selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-mono text-sm text-fg break-all",
							children: selected.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs uppercase tracking-wider text-muted",
							children: selected.kind
						}),
						selected.detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: selected.detail
						}) : null,
						typeof selected.risk === "number" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted",
							children: ["Relative exposure ", Math.round(selected.risk * 100)]
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-subtle",
							children: [
								graph.edges.filter((e) => e.source === selected.id || e.target === selected.id).length,
								" ",
								"links"
							]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm text-muted",
					children: "Select a node."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-6 space-y-1 text-[11px] text-subtle",
					children: Object.entries(KIND_COLOR).map(([k, c]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "size-2 rounded-full",
							style: { background: c }
						}), k]
					}, k))
				})
			]
		})]
	});
}
function OverviewPanel({ inv }) {
	const ok = inv.sources.filter((s) => s.ok).length;
	const fail = inv.sources.length - ok;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						tone: "accent",
						children: inv.kind
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						tone: "ok",
						children: [ok, " sources live"]
					}),
					fail ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						tone: "warn",
						children: [fail, " silent"]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, { children: shortDate(inv.collectedAt) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						tone: inv.lattice.confidence === "high" ? "ok" : inv.lattice.confidence === "medium" ? "warn" : "neutral",
						children: [
							"Lattice ",
							inv.lattice.leading,
							" / ",
							inv.lattice.confidence
						]
					})
				]
			}),
			inv.disagreements.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-xl border border-warn/30 bg-elevated p-4 text-sm text-warn",
				children: inv.disagreements.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: d }, d))
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "grid gap-3 sm:grid-cols-2",
				children: inv.facts.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-elevated p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-[11px] uppercase tracking-[0.14em] text-subtle",
							children: f.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "mt-1 break-words font-mono text-sm text-fg",
							children: f.value
						}),
						f.hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs text-muted",
							children: f.hint
						}) : null,
						f.tone && f.tone !== "neutral" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								tone: f.tone,
								children: f.tone
							})
						}) : null
					]
				}, f.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] uppercase tracking-[0.14em] text-subtle",
				children: "Collector health"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
				children: inv.sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: s.ok ? "text-fg" : "text-muted",
						children: s.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "tabular font-mono text-subtle",
						children: s.ok ? elapsed(s.ms) : s.error || "fail"
					})]
				}, s.id))
			})] })
		]
	});
}
function TimelinePanel({ inv }) {
	if (!inv.timeline.length) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "No Certificate Transparency or archive timestamps returned for this indicator."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "relative space-y-0 border-l border-border pl-6",
		children: inv.timeline.map((ev, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "relative pb-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute -left-[25px] top-1 size-2 rounded-full bg-accent" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-mono text-xs text-subtle",
					children: [
						ev.at.length === 14 ? `${ev.at.slice(0, 4)}-${ev.at.slice(4, 6)}-${ev.at.slice(6, 8)}` : ev.at.slice(0, 10),
						" ",
						"· ",
						ev.source
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-fg",
					children: ev.label
				})
			]
		}, `${ev.at}-${i}`))
	});
}
function SourcesPanel({ inv }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-3",
		children: inv.sources.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
			className: "rounded-xl border border-border bg-elevated p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", {
				className: "cursor-pointer text-sm text-fg",
				children: [
					s.name,
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-subtle",
						children: [
							s.ok ? "ok" : s.error,
							" · ",
							elapsed(s.ms)
						]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
				className: "mt-3 max-h-64 overflow-auto font-mono text-[11px] leading-relaxed text-muted",
				children: JSON.stringify(s.data ?? { error: s.error }, null, 2)
			})]
		}, s.id))
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var runInvestigation = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("9140bb570b4706572531f7338b689559311ea0b012eeee9e3746146585859fb4"));
var runGrokLattice = createServerFn({ method: "POST" }).validator((input) => input).handler(createSsrRpc("3eb63f89666fc689055134b5f4f1694f4d6fbfdbe94bcad7ffaacf23e477616d"));
var useOsintStore = create()(persist((set, get) => ({
	current: null,
	history: [],
	watchlist: [],
	ethicsAccepted: false,
	setCurrent: (inv) => set({ current: inv }),
	remember: (inv) => {
		set({
			current: inv,
			history: [inv, ...get().history.filter((h) => h.query !== inv.query)].slice(0, 16)
		});
	},
	acceptEthics: () => set({ ethicsAccepted: true }),
	addWatch: (query, note = "") => {
		const q = query.trim();
		if (!q) return;
		if (get().watchlist.some((w) => w.query === q)) return;
		set({ watchlist: [{
			query: q,
			note,
			added: (/* @__PURE__ */ new Date()).toISOString()
		}, ...get().watchlist].slice(0, 40) });
	},
	removeWatch: (query) => set({ watchlist: get().watchlist.filter((w) => w.query !== query) }),
	clearHistory: () => set({ history: [] })
}), {
	name: "omnitrace-v1",
	partialize: (s) => ({
		history: s.history.map((h) => ({
			...h,
			sources: h.sources.map((src) => ({
				...src,
				data: void 0
			}))
		})),
		watchlist: s.watchlist,
		ethicsAccepted: s.ethicsAccepted
	})
}));
var TABS = [
	{
		id: "overview",
		label: "Overview"
	},
	{
		id: "lattice",
		label: "Hypothesis Lattice"
	},
	{
		id: "prism",
		label: "Prism"
	},
	{
		id: "timeline",
		label: "Temporal"
	},
	{
		id: "sources",
		label: "Sources"
	}
];
function Home() {
	const { current, history, watchlist, ethicsAccepted, remember, setCurrent, acceptEthics, addWatch, removeWatch } = useOsintStore();
	const [query, setQuery] = (0, import_react.useState)("");
	const [tab, setTab] = (0, import_react.useState)("overview");
	const [error, setError] = (0, import_react.useState)(null);
	const investigate = useMutation({
		mutationFn: async (q) => runInvestigation({ data: { query: q } }),
		onSuccess: (inv) => {
			remember(inv);
			setTab("lattice");
			setError(null);
		},
		onError: (e) => setError(e instanceof Error ? e.message : "Investigation failed")
	});
	const upgrade = useMutation({
		mutationFn: async () => {
			if (!current) throw new Error("No investigation");
			return runGrokLattice({ data: { investigation: current } });
		},
		onSuccess: (lattice) => {
			if (!current) return;
			remember({
				...current,
				grokLattice: lattice,
				lattice
			});
		},
		onError: (e) => setError(e instanceof Error ? e.message : "Grok lattice failed")
	});
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				document.getElementById("omni-q")?.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	const watching = (0, import_react.useMemo)(() => current && watchlist.some((w) => w.query === current.query), [current, watchlist]);
	function submit(q) {
		const v = q.trim();
		if (!v || investigate.isPending) return;
		setQuery(v);
		investigate.mutate(v);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-bg text-fg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grid-veil pointer-events-none fixed inset-0 opacity-60" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "flex flex-wrap items-center justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex size-10 items-center justify-center rounded-xl border border-border bg-elevated",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, { className: "size-5 text-accent" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-medium tracking-tight",
								children: "OmniTrace"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] uppercase tracking-[0.16em] text-subtle",
								children: "Public-source intelligence"
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 text-xs text-muted",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "size-3.5" }), "Infrastructure only · no private targeting"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-8 flex flex-col gap-3 sm:flex-row",
						onSubmit: (e) => {
							e.preventDefault();
							submit(query);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "omni-q",
							value: query,
							onChange: (e) => setQuery(e.target.value),
							placeholder: "IP, domain, ASN, URL, hash, or public username",
							autoComplete: "off",
							spellCheck: false,
							className: "font-mono"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: investigate.isPending,
							className: "sm:w-40",
							children: investigate.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }), "Fusing"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Radar, { className: "size-4" }), "Investigate"] })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-subtle",
						children: "Ctrl/Cmd+K to focus · RDAP, CT, DNS, InternetDB, OTX, BGP, archives"
					}),
					error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 rounded-xl border border-danger/30 bg-elevated px-4 py-3 text-sm text-danger",
						children: error
					}) : null,
					!current && !investigate.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { onPick: submit }) : null,
					investigate.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
						children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-24 animate-pulse rounded-xl border border-border bg-elevated" }, i))
					}) : null,
					current && !investigate.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-8 grid gap-6 lg:grid-cols-[220px_1fr]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
							className: "hidden lg:block",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] uppercase tracking-[0.14em] text-subtle",
									children: "Cases"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-3 space-y-1",
									children: history.slice(0, 12).map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setCurrent(h);
											setQuery(h.query);
										},
										className: cn("w-full rounded-lg px-3 py-2 text-left font-mono text-xs", current.query === h.query ? "bg-elevated text-fg" : "text-muted hover:bg-surface"),
										children: h.query
									}) }, h.id))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-8 text-[11px] uppercase tracking-[0.14em] text-subtle",
									children: "Watchlist"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
									className: "mt-3 space-y-1",
									children: watchlist.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
										className: "text-xs text-subtle",
										children: "Empty"
									}) : watchlist.map((w) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "flex-1 truncate rounded-lg px-2 py-2 text-left font-mono text-xs text-muted hover:bg-surface",
											onClick: () => submit(w.query),
											children: w.query
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											className: "size-11 text-subtle hover:text-fg",
											onClick: () => removeWatch(w.query),
											"aria-label": "Remove watch",
											children: "×"
										})]
									}, w.query))
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "font-mono text-xl tracking-tight sm:text-2xl",
									children: current.query
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "mt-1 text-xs text-muted",
									children: [
										current.kind,
										" · ",
										current.graph.nodes.length,
										" entities ·",
										" ",
										current.sources.filter((s) => s.ok).length,
										"/",
										current.sources.length,
										" collectors"
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "secondary",
										size: "sm",
										onClick: () => watching ? removeWatch(current.query) : addWatch(current.query),
										children: [watching ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookmarkCheck, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: "size-4" }), watching ? "Watching" : "Watch"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "secondary",
										size: "sm",
										onClick: () => window.print(),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "size-4" }), "Brief"]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-5 flex gap-1 overflow-x-auto border-b border-border pb-px",
								children: TABS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setTab(t.id),
									className: cn("h-11 shrink-0 px-3 text-sm", tab === t.id ? "border-b-2 border-accent text-fg" : "text-muted hover:text-fg"),
									children: t.label
								}, t.id))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-6",
								children: [
									tab === "overview" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OverviewPanel, { inv: current }) : null,
									tab === "lattice" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LatticeBoard, {
										lattice: current.lattice,
										onUpgrade: () => upgrade.mutate(),
										upgrading: upgrade.isPending
									}) : null,
									tab === "prism" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrismGraph, { graph: current.graph }) : null,
									tab === "timeline" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelinePanel, { inv: current }) : null,
									tab === "sources" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SourcesPanel, { inv: current }) : null
								]
							})
						] })]
					}) : null
				]
			}),
			!ethicsAccepted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-4 sm:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] uppercase tracking-[0.16em] text-subtle",
							children: "Operating rules"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-2 text-lg font-medium",
							children: "Public infrastructure only"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm leading-relaxed text-muted",
							children: "OmniTrace queries public internet records: RDAP, DNS, Certificate Transparency, Shodan InternetDB, AlienVault OTX, BGP, urlscan, and the Wayback Machine. It is for defensive security, journalism, and research. Do not use it to target private individuals."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							className: "mt-6 w-full",
							onClick: acceptEthics,
							children: "Acknowledge"
						})
					]
				})
			}) : null
		]
	});
}
function EmptyState({ onPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-14 max-w-3xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
				tone: "accent",
				children: "First of its class"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-4 text-3xl font-medium tracking-tight sm:text-4xl",
				children: "Hypothesis Lattice"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 max-w-2xl text-base leading-relaxed text-muted",
				children: "Other tools dump records. OmniTrace fuses public collectors in parallel, then runs Heuer's Analysis of Competing Hypotheses — a CIA-grade method almost no commercial OSINT product implements as a first-class surface. Each hypothesis is scored against evidence, with residual uncertainty left visible."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8 grid gap-3 sm:grid-cols-3",
				children: [
					{
						icon: Radar,
						t: "Signal fusion",
						d: "DNS, RDAP, CT, InternetDB, OTX, BGP, archives — one packet."
					},
					{
						icon: Activity,
						t: "ACH lattice",
						d: "Competing hypotheses, posteriors, and an evidence matrix."
					},
					{
						icon: Crosshair,
						t: "Prism graph",
						d: "Entities on concentric hops — infrastructure, not persons."
					}
				].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-xl border border-border bg-elevated p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(c.icon, { className: "size-4 text-accent" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm font-medium",
							children: c.t
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs leading-relaxed text-muted",
							children: c.d
						})
					]
				}, c.t))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-10 text-[11px] uppercase tracking-[0.14em] text-subtle",
				children: "Try a public indicator"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: EXAMPLE_QUERIES.map((ex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => onPick(ex.q),
					className: "h-11 rounded-full border border-border bg-elevated px-4 font-mono text-xs text-fg hover:bg-surface",
					children: [ex.q, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "ml-2 text-subtle",
						children: ex.label
					})]
				}, ex.q))
			})
		]
	});
}
//#endregion
export { Home as component };
