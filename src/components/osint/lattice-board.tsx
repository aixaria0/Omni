import type { LatticeResult } from "@/lib/osint/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CELL: Record<string, string> = {
  support: "+",
  contradict: "−",
  neutral: "o",
  na: "·",
};

export function LatticeBoard({
  lattice,
  onUpgrade,
  upgrading,
}: {
  lattice: LatticeResult;
  onUpgrade?: () => void;
  upgrading?: boolean;
}) {
  const lead = lattice.hypotheses.find((h) => h.id === lattice.leading);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={lattice.engine === "grok" ? "accent" : "neutral"}>
            {lattice.engine === "grok" ? "Grok ACH" : "Heuristic ACH"}
          </Badge>
          <Badge
            tone={
              lattice.confidence === "high"
                ? "ok"
                : lattice.confidence === "medium"
                  ? "warn"
                  : "neutral"
            }
          >
            {lattice.confidence} confidence
          </Badge>
          {lead ? (
            <span className="text-sm text-muted">
              Leading {lead.id} · {(lead.posterior * 100).toFixed(0)}%
            </span>
          ) : null}
        </div>
        {onUpgrade ? (
          <button
            type="button"
            onClick={onUpgrade}
            disabled={upgrading}
            className="h-11 rounded-lg border border-border bg-elevated px-4 text-sm text-fg hover:bg-surface disabled:opacity-40"
          >
            {upgrading ? "Scoring with Grok…" : "Upgrade with Grok"}
          </button>
        ) : null}
      </div>

      <p className="max-w-3xl text-sm leading-relaxed text-muted">
        {lattice.briefing}
      </p>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lattice.hypotheses.map((h) => {
          const isLead = h.id === lattice.leading;
          return (
            <article
              key={h.id}
              className={cn(
                "rounded-xl border bg-elevated p-4",
                isLead ? "border-accent/40" : "border-border",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-xs text-subtle">{h.id}</p>
                <p className="tabular font-mono text-sm text-fg">
                  {(h.posterior * 100).toFixed(0)}%
                </p>
              </div>
              <h3 className="mt-1 text-sm font-medium text-fg">{h.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {h.statement}
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.round(h.posterior * 100)}%` }}
                />
              </div>
              <p className="mt-3 text-[11px] text-ok">
                + {h.supports.length} supporting
              </p>
              <p className="text-[11px] text-danger">
                − {h.contradicts.length} contradicting
              </p>
            </article>
          );
        })}
      </div>

      {lattice.matrix.length ? (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-elevated text-subtle">
              <tr>
                <th className="px-3 py-2 font-medium">Evidence</th>
                {lattice.hypotheses.map((h) => (
                  <th key={h.id} className="px-3 py-2 font-mono font-medium">
                    {h.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lattice.matrix.map((row) => (
                <tr key={row.evidence} className="border-t border-border">
                  <td className="px-3 py-2 text-muted">{row.evidence}</td>
                  {lattice.hypotheses.map((h) => {
                    const cell = row.cells[h.id] || "na";
                    return (
                      <td
                        key={h.id}
                        className={cn(
                          "px-3 py-2 font-mono",
                          cell === "support" && "text-ok",
                          cell === "contradict" && "text-danger",
                          cell === "neutral" && "text-subtle",
                        )}
                      >
                        {CELL[cell] ?? "·"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {lattice.watch.length ? (
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">
            Collection requirements
          </p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {lattice.watch.map((w) => (
              <li key={w}>— {w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
