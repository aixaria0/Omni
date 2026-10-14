import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Atom,
  Bookmark,
  BookmarkCheck,
  Boxes,
  ChevronRight,
  Clock3,
  Command,
  Crosshair,
  Database,
  FileCheck2,
  FlaskConical,
  GitBranch,
  History,
  Layers3,
  Loader2,
  Menu,
  Network,
  Printer,
  Radar,
  Search,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AutopilotPanel } from "@/components/osint/autopilot-panel";
import { EvidenceCapsulePanel } from "@/components/osint/capsule-panel";
import { ScenarioRoom } from "@/components/osint/scenario-room";
import { StressLab } from "@/components/osint/stress-lab";
import { LatticeBoard } from "@/components/osint/lattice-board";
import { PrismGraph } from "@/components/osint/prism-graph";
import { OverviewPanel, SourcesPanel, TimelinePanel } from "@/components/osint/overview";
import { SCENARIO_DEMO } from "@/lib/osint/scenario-demo";
import { EXAMPLE_QUERIES } from "@/lib/osint/classify";
import { runGrokLattice, runInvestigation } from "@/lib/osint/investigate";
import { useOsintStore, type WatchItem } from "@/lib/osint/store";
import type { Investigation } from "@/lib/osint/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "lattice", label: "Lattice", icon: Layers3 },
  { id: "scenarios", label: "Scenarios", icon: GitBranch },
  { id: "stress", label: "Stress Lab", icon: FlaskConical },
  { id: "autopilot", label: "Autopilot", icon: Sparkles },
  { id: "prism", label: "Prism", icon: Network },
  { id: "timeline", label: "Temporal", icon: Clock3 },
  { id: "sources", label: "Sources", icon: Database },
  { id: "capsule", label: "Capsule", icon: FileCheck2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Home() {
  const {
    current,
    history,
    watchlist,
    ethicsAccepted,
    remember,
    setCurrent,
    acceptEthics,
    addWatch,
    removeWatch,
  } = useOsintStore();
  const [showTraining, setShowTraining] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabId>("overview");
  const [error, setError] = useState<string | null>(null);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  const investigate = useMutation({
    mutationFn: async (q: string) => runInvestigation({ data: { query: q } }),
    onSuccess: (inv) => {
      remember(inv);
      setTab("lattice");
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Investigation failed"),
  });

  const upgrade = useMutation({
    mutationFn: async () => {
      if (!current) throw new Error("No investigation");
      return runGrokLattice({ data: { investigation: current } });
    },
    onSuccess: (lattice) => {
      if (!current) return;
      remember({ ...current, grokLattice: lattice, lattice });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Lattice upgrade failed"),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("omni-q")?.focus();
      }
      if (e.key === "Escape") setMobileRailOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const watching = useMemo(
    () => current && watchlist.some((w) => w.query === current.query),
    [current, watchlist],
  );

  const liveSources = current ? current.sources.filter((s) => s.ok).length : 0;

  function submit(q: string) {
    const v = q.trim();
    if (!v || investigate.isPending) return;
    setQuery(v);
    setMobileRailOpen(false);
    investigate.mutate(v);
  }

  return (
    <div className="omni-shell min-h-screen bg-bg text-fg">
      <div className="grid-veil pointer-events-none fixed inset-0 -z-10 opacity-50" />
      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <header className="no-print glass-panel sticky top-3 z-30 flex items-center justify-between gap-4 rounded-2xl px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileRailOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-muted lg:hidden"
              aria-label="Open case navigator"
            >
              <Menu className="size-4" />
            </button>
            <span className="omni-logo flex size-10 shrink-0 items-center justify-center rounded-xl">
              <Crosshair className="size-5 text-accent" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold tracking-[0.04em]">OMNI</p>
                <span className="hidden rounded-full border border-accent/20 bg-accent/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-accent sm:inline">
                  Trace
                </span>
              </div>
              <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-subtle sm:text-[10px]">
                Evidence Intelligence Runtime
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-bg/40 px-3 py-2 text-[10px] text-muted md:flex">
              <span className="status-dot size-1.5 rounded-full bg-ok" />
              public infrastructure mode
            </div>
            <Link
              to="/quantum"
              className="group inline-flex h-10 items-center gap-2 rounded-xl border border-quantum/20 bg-quantum/5 px-3 text-xs text-muted transition hover:border-quantum/40 hover:text-fg"
            >
              <Atom className="size-3.5 text-quantum transition group-hover:rotate-12" />
              <span className="hidden sm:inline">Quantum Fabric</span>
              <ChevronRight className="size-3 text-subtle" />
            </Link>
          </div>
        </header>

        <section className="no-print mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(query);
            }}
            className="command-bar glass-panel flex flex-col gap-2 rounded-2xl p-2 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 px-2">
              <Search className="size-4 shrink-0 text-accent" />
              <Input
                id="omni-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="IP, domain, ASN, URL, hash, or public username"
                autoComplete="off"
                spellCheck={false}
                aria-label="Public infrastructure indicator"
                className="h-12 border-0 bg-transparent px-0 font-mono text-sm shadow-none focus-visible:ring-0"
              />
              <span className="hidden items-center gap-1 rounded-lg border border-border bg-bg/55 px-2 py-1 font-mono text-[9px] text-subtle md:flex">
                <Command className="size-2.5" />K
              </span>
            </div>
            <Button type="submit" disabled={investigate.isPending} className="h-12 min-w-40 rounded-xl">
              {investigate.isPending ? (
                <><Loader2 className="size-4 animate-spin" />Fusing evidence</>
              ) : (
                <><Radar className="size-4" />Investigate</>
              )}
            </Button>
          </form>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[10px] text-subtle">
            <span>RDAP · CT · DNS · InternetDB · OTX · BGP · archives</span>
            <span className="hidden items-center gap-1 sm:flex"><Shield className="size-3" />public-source boundary enforced</span>
          </div>
        </section>

        {error ? (
          <div role="alert" className="mt-4 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {!current && !investigate.isPending ? (
          <>
            <EmptyState onPick={submit} onTraining={() => setShowTraining((old) => !old)} />
            {showTraining && <section className="mt-4">
              <p className="mb-3 rounded-xl border border-border bg-surface p-4 text-sm text-muted">Synthetic training case · No live collection · Try reducing “CT: shared certificate identity” to cross the decision boundary.</p>
              <ScenarioRoom inv={SCENARIO_DEMO} />
            </section>}
          </>
        ) : null}

        {investigate.isPending ? <LoadingState /> : null}

        {current && !investigate.isPending ? (
          <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="no-print glass-panel sticky top-24 hidden h-[calc(100vh-7rem)] overflow-hidden rounded-2xl lg:flex lg:flex-col">
              <div className="border-b border-border/70 px-4 py-4">
                <p className="kicker">Navigator</p>
                <p className="mt-2 text-xs text-muted">Cases and persistent watches</p>
              </div>
              <RailContent
                history={history}
                watchlist={watchlist}
                currentQuery={current.query}
                onCase={(item) => { setCurrent(item); setQuery(item.query); }}
                onWatch={submit}
                onRemoveWatch={removeWatch}
              />
            </aside>

            <main className="min-w-0">
              <section className="scan-sheen glass-panel rounded-2xl p-4 sm:p-5">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{current.kind}</Badge>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle">live evidence packet</span>
                    </div>
                    <h1 className="accent-text mt-3 break-all font-mono text-2xl font-medium tracking-tight sm:text-3xl">
                      {current.query}
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted">
                      Evidence fused across public collectors, scored as competing hypotheses, and kept inspectable down to source payloads.
                    </p>
                  </div>
                  <div className="no-print flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => watching ? removeWatch(current.query) : addWatch(current.query)}
                    >
                      {watching ? <BookmarkCheck className="size-4 text-ok" /> : <Bookmark className="size-4" />}
                      {watching ? "Watching" : "Watch"}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => window.print()}>
                      <Printer className="size-4" />Brief
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Entities" value={String(current.graph.nodes.length)} detail="linked nodes" icon={Boxes} />
                  <Metric label="Collectors" value={`${liveSources}/${current.sources.length}`} detail="responding" icon={Database} tone="ok" />
                  <Metric label="Leading" value={current.lattice.leading} detail={`${current.lattice.confidence} confidence`} icon={Layers3} />
                  <Metric label="History" value={String(history.length)} detail="local cases" icon={History} />
                </div>
              </section>

              <nav className="no-print mt-4 flex gap-1 overflow-x-auto rounded-xl border border-border/80 bg-surface/70 p-1" aria-label="Investigation views">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs transition",
                        active
                          ? "border border-accent/15 bg-accent/8 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,.03)]"
                          : "border border-transparent text-muted hover:bg-elevated hover:text-fg",
                      )}
                    >
                      <Icon className={cn("size-3.5", active && "text-accent")} />
                      {t.label}
                    </button>
                  );
                })}
              </nav>

              <section className="mt-4 min-w-0 rounded-2xl border border-border/70 bg-bg/25 p-3 sm:p-5">
                {tab === "overview" ? <OverviewPanel inv={current} /> : null}
                {tab === "lattice" ? (
                  <LatticeBoard
                    lattice={current.lattice}
                    onUpgrade={() => upgrade.mutate()}
                    upgrading={upgrade.isPending}
                    upgradeLabel={
                      import.meta.env.VITE_STATIC_PAGES === "true"
                        ? "Recompute locally"
                        : "Upgrade with Grok"
                    }
                  />
                ) : null}
                <div hidden={tab !== "scenarios"}>
                  <ScenarioRoom key={`${current.id}:${current.collectedAt}:${JSON.stringify(current.lattice)}`} inv={current} />
                </div>
                {tab === "stress" ? <StressLab inv={current} /> : null}
                {tab === "autopilot" ? <AutopilotPanel inv={current} /> : null}
                {tab === "prism" ? <PrismGraph graph={current.graph} /> : null}
                {tab === "timeline" ? <TimelinePanel inv={current} /> : null}
                {tab === "sources" ? <SourcesPanel inv={current} /> : null}
                {tab === "capsule" ? <EvidenceCapsulePanel inv={current} /> : null}
              </section>
            </main>
          </div>
        ) : null}
      </div>

      {mobileRailOpen ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={() => setMobileRailOpen(false)} aria-label="Close navigator" />
          <aside className="glass-panel absolute inset-y-0 left-0 flex w-[min(88vw,340px)] flex-col border-y-0 border-l-0 p-0 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div><p className="kicker">Navigator</p><p className="mt-2 text-xs text-muted">Cases + watchlist</p></div>
              <button type="button" onClick={() => setMobileRailOpen(false)} className="flex size-10 items-center justify-center rounded-xl border border-border bg-surface text-muted" aria-label="Close navigator">
                <X className="size-4" />
              </button>
            </div>
            <RailContent
              history={history}
              watchlist={watchlist}
              currentQuery={current?.query}
              onCase={(item) => { setCurrent(item); setQuery(item.query); setMobileRailOpen(false); }}
              onWatch={submit}
              onRemoveWatch={removeWatch}
            />
          </aside>
        </div>
      ) : null}

      {!ethicsAccepted ? <EthicsGate onAccept={acceptEthics} /> : null}
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone?: "ok";
}) {
  return (
    <div className="metric-card rounded-xl p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="kicker">{label}</p>
        <Icon className={cn("size-3.5 text-subtle", tone === "ok" && "text-ok")} />
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className="font-mono text-lg text-fg">{value}</p>
        <p className="pb-0.5 text-[10px] text-subtle">{detail}</p>
      </div>
    </div>
  );
}

function RailContent({
  history,
  watchlist,
  currentQuery,
  onCase,
  onWatch,
  onRemoveWatch,
}: {
  history: Investigation[];
  watchlist: WatchItem[];
  currentQuery?: string;
  onCase: (item: Investigation) => void;
  onWatch: (query: string) => void;
  onRemoveWatch: (query: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
      <div className="flex items-center gap-2 px-2"><History className="size-3.5 text-subtle" /><p className="kicker">Cases</p></div>
      <ul className="mt-2 space-y-1">
        {history.length === 0 ? <li className="px-2 py-3 text-xs text-subtle">No local cases yet.</li> : history.slice(0, 16).map((h) => (
          <li key={h.id}>
            <button
              type="button"
              data-active={currentQuery === h.query}
              onClick={() => onCase(h)}
              className={cn(
                "rail-button w-full rounded-xl px-3 py-2.5 text-left transition",
                currentQuery === h.query ? "bg-accent/6 text-fg" : "text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              <p className="truncate font-mono text-xs">{h.query}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-subtle">{h.kind} · {h.sources.filter((s) => s.ok).length}/{h.sources.length} live</p>
            </button>
          </li>
        ))}
      </ul>

      <div className="my-4 hairline" />
      <div className="flex items-center gap-2 px-2"><Bookmark className="size-3.5 text-subtle" /><p className="kicker">Watchlist</p></div>
      <ul className="mt-2 space-y-1">
        {watchlist.length === 0 ? <li className="px-2 py-3 text-xs text-subtle">Nothing pinned.</li> : watchlist.map((w) => (
          <li key={w.query} className="group flex items-center gap-1 rounded-xl hover:bg-elevated">
            <button type="button" className="min-w-0 flex-1 px-3 py-2.5 text-left" onClick={() => onWatch(w.query)}>
              <p className="truncate font-mono text-xs text-muted group-hover:text-fg">{w.query}</p>
            </button>
            <button type="button" className="mr-1 flex size-9 items-center justify-center rounded-lg text-subtle hover:bg-surface hover:text-danger" onClick={() => onRemoveWatch(w.query)} aria-label={`Remove ${w.query} from watchlist`}>
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 grid gap-3 lg:grid-cols-[250px_1fr]">
      <div className="hidden h-96 animate-pulse rounded-2xl border border-border bg-surface lg:block" />
      <div className="space-y-3">
        <div className="h-48 animate-pulse rounded-2xl border border-border bg-elevated" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-surface" />)}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onPick, onTraining }: { onPick: (q: string) => void; onTraining: () => void }) {
  const capabilities = [
    { icon: Layers3, tag: "01", title: "Hypothesis Lattice", desc: "Competing hypotheses scored against explicit evidence instead of opaque conclusions." },
    { icon: FlaskConical, tag: "02", title: "Stress Engine", desc: "Knock out evidence, expose correlated dependencies, and find the minimum decision flip." },
    { icon: Sparkles, tag: "03", title: "Autopilot", desc: "Proof-carrying multi-round investigations with reproducible planner receipts." },
    { icon: Atom, tag: "04", title: "Quantum Fabric", desc: "Inspect statevectors, hybrid certificates, quorum binding, and a Braket hardware boundary." },
  ];

  return (
    <main className="mt-10 pb-10">
      <section className="relative overflow-hidden rounded-[28px] border border-border/80 bg-[linear-gradient(145deg,rgba(14,22,33,.72),rgba(4,8,12,.72))] px-5 py-10 sm:px-9 sm:py-14 lg:px-14 lg:py-16">
        <div className="pointer-events-none absolute -right-24 -top-32 size-[420px] rounded-full bg-accent/[0.045] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 size-[360px] rounded-full bg-quantum/[0.04] blur-3xl" />
        <div className="relative max-w-4xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">PROOF-CARRYING INTELLIGENCE</Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">public infrastructure only</span>
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-medium leading-[1.02] tracking-[-0.04em] text-fg sm:text-6xl lg:text-7xl">
            Trace the infrastructure.<br />
            <span className="accent-text text-accent">Interrogate the evidence.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Omni fuses public-source telemetry into an inspectable evidence graph, challenges its own conclusions, and keeps the path from observation to verdict reproducible.
          </p>

          <Button className="mt-6" variant="secondary" onClick={onTraining}>
            <GitBranch className="size-4" /> Explore the scenario playground
            <span className="text-xs text-muted">No network needed</span>
          </Button>
          <div className="mt-8 flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.slice(0, 4).map((ex) => (
              <button key={ex.q} type="button" onClick={() => onPick(ex.q)} className="group flex h-11 items-center gap-2 rounded-xl border border-border bg-bg/45 px-3.5 font-mono text-xs text-fg transition hover:border-accent/30 hover:bg-accent/5">
                <Radar className="size-3.5 text-subtle group-hover:text-accent" />
                {ex.q}<span className="text-[10px] text-subtle">{ex.label}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map((c) => {
          const Icon = c.icon;
          return (
            <article key={c.title} className="metric-card group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-accent/20">
              <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-subtle">{c.tag}</span><Icon className="size-4 text-accent/75" /></div>
              <h2 className="mt-8 text-base font-medium text-fg">{c.title}</h2>
              <p className="mt-2 text-xs leading-5 text-muted">{c.desc}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="glass-panel rounded-2xl p-5 sm:p-6">
          <p className="kicker">Trust model</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <TrustItem title="Inspect" body="Raw collector payloads stay visible." />
            <TrustItem title="Challenge" body="Stress tests attack the leading conclusion." />
            <TrustItem title="Reproduce" body="Capsules bind evidence to verifiable roots." />
          </div>
        </div>
        <Link to="/quantum" className="group flex min-h-36 items-center justify-between gap-6 rounded-2xl border border-quantum/15 bg-quantum/[0.035] p-6 transition hover:border-quantum/35 sm:min-w-[310px]">
          <div><p className="kicker text-quantum/70">Separate trust plane</p><p className="quantum-text mt-3 text-lg font-medium">Enter Quantum Fabric</p><p className="mt-1 text-xs text-muted">Statevector → certificate → hardware bridge</p></div>
          <ChevronRight className="size-5 text-quantum transition group-hover:translate-x-1" />
        </Link>
      </section>
    </main>
  );
}

function TrustItem({ title, body }: { title: string; body: string }) {
  return <div><p className="font-mono text-xs text-accent">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{body}</p></div>;
}

function EthicsGate({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-bg/82 p-3 backdrop-blur-md sm:items-center sm:p-6">
      <div role="dialog" aria-modal="true" aria-labelledby="ethics-title" className="glass-panel w-full max-w-lg overflow-hidden rounded-2xl">
        <div className="hairline" />
        <div className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="omni-logo flex size-10 items-center justify-center rounded-xl"><Shield className="size-4 text-accent" /></span>
            <div><p className="kicker">Operating boundary</p><h2 id="ethics-title" className="mt-1 text-lg font-medium">Public infrastructure only</h2></div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted">
            Omni queries public internet records including RDAP, DNS, Certificate Transparency, InternetDB, OTX, BGP, urlscan, and archives. It is designed for defensive security, journalism, and infrastructure research—not private-person targeting.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <BoundaryItem title="Public" body="Open records" />
            <BoundaryItem title="Traceable" body="Source payloads" />
            <BoundaryItem title="Defensive" body="Research scope" />
          </div>
          <Button className="mt-6 w-full" onClick={onAccept}><Shield className="size-4" />Accept operating boundary</Button>
        </div>
      </div>
    </div>
  );
}

function BoundaryItem({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border border-border bg-bg/35 p-3"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent">{title}</p><p className="mt-1 text-[11px] text-subtle">{body}</p></div>;
}
