import type { GraphModel, GraphNode } from "./types";

export type AtlasPoint = { node: GraphNode; x: number; y: number; z: number };
export function layoutAtlas(graph: GraphModel): AtlasPoint[] {
  const ordered = [...graph.nodes].sort(
    (a, b) => a.hop - b.hop || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
  );
  const maxHop = Math.max(1, ...ordered.map((node) => node.hop));
  return ordered.map((node, i) => {
    if (node.hop === 0 || node.kind === "query") return { node, x: 0, y: 0, z: 0 };
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const vertical = 1 - 2 * ((i + 0.5) / Math.max(ordered.length, 1));
    const radial = Math.sqrt(Math.max(0, 1 - vertical * vertical));
    const radius = 0.48 + (node.hop / maxHop) * 0.42;
    return {
      node,
      x: Math.cos(angle) * radial * radius,
      y: vertical * radius,
      z: Math.sin(angle) * radial * radius,
    };
  });
}
export function projectAtlas(
  point: Pick<AtlasPoint, "x" | "y" | "z">,
  yaw: number,
  width: number,
  height: number,
  zoom = 1,
) {
  const x = point.x * Math.cos(yaw) - point.z * Math.sin(yaw);
  const z = point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
  const y = point.y * Math.cos(0.25) - z * Math.sin(0.25);
  const depth = point.y * Math.sin(0.25) + z * Math.cos(0.25);
  const scale = (Math.min(width, height) * 0.39 * zoom) / (1.8 - depth * 0.32);
  return { x: width / 2 + x * scale * 1.8, y: height / 2 + y * scale * 1.8, depth };
}
