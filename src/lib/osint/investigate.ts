import { createServerFn } from "@tanstack/react-start";
import type { Investigation, LatticeResult } from "./types";

export const runInvestigation = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => input)
  .handler(async ({ data }): Promise<Investigation> => {
    const q = data.query.trim().slice(0, 200);
    if (!q) throw new Error("Query required");
    const { collectInvestigation } = await import("./collect.server");
    return collectInvestigation(q);
  });

export const runGrokLattice = createServerFn({ method: "POST" })
  .validator((input: { investigation: Investigation }) => input)
  .handler(async ({ data }): Promise<LatticeResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error("Grok lattice is unavailable in this environment");
    }

    const inv = data.investigation;
    const compact = {
      query: inv.query,
      kind: inv.kind,
      facts: inv.facts.map((f) => ({
        label: f.label,
        value: f.value,
        tone: f.tone,
      })),
      nodes: inv.graph.nodes.map((n) => ({
        kind: n.kind,
        label: n.label,
        detail: n.detail,
      })),
      sourceHealth: inv.sources.map((s) => ({
        id: s.id,
        ok: s.ok,
        error: s.error,
      })),
      disagreements: inv.disagreements,
      heuristic: {
        leading: inv.lattice.leading,
        confidence: inv.lattice.confidence,
        hypotheses: inv.lattice.hypotheses.map((h) => ({
          id: h.id,
          title: h.title,
          posterior: Number(h.posterior.toFixed(3)),
        })),
      },
    };

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content:
              "You are a defensive intelligence analyst applying Heuer's Analysis of Competing Hypotheses to PUBLIC infrastructure records only. Never deanonymize private people. Never invent sources. Return ONLY compact JSON.",
          },
          {
            role: "user",
            content: `Build an ACH lattice for this public-source packet. JSON schema:
{"engine":"grok","leading":"H1","confidence":"low|medium|high","briefing":"160-220 words, cautious, no conviction language","watch":["..."],"hypotheses":[{"id":"H1","title":"...","statement":"...","prior":0.2,"posterior":0.4,"supports":[{"evidence":"...","note":"..."}],"contradicts":[{"evidence":"...","note":"..."}],"gaps":["..."]}],"matrix":[{"evidence":"...","cells":{"H1":"support|contradict|neutral|na"}}]}
Use 4-5 mutually exclusive hypotheses. Posteriors must sum to 1. Evidence rows must match the packet. Packet:\n${JSON.stringify(compact).slice(0, 9000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`xAI API error ${res.status}`);
    }
    const body = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    const text = body.choices[0]?.message.content ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Lattice model returned no JSON");
    const parsed = JSON.parse(jsonMatch[0]) as LatticeResult;
    parsed.engine = "grok";
    if (!parsed.hypotheses?.length) throw new Error("Empty lattice");
    const sum = parsed.hypotheses.reduce((s, h) => s + (h.posterior || 0), 0) || 1;
    parsed.hypotheses = parsed.hypotheses.map((h) => ({
      ...h,
      posterior: h.posterior / sum,
      supports: h.supports || [],
      contradicts: h.contradicts || [],
      gaps: h.gaps || [],
    }));
    parsed.matrix = parsed.matrix || [];
    parsed.watch = parsed.watch || [];
    return parsed;
  });
