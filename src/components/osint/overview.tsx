import type { Investigation } from "@/lib/osint/types";
import { Badge } from "@/components/ui/badge";
import { elapsed, shortDate } from "@/lib/utils";

export function OverviewPanel({ inv }: { inv: Investigation }) {
  const ok = inv.sources.filter((s) => s.ok).length;
  const fail = inv.sources.length - ok;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge tone="accent">{inv.kind}</Badge>
        <Badge tone="ok">{ok} sources live</Badge>
        {fail ? <Badge tone="warn">{fail} silent</Badge> : null}
        <Badge>{shortDate(inv.collectedAt)}</Badge>
        <Badge
          tone={
            inv.lattice.confidence === "high"
              ? "ok"
              : inv.lattice.confidence === "medium"
                ? "warn"
                : "neutral"
          }
        >
          Lattice {inv.lattice.leading} / {inv.lattice.confidence}
        </Badge>
      </div>

      {inv.disagreements.length ? (
        <div className="rounded-xl border border-warn/30 bg-elevated p-4 text-sm text-warn">
          {inv.disagreements.map((d) => (
            <p key={d}>{d}</p>
          ))}
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2">
        {inv.facts.map((f) => (
          <div
            key={f.id}
            className="rounded-xl border border-border bg-elevated p-4"
          >
            <dt className="text-[11px] uppercase tracking-[0.14em] text-subtle">
              {f.label}
            </dt>
            <dd className="mt-1 break-words font-mono text-sm text-fg">
              {f.value}
            </dd>
            {f.hint ? (
              <p className="mt-2 text-xs text-muted">{f.hint}</p>
            ) : null}
            {f.tone && f.tone !== "neutral" ? (
              <div className="mt-2">
                <Badge tone={f.tone}>{f.tone}</Badge>
              </div>
            ) : null}
          </div>
        ))}
      </dl>

      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">
          Collector health
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {inv.sources.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2 text-xs"
            >
              <span className={s.ok ? "text-fg" : "text-muted"}>{s.name}</span>
              <span className="tabular font-mono text-subtle">
                {s.ok ? elapsed(s.ms) : s.error || "fail"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function TimelinePanel({ inv }: { inv: Investigation }) {
  if (!inv.timeline.length) {
    return (
      <p className="text-sm text-muted">
        No Certificate Transparency or archive timestamps returned for this
        indicator.
      </p>
    );
  }
  return (
    <ol className="relative space-y-0 border-l border-border pl-6">
      {inv.timeline.map((ev, i) => (
        <li key={`${ev.at}-${i}`} className="relative pb-6">
          <span className="absolute -left-[25px] top-1 size-2 rounded-full bg-accent" />
          <p className="font-mono text-xs text-subtle">
            {ev.at.length === 14
              ? `${ev.at.slice(0, 4)}-${ev.at.slice(4, 6)}-${ev.at.slice(6, 8)}`
              : ev.at.slice(0, 10)}{" "}
            · {ev.source}
          </p>
          <p className="mt-1 text-sm text-fg">{ev.label}</p>
        </li>
      ))}
    </ol>
  );
}

export function SourcesPanel({ inv }: { inv: Investigation }) {
  return (
    <div className="space-y-3">
      {inv.sources.map((s) => (
        <details
          key={s.id}
          className="rounded-xl border border-border bg-elevated p-4"
        >
          <summary className="cursor-pointer text-sm text-fg">
            {s.name}{" "}
            <span className="text-subtle">
              {s.ok ? "ok" : s.error} · {elapsed(s.ms)}
            </span>
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto font-mono text-[11px] leading-relaxed text-muted">
            {JSON.stringify(s.data ?? { error: s.error }, null, 2)}
          </pre>
        </details>
      ))}
    </div>
  );
}
