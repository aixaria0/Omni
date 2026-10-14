import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [search, setSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState(false);
  const neighbors = new Set(
    graph.edges
      .filter((e) => e.source === sel || e.target === sel)
      .flatMap((e) => [e.source, e.target]),
  );
  const visible = new Set(
    graph.nodes
      .filter(
        (node) =>
          (!focus || node.id === sel || neighbors.has(node.id)) &&
          (!search ||
            `${node.label} ${node.kind} ${node.detail ?? ""}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      )
      .map((node) => node.id),
  );
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
      const maxHop = Math.max(1, ...byHop.keys());
      const r = hop === 0 ? 0 : (hop / maxHop) * 190;
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
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <input
            aria-label="Search graph nodes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a node…"
            className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
          />
          <Button
            variant="secondary"
            size="icon"
            aria-label="Zoom out"
            disabled={zoom <= 1}
            onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          >
            −
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Zoom in"
            disabled={zoom >= 4}
            onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
          >
            +
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setZoom(1);
              setSearch("");
              setFocus(false);
            }}
          >
            Reset view
          </Button>
          <Button
            variant={focus ? "default" : "secondary"}
            aria-pressed={focus}
            onClick={() => setFocus((v) => !v)}
          >
            Neighborhood
          </Button>
          <span className="font-mono text-xs text-muted">
            {visible.size}/{graph.nodes.length} nodes · {zoom}×
          </span>
        </div>
        <svg
          viewBox={`${(zoom > 1 ? (pos.get(sel ?? "")?.x ?? w / 2) : w / 2) - w / (2 * zoom)} ${(zoom > 1 ? (pos.get(sel ?? "")?.y ?? h / 2) : h / 2) - h / (2 * zoom)} ${w / zoom} ${h / zoom}`}
          className="h-[320px] w-full sm:h-[420px]"
          role="group"
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
            if (!a || !b || !visible.has(e.source) || !visible.has(e.target)) return null;
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
            if (!p || !visible.has(n.id)) return null;
            const active = n.id === sel;
            const fill = KIND_COLOR[n.kind];
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`${n.label}, ${n.kind}`}
                aria-pressed={active}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSel(n.id);
                  }
                }}
                onClick={() => setSel(n.id)}
              >
                <circle r={22} fill="transparent" />
                <circle r={active ? 11 : 8} fill={fill} opacity={active ? 1 : 0.85} />
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
        <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Node</p>
        {selected ? (
          <div className="mt-3 space-y-2">
            <p className="font-mono text-sm text-fg break-all">{selected.label}</p>
            <p className="text-xs uppercase tracking-wider text-muted">{selected.kind}</p>
            {selected.detail ? <p className="text-sm text-muted">{selected.detail}</p> : null}
            {typeof selected.risk === "number" ? (
              <p className="text-xs text-muted">
                Relative exposure {Math.round(selected.risk * 100)}
              </p>
            ) : null}
            <p className="text-xs text-subtle">
              {
                graph.edges.filter((e) => e.source === selected.id || e.target === selected.id)
                  .length
              }{" "}
              links
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Select a node.</p>
        )}
        {selected && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted">Connected entities</p>
            {graph.edges
              .filter((edge) => edge.source === selected.id || edge.target === selected.id)
              .map((edge) => {
                const other = graph.nodes.find(
                  (node) => node.id === (edge.source === selected.id ? edge.target : edge.source),
                );
                return other ? (
                  <button
                    key={edge.id}
                    className="block min-h-11 w-full break-all rounded-lg border border-border p-2 text-left text-xs hover:border-accent"
                    onClick={() => setSel(other.id)}
                  >
                    <span className="block text-subtle">{edge.rel}</span>
                    {other.label}
                  </button>
                ) : null;
              })}
          </div>
        )}
        <ul className="mt-6 space-y-1 text-[11px] text-subtle">
          {Object.entries(KIND_COLOR).map(([k, c]) => (
            <li key={k} className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: c }} />
              {k}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
