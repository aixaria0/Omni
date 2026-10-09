import { CloudCog, Cpu, ExternalLink, Server, SquareTerminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const BACKENDS = [
  {
    id: "local",
    title: "Local simulator",
    detail: "Embedded Braket LocalSimulator for zero-cloud iteration.",
    command: "BRAKET_BACKEND=local python run_job.py --iterations 5 --shots 100",
    icon: Cpu,
  },
  {
    id: "sv1",
    title: "Managed SV1",
    detail: "Amazon-managed state-vector simulator with Hybrid Jobs telemetry.",
    command: "BRAKET_BACKEND=sv1 python run_job.py --iterations 20 --shots 1000",
    icon: Server,
  },
  {
    id: "dm1",
    title: "Managed DM1",
    detail: "Amazon-managed density-matrix simulator for noisy circuit workloads.",
    command: "BRAKET_BACKEND=dm1 python run_job.py --iterations 20 --shots 1000",
    icon: Server,
  },
  {
    id: "qpu",
    title: "QPU",
    detail: "Any Braket QPU ARN supplied at runtime; no source change required.",
    command: "BRAKET_BACKEND=qpu BRAKET_QPU_ARN=<device-arn> python run_job.py --iterations 10 --shots 100",
    icon: CloudCog,
  },
] as const;

export function BraketPanel() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <SquareTerminal className="size-4 text-accent" />
              <p className="text-sm font-medium">Amazon Braket Hybrid Jobs bridge</p>
              <Badge tone="accent">PYTHON SUBPROJECT</Badge>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
              The hardware path is deliberately isolated from the browser simulator. Backend selection is an
              environment switch, while the algorithm body remains identical across local, managed simulators,
              and QPU devices.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {BACKENDS.map((backend) => (
            <div key={backend.id} className="rounded-xl border border-border bg-elevated p-4">
              <div className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-bg">
                  <backend.icon className="size-4 text-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{backend.title}</p>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-subtle">
                      {backend.id}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{backend.detail}</p>
                  <code className="mt-3 block overflow-x-auto rounded-lg border border-border bg-bg px-3 py-2 font-mono text-[11px] text-muted">
                    {backend.command}
                  </code>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Execution contract</p>
          <div className="mt-4 space-y-3 text-xs leading-relaxed text-muted">
            <Row n="01" text="Resolve local / SV1 / DM1 / QPU from BRAKET_BACKEND." />
            <Row n="02" text="Decorate the self-contained iterative job with @hybrid_job." />
            <Row n="03" text="Emit cost, theta, and gradient metrics every iteration." />
            <Row n="04" text="Managed runs expose CloudWatch logs/metrics and S3 results." />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-sm font-medium">Repository artifact</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            The complete runner lives under <code className="font-mono text-fg">braket/</code> with a
            launcher, requirements, environment template, and setup documentation. AWS credentials and IAM
            role data are never committed.
          </p>
          <a
            href="https://docs.aws.amazon.com/braket/latest/developerguide/braket-hybrid-job-decorator.html"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-elevated px-3 text-xs text-muted hover:text-fg"
          >
            AWS Hybrid Jobs guide
            <ExternalLink className="size-3.5" />
          </a>
        </section>
      </aside>
    </div>
  );
}

function Row({ n, text }: { n: string; text: string }) {
  return (
    <div className="grid grid-cols-[28px_1fr] gap-3">
      <span className="font-mono text-subtle">{n}</span>
      <span>{text}</span>
    </div>
  );
}
