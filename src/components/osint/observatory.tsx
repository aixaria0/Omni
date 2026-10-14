import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  GitBranch,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { EvidenceAtlas } from "./evidence-atlas";
import { evaluateScenario } from "@/lib/osint/scenario";
import type { Investigation } from "@/lib/osint/types";

type Props = {
  inv: Investigation;
  retention: Record<string, number>;
  setRetention: Dispatch<SetStateAction<Record<string, number>>>;
  onScenarios: () => void;
  training: boolean;
};
export function Observatory({ inv, retention, setRetention, onScenarios, training }: Props) {
  const [filter, setFilter] = useState("");
  const baseline = useMemo(() => evaluateScenario(inv.lattice, {}), [inv.lattice]);
  const result = useMemo(() => evaluateScenario(inv.lattice, retention), [inv.lattice, retention]);
  const leader = result[0];
  const changed = leader?.id !== baseline[0]?.id;
  const changes = inv.lattice.matrix.filter((row) => (retention[row.evidence] ?? 1) < 1).length;
  const hypothesisTitle = (id: string) =>
    inv.lattice.hypotheses.find((h) => h.id === id)?.title ?? id;
  return (
    <div className="observatory">
      <div className="observatory-grid">
        <section className="atlas-panel">
          <EvidenceAtlas graph={inv.graph} />
        </section>
        <aside className="decision-panel">
          <div className="section-label">
            <span className="signal-dot" /> DECISION MONITOR <span>01</span>
          </div>
          <div className="decision-state">
            <span className="mini-label">
              {changed ? "Boundary crossed" : "Leading explanation"}
            </span>
            <h2>{leader ? hypothesisTitle(leader.id) : "Awaiting hypotheses"}</h2>
            <p>
              {changed
                ? "Your intervention changed the leading explanation."
                : "An explanation to challenge. A conclusion to inspect."}
            </p>
          </div>
          <div className="hypothesis-monitor" aria-live="polite">
            {result.map((item, i) => {
              const original = baseline.find((h) => h.id === item.id)?.posterior ?? 0;
              const delta = (item.posterior - original) * 100;
              return (
                <div className="monitor-row" key={item.id}>
                  <div className="monitor-row-title">
                    <span>
                      <b>{String(i + 1).padStart(2, "0")}</b>
                      {hypothesisTitle(item.id)}
                    </span>
                    <strong>
                      {(item.posterior * 100).toFixed(1)}
                      <small>%</small>
                    </strong>
                  </div>
                  <div className="monitor-track">
                    <span style={{ width: `${item.posterior * 100}%` }} />
                    <i style={{ left: `${original * 100}%` }} />
                  </div>
                  <div className="monitor-delta">
                    {delta >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}
                    {delta > 0 ? "+" : ""}
                    {delta.toFixed(1)} pp <span>vs. baseline</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="decision-note">
            <ShieldCheck />
            <span>
              Model-relative sensitivity weights.
              <br />
              Not calibrated truth probabilities.
            </span>
          </div>
          <button className="desk-link" onClick={onScenarios}>
            Compare alternate branches <ArrowUpRight />
          </button>
        </aside>
      </div>
      <section className="evidence-desk">
        <div className="desk-heading">
          <div>
            <p className="section-label">
              EVIDENCE MIXING DESK <span>02</span>
            </p>
            <h2>What if this didn't hold?</h2>
          </div>
          <div className="desk-tools">
            <label>
              <Search />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Find evidence on mixing desk"
                placeholder="Find a thread"
              />
            </label>
            <button onClick={() => setRetention({})}>
              <RotateCcw />
              Reset
            </button>
          </div>
        </div>
        <div className="desk-table-wrap">
          <table className="desk-table">
            <caption className="sr-only">
              Retain or remove evidence influence and observe the live hypothesis monitor
            </caption>
            <thead>
              <tr>
                <th>Evidence thread</th>
                <th>Provenance</th>
                <th>Retained influence</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {inv.lattice.matrix
                .filter((row) => row.evidence.toLowerCase().includes(filter.toLowerCase()))
                .map((row, i) => {
                  const kept = retention[row.evidence] ?? 1;
                  const fact = inv.facts.find((f) => f.label === row.evidence);
                  return (
                    <tr key={row.evidence} data-modified={kept < 1}>
                      <th>
                        <span className="thread-index">{String(i + 1).padStart(2, "0")}</span>
                        <span>{row.evidence}</span>
                      </th>
                      <td>
                        <span className="source-tag">
                          {fact?.sourceIds.join(" · ") || "lattice row"}
                        </span>
                      </td>
                      <td>
                        <div className="desk-slider">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={kept * 100}
                            aria-label={`Desk influence: ${row.evidence}`}
                            onChange={(e) =>
                              setRetention((old) => ({
                                ...old,
                                [row.evidence]: Number(e.target.value) / 100,
                              }))
                            }
                          />
                          <output>{Math.round(kept * 100)}%</output>
                        </div>
                      </td>
                      <td>
                        <button
                          className="thread-toggle"
                          aria-label={`${kept === 0 ? "Restore" : "Remove"} ${row.evidence}`}
                          aria-pressed={kept === 0}
                          onClick={() =>
                            setRetention((old) => ({ ...old, [row.evidence]: kept === 0 ? 1 : 0 }))
                          }
                        >
                          {kept === 0 ? "REMOVED" : kept < 1 ? "REDUCED" : "RETAINED"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!inv.lattice.matrix.length && (
          <p className="desk-empty">
            This case has no evidence matrix. Collect an indicator or recompute its lattice.
          </p>
        )}
        <div className="desk-footer">
          <p>
            <span className="signal-dot" />
            {changes} intervention{changes === 1 ? "" : "s"} · Original evidence preserved
          </p>
          <button onClick={onScenarios}>
            <GitBranch />
            Pin a scenario <ArrowRight />
          </button>
        </div>
      </section>
      {training && (
        <p className="training-tip">
          <span>TRY THIS</span>Remove the shared certificate identity. Watch the leading explanation
          change. Every entity in this sample is synthetic; no live collection has occurred.
        </p>
      )}
    </div>
  );
}
