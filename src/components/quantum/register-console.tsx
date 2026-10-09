import { useMemo, useState } from "react";
import { Activity, Atom, RotateCcw, Send, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { executeQuantumCommand } from "@/lib/quantum/commands";
import { QuantumRegister } from "@/lib/quantum/register";

type LogEntry = { id: number; input: string; output: string; error?: boolean };

const QUICK = [
  { label: "GHZ", command: "GHZ" },
  { label: "H q0", command: "H 0" },
  { label: "CNOT 0→3", command: "CNOT 0 3" },
  { label: "⟨Z₀Z₁⟩", command: "ZZ 0 1" },
  { label: "⟨X⊗12⟩", command: "global X" },
  { label: "Measure", command: "measure all" },
] as const;

export function RegisterConsole() {
  const [register] = useState(() => new QuantumRegister(12, "ghz"));
  const [revision, setRevision] = useState(0);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 0,
      input: "boot",
      output: "GHZ₁₂ initialized — 4096-dimensional statevector, norm verified.",
    },
  ]);
  const summary = useMemo(() => register.summary(), [register, revision]);
  const amplitudes = useMemo(() => register.topAmplitudes(8), [register, revision]);

  function run(command: string) {
    const clean = command.trim();
    if (!clean) return;
    try {
      const result = executeQuantumCommand(register, clean);
      setLogs((current) => [
        ...current.slice(-7),
        { id: Date.now(), input: clean, output: result.message },
      ]);
      if (result.destructive) setRevision((value) => value + 1);
    } catch (error) {
      setLogs((current) => [
        ...current.slice(-7),
        {
          id: Date.now(),
          input: clean,
          output: error instanceof Error ? error.message : "Quantum operation failed",
          error: true,
        },
      ]);
    }
    setInput("");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Atom className="size-4 text-accent" />
              <p className="text-sm font-medium">Statevector console</p>
              <Badge tone="ok">LIVE SIM</Badge>
            </div>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted">
              A persistent 12-qubit register in browser memory. Gates mutate the same
              4096-amplitude state; measurement samples the Born distribution and collapses it.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              register.resetGhz();
              setRevision((value) => value + 1);
              setLogs((current) => [
                ...current.slice(-7),
                { id: Date.now(), input: "reset", output: "GHZ₁₂ restored." },
              ]);
            }}
          >
            <RotateCcw className="size-3.5" />
            Reset GHZ
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Qubits" value={String(summary.qubits)} />
          <Metric label="Dimension" value={summary.dimension.toLocaleString()} />
          <Metric label="Norm" value={summary.norm.toFixed(12)} />
          <Metric label="Non-zero" value={String(summary.nonZero)} />
        </div>

        <div className="mt-5 rounded-xl border border-border bg-bg/60 p-4 font-mono text-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3 text-subtle">
            <span>basis amplitude</span>
            <span>probability</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {amplitudes.map((amplitude) => (
              <div key={amplitude.basis} className="grid grid-cols-[1fr_auto] gap-3">
                <span className="truncate text-fg">
                  |{amplitude.basis}⟩ · {signed(amplitude.real)}
                  {Math.abs(amplitude.imag) > 1e-12 ? ` ${signed(amplitude.imag)}i` : ""}
                </span>
                <span className="tabular text-muted">
                  {(amplitude.probability * 100).toFixed(4)}%
                </span>
              </div>
            ))}
            {amplitudes.length === 0 ? <p className="text-muted">No amplitude above threshold.</p> : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {QUICK.map((item) => (
            <button
              key={item.command}
              type="button"
              onClick={() => run(item.command)}
              className="h-9 rounded-full border border-border bg-elevated px-3 font-mono text-[11px] text-muted transition hover:text-fg"
            >
              {item.label}
            </button>
          ))}
        </div>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(input);
          }}
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='Try “Hadamard on qubit 3” or “ZZ 0 5”'
            className="font-mono"
          />
          <Button type="submit" size="icon" aria-label="Execute quantum command">
            <Send className="size-4" />
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {logs.slice().reverse().map((entry) => (
            <div key={entry.id} className="grid gap-1 rounded-lg border border-border/70 bg-bg/40 px-3 py-2 font-mono text-xs sm:grid-cols-[150px_1fr]">
              <span className="truncate text-subtle">› {entry.input}</span>
              <span className={entry.error ? "text-danger" : "text-muted"}>{entry.output}</span>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Waves className="size-4 text-accent" />
            <p className="text-sm font-medium">GHZ coherence</p>
          </div>
          <div className="mt-5 space-y-4">
            <Gauge label="Global ⟨X₀…X₁₁⟩" value={summary.globalX} />
            <Gauge
              label="Perfect Z correlations"
              value={summary.totalPairs ? summary.perfectZPairs / summary.totalPairs : 0}
              suffix={`${summary.perfectZPairs}/${summary.totalPairs}`}
            />
          </div>
          <div className="mt-5 rounded-xl border border-warn/25 bg-warn/5 p-3 text-xs leading-relaxed text-muted">
            <strong className="font-medium text-warn">Correlation ≠ pairwise entanglement.</strong>{" "}
            A 12-party GHZ state has perfect pairwise Z correlation while any two-qubit reduced state is separable.
            The global coherence observable is tracked separately.
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-accent" />
            <p className="text-sm font-medium">Execution boundary</p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            This console is a deterministic statevector engine running locally in the app. It does not claim
            to be physical quantum hardware. Hardware execution is isolated in the Braket bridge so simulator
            evidence and QPU evidence cannot be confused.
          </p>
        </section>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">{label}</p>
      <p className="mt-1 font-mono text-sm tabular text-fg">{value}</p>
    </div>
  );
}

function Gauge({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  const normalized = Math.max(0, Math.min(1, Math.abs(value)));
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono tabular text-fg">{suffix ?? value.toFixed(6)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-accent" style={{ width: `${normalized * 100}%` }} />
      </div>
    </div>
  );
}

function signed(value: number) {
  if (Math.abs(value) < 1e-12) return "0.000000";
  return `${value >= 0 ? "+" : ""}${value.toFixed(6)}`;
}
