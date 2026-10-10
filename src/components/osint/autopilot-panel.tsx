import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  Download,
  Fingerprint,
  GitBranch,
  Loader2,
  Network,
  Play,
  Route,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_AUTOPILOT_POLICY,
  actionKey,
  createAutopilotReceipt,
  createAutopilotRound,
  mergeWorldInvestigations,
  parseAutopilotReceipt,
  planNextAction,
  verifyAutopilotReceipt,
  type AutopilotAction,
  type AutopilotReceipt,
  type AutopilotRound,
} from "@/lib/osint/autopilot";
import { runInvestigation } from "@/lib/osint/investigate";
import { useOsintStore } from "@/lib/osint/store";
import { buildStressReport } from "@/lib/osint/stress";
import type { Investigation } from "@/lib/osint/types";
import { runBoundDigestCertificate, type HybridCertificate } from "@/lib/quantum/cert";
import { useCertificateStore } from "@/lib/quantum/store";

export function AutopilotPanel({ inv }: { inv: Investigation }) {
  const { autopilotReceipts, addAutopilotReceipt, remember } = useOsintStore();
  const addCertificate = useCertificateStore((state) => state.addCertificate);
  const [receipt, setReceipt] = useState<AutopilotReceipt | null>(null);
  const [liveRounds, setLiveRounds] = useState<AutopilotRound[]>([]);
  const [phase, setPhase] = useState<string | null>(null);
  const [attestation, setAttestation] = useState<HybridCertificate | null>(null);
  const [attesting, setAttesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const latest = autopilotReceipts[inv.query]?.[0] ?? null;
  const activeReceipt = receipt ?? latest;
  const verification = useMemo(
    () => (activeReceipt ? verifyAutopilotReceipt(activeReceipt) : null),
    [activeReceipt],
  );

  useEffect(() => {
    setReceipt(null);
    setLiveRounds([]);
    setAttestation(null);
    setMessage(null);
  }, [inv.query]);

  const autopilot = useMutation({
    mutationFn: async () => {
      const policy = DEFAULT_AUTOPILOT_POLICY;
      const startedAt = new Date().toISOString();
      const runId = `autopilot_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
      const rounds: AutopilotRound[] = [];
      const visited = new Set<string>();
      let previousRoundRoot: string | null = null;

      setLiveRounds([]);
      setAttestation(null);
      setMessage(null);
      setPhase("Refreshing the root observation");
      let world = await runInvestigation({ data: { query: inv.query } });
      let action: AutopilotAction = {
        kind: "seed",
        target: world.query,
        targetKind: world.kind,
        reason: "Initial full-spectrum public-infrastructure observation.",
        expectedInformationGain: 1,
        estimatedCost: 1,
      };

      for (let index = 0; index < policy.maxRounds; index += 1) {
        visited.add(actionKey(action));
        setPhase(`Stress-testing round ${index + 1}`);
        const stress = buildStressReport(world);
        const nextAction = planNextAction(world, stress, visited, policy, index + 1);
        const round = createAutopilotRound({
          index,
          action,
          nextAction,
          investigation: world,
          previousRoundRoot,
          sealedAt: new Date().toISOString(),
        });
        rounds.push(round);
        previousRoundRoot = round.roundRoot;
        setLiveRounds([...rounds]);

        if (nextAction.kind === "stop") break;

        setPhase(
          nextAction.kind === "pivot"
            ? `Collecting ${nextAction.targetKind.toUpperCase()} pivot ${nextAction.target}`
            : `Refreshing ${nextAction.target}`,
        );
        const child = await runInvestigation({ data: { query: nextAction.target } });
        world = mergeWorldInvestigations(
          world,
          child,
          `inv_world_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
          child.collectedAt,
        );
        action = nextAction;
      }

      const completedAt = new Date().toISOString();
      const completed = createAutopilotReceipt({
        runId,
        startedAt,
        completedAt,
        policy,
        rounds,
        finalInvestigation: world,
      });
      return { receipt: completed, world };
    },
    onSuccess: ({ receipt: completed, world }) => {
      setReceipt(completed);
      addAutopilotReceipt(completed);
      remember(world);
      setPhase(null);
      setMessage(
        `Autopilot stopped after ${completed.rounds.length} round${completed.rounds.length === 1 ? "" : "s"}: ${humanStop(completed.stopReason)}.`,
      );
    },
    onError: (cause) => {
      setPhase(null);
      setMessage(cause instanceof Error ? cause.message : "Autopilot failed");
    },
  });

  async function importReceipt(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error("Autopilot receipt import is limited to 2 MB");
      const imported = parseAutopilotReceipt(await file.text());
      addAutopilotReceipt(imported);
      setReceipt(imported);
      setAttestation(null);
      setMessage(`Imported and replay-verified Autopilot run ${imported.runId}.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Autopilot receipt import failed");
    }
  }

  async function attestRun() {
    if (!activeReceipt) return;
    setAttesting(true);
    setMessage(null);
    try {
      const certificate = await runBoundDigestCertificate(
        activeReceipt.runRoot,
        `${activeReceipt.query} autonomous evidence run`,
        "autopilot-run",
      );
      addCertificate(certificate);
      setAttestation(certificate);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Run attestation failed");
    } finally {
      setAttesting(false);
    }
  }

  const roundsToShow = autopilot.isPending ? liveRounds : (activeReceipt?.rounds ?? []);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-accent/25 bg-surface">
        <div className="border-b border-border bg-accent/[0.04] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Bot className="size-4 text-accent" />
                <h2 className="text-sm font-medium">Self-Driving Investigation Runtime</h2>
                <Badge tone="accent">closed loop</Badge>
                {verification ? (
                  <Badge tone={verification.valid ? "ok" : "danger"}>
                    {verification.valid ? "proof valid" : "proof failed"}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                Omni observes, stress-tests its own hypothesis ranking, chooses the highest-value
                infrastructure pivot, collects it, folds the result into a case world model, and
                repeats until the robustness policy stops the run. The planner is deterministic; IP,
                domain and ASN are the only autonomous pivot classes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => importRef.current?.click()}>
                <Upload className="size-3.5" />
                Import proof
              </Button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importReceipt(file);
                  event.currentTarget.value = "";
                }}
              />
              <Button size="sm" disabled={autopilot.isPending} onClick={() => autopilot.mutate()}>
                {autopilot.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {autopilot.isPending ? "Autopilot running" : "Launch autonomous run"}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Round budget" value={String(DEFAULT_AUTOPILOT_POLICY.maxRounds)} />
            <Metric
              label="Stability target"
              value={`${DEFAULT_AUTOPILOT_POLICY.targetStability}/100`}
            />
            <Metric
              label="Margin target"
              value={`${Math.round(DEFAULT_AUTOPILOT_POLICY.targetMargin * 100)} pp`}
            />
            <Metric label="Pivot boundary" value="IP · domain · ASN" />
          </div>
          {phase ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-accent/20 bg-bg/50 px-4 py-3 text-xs text-muted">
              <Loader2 className="size-3.5 animate-spin text-accent" />
              {phase}
            </div>
          ) : null}
        </div>

        <div className="grid gap-px bg-border lg:grid-cols-3">
          <ProcessStep
            icon={Network}
            label="Observe"
            body="Fresh public collectors produce a concrete Evidence Capsule."
          />
          <ProcessStep
            icon={GitBranch}
            label="Decide"
            body="Stress, entropy, source concentration and graph risk drive the next pivot."
          />
          <ProcessStep
            icon={Route}
            label="Refuse"
            body="Pivot evidence is provenance-namespaced and fused back into one world model."
          />
        </div>
      </section>

      {roundsToShow.length ? <Trace rounds={roundsToShow} running={autopilot.isPending} /> : null}

      {activeReceipt && verification ? (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-accent" />
                <h2 className="text-sm font-medium">Proof-Carrying Run</h2>
                <Badge tone={verification.valid ? "ok" : "danger"}>
                  {verification.valid ? "verified" : "invalid"}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Every round carries a verified Evidence Capsule. Capsule roots, stress digest,
                planner action and next decision are chained into the next round. Verification also
                recomputes the deterministic planner decision from the recorded state.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => downloadReceipt(activeReceipt)}>
                <Download className="size-3.5" />
                Export proof
              </Button>
              <Button size="sm" disabled={attesting} onClick={() => void attestRun()}>
                {attesting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Fingerprint className="size-3.5" />
                )}
                {attesting ? "Attesting" : "Attest run root"}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ProofMetric label="Capsules" ok={verification.capsuleIntegrity} />
            <ProofMetric label="Hash chain" ok={verification.chainIntegrity} />
            <ProofMetric label="Planner replay" ok={verification.plannerIntegrity} />
            <ProofMetric label="Run root" ok={verification.runRootIntegrity} />
          </div>

          <div className="mt-4 rounded-xl border border-border bg-bg/60 p-4 font-mono text-[11px] text-muted">
            <Hash label="run" value={activeReceipt.runRoot} />
            <Hash label="evidence" value={activeReceipt.final.evidenceDigest} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Stop" value={humanStop(activeReceipt.stopReason)} />
            <Metric label="Final leader" value={activeReceipt.final.leader} />
            <Metric label="Final stability" value={`${activeReceipt.final.stabilityScore}/100`} />
            <Metric label="Rounds" value={String(activeReceipt.rounds.length)} />
          </div>

          {attestation ? (
            <div className="mt-4 rounded-xl border border-ok/25 bg-ok/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={attestation.status === "ACCEPTED" ? "ok" : "danger"}>
                  {attestation.status}
                </Badge>
                <span className="font-mono text-xs text-muted">cert:{attestation.id}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Shared Quantum Fabric ledger now binds the exact Autopilot run root as an
                <span className="font-mono"> autopilot-run</span> subject. This certifies run
                identity and integrity, not the truth of public-source claims.
              </p>
            </div>
          ) : null}

          {!verification.valid && verification.problems.length ? (
            <ul className="mt-4 space-y-1 text-xs text-danger">
              {verification.problems.map((problem) => (
                <li key={problem}>• {problem}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Runtime boundary</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Autopilot expands only through public infrastructure entities already discovered in the
          case graph. It does not pivot into private people, does not treat threat-intel tags as
          verdicts, and does not call a model to invent a next step. A high stability score means
          the current ranking survived the implemented evidence-removal tests; it is not a truth
          score.
        </p>
      </section>

      {message ? (
        <p className="rounded-xl border border-border bg-elevated p-3 text-xs text-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function Trace({ rounds, running }: { rounds: AutopilotRound[]; running: boolean }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-accent" />
          <h2 className="text-sm font-medium">Autonomous Trace</h2>
          {running ? <Badge tone="accent">live</Badge> : <Badge tone="ok">complete</Badge>}
        </div>
        <span className="text-xs text-subtle">{rounds.length} recorded round(s)</span>
      </div>
      <div className="mt-5 space-y-3">
        {rounds.map((round) => (
          <article
            key={round.roundRoot}
            className="rounded-xl border border-border bg-elevated p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-subtle">
                  Round {round.index + 1}
                </p>
                <p className="mt-1 text-sm font-medium text-fg">{actionTitle(round.action)}</p>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
                  {round.action.reason}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge tone={gradeTone(round.checkpoint.grade)}>{round.checkpoint.grade}</Badge>
                <Badge tone="neutral">{round.checkpoint.stabilityScore}/100</Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Leader" value={round.checkpoint.leader} />
              <Metric label="Margin" value={`${Math.round(round.checkpoint.margin * 100)} pp`} />
              <Metric label="Entropy" value={round.checkpoint.entropy.toFixed(3)} />
              <Metric
                label="Live sources"
                value={`${round.capsule.coverage.sourcesLive}/${round.capsule.coverage.sourcesTotal}`}
              />
            </div>

            <div className="mt-4 rounded-lg border border-border bg-bg/50 p-3 text-xs text-muted">
              <span className="text-subtle">Planner → </span>
              <span className="text-fg">{actionTitle(round.nextAction)}</span>
              {round.nextAction.kind !== "stop" ? (
                <span>
                  {" "}
                  · expected gain {(round.nextAction.expectedInformationGain * 100).toFixed(0)}%
                </span>
              ) : null}
            </div>

            <div className="mt-3 font-mono text-[10px] text-subtle">
              root:{round.roundRoot.slice(0, 20)}… · capsule:{round.capsule.rootDigest.slice(0, 20)}
              …
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProcessStep({
  icon: Icon,
  label,
  body,
}: {
  icon: typeof Network;
  label: string;
  body: string;
}) {
  return (
    <div className="bg-surface p-4">
      <Icon className="size-4 text-accent" />
      <p className="mt-2 text-xs font-medium text-fg">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg/50 p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{label}</p>
      <p className="mt-1 truncate font-mono text-sm text-fg">{value}</p>
    </div>
  );
}

function ProofMetric({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-elevated p-3">
      <CheckCircle2 className={`size-4 ${ok ? "text-ok" : "text-danger"}`} />
      <div>
        <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{label}</p>
        <p className="mt-0.5 text-xs text-fg">{ok ? "verified" : "failed"}</p>
      </div>
    </div>
  );
}

function Hash({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-1 sm:grid-cols-[68px_1fr]">
      <span className="text-subtle">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}

function actionTitle(action: AutopilotAction) {
  if (action.kind === "seed") return `Seed · ${action.target}`;
  if (action.kind === "pivot") return `Pivot ${action.targetKind.toUpperCase()} · ${action.target}`;
  if (action.kind === "refresh-root") return `Refresh root · ${action.target}`;
  return `Stop · ${humanStop(action.reason)}`;
}

function humanStop(reason: AutopilotReceipt["stopReason"]) {
  if (reason === "robustness-target-reached") return "robustness target reached";
  if (reason === "round-budget-exhausted") return "round budget exhausted";
  return "no actionable infrastructure pivots";
}

function gradeTone(grade: AutopilotRound["checkpoint"]["grade"]) {
  if (grade === "resilient" || grade === "stable") return "ok" as const;
  if (grade === "sensitive") return "warn" as const;
  return "danger" as const;
}

function downloadReceipt(receipt: AutopilotReceipt) {
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `omnitrace-${safeName(receipt.query)}-${receipt.runRoot.slice(0, 10)}.autopilot.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "run"
  );
}
