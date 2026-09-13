"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  GitBranch,
  Layers,
  Pause,
  Play,
  Plus,
  RotateCcw,
  AlertCircle,
  X,
} from "lucide-react";
import { useReplay } from "@/context/replay-context";
import { ReplayEvent } from "@/lib/types/event";
import { reconstructRecord } from "@/lib/engine/reconstruct";
import { computeStateDiff } from "@/lib/engine/diff";
import { BranchModal } from "@/components/branch/branch-modal";

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

function StudioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status, tables, ledger, revision, openMutationModal } = useReplay();

  const initialTable = searchParams.get("table") || "users";
  const initialPk = searchParams.get("pk") || "1";

  const [table, setTable] = useState(initialTable);
  const [pk, setPk] = useState(initialPk);
  const [draftPk, setDraftPk] = useState(initialPk);
  const [events, setEvents] = useState<ReplayEvent[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"record" | "diff">("record");
  const [playing, setPlaying] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);

  // Sync state if URL searchParams change
  useEffect(() => {
    const urlTable = searchParams.get("table");
    const urlPk = searchParams.get("pk");
    if (urlTable && urlTable !== table) setTable(urlTable);
    if (urlPk && urlPk !== pk) {
      setPk(urlPk);
      setDraftPk(urlPk);
    }
  }, [searchParams]);

  // Fetch events for current table + pk
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPlaying(false);
    setEvents([]);
    setIndex(0);

    fetch(
      `/api/v1/history/records/${encodeURIComponent(table)}/${encodeURIComponent(pk)}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error);
        const list: ReplayEvent[] = json.data?.events || [];
        setEvents(list);
        setIndex(Math.max(0, list.length - 1));
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [table, pk, revision]);

  // Playback loop
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setIndex((i) => {
        if (i >= events.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1100);
    return () => clearInterval(timer);
  }, [playing, events.length]);

  const current = events[index];
  const state = current
    ? reconstructRecord(table, pk, events, current.recordedAt)
    : null;
  const diffs = current
    ? computeStateDiff(current.oldState, current.newState)
    : [];

  const handleSelectTable = (tblName: string) => {
    setTable(tblName);
    setPk("1");
    setDraftPk("1");
    router.push(`/studio?table=${tblName}&pk=1`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftPk.trim()) {
      setPk(draftPk.trim());
      router.push(`/studio?table=${table}&pk=${draftPk.trim()}`);
    }
  };

  return (
    <div className="page-container shell">
      {/* ─── Studio Header Block ──────────────────────────── */}
      <div className="page-header-block">
        <div>
          <div className="eyebrow">
            <span className="orange-dot" /> TEMPORAL FLIGHT RECORDER
          </div>
          <h1>
            Replay <span>Studio</span>
          </h1>
          <p className="page-subtitle">
            Travel forward and backward across historical database mutations. Reconstruct row state at any microsecond and inspect field-level differentials.
          </p>
        </div>

        <div className="header-actions">
          <Link
            href={`/transactions${current ? `?txId=${current.transactionId}` : ""}`}
            className="button subtle small"
            title="Inspect transaction blast radius"
          >
            <Layers size={14} />
            <span>Tx Forensics</span>
          </Link>

          <button
            className="button subtle small"
            onClick={() => setBranchModalOpen(true)}
            disabled={!events.length || loading}
          >
            <GitBranch size={14} />
            <span>Fork Branch</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert" style={{ marginBottom: "20px" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ─── Main Studio Workspace Container ──────────────── */}
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
            <span className={status?.database?.connected ? "green-dot" : "orange-dot"} />
            {status
              ? status.database.connected
                ? "PostgreSQL Connected"
                : "Deterministic Ledger (Simulated)"
              : "Connecting…"}
          </span>
        </div>

        <div className="studio-body">
          {/* ─── Sidebar Table Explorer ─────────────────────── */}
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
                  onClick={() => handleSelectTable(t.name)}
                >
                  <Layers size={15} />
                  {t.name}
                  <span>{t.eventCount}</span>
                </button>
              ))}
            </div>

            <div className="sidebar-bottom">
              <div className="eyebrow">COUNTERFACTUAL SANDBOX</div>
              <p>
                What if an errant write never ran? Fork an isolated branch to see.
              </p>
              <button
                className="text-link"
                disabled={!events.length || loading}
                onClick={() => setBranchModalOpen(true)}
              >
                Create a branch <ArrowUpRight size={14} />
              </button>
            </div>
          </aside>

          {/* ─── Main Stage ─────────────────────────────────── */}
          <div className="studio-main">
            {/* Record Toolbar */}
            <div className="record-toolbar">
              <div className="breadcrumb">
                public <span>/</span> <strong>{table}</strong>
              </div>

              <form onSubmit={handleFormSubmit}>
                <label htmlFor="record-key">Record PK</label>
                <input
                  id="record-key"
                  value={draftPk}
                  onChange={(e) => setDraftPk(e.target.value)}
                  required
                  aria-label="Record primary key"
                  placeholder="e.g. 1"
                />
                <button aria-label="Load record" disabled={loading}>
                  <ArrowRight size={15} />
                </button>
              </form>

              <button
                className="button subtle small branch-toolbar"
                disabled={!events.length || loading}
                onClick={() => setBranchModalOpen(true)}
              >
                <GitBranch size={14} />
                <span>Branch</span>
              </button>

              <button
                className="button subtle small"
                onClick={openMutationModal}
              >
                <Plus size={14} /> New mutation
              </button>
            </div>

            {/* Timeline Panel */}
            <div className="timeline-panel" aria-busy={loading}>
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">RECORD TIMELINE</span>
                  <h3>
                    {loading
                      ? "Querying immutable ledger…"
                      : events.length
                      ? `Timeline for ${table} #${pk}`
                      : "No historical mutations found."}
                  </h3>
                </div>
                <span className="count-badge">{events.length} events</span>
              </div>

              {events.length > 0 ? (
                <>
                  <div className="timeline-track">
                    <div className="track-line" />
                    <div
                      className="track-progress"
                      style={{
                        width: `${
                          events.length > 1
                            ? (index / (events.length - 1)) * 100
                            : 0
                        }%`,
                      }}
                    />
                    {events.map((event, i) => (
                      <button
                        key={event.eventId}
                        aria-label={`Select event ${event.eventId}`}
                        aria-pressed={i === index}
                        className={`event-marker ${
                          i <= index ? "passed" : ""
                        } ${i === index ? "active" : ""} ${
                          event.transactionId === "402" ? "incident" : ""
                        }`}
                        onClick={() => {
                          setIndex(i);
                          setPlaying(false);
                        }}
                      >
                        <span className="event-tooltip">
                          Tx {event.transactionId} · {event.operationType}
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
                        aria-label={playing ? "Pause replay" : "Play replay"}
                        onClick={() => {
                          if (index === events.length - 1) setIndex(0);
                          setPlaying((p) => !p);
                        }}
                      >
                        {playing ? <Pause size={13} /> : <Play size={13} />}
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
                        {playing ? "Replaying sequence…" : "Timeline scrubber"}
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
                    ? "Streaming historical events for this record…"
                    : `No events recorded for ${table} #${pk}. Insert a new row or select another entity.`}
                </p>
              )}
            </div>

            {/* Inspector Tabs */}
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
                <Layers size={14} /> State at this moment
              </button>
              <button
                role="tab"
                aria-selected={tab === "diff"}
                onClick={() => setTab("diff")}
              >
                <RotateCcw size={14} /> Field diff ({diffs.filter((d) => d.status !== "unchanged").length})
              </button>

              {current && (
                <Link
                  href={`/transactions?txId=${current.transactionId}`}
                  className="text-link"
                  style={{ marginLeft: "auto", fontSize: "11px" }}
                  title="View full transaction blast radius"
                >
                  <span>Tx {current.transactionId}</span>
                  {current.transactionId === "402" && (
                    <span className="badge badge-orange" style={{ marginLeft: "6px" }}>Incident</span>
                  )}
                  <ArrowUpRight size={13} />
                </Link>
              )}
            </div>

            {/* Inspector Body */}
            <div className="inspector" role="tabpanel">
              {tab === "record" ? (
                <>
                  <div className="snapshot">
                    <div className="panel-heading">
                      <h4>Reconstructed Row Snapshot</h4>
                      <span
                        className={`status-pill ${
                          state?.exists ? "" : "muted"
                        }`}
                      >
                        {state?.exists ? (
                          <>
                            <Check size={11} /> Active in Database
                          </>
                        ) : (
                          "Does Not Exist"
                        )}
                      </span>
                    </div>

                    <div className="field-list">
                      {state?.state ? (
                        Object.entries(state.state).map(([key, value]) => (
                          <div key={key}>
                            <span>{key}</span>
                            <strong>{display(value)}</strong>
                          </div>
                        ))
                      ) : (
                        <p className="empty-state">
                          {current
                            ? "This record does not exist at this point in time (pre-creation or post-deletion)."
                            : "Select an event on the timeline to inspect state."}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="changes">
                    <div className="panel-heading">
                      <h4>Direct Mutation Payload</h4>
                      <span className="count-badge">
                        {current?.operationType || "NONE"}
                      </span>
                    </div>

                    {current ? (
                      <pre className="json-dump">
                        {JSON.stringify(
                          {
                            eventId: current.eventId,
                            operation: current.operationType,
                            transactionId: current.transactionId,
                            recordedAt: current.recordedAt,
                            dbUser: current.dbUser,
                            newState: current.newState,
                          },
                          null,
                          2
                        )}
                      </pre>
                    ) : (
                      <p className="empty-state">Select an event to view payload.</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="changes" style={{ gridColumn: "1 / -1" }}>
                  <div className="panel-heading">
                    <h4>What changed in Event #{current?.eventId}</h4>
                    <span className="count-badge">
                      {diffs.filter((d) => d.status !== "unchanged").length} modified fields
                    </span>
                  </div>

                  {diffs
                    .filter((d) => d.status !== "unchanged")
                    .map((d) => (
                      <div className="diff-row" key={d.field}>
                        <span style={{ fontWeight: 600 }}>{d.field}</span>
                        <div>
                          <del>{display(d.oldValue)}</del>
                          <ArrowRight size={12} />
                          <ins>{display(d.newValue)}</ins>
                        </div>
                      </div>
                    ))}

                  {!diffs.some((d) => d.status !== "unchanged") && (
                    <p className="empty-state">
                      {current
                        ? "No attribute changes detected in this event."
                        : "Select an event to view field differentials."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Studio Bottom Bar */}
        <div className="studio-bottom">
          <span>
            <span className="green-dot" /> {status?.totalEventsInLedger ?? 0}{" "}
            events captured across {tables.length} monitored tables
          </span>
          <span>Deterministic time travel with microsecond timestamp granularity.</span>
        </div>
      </div>

      {/* Branch Modal */}
      <BranchModal
        key={`${table}-${pk}-${branchModalOpen}`}
        isOpen={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        tableName={table}
        recordPk={pk}
        allTransactions={Array.from(new Set(ledger.map((e) => e.transactionId)))}
        events={events}
        asOf={current?.recordedAt}
      />
    </div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="page-container shell"><p className="empty-state">Loading Replay Studio…</p></div>}>
      <StudioContent />
    </Suspense>
  );
}
