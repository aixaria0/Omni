import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Download, GitBranch, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inferEvidenceSources } from "@/lib/osint/stress";
import { evaluateScenario } from "@/lib/osint/scenario";
import type { Investigation } from "@/lib/osint/types";

type Branch = { name: string; retention: Record<string, number> };
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function ScenarioRoom({
  inv,
  controls,
}: {
  inv: Investigation;
  controls?: {
    retention: Record<string, number>;
    setRetention: Dispatch<SetStateAction<Record<string, number>>>;
  };
}) {
  const [localRetention, setLocalRetention] = useState<Record<string, number>>({});
  const retention = controls?.retention ?? localRetention;
  const setRetention = controls?.setRetention ?? setLocalRetention;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const baseline = useMemo(() => evaluateScenario(inv.lattice, {}), [inv.lattice]);
  const result = useMemo(() => evaluateScenario(inv.lattice, retention), [inv.lattice, retention]);
  const title = (id: string) => inv.lattice.hypotheses.find((h) => h.id === id)?.title ?? id;
  const changed = result[0]?.id !== baseline[0]?.id;
  const modified = inv.lattice.matrix.filter((row) => (retention[row.evidence] ?? 1) !== 1).length;
  function exportScenario() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            schema: "omni.scenarios",
            version: 1,
            query: inv.query,
            collectedAt: inv.collectedAt,
            lattice: inv.lattice,
            model: "stress-fractional-removal/v1",
            branches: [{ name: name.trim() || "Working scenario", retention }, ...branches],
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "omni-scenarios.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-accent/25 bg-surface p-5 sm:p-7">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
          <GitBranch className="size-4" /> Scenario room / 01
        </p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Pull a thread. Watch the conclusion move.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Reduce the influence of evidence, preserve alternate branches, and compare the decision
          they produce. Your collected evidence stays intact.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3" aria-live="polite">
          <Metric
            label="Baseline leader"
            value={baseline[0] ? title(baseline[0].id) : "No hypotheses"}
          />
          <Metric
            label={changed ? "Decision boundary crossed" : "Scenario leader"}
            value={result[0] ? title(result[0].id) : "No hypotheses"}
          />
          <Metric
            label="Evidence interventions"
            value={`${modified} / ${inv.lattice.matrix.length}`}
          />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-subtle">
          Deterministic sensitivity analysis using the Stress factors (1.55 / 0.55). These weights
          are not calibrated truth probabilities; changing a slider does not re-run an AI model.
        </p>
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-medium">Evidence mixing desk</h3>
            <Button variant="ghost" onClick={() => setRetention({})}>
              <RotateCcw className="size-4" /> Reset
            </Button>
          </div>
          <input
            aria-label="Filter scenario evidence"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find an evidence thread…"
            className="mt-4 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {inv.sources
              .filter((source) => source.ok)
              .map((source) => (
                <Button
                  key={source.id}
                  variant="secondary"
                  onClick={() =>
                    setRetention((old) => ({
                      ...old,
                      ...Object.fromEntries(
                        inv.lattice.matrix
                          .filter((row) =>
                            inferEvidenceSources(inv, row.evidence).includes(source.id),
                          )
                          .map((row) => [row.evidence, 0]),
                      ),
                    }))
                  }
                >
                  Mute {source.name}
                </Button>
              ))}
          </div>
          <div className="mt-4 max-h-96 space-y-4 overflow-y-auto pr-2">
            {inv.lattice.matrix
              .filter((row) => row.evidence.toLowerCase().includes(search.toLowerCase()))
              .map((row, index) => (
                <label
                  key={row.evidence}
                  className="block rounded-xl border border-border bg-bg p-4"
                >
                  <span className="flex justify-between gap-4 text-sm">
                    <span>{row.evidence}</span>
                    <span className="font-mono text-accent">
                      {Math.round((retention[row.evidence] ?? 1) * 100)}%
                    </span>
                  </span>
                  <input
                    aria-label={`Retained influence: ${row.evidence}`}
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={(retention[row.evidence] ?? 1) * 100}
                    onChange={(e) =>
                      setRetention((old) => ({
                        ...old,
                        [row.evidence]: Number(e.target.value) / 100,
                      }))
                    }
                    className="mt-3 h-11 w-full accent-accent"
                  />
                  <span className="flex justify-between font-mono text-xs text-subtle">
                    <span>REMOVE</span>
                    <span>THREAD {String(index + 1).padStart(2, "0")}</span>
                    <span>RETAIN</span>
                  </span>
                </label>
              ))}
            {!inv.lattice.matrix.length && (
              <p className="text-sm text-muted">This investigation has no evidence matrix yet.</p>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-medium">Decision displacement</h3>
          <div className="mt-5 space-y-5">
            {result.map((item) => {
              const before = baseline.find((base) => base.id === item.id)?.posterior ?? 0;
              const delta = (item.posterior - before) * 100;
              return (
                <div key={item.id}>
                  <div className="flex justify-between gap-4 text-sm">
                    <span>{title(item.id)}</span>
                    <span className="shrink-0 font-mono">
                      {pct(item.posterior)}{" "}
                      <span className="text-muted">
                        ({delta >= 0 ? "+" : ""}
                        {delta.toFixed(1)} pp)
                      </span>
                    </span>
                  </div>
                  <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-elevated">
                    <div
                      className="absolute inset-y-0 left-0 bg-accent transition-all motion-reduce:transition-none"
                      style={{ width: pct(item.posterior) }}
                    />
                    <span
                      className="absolute inset-y-0 border-l-2 border-fg"
                      style={{ left: pct(before) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-subtle">White marker: baseline · Filled bar: scenario</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <input
              aria-label="Scenario name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this branch"
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 text-sm"
            />
            <Button
              disabled={branches.length >= 6}
              onClick={() => {
                setBranches((old) => [
                  ...old,
                  { name: name.trim() || `Branch ${old.length + 1}`, retention: { ...retention } },
                ]);
                setName("");
              }}
            >
              <Save className="size-4" /> Pin branch
            </Button>
          </div>
          <p className="mt-2 text-xs text-subtle">
            Up to six branches, held in this session. Export to keep a reproducible copy.
          </p>
          <div className="mt-4 space-y-2">
            {branches.map((branch, i) => {
              const lead = evaluateScenario(inv.lattice, branch.retention)[0];
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-border p-3"
                >
                  <button
                    className="min-h-11 min-w-0 flex-1 text-left"
                    onClick={() => {
                      setRetention({ ...branch.retention });
                      setName(branch.name);
                    }}
                  >
                    <span className="block text-sm font-medium">{branch.name}</span>
                    <span className="text-xs text-muted">
                      {lead ? `${title(lead.id)} · ${pct(lead.posterior)}` : "No hypotheses"}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${branch.name}`}
                    onClick={() => setBranches((old) => old.filter((_, index) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          <Button className="mt-4 w-full" variant="secondary" onClick={exportScenario}>
            <Download className="size-4" /> Export reproducible scenario pack
          </Button>
        </section>
      </div>
      {branches.length > 0 && (
        <section className="overflow-x-auto rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-4 font-medium">Branch comparison</h3>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Hypothesis weights across baseline and pinned scenarios
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th className="p-3">Hypothesis</th>
                <th className="p-3">Baseline</th>
                {branches.map((branch, index) => (
                  <th key={index} className="p-3">
                    {branch.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {baseline.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <th className="p-3 font-normal">{title(item.id)}</th>
                  <td className="p-3 font-mono">{pct(item.posterior)}</td>
                  {branches.map((branch, index) => (
                    <td key={index} className="p-3 font-mono text-accent">
                      {pct(
                        evaluateScenario(inv.lattice, branch.retention).find(
                          (h) => h.id === item.id,
                        )?.posterior ?? 0,
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-lg font-medium">{value}</p>
    </div>
  );
}
