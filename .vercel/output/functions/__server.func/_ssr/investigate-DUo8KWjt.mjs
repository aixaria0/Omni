import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/investigate-DUo8KWjt.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var runInvestigation_createServerFn_handler = createServerRpc({
	id: "9140bb570b4706572531f7338b689559311ea0b012eeee9e3746146585859fb4",
	name: "runInvestigation",
	filename: "src/lib/osint/investigate.ts"
}, (opts) => runInvestigation.__executeServer(opts));
var runInvestigation = createServerFn({ method: "POST" }).validator((input) => input).handler(runInvestigation_createServerFn_handler, async ({ data }) => {
	const q = data.query.trim().slice(0, 200);
	if (!q) throw new Error("Query required");
	const { collectInvestigation } = await import("./collect.server-BwkeJLqV.mjs");
	return collectInvestigation(q);
});
var runGrokLattice_createServerFn_handler = createServerRpc({
	id: "3eb63f89666fc689055134b5f4f1694f4d6fbfdbe94bcad7ffaacf23e477616d",
	name: "runGrokLattice",
	filename: "src/lib/osint/investigate.ts"
}, (opts) => runGrokLattice.__executeServer(opts));
var runGrokLattice = createServerFn({ method: "POST" }).validator((input) => input).handler(runGrokLattice_createServerFn_handler, async ({ data }) => {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) throw new Error("Grok lattice is unavailable in this environment");
	const inv = data.investigation;
	const compact = {
		query: inv.query,
		kind: inv.kind,
		facts: inv.facts.map((f) => ({
			label: f.label,
			value: f.value,
			tone: f.tone
		})),
		nodes: inv.graph.nodes.map((n) => ({
			kind: n.kind,
			label: n.label,
			detail: n.detail
		})),
		sourceHealth: inv.sources.map((s) => ({
			id: s.id,
			ok: s.ok,
			error: s.error
		})),
		disagreements: inv.disagreements,
		heuristic: {
			leading: inv.lattice.leading,
			confidence: inv.lattice.confidence,
			hypotheses: inv.lattice.hypotheses.map((h) => ({
				id: h.id,
				title: h.title,
				posterior: Number(h.posterior.toFixed(3))
			}))
		}
	};
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			temperature: .2,
			max_tokens: 1800,
			messages: [{
				role: "system",
				content: "You are a defensive intelligence analyst applying Heuer's Analysis of Competing Hypotheses to PUBLIC infrastructure records only. Never deanonymize private people. Never invent sources. Return ONLY compact JSON."
			}, {
				role: "user",
				content: `Build an ACH lattice for this public-source packet. JSON schema:
{"engine":"grok","leading":"H1","confidence":"low|medium|high","briefing":"160-220 words, cautious, no conviction language","watch":["..."],"hypotheses":[{"id":"H1","title":"...","statement":"...","prior":0.2,"posterior":0.4,"supports":[{"evidence":"...","note":"..."}],"contradicts":[{"evidence":"...","note":"..."}],"gaps":["..."]}],"matrix":[{"evidence":"...","cells":{"H1":"support|contradict|neutral|na"}}]}
Use 4-5 mutually exclusive hypotheses. Posteriors must sum to 1. Evidence rows must match the packet. Packet:\n${JSON.stringify(compact).slice(0, 9e3)}`
			}]
		})
	});
	if (!res.ok) throw new Error(`xAI API error ${res.status}`);
	const jsonMatch = ((await res.json()).choices[0]?.message.content ?? "").match(/\{[\s\S]*\}/);
	if (!jsonMatch) throw new Error("Lattice model returned no JSON");
	const parsed = JSON.parse(jsonMatch[0]);
	parsed.engine = "grok";
	if (!parsed.hypotheses?.length) throw new Error("Empty lattice");
	const sum = parsed.hypotheses.reduce((s, h) => s + (h.posterior || 0), 0) || 1;
	parsed.hypotheses = parsed.hypotheses.map((h) => ({
		...h,
		posterior: h.posterior / sum,
		supports: h.supports || [],
		contradicts: h.contradicts || [],
		gaps: h.gaps || []
	}));
	parsed.matrix = parsed.matrix || [];
	parsed.watch = parsed.watch || [];
	return parsed;
});
//#endregion
export { runGrokLattice_createServerFn_handler, runInvestigation_createServerFn_handler };
