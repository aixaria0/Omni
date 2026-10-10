import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bookmark,
  BookmarkCheck,
  Crosshair,
  Loader2,
  Printer,
  Radar,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EvidenceCapsulePanel } from "@/components/osint/capsule-panel";
import { StressLab } from "@/components/osint/stress-lab";
import { LatticeBoard } from "@/components/osint/lattice-board";
import { PrismGraph } from "@/components/osint/prism-graph";
import { OverviewPanel, SourcesPanel, TimelinePanel } from "@/components/osint/overview";
import { EXAMPLE_QUERIES } from "@/lib/osint/classify";
import { runGrokLattice, runInvestigation } from "@/lib/osint/investigate";
import { useOsintStore } from "@/lib/osint/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "lattice", label: "Hypothesis Lattice" },
  { id: "stress", label: "Stress Lab" },
  { id: "prism", label: "Prism" },
  { id: "timeline", label: "Temporal" },
  { id: "sources", label: "Sources" },
  { id: "capsule", label: "Evidence Capsule" },
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
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabId>("overview");
  const [error, setError] = useState<string | null>(null);

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
    onError: (e) => setError(e instanceof Error ? e.message : "Grok lattice failed"),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("omni-q")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const watching = useMemo(
    () => current && watchlist.some((w) => w.query === current.query),
    [current, watchlist],
  );

  function submit(q: string) {
    const v = q.trim();
    if (!v || investigate.isPending) return;
    setQuery(v);
    investigate.mutate(v);
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <div className="grid-veil pointer-events-none fixed inset-0 opacity-60" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 pb-16 pt-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-elevated">
              <Crosshair className="size-5 text-accent" />
            </span>
            <div>
              <p className="text-sm font-medium tracking-tight">OmniTrace</p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">
                Public-source intelligence
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/quantum"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-elevated px-3 text-xs text-muted transition hover:text-fg"
            >
              <Activity className="size-3.5" />
              Quantum Fabric
            </Link>
            <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
              <Shield className="size-3.5" />
              Infrastructure only · no private targeting
            </div>
          </div>
        </header>

        <form
          className="mt-8 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            submit(query);
          }}
        >
          <Input
            id="omni-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="IP, domain, ASN, URL, hash, or public username"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
          <Button type="submit" disabled={investigate.isPending} className="sm:w-40">
            {investigate.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Fusing
              </>
            ) : (
              <>
                <Radar className="size-4" />
                Investigate
              </>
            )}
          </Button>
        </form>
        <p className="mt-2 text-xs text-subtle">
          Ctrl/Cmd+K to focus · RDAP, CT, DNS, InternetDB, OTX, BGP, archives
        </p>

        {error ? (
          <p className="mt-4 rounded-xl border border-danger/30 bg-elevated px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {!current && !investigate.isPending ? <EmptyState onPick={submit} /> : null}

        {investigate.isPending ? (
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl border border-border bg-elevated"
              />
            ))}
          </div>
        ) : null}

        {current && !investigate.isPending ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="hidden lg:block">
              <p className="text-[11px] uppercase tracking-[0.14em] text-subtle">Cases</p>
              <ul className="mt-3 space-y-1">
                {history.slice(0, 12).map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrent(h);
                        setQuery(h.query);
                      }}
                      className={cn(
                        "w-full rounded-lg px-3 py-2 text-left font-mono text-xs",
                        current.query === h.query
                          ? "bg-elevated text-fg"
                          : "text-muted hover:bg-surface",
                      )}
                    >
                      {h.query}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-[11px] uppercase tracking-[0.14em] text-subtle">Watchlist</p>
              <ul className="mt-3 space-y-1">
                {watchlist.length === 0 ? (
                  <li className="text-xs text-subtle">Empty</li>
                ) : (
                  watchlist.map((w) => (
                    <li key={w.query} className="flex items-center gap-1">
                      <button
                        type="button"
                        className="flex-1 truncate rounded-lg px-2 py-2 text-left font-mono text-xs text-muted hover:bg-surface"
                        onClick={() => submit(w.query)}
                      >
                        {w.query}
                      </button>
                      <button
                        type="button"
                        className="size-11 text-subtle hover:text-fg"
                        onClick={() => removeWatch(w.query)}
                        aria-label="Remove watch"
                      >
                        ×
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </aside>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="font-mono text-xl tracking-tight sm:text-2xl">{current.query}</h1>
                  <p className="mt-1 text-xs text-muted">
                    {current.kind} · {current.graph.nodes.length} entities ·{" "}
                    {current.sources.filter((s) => s.ok).length}/{current.sources.length} collectors
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      watching ? removeWatch(current.query) : addWatch(current.query)
                    }
                  >
                    {watching ? (
                      <BookmarkCheck className="size-4" />
                    ) : (
                      <Bookmark className="size-4" />
                    )}
                    {watching ? "Watching" : "Watch"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>
                    <Printer className="size-4" />
                    Brief
                  </Button>
                </div>
              </div>

              <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border pb-px">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "h-11 shrink-0 px-3 text-sm",
                      tab === t.id
                        ? "border-b-2 border-accent text-fg"
                        : "text-muted hover:text-fg",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {tab === "overview" ? <OverviewPanel inv={current} /> : null}
                {tab === "lattice" ? (
                  <LatticeBoard
                    lattice={current.lattice}
                    onUpgrade={() => upgrade.mutate()}
                    upgrading={upgrade.isPending}
                  />
                ) : null}
                {tab === "stress" ? <StressLab inv={current} /> : null}
                {tab === "prism" ? <PrismGraph graph={current.graph} /> : null}
                {tab === "timeline" ? <TimelinePanel inv={current} /> : null}
                {tab === "sources" ? <SourcesPanel inv={current} /> : null}
                {tab === "capsule" ? <EvidenceCapsulePanel inv={current} /> : null}
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {!ethicsAccepted ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/80 p-4 sm:items-center">
          <div className="max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <p className="text-[11px] uppercase tracking-[0.16em] text-subtle">Operating rules</p>
            <h2 className="mt-2 text-lg font-medium">Public infrastructure only</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              OmniTrace queries public internet records: RDAP, DNS, Certificate Transparency, Shodan
              InternetDB, AlienVault OTX, BGP, urlscan, and the Wayback Machine. It is for defensive
              security, journalism, and research. Do not use it to target private individuals.
            </p>
            <Button className="mt-6 w-full" onClick={acceptEthics}>
              Acknowledge
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="mt-14 max-w-3xl">
      <Badge tone="accent">First of its class</Badge>
      <h1 className="mt-4 text-3xl font-medium tracking-tight sm:text-4xl">Hypothesis Lattice</h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
        Other tools dump records. OmniTrace fuses public collectors in parallel, then runs Heuer's
        Analysis of Competing Hypotheses — a CIA-grade method almost no commercial OSINT product
        implements as a first-class surface. Each hypothesis is scored against evidence, with
        residual uncertainty left visible.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          {
            icon: Radar,
            t: "Signal fusion",
            d: "DNS, RDAP, CT, InternetDB, OTX, BGP, archives — one packet.",
          },
          {
            icon: Activity,
            t: "ACH lattice",
            d: "Competing hypotheses, posteriors, and an evidence matrix.",
          },
          {
            icon: Crosshair,
            t: "Prism graph",
            d: "Entities on concentric hops — infrastructure, not persons.",
          },
        ].map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-elevated p-4">
            <c.icon className="size-4 text-accent" />
            <p className="mt-3 text-sm font-medium">{c.t}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{c.d}</p>
          </div>
        ))}
      </div>
      <p className="mt-10 text-[11px] uppercase tracking-[0.14em] text-subtle">
        Try a public indicator
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLE_QUERIES.map((ex) => (
          <button
            key={ex.q}
            type="button"
            onClick={() => onPick(ex.q)}
            className="h-11 rounded-full border border-border bg-elevated px-4 font-mono text-xs text-fg hover:bg-surface"
          >
            {ex.q}
            <span className="ml-2 text-subtle">{ex.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
