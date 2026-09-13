"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Database,
  History,
  GitBranch,
  Play,
  Pause,
  Plus,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  Check,
  Activity,
  AlertCircle,
} from "lucide-react";
import { ReplayEvent, MonitoredTableInfo } from "@/lib/types/event";
import { reconstructRecord } from "@/lib/engine/reconstruct";
import { computeStateDiff } from "@/lib/engine/diff";
import { BranchModal } from "@/components/branch/branch-modal";
import { MutationModal } from "@/components/mutation/mutation-modal";

type Status = {
  database: { connected: boolean; mode: string };
  totalEventsInLedger: number;
};
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const json = await response.json();
  if (!response.ok || !json.success)
    throw new Error(json.error || "Unable to connect. Please try again.");
  return json.data as T;
}
const time = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
const display = (value: unknown) =>
  value === undefined
    ? "—"
    : value === null
      ? "null"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

export default function ReplayDBStudio() {
  const [status, setStatus] = useState<Status | null>(null);
  const [tables, setTables] = useState<MonitoredTableInfo[]>([]);
  const [ledger, setLedger] = useState<ReplayEvent[]>([]);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [table, setTable] = useState("users");
  const [pk, setPk] = useState("1");
  const [draftPk, setDraftPk] = useState("1");
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"record" | "transaction">("record");
  const [search, setSearch] = useState("");
  const [playing, setPlaying] = useState(false);
  const [branch, setBranch] = useState(false);
  const [mutation, setMutation] = useState(false);
  const [revision, setRevision] = useState(0);
  const pendingEvent = useRef<string | null>(null);
  const sculpture = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const [system, monitored, global] = await Promise.all([
      api<Status>("/api/v1/system/status"),
      api<MonitoredTableInfo[]>("/api/v1/management/tables"),
      api<ReplayEvent[]>("/api/v1/history/events?limit=200"),
    ]);
    setStatus(system);
    setTables(monitored);
    setLedger(global);
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh, revision]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPlaying(false);
    setEvents([]);
    setIndex(0);
    api<{ events: ReplayEvent[] }>(
      `/api/v1/history/records/${encodeURIComponent(table)}/${encodeURIComponent(pk)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        const list = data.events || [];
        setEvents(list);
        const requested = list.findIndex(
          (event) => event.eventId === pendingEvent.current,
        );
        setIndex(requested >= 0 ? requested : Math.max(0, list.length - 1));
        pendingEvent.current = null;
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [table, pk, revision]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setIndex((i) => {
          if (i >= events.length - 1) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        }),
      1100,
    );
    return () => clearInterval(timer);
  }, [playing, events.length]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const action = async (actionName: "seed" | "inject_bug") => {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionName }),
      });
      setTable("users");
      setPk("1");
      setDraftPk("1");
      setRevision((r) => r + 1);
      setNotice(
        actionName === "seed"
          ? "Demo restored. Your investigation starts here."
          : "Demo incident added. Select transaction 402 to investigate.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };
  const selectEvent = (event: ReplayEvent) => {
    setPlaying(false);
    setDraftPk(event.recordPk);
    if (event.tableName === table && event.recordPk === pk)
      setIndex(events.findIndex((e) => e.eventId === event.eventId));
    else {
      pendingEvent.current = event.eventId;
      setTable(event.tableName);
      setPk(event.recordPk);
    }
  };
  const current = events[index];
  const state = current
    ? reconstructRecord(table, pk, events, current.recordedAt)
    : null;
  const diffs = current
    ? computeStateDiff(current.oldState, current.newState)
    : [];
  const txEvents = current
    ? ledger.filter((e) => e.transactionId === current.transactionId)
    : [];
  const filtered = ledger.filter((e) =>
    `${e.tableName} ${e.recordPk} ${e.transactionId} ${e.operationType}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const jump = () =>
    document
      .getElementById("studio")
      ?.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });

  return (
    <>
      <a className="skip-link" href="#studio">
        Skip to workspace
      </a>
      <header className="site-header shell">
        <a className="wordmark" href="#" aria-label="ReplayDB home">
          <span className="brand-mark">
            <History size={23} />
          </span>
          replay<span>db</span>
          <sup>®</sup>
        </a>
        <nav aria-label="Main navigation">
          <a href="#studio">Workspace</a>
          <a href="#how-it-works">How it works</a>
          <a
            href="https://github.com/harkirath1511/Se"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRight size={13} />
          </a>
        </nav>
        <button className="button dark small" onClick={jump}>
          Open studio <ArrowUpRight size={16} />
        </button>
      </header>

      <main>
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="orange-dot" /> THE PAST IS STILL POSSIBLE
            </div>
            <h1 id="hero-title">
              Every change.
              <br />
              Every version.
              <br />
              <span>A way back.</span>
            </h1>
            <p>
              Your database has a story. Rewind the moments,
              <br className="desktop-break" /> understand the changes, and
              explore what could have been.
            </p>
            <div className="hero-actions">
              <button className="button orange" onClick={jump}>
                Explore your timeline <ArrowUpRight size={18} />
              </button>
              <a className="text-link" href="#how-it-works">
                <span className="play-outline">
                  <Play size={12} />
                </span>{" "}
                Meet ReplayDB
              </a>
            </div>
            <div className="hero-note">
              <span className="tiny-line" /> Built for PostgreSQL. Designed for
              peace of mind.
            </div>
          </div>
          <div
            className="hero-art"
            onPointerMove={(e) => {
              if (
                !sculpture.current ||
                matchMedia("(prefers-reduced-motion: reduce)").matches
              )
                return;
              const r = e.currentTarget.getBoundingClientRect();
              sculpture.current.style.setProperty(
                "--tilt",
                `${(e.clientX - r.left - r.width / 2) / 35}deg`,
              );
            }}
            onPointerLeave={() =>
              sculpture.current?.style.setProperty("--tilt", "0deg")
            }
          >
            <div className="art-grid" />
            <span className="art-coordinate">FIG. 01 / A MEMORY IN MOTION</span>
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="sculpture" ref={sculpture} aria-hidden="true">
              <div className="ring-stack">
                {Array.from({ length: 15 }, (_, i) => (
                  <div
                    key={i}
                    className="time-ring"
                    style={{ "--i": i } as React.CSSProperties}
                  />
                ))}
              </div>
            </div>
            <div className="floating-label label-past">
              <span /> PAST STATE <span className="label-code">t − 1</span>
            </div>
            <div className="floating-label label-now">
              <span className="orange-dot" /> YOU ARE HERE{" "}
              <span className="label-code">t = now</span>
            </div>
            <div className="art-caption">
              <span className="crosshair">+</span> Nothing lost. Everything
              connected.<span>↗</span>
            </div>
          </div>
        </section>
        <div className="principles shell">
          <span>YOUR DATA. WITH A MEMORY.</span>
          <div>
            <History size={16} /> Rewind any moment
          </div>
          <div>
            <Layers size={16} /> Understand every change
          </div>
          <div>
            <GitBranch size={16} /> Explore another outcome
          </div>
          <a href="#studio" aria-label="Scroll to studio">
            <ArrowDown size={20} />
          </a>
        </div>

        <section className="workspace-section" id="studio">
          <div className="shell">
            <div className="section-heading">
              <div>
                <div className="eyebrow">01 / THE WORKSPACE</div>
                <h2>
                  A little perspective.
                  <br />
                  <span>A lot of clarity.</span>
                </h2>
              </div>
              <p>
                Follow a record through time.
                <br />
                Every event is a piece of the bigger picture.
              </p>
            </div>
            <div className="studio">
              <div className="studio-top">
                <div className="studio-title">
                  <span className="studio-icon">
                    <Database size={18} />
                  </span>
                  <strong>Replay Studio</strong>
                  <span className="version">v1.0</span>
                </div>
                <span className="connection">
                  <span className={status ? "green-dot" : "orange-dot"} />
                  {status
                    ? status.database.connected
                      ? "PostgreSQL connected"
                      : "Demo workspace"
                    : "Connecting…"}
                </span>
              </div>
              <div className="studio-body">
                <aside className="sidebar">
                  <div className="sidebar-label">
                    EXPLORER <Database size={12} />
                  </div>
                  <div className="database-name">
                    <span className="green-dot" /> replaydb <span>public</span>
                  </div>
                  <div className="table-list">
                    {tables.map((t) => (
                      <button
                        className={table === t.name ? "selected" : ""}
                        key={t.name}
                        onClick={() => {
                          setTable(t.name);
                          setPk("1");
                          setDraftPk("1");
                        }}
                      >
                        <Layers size={15} />
                        {t.name}
                        <span>{t.eventCount}</span>
                      </button>
                    ))}
                  </div>
                  <div className="sidebar-bottom">
                    <div className="eyebrow">A SAFE PLACE TO EXPLORE</div>
                    <p>
                      Try a different past.
                      <br />
                      Keep your source data intact.
                    </p>
                    <button
                      className="text-link"
                      disabled={!events.length || loading}
                      onClick={() => setBranch(true)}
                    >
                      Create a branch <ArrowUpRight size={14} />
                    </button>
                  </div>
                </aside>
                <div className="studio-main">
                  <div className="record-toolbar">
                    <div className="breadcrumb">
                      public <span>/</span> <strong>{table}</strong>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (draftPk.trim()) {
                          setPk(draftPk.trim());
                          setRevision((r) => r + 1);
                        }
                      }}
                    >
                      <label htmlFor="record-key">Record</label>
                      <input
                        id="record-key"
                        value={draftPk}
                        onChange={(e) => setDraftPk(e.target.value)}
                        required
                        aria-label="Record primary key"
                      />
                      <button aria-label="Load record" disabled={loading}>
                        <ArrowRight size={15} />
                      </button>
                    </form>
                    <button
                      className="button subtle small branch-toolbar"
                      aria-label="Create a branch"
                      disabled={!events.length || loading}
                      onClick={() => setBranch(true)}
                    >
                      <GitBranch size={14} />
                      <span>Branch</span>
                    </button>
                    <button
                      className="button subtle small"
                      aria-label="New mutation"
                      onClick={() => setMutation(true)}
                    >
                      <Plus size={14} /> New mutation
                    </button>
                  </div>
                  {error && (
                    <div className="error-banner" role="alert">
                      <AlertCircle size={16} />
                      {error}
                      <button
                        onClick={() => {
                          setError("");
                          setRevision((r) => r + 1);
                        }}
                      >
                        Retry
                      </button>
                      <button
                        aria-label="Dismiss error"
                        onClick={() => setError("")}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                  <div className="timeline-panel" aria-busy={loading}>
                    <div className="panel-heading">
                      <div>
                        <span className="eyebrow">RECORD TIMELINE</span>
                        <h3>
                          {loading
                            ? "Finding your moments…"
                            : events.length
                              ? "A journey through changes."
                              : "A clean slate."}
                        </h3>
                      </div>
                      <span className="count-badge">
                        {events.length} events
                      </span>
                    </div>
                    {events.length > 0 ? (
                      <>
                        <div className="timeline-track">
                          <div className="track-line" />
                          <div
                            className="track-progress"
                            style={{
                              width: `${events.length > 1 ? (index / (events.length - 1)) * 100 : 0}%`,
                            }}
                          />
                          {events.map((event, i) => (
                            <button
                              key={event.eventId}
                              aria-label={`Select event ${event.eventId}, transaction ${event.transactionId}`}
                              aria-pressed={i === index}
                              className={`event-marker ${i <= index ? "passed" : ""} ${i === index ? "active" : ""} ${event.transactionId === "402" ? "incident" : ""}`}
                              onClick={() => {
                                setIndex(i);
                                setPlaying(false);
                              }}
                            >
                              <span className="event-tooltip">
                                Tx {event.transactionId}
                              </span>
                              <i />
                              <span className="event-time">
                                {time(event.recordedAt).slice(0, 5)}
                              </span>
                            </button>
                          ))}
                        </div>
                        <input
                          className="timeline-range"
                          type="range"
                          min={0}
                          max={events.length - 1}
                          value={index}
                          aria-label="Scrub through record history"
                          onChange={(e) => {
                            setIndex(Number(e.target.value));
                            setPlaying(false);
                          }}
                        />
                        <div className="playback">
                          <div>
                            <button
                              aria-label="Previous event"
                              disabled={index <= 0}
                              onClick={() => {
                                setPlaying(false);
                                setIndex((i) => i - 1);
                              }}
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              className="play-button"
                              aria-label={
                                playing ? "Pause replay" : "Play replay"
                              }
                              onClick={() => {
                                if (index === events.length - 1) setIndex(0);
                                setPlaying((p) => !p);
                              }}
                            >
                              {playing ? (
                                <Pause size={13} />
                              ) : (
                                <Play size={13} />
                              )}
                            </button>
                            <button
                              aria-label="Next event"
                              disabled={index >= events.length - 1}
                              onClick={() => {
                                setPlaying(false);
                                setIndex((i) => i + 1);
                              }}
                            >
                              <ChevronRight size={16} />
                            </button>
                            <span>
                              {playing
                                ? "Replaying history"
                                : "Travel through time"}
                            </span>
                          </div>
                          <span className="timestamp">
                            {current ? `${time(current.recordedAt)} UTC` : "—"}{" "}
                            <span>
                              EVENT {index + 1} OF {events.length}
                            </span>
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="empty-state">
                        {loading
                          ? "Loading record history from the ledger."
                          : "No history for this record. Choose another record or add a mutation to get started."}
                      </p>
                    )}
                  </div>
                  <div
                    className="inspector-tabs"
                    role="tablist"
                    aria-label="Record inspector"
                  >
                    <button
                      role="tab"
                      aria-selected={tab === "record"}
                      onClick={() => setTab("record")}
                    >
                      <Layers size={14} /> Record state
                    </button>
                    <button
                      role="tab"
                      aria-selected={tab === "transaction"}
                      onClick={() => setTab("transaction")}
                    >
                      <GitBranch size={14} /> Transaction context
                    </button>
                    <span>
                      {current
                        ? `Tx ${current.transactionId}`
                        : "No event selected"}
                    </span>
                  </div>
                  <div className="inspector" role="tabpanel">
                    {tab === "record" ? (
                      <>
                        <div className="snapshot">
                          <div className="panel-heading">
                            <h4>At this moment</h4>
                            <span
                              className={`status-pill ${state?.exists ? "" : "muted"}`}
                            >
                              {state?.exists ? (
                                <>
                                  <Check size={11} /> Record exists
                                </>
                              ) : (
                                "No record"
                              )}
                            </span>
                          </div>
                          <div className="field-list">
                            {state?.state ? (
                              Object.entries(state.state).map(
                                ([key, value]) => (
                                  <div key={key}>
                                    <span>{key}</span>
                                    <strong>{display(value)}</strong>
                                  </div>
                                ),
                              )
                            ) : (
                              <p className="empty-state">
                                {current
                                  ? "This record does not exist at this point in time."
                                  : "Select an event to inspect its state."}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="changes">
                          <div className="panel-heading">
                            <h4>What changed</h4>
                            <span className="count-badge">
                              {
                                diffs.filter((d) => d.status !== "unchanged")
                                  .length
                              }{" "}
                              fields
                            </span>
                          </div>
                          {diffs
                            .filter((d) => d.status !== "unchanged")
                            .map((d) => (
                              <div className="diff-row" key={d.field}>
                                <span>{d.field}</span>
                                <div>
                                  <del>{display(d.oldValue)}</del>
                                  <ArrowRight size={12} />
                                  <ins>{display(d.newValue)}</ins>
                                </div>
                              </div>
                            ))}
                          {!diffs.length && (
                            <p className="empty-state">
                              Changes will appear here.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="transaction-context">
                        <h4>
                          Transaction {current?.transactionId || "—"}{" "}
                          <span>
                            · {txEvents.length} events in loaded ledger
                          </span>
                        </h4>
                        <p>
                          Explore the records changed together in this
                          transaction.
                        </p>
                        {txEvents.map((event) => (
                          <button
                            key={event.eventId}
                            onClick={() => {
                              selectEvent(event);
                              setTab("record");
                            }}
                          >
                            <Database size={15} />
                            {event.tableName}
                            <span>Record {event.recordPk}</span>
                            <span
                              className={`op ${event.operationType.toLowerCase()}`}
                            >
                              {event.operationType}
                            </span>
                            <ArrowUpRight size={15} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="studio-bottom">
                <span>
                  <span className="green-dot" />{" "}
                  {status?.totalEventsInLedger ?? "—"} events captured <i />{" "}
                  {tables.length} tables
                </span>
                <span>
                  <History size={13} /> A complete picture, one moment at a
                  time.
                </span>
              </div>
            </div>
            <div className="demo-strip">
              <div className="demo-symbol">
                <Activity size={21} />
              </div>
              <div>
                <strong>Curious? Break something. Then rewind.</strong>
                <p>
                  Simulate a bad transaction and follow the evidence back to a
                  healthy state.
                </p>
              </div>
              <div className="demo-actions">
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => action("seed")}
                >
                  <RotateCcw size={14} /> Reset demo
                </button>
                <button
                  className="button outline small"
                  disabled={busy}
                  onClick={() => action("inject_bug")}
                >
                  {busy ? "Working…" : "Simulate an incident"}
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
            <div className="ledger-panel">
              <div className="ledger-heading">
                <div>
                  <div className="eyebrow">THE BIGGER PICTURE</div>
                  <h3>Nothing slips through.</h3>
                </div>
                <label className="search-box">
                  <Search size={15} />
                  <input
                    placeholder="Search events, tables, transactions…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search ledger"
                  />
                </label>
              </div>
              <div className="table-scroll">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>EVENT</th>
                      <th>TABLE / RECORD</th>
                      <th>OPERATION</th>
                      <th>TRANSACTION</th>
                      <th>TIME (UTC)</th>
                      <th>
                        <span className="sr-only">Inspect</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 30).map((event) => (
                      <tr
                        key={event.eventId}
                        className={
                          current?.eventId === event.eventId ? "active-row" : ""
                        }
                      >
                        <td>#{event.eventId}</td>
                        <td>
                          <strong>{event.tableName}</strong>
                          <span className="record-number">
                            #{event.recordPk}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`op ${event.operationType.toLowerCase()}`}
                          >
                            {event.operationType}
                          </span>
                        </td>
                        <td>
                          Tx {event.transactionId}
                          {event.transactionId === "402" && (
                            <span className="incident-tag">Demo incident</span>
                          )}
                        </td>
                        <td>{time(event.recordedAt)}</td>
                        <td>
                          <button
                            className="inspect-button"
                            aria-label={`Inspect event ${event.eventId}`}
                            onClick={() => {
                              selectEvent(event);
                              jump();
                            }}
                          >
                            <ArrowUpRight size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <p className="empty-state">
                    {search
                      ? "No events match your search."
                      : "No events loaded yet."}
                  </p>
                )}
              </div>
              <div className="ledger-footer">
                Showing {Math.min(filtered.length, 30)} of {filtered.length}{" "}
                matching events · latest {ledger.length} loaded
                <span>
                  Immutable by design <Check size={13} />
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="how-section shell" id="how-it-works">
          <div className="eyebrow">02 / A NEW PERSPECTIVE</div>
          <div className="how-title">
            <h2>
              Move forward.
              <br />
              <span>By looking back.</span>
            </h2>
            <p>
              From “what happened?” to “what if?”
              <br />
              Your next answer is already in your history.
            </p>
          </div>
          <div className="feature-grid">
            {[
              {
                n: "01",
                icon: History,
                title: "Rewind the moment.",
                text: "Scrub through a record’s lifecycle and see exactly what your data looked like at any captured moment.",
              },
              {
                n: "02",
                icon: Layers,
                title: "Connect the dots.",
                text: "See field-level changes and follow a transaction across tables. Give every unexpected change its context.",
              },
              {
                n: "03",
                icon: GitBranch,
                title: "Find another ending.",
                text: "Leave a transaction out. Reconstruct an alternative timeline and compare it with what actually happened.",
              },
            ].map((f) => (
              <article key={f.n}>
                <div>
                  <f.icon size={25} />
                  <span>{f.n}</span>
                </div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="closing shell">
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h2>
            Hindsight.
            <br />
            <em>Now on demand.</em>
          </h2>
          <button className="button dark" onClick={jump}>
            Take a look back <ArrowUpRight size={18} />
          </button>
          <span className="closing-asterisk" aria-hidden="true">
            ✳
          </span>
        </section>
      </main>
      <footer className="shell">
        <a className="wordmark" href="#">
          <History size={23} />
          replay<span>db</span>
        </a>
        <span>Made for the moments that matter.</span>
        <a
          href="https://github.com/harkirath1511/Se"
          target="_blank"
          rel="noreferrer"
        >
          Explore the source <ArrowUpRight size={14} />
        </a>
      </footer>
      <div className="modal-theme">
        <BranchModal
          key={`${table}-${pk}-${branch}`}
          isOpen={branch}
          onClose={() => setBranch(false)}
          tableName={table}
          recordPk={pk}
          allTransactions={Array.from(
            new Set(ledger.map((e) => e.transactionId)),
          )}
          events={events}
          asOf={current?.recordedAt}
        />
        <MutationModal
          isOpen={mutation}
          onClose={() => setMutation(false)}
          monitoredTables={tables.map((t) => t.name)}
          onMutationSuccess={() => {
            setRevision((r) => r + 1);
            setNotice("Mutation committed. Your timeline is up to date.");
          }}
        />
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  );
}
