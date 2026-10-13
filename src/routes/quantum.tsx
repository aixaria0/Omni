import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Atom,
  CircuitBoard,
  CloudCog,
  Cpu,
  Fingerprint,
  Network,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BraketPanel } from "@/components/quantum/braket-panel";
import { CertificateDashboard } from "@/components/quantum/cert-dashboard";
import { RegisterConsole } from "@/components/quantum/register-console";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quantum")({ component: QuantumFabric });

type TabId = "register" | "certificates" | "braket";

const TABS: Array<{
  id: TabId;
  label: string;
  eyebrow: string;
  icon: typeof Atom;
  description: string;
}> = [
  {
    id: "register",
    label: "12-Qubit Register",
    eyebrow: "STATE",
    icon: Atom,
    description: "Persistent statevector with deterministic and natural-language operations.",
  },
  {
    id: "certificates",
    label: "QuantumCert",
    eyebrow: "ATTEST",
    icon: Fingerprint,
    description: "Quantum witness, BFT quorum, and cryptographic evidence binding.",
  },
  {
    id: "braket",
    label: "Braket Bridge",
    eyebrow: "EXECUTE",
    icon: CloudCog,
    description: "Explicit boundary from local simulation to managed hardware execution.",
  },
];

function QuantumFabric() {
  const [tab, setTab] = useState<TabId>("register");

  return (
    <div className="omni-shell min-h-screen bg-bg text-fg">
      <div className="pointer-events-none fixed -right-40 -top-48 -z-10 size-[680px] rounded-full bg-quantum/[0.055] blur-3xl" />
      <div className="pointer-events-none fixed -left-60 top-1/3 -z-10 size-[520px] rounded-full bg-accent/[0.035] blur-3xl" />
      <div className="relative mx-auto min-h-screen max-w-[1500px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="glass-panel sticky top-3 z-30 flex items-center justify-between gap-4 rounded-2xl px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-quantum/20 bg-quantum/[0.07] shadow-[0_0_30px_rgba(167,139,250,.06)]">
              <Network className="size-5 text-quantum" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold tracking-[0.04em]">OMNI</p>
                <span className="rounded-full border border-quantum/20 bg-quantum/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-quantum">Quantum</span>
              </div>
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-subtle sm:text-[10px]">Hybrid trust fabric</p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface/70 px-3 text-xs text-muted transition hover:border-accent/20 hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Evidence Runtime</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[28px] border border-quantum/15 bg-[linear-gradient(145deg,rgba(18,17,34,.62),rgba(6,10,15,.82))] p-6 sm:p-9 lg:p-12">
          <div className="pointer-events-none absolute right-0 top-0 size-96 bg-[radial-gradient(circle_at_center,rgba(167,139,250,.09),transparent_65%)]" />
          <div className="relative max-w-4xl">
            <Badge className="border-quantum/25 bg-quantum/5 text-quantum">QUANTUM FABRIC / V1</Badge>
            <h1 className="mt-6 max-w-4xl text-4xl font-medium leading-[1.03] tracking-[-0.04em] sm:text-6xl">
              Quantum evidence without
              <span className="quantum-text text-quantum"> quantum theater.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-muted sm:text-base">
              Simulation, attestation, and hardware execution remain separate trust boundaries. Every layer is inspectable, every transition is explicit, and the classical evidence root stays cryptographically visible.
            </p>
          </div>

          <div className="relative mt-9 grid gap-2 sm:grid-cols-3">
            <FabricMetric icon={Cpu} label="Register" value="12 qubits" />
            <FabricMetric icon={ShieldCheck} label="Quorum" value="BFT bound" />
            <FabricMetric icon={RadioTower} label="Hardware" value="Braket bridge" />
          </div>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          <nav className="glass-panel h-fit rounded-2xl p-2" aria-label="Quantum fabric layers">
            <div className="px-3 pb-3 pt-2">
              <p className="kicker">Trust plane</p>
              <p className="mt-2 text-xs leading-5 text-muted">Choose a layer. State persists while you move between surfaces.</p>
            </div>
            <div className="space-y-1">
              {TABS.map((item, index) => {
                const active = tab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition",
                      active
                        ? "border-quantum/25 bg-quantum/[0.065] text-fg"
                        : "border-transparent text-muted hover:border-border hover:bg-elevated/70 hover:text-fg",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={cn("flex size-9 items-center justify-center rounded-lg border", active ? "border-quantum/20 bg-quantum/[0.06]" : "border-border bg-bg/35")}>
                          <Icon className={cn("size-4", active ? "text-quantum" : "text-subtle")} />
                        </span>
                        <div>
                          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-subtle">0{index + 1} / {item.eyebrow}</p>
                          <p className="mt-1 text-sm font-medium">{item.label}</p>
                        </div>
                      </div>
                      <CircuitBoard className={cn("size-3.5", active ? "text-quantum" : "text-subtle/50")} />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-subtle">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="min-w-0 rounded-2xl border border-border/70 bg-bg/25 p-3 sm:p-5">
            <div className={tab === "register" ? "block" : "hidden"}><RegisterConsole /></div>
            <div className={tab === "certificates" ? "block" : "hidden"}><CertificateDashboard /></div>
            <div className={tab === "braket" ? "block" : "hidden"}><BraketPanel /></div>
          </main>
        </section>
      </div>
    </div>
  );
}

function FabricMetric({ icon: Icon, label, value }: { icon: typeof Cpu; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-quantum/10 bg-bg/35 p-3.5">
      <span className="flex size-9 items-center justify-center rounded-lg border border-quantum/15 bg-quantum/[0.04]"><Icon className="size-4 text-quantum/80" /></span>
      <div><p className="kicker">{label}</p><p className="mt-1 font-mono text-xs text-fg">{value}</p></div>
    </div>
  );
}
