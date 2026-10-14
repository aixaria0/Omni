import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Atom,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Command,
  Crosshair,
  Database,
  FileCheck2,
  FlaskConical,
  GitBranch,
  Layers3,
  Loader2,
  Menu,
  Network,
  Orbit,
  Printer,
  Search,
  Shield,
  Sparkles,
  X,
  Clock3,
} from "lucide-react";
import { AutopilotPanel } from "@/components/osint/autopilot-panel";
import { EvidenceCapsulePanel } from "@/components/osint/capsule-panel";
import { ScenarioRoom } from "@/components/osint/scenario-room";
import { StressLab } from "@/components/osint/stress-lab";
import { LatticeBoard } from "@/components/osint/lattice-board";
import { PrismGraph } from "@/components/osint/prism-graph";
import { Observatory } from "@/components/osint/observatory";
import { OverviewPanel, SourcesPanel, TimelinePanel } from "@/components/osint/overview";
import { OBSERVATORY_DEMO } from "@/lib/osint/observatory-demo";
import { EXAMPLE_QUERIES } from "@/lib/osint/classify";
import { runGrokLattice, runInvestigation } from "@/lib/osint/investigate";
import { useOsintStore } from "@/lib/osint/store";
import type { Investigation } from "@/lib/osint/types";

export const Route = createFileRoute("/")({ component: Home });
const VIEWS = [
  { id: "observatory", label: "Observatory", icon: Orbit, caption: "The whole picture" },
  { id: "lattice", label: "Hypotheses", icon: Layers3, caption: "Competing explanations" },
  { id: "scenarios", label: "Scenario room", icon: GitBranch, caption: "Alternate outcomes" },
  { id: "stress", label: "Stress engine", icon: FlaskConical, caption: "Challenge the conclusion" },
  { id: "autopilot", label: "Autopilot", icon: Sparkles, caption: "Bounded investigation" },
  { id: "prism", label: "Prism graph", icon: Network, caption: "Inspect connections" },
  { id: "overview", label: "Evidence", icon: Activity, caption: "The underlying observations" },
  { id: "timeline", label: "Timeline", icon: Clock3, caption: "History of observations" },
  { id: "sources", label: "Sources", icon: Database, caption: "Collector responses" },
  { id: "capsule", label: "Proof capsule", icon: FileCheck2, caption: "Seal and verify" },
] as const;
type ViewId = (typeof VIEWS)[number]["id"];

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
  const [view, setView] = useState<ViewId>("observatory");
  const [railOpen, setRailOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedQuery, setQueuedQuery] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandFilter, setCommandFilter] = useState("");
  const inv = current ?? OBSERVATORY_DEMO;
  const training = !current;
  const watching = current && watchlist.some((w) => w.query === current.query);
  const investigate = useMutation({
    mutationFn: async (q: string) => runInvestigation({ data: { query: q } }),
    onSuccess: (result) => {
      remember(result);
      setView("observatory");
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Investigation failed"),
  });
  const upgrade = useMutation({
    mutationFn: async () => runGrokLattice({ data: { investigation: inv } }),
    onSuccess: (lattice) => {
      if (current) remember({ ...current, grokLattice: lattice, lattice });
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Lattice upgrade failed"),
  });
  function navigate(id: ViewId) {
    setView(id);
    setRailOpen(false);
    setCommandOpen(false);
  }
  function submit(q: string) {
    const value = q.trim();
    if (!value || investigate.isPending) return;
    setQuery(value);
    setRailOpen(false);
    setError(null);
    if (!ethicsAccepted) {
      setQueuedQuery(value);
      return;
    }
    investigate.mutate(value);
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((old) => !old);
      }
      if (e.key === "Escape") setRailOpen(false);
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        document.getElementById("omni-q")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="omni-v2">
      {railOpen && (
        <button
          className="rail-scrim"
          aria-label="Close navigation"
          onClick={() => setRailOpen(false)}
        />
      )}
      <aside
        className={`mission-rail ${railOpen ? "is-open" : ""}`}
        aria-label="Workspace navigation"
      >
        <button
          className="brand-lockup"
          onClick={() => navigate("observatory")}
          aria-label="OMNI Observatory"
        >
          <span className="brand-mark">
            <Crosshair />
          </span>
          <span>
            OMNI<small>INTELLIGENCE WORKSPACE</small>
          </span>
          <span className="brand-version">02</span>
        </button>
        <div className="rail-section-label">
          WORKSPACE <span>10</span>
        </div>
        <nav className="mission-nav">
          {VIEWS.map((item, i) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <item.icon />
              <span>{item.label}</span>
              <small>{String(i + 1).padStart(2, "0")}</small>
            </button>
          ))}
        </nav>
        <div className="rail-section-label rail-cases-label">
          CASE FILES <span>{history.length}</span>
        </div>
        <div className="rail-case-list">
          {history.length === 0 ? (
            <p>
              Your investigations
              <br />
              will live here.
            </p>
          ) : (
            history.slice(0, 8).map((item) => (
              <button
                key={item.id}
                className={current?.id === item.id ? "case-active" : ""}
                onClick={() => {
                  setCurrent(item);
                  setQuery(item.query);
                  navigate("observatory");
                }}
              >
                <span className="case-indicator" />
                <span>
                  {item.query}
                  <small>
                    {item.kind} / {item.sources.filter((s) => s.ok).length} collectors
                  </small>
                </span>
              </button>
            ))
          )}
        </div>
        {watchlist.length > 0 && (
          <div className="rail-watchlist">
            <p className="rail-section-label">WATCHLIST</p>
            {watchlist.map((item) => (
              <div key={item.query}>
                <button onClick={() => submit(item.query)}>{item.query}</button>
                <button
                  aria-label={`Remove watch ${item.query}`}
                  onClick={() => removeWatch(item.query)}
                >
                  <X />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="rail-bottom">
          <Link to="/quantum">
            <Atom />
            <span>
              Quantum Fabric<small>Separate verification plane</small>
            </span>
            <ArrowUpRight />
          </Link>
          <p>
            <span className="signal-dot" />
            LOCAL WORKSPACE<span>v2.0</span>
          </p>
        </div>
      </aside>
      <div className="mission-main">
        <header className="mission-topbar">
          <div>
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setRailOpen(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              WORKSPACE <ChevronRight /> <strong>{VIEWS.find((v) => v.id === view)?.label}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="topbar-mode">
              <span className="signal-dot" />
              {training ? "OFFLINE EXPLORATION" : "RECORDED OBSERVATIONS"}
            </span>
            <button
              className="command-trigger"
              onClick={() => setCommandOpen(true)}
              aria-label="Open command palette"
            >
              <Command />
              <span>K</span>
            </button>
            <a
              href="https://github.com/aixaria0/Omni"
              target="_blank"
              rel="noreferrer"
              aria-label="Open OMNI repository"
            >
              <ArrowUpRight />
            </a>
          </div>
        </header>
        <main className="mission-content">
          <section className="mission-masthead">
            <div>
              <p className="eyebrow">
                <span />
                EVIDENCE INTELLIGENCE / OBSERVATORY EDITION
              </p>
              <h1>
                {view === "observatory" ? (
                  <>
                    See the connections.
                    <br />
                    <span>Question the conclusion.</span>
                  </>
                ) : (
                  VIEWS.find((v) => v.id === view)?.label
                )}
              </h1>
              <p className="masthead-copy">
                {view === "observatory"
                  ? "An investigation is a living set of explanations. Explore the evidence. Change an assumption. Follow what moves."
                  : VIEWS.find((v) => v.id === view)?.caption}
              </p>
            </div>
            <div className="masthead-index">
              <span>OMNI</span>
              <strong>
                {String(VIEWS.findIndex((v) => v.id === view) + 1).padStart(2, "0")}
                <small>/10</small>
              </strong>
              <p>OBSERVE · CHALLENGE · VERIFY</p>
            </div>
          </section>
          <section className="indicator-section">
            <form
              className="indicator-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit(query);
              }}
            >
              <Search />
              <input
                id="omni-q"
                aria-label="Public infrastructure indicator"
                placeholder="Start with an IP, domain, ASN, or public indicator…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd>/</kbd>
              <button disabled={investigate.isPending} type="submit">
                {investigate.isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Collecting
                  </>
                ) : (
                  <>
                    Investigate <ArrowRight />
                  </>
                )}
              </button>
            </form>
            <div className="indicator-examples">
              <span>EXPLORE A PUBLIC RECORD</span>
              {EXAMPLE_QUERIES.slice(0, 4).map((example) => (
                <button
                  key={example.q}
                  disabled={investigate.isPending}
                  onClick={() => submit(example.q)}
                >
                  {example.q}
                  <ArrowUpRight />
                </button>
              ))}
            </div>
          </section>
          {error && (
            <div className="mission-error" role="alert">
              {error}
              <button onClick={() => setError(null)} aria-label="Dismiss error">
                <X />
              </button>
            </div>
          )}
          {investigate.isPending && (
            <div className="collection-progress" role="status">
              <Loader2 className="animate-spin" />
              <div>
                <strong>Collecting public observations for {query}</strong>
                <span>The current view remains available while collectors finish.</span>
              </div>
              <div className="collection-progress-track">
                <i />
              </div>
            </div>
          )}
          <section className="case-strip">
            <div>
              <span className={`case-mode ${training ? "is-training" : ""}`}>
                {training ? "SYNTHETIC EXERCISE" : "CASE FILE"}
              </span>
              <h2>{inv.query}</h2>
              <span className="case-kind">{inv.kind}</span>
            </div>
            <div className="case-strip-actions">
              {training ? (
                <span className="case-description">
                  Explore the workspace. No network requests.
                </span>
              ) : (
                <>
                  <button
                    aria-pressed={!!watching}
                    onClick={() => (watching ? removeWatch(inv.query) : addWatch(inv.query))}
                  >
                    {watching ? <BookmarkCheck /> : <Bookmark />}
                    {watching ? "Watching" : "Watch"}
                  </button>
                  <button
                    onClick={() => {
                      setCurrent(null);
                      setQuery("");
                      setView("observatory");
                    }}
                  >
                    Open exercise
                  </button>
                </>
              )}
              <button onClick={() => window.print()} aria-label="Print case brief">
                <Printer />
                <span>Brief</span>
              </button>
            </div>
          </section>
          <section className="case-measures" aria-label="Case metrics">
            <CaseMeasure
              label="Linked entities"
              value={String(inv.graph.nodes.length).padStart(2, "0")}
              detail={`${inv.graph.edges.length} relationships`}
            />
            <CaseMeasure
              label="Evidence threads"
              value={String(inv.lattice.matrix.length).padStart(2, "0")}
              detail="ready to challenge"
            />
            <CaseMeasure
              label={training ? "Synthetic collectors" : "Responding collectors"}
              value={`${inv.sources.filter((s) => s.ok).length}/${inv.sources.length}`}
              detail={training ? "illustrative observations" : "at collection time"}
            />
            <CaseMeasure
              label="Competing hypotheses"
              value={String(inv.lattice.hypotheses.length).padStart(2, "0")}
              detail={`${inv.lattice.engine} analysis`}
            />
          </section>
          <Desk
            key={`${inv.id}:${inv.collectedAt}:${JSON.stringify(inv.lattice)}`}
            inv={inv}
            training={training}
            view={view}
            onNavigate={navigate}
            onUpgrade={() => upgrade.mutate()}
            upgrading={upgrade.isPending}
          />
          <footer className="mission-footer">
            <span>
              <Crosshair /> OMNI / EVIDENCE INTELLIGENCE
            </span>
            <p>Inspect the claim. Preserve the disagreement.</p>
            <span>INTEGRITY ≠ TRUTH</span>
          </footer>
        </main>
      </div>
      <Dialog.Root
        open={queuedQuery !== null}
        onOpenChange={(open) => {
          if (!open) setQueuedQuery(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="mission-dialog-overlay" />
          <Dialog.Content className="mission-dialog">
            <Dialog.Close className="dialog-close" aria-label="Close operating boundary">
              <X />
            </Dialog.Close>
            <Shield className="dialog-emblem" />
            <p className="eyebrow">BEFORE LIVE COLLECTION</p>
            <Dialog.Title>Public infrastructure only.</Dialog.Title>
            <Dialog.Description>
              OMNI queries public internet records for defensive research, journalism, and
              infrastructure analysis. Keep investigations within that scope. It is not a
              private-person targeting tool.
            </Dialog.Description>
            <div className="dialog-boundaries">
              <span>PUBLIC RECORDS</span>
              <span>INSPECTABLE SOURCES</span>
              <span>DEFENSIVE RESEARCH</span>
            </div>
            <button
              className="dialog-primary"
              onClick={() => {
                const q = queuedQuery;
                acceptEthics();
                setQueuedQuery(null);
                if (q) investigate.mutate(q);
              }}
            >
              Accept and investigate <ArrowRight />
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="mission-dialog-overlay" />
          <Dialog.Content className="mission-dialog command-dialog">
            <Dialog.Title className="sr-only">Workspace commands</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search and navigate OMNI views.
            </Dialog.Description>
            <label className="command-search">
              <Search />
              <input
                autoFocus
                placeholder="Where do you want to go?"
                aria-label="Search workspace commands"
                value={commandFilter}
                onChange={(e) => setCommandFilter(e.target.value)}
              />
              <Dialog.Close aria-label="Close commands">
                <X />
              </Dialog.Close>
            </label>
            <div className="command-results">
              {VIEWS.filter((item) =>
                `${item.label} ${item.caption}`.toLowerCase().includes(commandFilter.toLowerCase()),
              ).map((item) => (
                <button key={item.id} onClick={() => navigate(item.id)}>
                  <item.icon />
                  <span>
                    {item.label}
                    <small>{item.caption}</small>
                  </span>
                  <ArrowUpRight />
                </button>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function CaseMeasure({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
function Desk({
  inv,
  training,
  view,
  onNavigate,
  onUpgrade,
  upgrading,
}: {
  inv: Investigation;
  training: boolean;
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onUpgrade: () => void;
  upgrading: boolean;
}) {
  const [retention, setRetention] = useState<Record<string, number>>({});
  return (
    <>
      <div hidden={view !== "observatory"}>
        <Observatory
          inv={inv}
          training={training}
          retention={retention}
          setRetention={setRetention}
          onScenarios={() => onNavigate("scenarios")}
        />
      </div>
      <div className="mission-view-panel" hidden={view !== "scenarios"}>
        <ScenarioRoom inv={inv} controls={{ retention, setRetention }} />
      </div>
      {view === "lattice" && (
        <section className="mission-view-panel">
          <LatticeBoard
            lattice={inv.lattice}
            onUpgrade={training ? undefined : onUpgrade}
            upgrading={upgrading}
            upgradeLabel={
              import.meta.env.VITE_STATIC_PAGES === "true"
                ? "Recompute locally"
                : "Upgrade with Grok"
            }
          />
        </section>
      )}
      {view === "stress" && (
        <section className="mission-view-panel">
          <StressLab inv={inv} />
        </section>
      )}
      {view === "autopilot" && (
        <section className="mission-view-panel">
          {training ? (
            <div className="training-autopilot">
              <Sparkles />
              <h2>Ready for a real investigation.</h2>
              <p>
                Autopilot makes bounded public-infrastructure pivots. Collect a real indicator above
                to start it; the synthetic exercise never triggers automatic network requests.
              </p>
            </div>
          ) : (
            <AutopilotPanel inv={inv} />
          )}
        </section>
      )}
      {view === "prism" && (
        <section className="mission-view-panel">
          <PrismGraph graph={inv.graph} />
        </section>
      )}
      {view === "overview" && (
        <section className="mission-view-panel">
          <OverviewPanel inv={inv} />
        </section>
      )}
      {view === "timeline" && (
        <section className="mission-view-panel">
          <TimelinePanel inv={inv} />
        </section>
      )}
      {view === "sources" && (
        <section className="mission-view-panel">
          <SourcesPanel inv={inv} />
        </section>
      )}
      {view === "capsule" && (
        <section className="mission-view-panel">
          <EvidenceCapsulePanel inv={inv} />
        </section>
      )}
    </>
  );
}
