import { useMemo, useState } from "react";
import type { GraphModel, GraphNode } from "@/lib/osint/types";


const KIND_COLOR: Record<GraphNode["kind"], string> = {
  query: "var(--color-accent)",
  ip: "#8aa4c4",
  domain: "#a8b4c4",
  asn: "#7d9b86",
  org: "#c4a35a",
  cert: "#9aa3b5",
  port: "#c45c4a",
  host: "#8b93a1",
  hash: "#c45c4a",
  geo: "#7d9b86",
};

export function PrismGraph({ graph }: { graph: GraphModel }) {
  const [sel, setSel] = useState<string | null>("query");
  const { pos, w, h } = useMemo(() => {
    const w = 720;
    const h = 460;
    const cx = w / 2;
    const cy = h / 2;
    const byHop = new Map<number, GraphNode[]>();
    for (const n of graph.nodes) {
      const hop = n.hop ?? 1;
      byHop.set(hop, [...(byHop.get(hop) ?? []), n]);
    }
    const pos = new Map<string, { x: number; y: number }>();
    for (const [hop, list] of byHop) {
      const r = hop === 0 ? 0 : 70 + hop * 78;
      list.forEach((n, i) => {
        const a = (Math.PI * 2 * i) / Math.max(list.length, 1) - Math.PI / 2;
        pos.set(n.id, {
          x: cx + r * Math.cos(a),
          y: cy + r * Math.sin(a),
        });
      });
    }
    return { pos, w, h };
  }, [graph]);

  const selected = graph.nodes.find((n) => n.id === sel);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
      <div className="overflow-hidden rounded-xl border border-border bg-bg">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-[320px] w-full sm:h-[420px]"
          role="img"
          aria-label="Entity prism graph"
        >
          {[1, 2, 3].map((ring) => (
            <circle
              key={ring}
              cx={w / 2}
              cy={h / 2}
              r={70 + ring * 78}
              fill="none"
              stroke="var(--color-border)"
              strokeDasharray="2 6"
            />
          ))}
          {graph.edges.map((e) => {
            const a = pos.get(e.source);
            const b = pos.get(e.target);
            if (!a || !b) return null;
            const hot = e.source === sel || e.target === sel;
            return (
              <line
                key={e.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={hot ? "var(--color-accent)" : "var(--color-border)"}
                strokeWidth={hot ? 1.4 : 1}
                opacity={hot ? 0.9 : 0.55}
              />
            );
          })}
          {graph.nodes.map((n) => {
            const p = pos.get(n.id);
            if (!p) return null;
            const active = n.id === sel;
            const fill = KIND_COLOR[n.kind];
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                className="cursor-pointer"
                onClick={() => setSel(n.id)}
              >
                <circle
                  r={active ? 11 : 8}
                  fill={fill}
                  opacity={active ? 1 : 0.85}
                />
                {n.kind !== "port" || active ? (
                  <text
                    y={22}
                    textAnchor="middle"
                    fill="var(--color-muted)"
                    fontSize="9"
                    fontFamily="IBM Plex Mono, ui-monospace, monospace"
                  >
                    {n.label.length > 18 ? `${n.label.slice(0, 16)}…` : n.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <aside className="rounded-xl border border-border bg-elevated p-4">
        <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">
          Node
        </p>
        {selected ? (
          <div className="mt-3 space-y-2">
            <p className="font-mono text-sm text-fg break-all">{selected.label}</p>
            <p className="text-xs uppercase tracking-wider text-muted">
              {selected.kind}
            </p>
            {selected.detail ? (
              <p className="text-sm text-muted">{selected.detail}</p>
            ) : null}
            {typeof selected.risk === "number" ? (
              <p className="text-xs text-muted">
                Relative exposure {Math.round(selected.risk * 100)}
              </p>
            ) : null}
            <p className="text-xs text-subtle">
              {graph.edges.filter((e) => e.source === selected.id || e.target === selected.id).length}{" "}
              links
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Select a node.</p>
        )}
        <ul className="mt-6 space-y-1 text-[11px] text-subtle">
          {Object.entries(KIND_COLOR).map(([k, c]) => (
            <li key={k} className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: c }}
              />
              {k}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

