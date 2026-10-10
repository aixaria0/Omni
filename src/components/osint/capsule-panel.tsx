import { useMemo, useRef, useState } from "react";
import {
  Download,
  FileLock2,
  Fingerprint,
  GitCompareArrows,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  compareEvidenceCapsules,
  createEvidenceCapsule,
  parseEvidenceCapsule,
  verifyEvidenceCapsule,
  type CapsuleDrift,
  type EvidenceCapsule,
} from "@/lib/osint/capsule";
import { useOsintStore } from "@/lib/osint/store";
import type { Investigation } from "@/lib/osint/types";
import { runBoundCertificate, type HybridCertificate } from "@/lib/quantum/cert";
import { useCertificateStore } from "@/lib/quantum/store";

export function EvidenceCapsulePanel({ inv }: { inv: Investigation }) {
  const { capsules, addCapsule } = useOsintStore();
  const addCertificate = useCertificateStore((state) => state.addCertificate);
  const [attestation, setAttestation] = useState<HybridCertificate | null>(null);
  const [attesting, setAttesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draft = useMemo(() => createEvidenceCapsule(inv), [inv]);
  const archived = capsules[inv.query] ?? [];
  const sealed = archived.some((item) => item.rootDigest === draft.rootDigest);
  const baseline = archived.find((item) => item.rootDigest !== draft.rootDigest) ?? null;
  const drift = baseline ? compareEvidenceCapsules(baseline, draft) : null;
  const verification = verifyEvidenceCapsule(draft);

  function seal() {
    addCapsule(draft);
    setMessage("Snapshot sealed locally. Export it if you need a portable audit artifact.");
  }

  async function attest() {
    setAttesting(true);
    setMessage(null);
    try {
      const certificate = await runBoundCertificate(
        draft.rootDigest,
        `${inv.query} · ${draft.observedAt}`,
      );
      addCertificate(certificate);
      setAttestation(certificate);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Attestation failed");
    } finally {
      setAttesting(false);
    }
  }

  async function importCapsule(file: File) {
    try {
      if (file.size > 2_000_000) throw new Error("Evidence Capsule import is limited to 2 MB");
      const capsule = parseEvidenceCapsule(await file.text());
      addCapsule(capsule);
      setMessage(
        `Imported verified capsule ${capsule.capsuleId.slice(0, 12)}… for ${capsule.subject.query}.`,
      );
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Import failed");
    }
  }

  function exportCapsule() {
    downloadJson(
      `omnitrace-${safeName(inv.query)}-${draft.capsuleId.slice(0, 10)}.capsule.json`,
      draft,
    );
  }

  function exportBundle() {
    if (!attestation) return;
    downloadJson(`omnitrace-${safeName(inv.query)}-${draft.capsuleId.slice(0, 10)}.attested.json`, {
      capsule: draft,
      attestation,
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <FileLock2 className="size-4 text-accent" />
              <h2 className="text-sm font-medium">Evidence Capsule</h2>
              <Badge tone={verification.valid ? "ok" : "danger"}>
                {verification.valid ? "integrity valid" : "invalid"}
              </Badge>
              {sealed ? <Badge tone="accent">sealed</Badge> : null}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Canonical, portable snapshot of collector outputs, facts, graph topology, timeline and
              hypothesis lattice. SHA3-512 section hashes make later mutation detectable without
              claiming that public-source data itself is true.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              <Upload className="size-3.5" />
              Import
            </Button>
            <Button size="sm" variant="secondary" onClick={exportCapsule}>
              <Download className="size-3.5" />
              Export
            </Button>
            <Button size="sm" disabled={sealed} onClick={seal}>
              <FileLock2 className="size-3.5" />
              {sealed ? "Sealed" : "Seal snapshot"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importCapsule(file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Capsule" value={`${draft.capsuleId.slice(0, 12)}…`} />
          <Metric
            label="Sources"
            value={`${draft.coverage.sourcesLive}/${draft.coverage.sourcesTotal} live`}
          />
          <Metric
            label="Raw coverage"
            value={`${draft.coverage.rawPayloads}/${draft.coverage.sourcesTotal}`}
          />
          <Metric label="Archive depth" value={String(archived.length)} />
        </div>

        {draft.coverage.rawPayloads < draft.coverage.sourcesTotal ? (
          <p className="mt-4 rounded-lg border border-warn/25 bg-warn/5 p-3 text-xs leading-relaxed text-muted">
            Raw collector payload coverage is incomplete. This often happens when sealing an item
            restored from local history, where raw source bodies are intentionally discarded. Re-run
            the query before sealing when you need full payload-level evidence hashes.
          </p>
        ) : null}

        <div className="mt-5 rounded-xl border border-border bg-bg/60 p-4 font-mono text-[11px] leading-relaxed text-muted">
          <Hash label="evidence" value={draft.evidenceDigest} />
          <Hash label="root" value={draft.rootDigest} />
        </div>
      </section>

      <DriftCard drift={drift} baseline={baseline} />

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <Fingerprint className="size-4 text-accent" />
              <h2 className="text-sm font-medium">Bound Quantum Attestation</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Binds this capsule root into QuantumCert's proposal digest, 4-validator Ed25519 quorum
              and SHA3-512 classical/quantum binding. The attestation proves which exact capsule was
              certified; it does not convert OSINT assertions into ground truth.
            </p>
          </div>
          <Button size="sm" disabled={!sealed || attesting} onClick={() => void attest()}>
            {attesting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            {attesting ? "Attesting" : "Attest sealed root"}
          </Button>
        </div>

        {!sealed ? (
          <p className="mt-4 text-xs text-subtle">
            Seal the current snapshot before creating an attestation.
          </p>
        ) : null}

        {attestation ? (
          <div className="mt-5 rounded-xl border border-ok/25 bg-ok/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge tone={attestation.status === "ACCEPTED" ? "ok" : "danger"}>
                  {attestation.status}
                </Badge>
                <span className="font-mono text-xs text-muted">cert:{attestation.id}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={exportBundle}>
                <Download className="size-3.5" />
                Export attested bundle
              </Button>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Metric
                label="Quorum"
                value={`${attestation.quorum.validVotes}/${attestation.quorum.totalNodes}`}
              />
              <Metric label="Witness" value={attestation.witness.value.toFixed(4)} />
              <Metric
                label="Binding"
                value={attestation.binding.verified ? "verified" : "failed"}
              />
            </div>
            <div className="mt-4 font-mono text-[11px] text-muted">
              <Hash label="subject" value={attestation.subject?.digest ?? "—"} />
              <Hash label="binding" value={attestation.binding.digest} />
            </div>
          </div>
        ) : null}
      </section>

      {message ? (
        <p className="rounded-xl border border-border bg-elevated p-3 text-xs text-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function DriftCard({
  drift,
  baseline,
}: {
  drift: CapsuleDrift | null;
  baseline: EvidenceCapsule | null;
}) {
  if (!baseline || !drift) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="size-4 text-accent" />
          <h2 className="text-sm font-medium">Drift Radar</h2>
        </div>
        <p className="mt-3 text-sm text-muted">
          No previous sealed observation exists for this query. Seal this run, then re-run the same
          indicator later to get semantic change detection instead of a raw JSON diff.
        </p>
      </section>
    );
  }

  const tone = drift.severity === "major" ? "danger" : drift.severity === "minor" ? "warn" : "ok";
  const groups = [
    ["Sources", drift.sourceChanges],
    ["Facts", drift.factChanges],
    ["Graph", drift.graphChanges],
    ["Lattice", drift.latticeChanges],
  ] as const;

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="size-4 text-accent" />
          <h2 className="text-sm font-medium">Drift Radar</h2>
          <Badge tone={tone}>{drift.severity}</Badge>
        </div>
        <span className="text-[11px] text-subtle">
          baseline {new Date(baseline.observedAt).toLocaleString()}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted">{drift.summary}</p>
      {drift.changed ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {groups
            .filter(([, items]) => items.length > 0)
            .map(([label, items]) => (
              <div key={label} className="rounded-xl border border-border bg-elevated p-4">
                <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{label}</p>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
                  {items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-elevated p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-subtle">{label}</p>
      <p className="mt-1 truncate font-mono text-sm text-fg">{value}</p>
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

function safeName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "evidence"
  );
}

function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
