import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  FlaskConical,
  Gauge,
  GitBranch,
  SearchCheck,
  ShieldAlert,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildStressReport, simulateEvidenceRemoval } from "@/lib/osint/stress";
import type { Investigation } from "@/lib/osint/types";

export function StressLab({ inv }: { inv: Investigation }) {
  const report = useMemo(() => buildStressReport(inv), [inv]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const sandbox = useMemo(
    () => simulateEvidenceRemoval(inv.lattice, excluded),
    [inv.lattice, excluded],
  );
  const hypothesis = new Map(inv.lattice.hypotheses.map((item) => [item.id, item]));
  const leader = hypothesis.get(report.baseline.leader);
  const runner = report.baseline.runnerUp ? hypothesis.get(report.baseline.runnerUp) : null;

  if (!inv.lattice.matrix.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/60 p-8 text-center">
        <FlaskConical className="mx-auto size-7 text-accent" />
        <h2 className="mt-4 text-lg font-medium">No evidence matrix to stress-test</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted">
          Stress Lab needs evidence-to-hypothesis cells. Build or upgrade the Hypothesis Lattice
          first; Omni will then test how easily the current conclusion can be overturned.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <FlaskConical className="size-4 text-accent" />
              <h2 className="text-sm font-medium">Evidence Stress Engine</h2>
              <GradeBadge grade={report.grade} />
              <Badge tone="neutral">{report.engine}</Badge>
            </div>
            <h3 className="mt-4 text-2xl font-medium tracking-tight">
              What would change the conclusion?
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
              Omni removes evidence and entire source families, recomputes the decision boundary,
              searches for the smallest flip set, and ranks the next collection step by expected
              ability to separate the closest hypotheses. This measures decision robustness — not
              truth.
            </p>
          </div>
          <div className="flex min-w-40 flex-col items-center rounded-2xl border border-border bg-elevated p-5">
            <Gauge className="size-5 text-accent" />
            <span className="mt-2 font-mono text-4xl font-medium tabular text-fg">
              {report.stabilityScore}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-subtle">
              stability / 100
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={Target}
            label="Decision margin"
            value={`${(report.baseline.margin * 100).toFixed(1)} pp`}
            detail={`${report.baseline.leader}${report.baseline.runnerUp ? ` vs ${report.baseline.runnerUp}` : ""}`}
          />
          <Metric
            icon={Activity}
            label="Entropy"
            value={`${report.baseline.entropy.toFixed(3)} bits`}
            detail="Residual hypothesis uncertainty"
          />
          <Metric
            icon={GitBranch}
            label="Minimal flip"
            value={
              report.minimalFlipSet
                ? `${report.minimalFlipSet.evidence.length} row${report.minimalFlipSet.evidence.length === 1 ? "" : "s"}`
                : `>${4} rows`
            }
            detail={
              report.minimalFlipSet
                ? `→ ${report.minimalFlipSet.leaderAfterRemoval}`
                : "No flip found in bounded search"
            }
          />
          <Metric
            icon={ShieldAlert}
            label="Source concentration"
            value={
              report.dominantSource
                ? `${Math.round(report.dominantSource.leverageShare * 100)}%`
                : "0%"
            }
            detail={report.dominantSource?.sourceName ?? "No dominant source"}
          />
        </div>
      </section>

      {report.warnings.length ? (
        <section className="space-y-2">
          {report.warnings.map((warning) => (
            <div
              key={warning}
              className="flex gap-3 rounded-xl border border-warn/25 bg-warn/5 p-4 text-xs leading-relaxed text-muted"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <span>{warning}</span>
            </div>
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-ok/25 bg-ok/5 p-4 text-xs text-muted">
          No single-point or source-knockout decision failure was found within the current matrix.
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-accent" />
            <h2 className="text-sm font-medium">Decision boundary</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <HypothesisCard
              label="Leader"
              id={report.baseline.leader}
              title={leader?.title ?? report.baseline.leader}
              posterior={leader?.posterior ?? 0}
              tone="accent"
            />
            {runner ? (
              <HypothesisCard
                label="Closest rival"
                id={runner.id}
                title={runner.title}
                posterior={runner.posterior}
                tone="warn"
              />
            ) : null}
          </div>

          <div className="mt-5 rounded-xl border border-border bg-elevated p-4">
            <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">
              Smallest observed path to a different answer
            </p>
            {report.minimalFlipSet ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {report.minimalFlipSet.evidence.map((item) => (
                    <Badge key={item} tone="warn">
                      remove {item}
                    </Badge>
                  ))}
                  <span className="text-xs text-subtle">→</span>
                  <Badge tone="danger">{report.minimalFlipSet.leaderAfterRemoval} leads</Badge>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  After this removal, the current leader's signed margin becomes{" "}
                  {(report.minimalFlipSet.signedMarginAfterRemoval * 100).toFixed(1)} percentage
                  points. Negative means a rival has crossed the decision boundary.
                </p>
              </>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                No alternative leader emerged while exhaustively removing combinations up to four
                rows from the highest-leverage evidence set.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <SearchCheck className="size-4 text-accent" />
            <h2 className="text-sm font-medium">Next-best collection</h2>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Highest-value steps for reducing ambiguity between the current leader and closest rival.
          </p>
          <ol className="mt-4 space-y-2">
            {report.collectionPriorities.slice(0, 6).map((item, index) => (
              <li key={item.id} className="rounded-xl border border-border bg-elevated p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="font-mono text-xs text-accent">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-fg">{item.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">
                        {item.rationale}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular text-subtle">
                    {item.score.toFixed(0)}
                  </span>
                </div>
                {item.estimatedInformationGain !== null ? (
                  <p className="mt-2 pl-8 font-mono text-[10px] text-subtle">
                    estimated ΔH {item.estimatedInformationGain.toFixed(4)} bits
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="size-4 text-accent" />
              <h2 className="text-sm font-medium">Counterfactual Sandbox</h2>
              <Badge tone={sandbox[0]?.id !== report.baseline.leader ? "danger" : "neutral"}>
                {sandbox[0]?.id !== report.baseline.leader
                  ? `leader → ${sandbox[0]?.id}`
                  : `${report.baseline.leader} holds`}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
              Temporarily exclude evidence you distrust and recompute the hypothesis ranking
              locally. Nothing is written back to the case; this is an analyst what-if surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.minimalFlipSet ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setExcluded(report.minimalFlipSet?.evidence ?? [])}
              >
                Apply minimal flip
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              disabled={!excluded.length}
              onClick={() => setExcluded([])}
            >
              Reset
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-2 sm:grid-cols-2">
            {inv.lattice.matrix.map((row) => {
              const off = excluded.includes(row.evidence);
              return (
                <button
                  key={row.evidence}
                  type="button"
                  aria-pressed={off}
                  onClick={() =>
                    setExcluded((current) =>
                      current.includes(row.evidence)
                        ? current.filter((item) => item !== row.evidence)
                        : [...current, row.evidence],
                    )
                  }
                  className={`rounded-xl border p-3 text-left transition ${
                    off
                      ? "border-danger/30 bg-danger/5 text-muted"
                      : "border-border bg-elevated text-fg hover:bg-bg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium">{row.evidence}</span>
                    <span className={`font-mono text-[10px] ${off ? "text-danger" : "text-ok"}`}>
                      {off ? "EXCLUDED" : "ACTIVE"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-elevated p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">Live ranking</p>
              <span className="font-mono text-[10px] text-subtle">
                −{excluded.length} evidence rows
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {sandbox.map((item, index) => {
                const title = hypothesis.get(item.id)?.title ?? item.id;
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className={index === 0 ? "text-fg" : "text-muted"}>
                        {item.id} · {title}
                      </span>
                      <span className="font-mono tabular text-fg">
                        {(item.posterior * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
                      <div
                        className={index === 0 ? "h-full bg-accent" : "h-full bg-muted"}
                        style={{ width: `${Math.max(1, item.posterior * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-accent" />
          <h2 className="text-sm font-medium">Adversarial robustness frontier</h2>
        </div>
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted">
          Worst decision margin Omni can produce when up to k high-leverage evidence rows disappear.
          This is a bounded robustness certificate over the current evidence matrix, not a guarantee
          about unobserved data.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {report.robustnessFrontier.map((point) => {
            const crossed = point.worstSignedMargin < 0;
            return (
              <div
                key={point.removalBudget}
                className={`rounded-xl border p-3 ${crossed ? "border-danger/30 bg-danger/5" : "border-border bg-elevated"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-subtle">
                    budget
                  </span>
                  <span className="font-mono text-xs text-fg">{point.removalBudget}</span>
                </div>
                <p
                  className={`mt-2 font-mono text-lg tabular ${crossed ? "text-danger" : "text-fg"}`}
                >
                  {(point.worstSignedMargin * 100).toFixed(1)} pp
                </p>
                <p className="mt-1 text-[10px] text-subtle">
                  {crossed
                    ? `leader → ${point.leaderAfterRemoval}`
                    : `${report.baseline.leader} survives`}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-accent" />
          <h2 className="text-sm font-medium">Evidence leverage</h2>
        </div>
        <p className="mt-2 text-xs text-muted">
          Leave-one-out influence on the full posterior distribution and current leader margin.
        </p>
        <div className="mt-4 space-y-2">
          {report.evidenceImpacts.map((item) => (
            <div key={item.evidence} className="rounded-xl border border-border bg-elevated p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-medium text-fg">{item.evidence}</p>
                    {item.leaderChanged ? (
                      <Badge tone="danger">flips → {item.counterfactualLeader}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[10px] text-subtle">
                    {item.sourceIds.join(" + ")} · TV shift {(item.posteriorShift * 100).toFixed(1)}
                    % · margin loss {(item.marginLoss * 100).toFixed(1)} pp · Shapley Δmargin{" "}
                    {item.coalitionalContribution >= 0 ? "+" : ""}
                    {(item.coalitionalContribution * 100).toFixed(1)} pp
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.max(2, item.impactScore)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-xs tabular text-fg">
                    {item.impactScore.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-accent" />
          <h2 className="text-sm font-medium">Source knockout</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Removes every evidence row associated with each collector. This exposes hidden correlation
          where several apparently separate facts depend on one upstream source.
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-elevated text-subtle">
              <tr>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Rows</th>
                <th className="px-3 py-2 font-medium">Leverage</th>
                <th className="px-3 py-2 font-medium">Posterior shift</th>
                <th className="px-3 py-2 font-medium">Leader after knockout</th>
              </tr>
            </thead>
            <tbody>
              {report.sourceStress.map((source) => (
                <tr key={source.sourceId} className="border-t border-border">
                  <td className="px-3 py-3 text-fg">{source.sourceName}</td>
                  <td className="px-3 py-3 font-mono text-subtle">{source.evidenceRows.length}</td>
                  <td className="px-3 py-3 font-mono text-subtle">
                    {Math.round(source.leverageShare * 100)}%
                  </td>
                  <td className="px-3 py-3 font-mono text-subtle">
                    {(source.posteriorShift * 100).toFixed(1)}%
                  </td>
                  <td className="px-3 py-3">
                    <Badge tone={source.leaderChanged ? "danger" : "neutral"}>
                      {source.counterfactualLeader}
                      {source.leaderChanged ? " · changed" : ""}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-2xl border border-border bg-surface p-5">
        <summary className="cursor-pointer text-xs font-medium text-muted">
          Inspect stress methodology and bounds
        </summary>
        <ul className="mt-4 space-y-2 text-xs leading-relaxed text-muted">
          {report.methodology.map((item) => (
            <li key={item}>— {item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function GradeBadge({ grade }: { grade: ReturnType<typeof buildStressReport>["grade"] }) {
  const tone =
    grade === "fragile"
      ? "danger"
      : grade === "sensitive"
        ? "warn"
        : grade === "stable"
          ? "accent"
          : "ok";
  return <Badge tone={tone}>{grade}</Badge>;
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-4">
      <div className="flex items-center gap-2 text-subtle">
        <Icon className="size-3.5" />
        <span className="text-[10px] uppercase tracking-[0.12em]">{label}</span>
      </div>
      <p className="mt-2 font-mono text-lg tabular text-fg">{value}</p>
      <p className="mt-1 truncate text-[10px] text-subtle">{detail}</p>
    </div>
  );
}

function HypothesisCard({
  label,
  id,
  title,
  posterior,
  tone,
}: {
  label: string;
  id: string;
  title: string;
  posterior: number;
  tone: "accent" | "warn";
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{label}</p>
        <Badge tone={tone}>{id}</Badge>
      </div>
      <p className="mt-3 text-sm font-medium text-fg">{title}</p>
      <p className="mt-2 font-mono text-2xl tabular text-fg">{(posterior * 100).toFixed(1)}%</p>
    </div>
  );
}
