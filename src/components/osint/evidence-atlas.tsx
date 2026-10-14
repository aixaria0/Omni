import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Pause, Play, RotateCcw, Search, ZoomIn, ZoomOut } from "lucide-react";
import { layoutAtlas, projectAtlas } from "@/lib/osint/atlas";
import type { GraphModel } from "@/lib/osint/types";

export function EvidenceAtlas({ graph }: { graph: GraphModel }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const yaw = useRef(0.4);
  const hits = useRef<{ id: string; x: number; y: number }[]>([]);
  const drag = useRef<{ x: number; start: number; moved: boolean } | null>(null);
  const [selected, setSelected] = useState(graph.nodes.find((n) => n.kind === "query")?.id ?? "");
  const [playing, setPlaying] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState("");
  const [neighborhood, setNeighborhood] = useState(false);
  const points = useMemo(() => layoutAtlas(graph), [graph]);
  const neighbors = useMemo(
    () =>
      new Set(
        graph.edges
          .filter((e) => e.source === selected || e.target === selected)
          .flatMap((e) => [e.source, e.target]),
      ),
    [graph, selected],
  );
  const visible = useMemo(
    () =>
      points
        .filter(
          ({ node }) =>
            (!neighborhood || node.id === selected || neighbors.has(node.id)) &&
            (!search ||
              `${node.label} ${node.kind} ${node.detail ?? ""}`
                .toLowerCase()
                .includes(search.toLowerCase())),
        )
        .slice(0, 250),
    [points, search, neighborhood, selected, neighbors],
  );
  const selectedNode = graph.nodes.find((n) => n.id === selected);
  const [revision, refresh] = useState(0);
  useEffect(() => {
    const el = canvas.current;
    const parent = host.current;
    if (!el || !parent) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let width = 0,
      height = 0,
      frame = 0,
      last = 0,
      shown = true,
      drawNext = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const styles = getComputedStyle(parent);
    const accent = styles.getPropertyValue("--color-accent").trim() || "#76e8ff";
    const muted = styles.getPropertyValue("--color-muted").trim() || "#92a6b2";
    const fg = styles.getPropertyValue("--color-fg").trim() || "#edf7fb";
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      el.width = width * ratio;
      el.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawNext = true;
    });
    resize.observe(parent);
    const observer = new IntersectionObserver(([entry]) => {
      shown = entry.isIntersecting;
      drawNext = true;
    });
    observer.observe(parent);
    function draw(now: number) {
      frame = requestAnimationFrame(draw);
      const elapsed = Math.min((now - last) / 1000, 0.1);
      if (now - last < 1000 / 30 || !shown || document.hidden || !width || !height) return;
      last = now;
      const animating = playing && !reduced.matches && !drag.current;
      if (!animating && !drawNext) return;
      drawNext = false;
      if (animating) yaw.current += elapsed * 0.09;
      ctx!.clearRect(0, 0, width, height);
      // Spatial reference rings: decorative coordinates, not additional evidence.
      ctx!.strokeStyle = accent;
      ctx!.lineWidth = 0.6;
      for (const radius of [0.33, 0.57, 0.82]) {
        ctx!.globalAlpha = 0.12;
        ctx!.beginPath();
        ctx!.ellipse(
          width / 2,
          height / 2,
          Math.min(width, height) * radius * 0.55 * zoom,
          Math.min(width, height) * radius * 0.2 * zoom,
          -0.25,
          0,
          Math.PI * 2,
        );
        ctx!.stroke();
      }
      const projected = visible
        .map((point) => ({ ...point, ...projectAtlas(point, yaw.current, width, height, zoom) }))
        .sort((a, b) => a.depth - b.depth);
      const byId = new Map(projected.map((point) => [point.node.id, point]));
      for (const edge of graph.edges) {
        const a = byId.get(edge.source),
          b = byId.get(edge.target);
        if (!a || !b) continue;
        const hot = edge.source === selected || edge.target === selected;
        ctx!.globalAlpha = hot ? 0.6 : 0.12;
        ctx!.strokeStyle = hot ? accent : muted;
        ctx!.lineWidth = hot ? 1 : 0.6;
        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.stroke();
      }
      hits.current = projected.map((p) => ({ id: p.node.id, x: p.x, y: p.y }));
      for (const point of projected) {
        const active = point.node.id === selected;
        const root = point.node.kind === "query";
        ctx!.globalAlpha = active ? 1 : 0.45 + ((point.depth + 1) / 2) * 0.5;
        ctx!.fillStyle = active || root ? accent : fg;
        if (active || root) {
          ctx!.globalAlpha = 0.08;
          ctx!.beginPath();
          ctx!.arc(point.x, point.y, root ? 30 : 18, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = 0.9;
          ctx!.strokeStyle = accent;
          ctx!.beginPath();
          ctx!.arc(point.x, point.y, root ? 13 : 9, 0, Math.PI * 2);
          ctx!.stroke();
        }
        ctx!.beginPath();
        ctx!.arc(point.x, point.y, root ? 6 : active ? 4 : 2.5, 0, Math.PI * 2);
        ctx!.fill();
        if (active || root || projected.length < 32 || point.depth > 0.35) {
          ctx!.globalAlpha = active || root ? 1 : 0.58;
          ctx!.font = `${active ? 11 : 9}px "IBM Plex Mono", monospace`;
          ctx!.textAlign = "center";
          const label =
            point.node.label.length > 25 ? `${point.node.label.slice(0, 23)}…` : point.node.label;
          ctx!.fillText(label, point.x, point.y + (root ? 29 : 18));
        }
      }
      ctx!.globalAlpha = 1;
    }
    frame = requestAnimationFrame(draw);
    const invalidate = () => {
      drawNext = true;
    };
    el.addEventListener("pointermove", invalidate);
    document.addEventListener("visibilitychange", invalidate);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      el.removeEventListener("pointermove", invalidate);
      document.removeEventListener("visibilitychange", invalidate);
    };
  }, [visible, graph, selected, zoom, playing, revision]);
  function reset() {
    yaw.current = 0.4;
    setZoom(1);
    setSearch("");
    setNeighborhood(false);
    refresh((n) => n + 1);
  }
  return (
    <div className="atlas-wrap">
      <div className="atlas-toolbar">
        <span className="atlas-coordinate">
          RELATIONAL ATLAS <span>/ 3D</span>
        </span>
        <div className="atlas-actions">
          <button
            aria-label={playing ? "Pause rotation" : "Rotate atlas"}
            aria-pressed={playing}
            onClick={() => setPlaying((v) => !v)}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button
            aria-label="Zoom out"
            disabled={zoom <= 0.7}
            onClick={() => setZoom((v) => Math.max(0.7, v - 0.2))}
          >
            <ZoomOut />
          </button>
          <button
            aria-label="Zoom in"
            disabled={zoom >= 2}
            onClick={() => setZoom((v) => Math.min(2, v + 0.2))}
          >
            <ZoomIn />
          </button>
          <button aria-label="Reset atlas" onClick={reset}>
            <RotateCcw />
          </button>
        </div>
      </div>
      <div className="atlas-canvas-host" ref={host}>
        <div className="atlas-crosshair atlas-crosshair-top" />
        <div className="atlas-crosshair atlas-crosshair-bottom" />
        <canvas
          ref={canvas}
          className="atlas-canvas"
          aria-label={`Interactive evidence topology: ${graph.nodes.length} entities. Drag to rotate; use the entity selector below for keyboard access.`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, start: yaw.current, moved: false };
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const delta = e.clientX - drag.current.x;
            if (Math.abs(delta) > 5) drag.current.moved = true;
            yaw.current = drag.current.start + delta * 0.008;
          }}
          onPointerCancel={() => {
            drag.current = null;
            refresh((n) => n + 1);
          }}
          onPointerUp={(e) => {
            const moved = drag.current?.moved;
            drag.current = null;
            if (!moved) {
              const rect = e.currentTarget.getBoundingClientRect();
              const hit = [...hits.current]
                .reverse()
                .find(
                  (p) =>
                    Math.hypot(p.x - (e.clientX - rect.left), p.y - (e.clientY - rect.top)) < 22,
                );
              if (hit) setSelected(hit.id);
            }
            refresh((n) => n + 1);
          }}
        />
        {!graph.nodes.length && (
          <p className="atlas-empty">No entities have been collected in this case.</p>
        )}
        <div className="atlas-corner">
          <span className="signal-dot" />
          {visible.length} / {graph.nodes.length} ENTITIES
        </div>
        <p className="atlas-hint">DRAG TO ROTATE · SELECT TO INSPECT</p>
      </div>
      <div className="atlas-inspector">
        <div className="atlas-node-detail">
          <span className="atlas-node-kind">{selectedNode?.kind ?? "entity"}</span>
          <strong>{selectedNode?.label ?? "Select an entity"}</strong>
          <p>{selectedNode?.detail ?? "Select a connected entity to inspect its relationships."}</p>
        </div>
        <button
          className="atlas-focus"
          aria-pressed={neighborhood}
          onClick={() => setNeighborhood((v) => !v)}
        >
          <Maximize2 />
          {neighborhood ? "Show all" : "Focus links"}
        </button>
      </div>
      <div className="atlas-selector">
        <label>
          <Search />
          <input
            aria-label="Find atlas entity"
            placeholder="Find an entity"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Select atlas entity"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select entity</option>
          {graph.nodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.kind} · {node.label}
            </option>
          ))}
        </select>
      </div>
      <p className="atlas-disclosure">
        Topology reflects recorded relationships. Spatial placement and rotation do not represent
        location or live traffic. At most 250 nodes are drawn; the selector includes every entity.
      </p>
    </div>
  );
}
