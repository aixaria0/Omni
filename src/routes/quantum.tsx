import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Atom, CloudCog, Fingerprint, Network } from "lucide-react";
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
  icon: typeof Atom;
  description: string;
}> = [
  {
    id: "register",
    label: "12-Qubit Register",
    icon: Atom,
    description: "Persistent statevector + natural-language operations",
  },
  {
    id: "certificates",
    label: "QuantumCert",
    icon: Fingerprint,
    description: "Quantum witness + BFT quorum + cryptographic binding",
  },
  {
    id: "braket",
    label: "Braket Bridge",
    icon: CloudCog,
    description: "Local simulator → managed simulator → QPU",
  },
];

function QuantumFabric() {
  const [tab, setTab] = useState<TabId>("register");

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="grid-veil pointer-events-none fixed inset-0 opacity-50" />
      <div className="relative mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-elevated">
              <Network className="size-5 text-accent" />
            </span>
            <div>
              <p className="text-sm font-medium tracking-tight">Omni Quantum Fabric</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">
                Hybrid classical-quantum trust plane
              </p>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-elevated px-3 text-xs text-muted transition hover:text-fg"
          >
            <ArrowLeft className="size-3.5" />
            OmniTrace
          </Link>
        </header>

        <section className="mt-10 max-w-3xl">
          <Badge tone="accent">QUANTUM FABRIC / V1</Badge>
          <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
            Evidence you can inspect, not quantum theater.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
            Omni separates three concerns that are often blurred together: a real statevector simulator,
            cryptographically bound hybrid certificates, and an explicit hardware bridge for Amazon Braket.
            Every layer exposes its trust boundary.
          </p>
        </section>

        <nav className="mt-8 grid gap-2 lg:grid-cols-3">
          {TABS.map((item) => {
            const active = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition",
                  active
                    ? "border-accent/35 bg-elevated text-fg"
                    : "border-border bg-surface/70 text-muted hover:bg-elevated",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("size-4", active ? "text-accent" : "text-subtle")} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-subtle">{item.description}</p>
              </button>
            );
          })}
        </nav>

        <div className="mt-5">
          <div className={tab === "register" ? "block" : "hidden"}>
            <RegisterConsole />
          </div>
          <div className={tab === "certificates" ? "block" : "hidden"}>
            <CertificateDashboard />
          </div>
          <div className={tab === "braket" ? "block" : "hidden"}>
            <BraketPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
