import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleAlert,
  Fingerprint,
  Loader2,
  Play,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  runCertificateScenario,
  type HybridCertificate,
  type QuantumScenario,
} from "@/lib/quantum/cert";

const SCENARIOS: Array<{
  id: QuantumScenario;
  label: string;
  detail: string;
}> = [
  { id: "bell", label: "Bell state", detail: "Valid witness + 4/4 quorum" },
  { id: "separable", label: "Separable", detail: "Quantum evidence must fail" },
  { id: "tamper", label: "Tamper test", detail: "Post-bind mutation" },
  { id: "byzantine", label: "Byzantine", detail: "1 equivocation, 3/4 quorum" },
  { id: "shadow", label: "Shadows", detail: "300-snapshot estimate" },
  { id: "ghz", label: "GHZ₁₂", detail: "Multipartite coherence" },
];

export function CertificateDashboard() {
  const [certificates, setCertificates] = useState<HybridCertificate[]>([]);
  const [running, setRunning] = useState<QuantumScenario | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const accepted = certificates.filter((item) => item.status === "ACCEPTED").length;
    const rejected = certificates.filter((item) => item.status === "REJECTED").length;
    const latest = certificates[0]?.witness.value;
    return { total: certificates.length, accepted, rejected, latest };
  }, [certificates]);

  async function run(scenario: QuantumScenario) {
    setRunning(scenario);
    setError(null);
    try {
      const certificate = await runCertificateScenario(scenario);
      setCertificates((current) => [certificate, ...current].slice(0, 20));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Certificate run failed");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2">
            <Fingerprint className="size-4 text-accent" />
            <p className="text-sm font-medium">Scenario forge</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Each run generates fresh Ed25519 validator keys, signs the proposal, verifies the quorum,
            and binds classical + quantum evidence with SHA3-512.
          </p>
          <div className="mt-4 space-y-2">
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                type="button"
                disabled={running !== null}
                onClick={() => void run(scenario.id)}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border border-border bg-elevated px-3 py-2 text-left transition hover:bg-bg disabled:opacity-50"
              >
                <div>
                  <p className="text-xs font-medium text-fg">{scenario.label}</p>
                  <p className="mt-0.5 text-[11px] text-subtle">{scenario.detail}</p>
                </div>
                {running === scenario.id ? (
                  <Loader2 className="size-4 animate-spin text-accent" />
                ) : (
                  <Play className="size-3.5 text-subtle" />
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Live totals</p>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Clear certificate history"
              disabled={certificates.length === 0}
              onClick={() => setCertificates([])}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Total" value={String(stats.total)} />
            <Stat label="Accepted" value={String(stats.accepted)} tone="ok" />
            <Stat label="Rejected" value={String(stats.rejected)} tone="danger" />
            <Stat
              label="Latest W"
              value={stats.latest === undefined ? "—" : stats.latest.toFixed(3)}
            />
          </div>
        </section>
      </aside>

      <section>
        {error ? (
          <div className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {certificates.length === 0 ? (
          <div className="flex min-h-[430px] items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
            <div className="max-w-md">
              <ShieldCheck className="mx-auto size-7 text-accent" />
              <h3 className="mt-4 text-lg font-medium">No certificates yet</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Run a scenario. The resulting certificate exposes all three trust boundaries:
                quantum evidence, Byzantine quorum, and binding integrity.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {certificates.map((certificate) => (
              <CertificateCard key={certificate.id} certificate={certificate} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CertificateCard({ certificate }: { certificate: HybridCertificate }) {
  const [expanded, setExpanded] = useState(false);
  const tone = certificate.status === "ACCEPTED"
    ? "ok"
    : certificate.status === "REJECTED"
      ? "danger"
      : "warn";
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone}>{certificate.status}</Badge>
            <span className="text-[11px] uppercase tracking-[0.14em] text-subtle">
              {certificate.scenario}
            </span>
          </div>
          <p className="mt-3 font-mono text-xs text-muted">cert:{certificate.id}</p>
          <p className="mt-1 text-[11px] text-subtle">
            {new Date(certificate.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-right font-mono text-xs">
          <span className="text-subtle">witness</span>
          <span className="tabular text-fg">{certificate.witness.value.toFixed(6)}</span>
          <span className="text-subtle">quorum</span>
          <span className="tabular text-fg">
            {certificate.quorum.validVotes}/{certificate.quorum.totalNodes}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <CheckPill label="Quantum evidence" passed={certificate.checks.quantumEvidence} />
        <CheckPill label="Classical quorum" passed={certificate.checks.classicalQuorum} />
        <CheckPill label="SHA3 binding" passed={certificate.checks.bindingIntegrity} />
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted">{certificate.witness.explanation}</p>

      {certificate.anomalies.length ? (
        <div className="mt-4 space-y-2">
          {certificate.anomalies.map((anomaly) => (
            <div key={anomaly} className="flex gap-2 rounded-lg border border-warn/25 bg-warn/5 p-3 text-xs text-muted">
              <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" />
              <span>{anomaly}</span>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        className="mt-4 text-xs text-subtle hover:text-fg"
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide cryptographic record" : "Inspect cryptographic record"}
      </button>

      {expanded ? (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-bg/60 p-4 font-mono text-[11px] leading-relaxed text-muted">
          <Hash label="proposal" value={certificate.proposalDigest} />
          <Hash label="quantum" value={certificate.quantumDigest} />
          <Hash label="binding" value={certificate.binding.digest} />
          <div className="border-t border-border pt-3">
            {certificate.quorum.votes.map((vote) => (
              <div key={vote.nodeId} className="mt-2 grid grid-cols-[88px_1fr_auto] gap-2 first:mt-0">
                <span className="text-subtle">{vote.nodeId}</span>
                <span className="truncate">sig:{vote.signature}</span>
                <span className={vote.verified ? "text-ok" : "text-danger"}>
                  {vote.verified ? "verified" : "invalid"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function CheckPill({ label, passed }: { label: string; passed: boolean }) {
  const Icon = passed ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-xs text-muted">
      <Icon className={`size-3.5 ${passed ? "text-ok" : "text-danger"}`} />
      {label}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{label}</p>
      <p className={`mt-1 font-mono text-lg tabular ${tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : "text-fg"}`}>
        {value}
      </p>
    </div>
  );
}

function Hash({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[70px_1fr]">
      <span className="text-subtle">{label}</span>
      <span className="break-all">{value}</span>
    </div>
  );
}
