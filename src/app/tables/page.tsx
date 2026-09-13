"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Database,
  Layers,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { useReplay } from "@/context/replay-context";

export default function TablesPage() {
  const { tables, status, refresh, setNotice, setError } = useReplay();
  const [busyTable, setBusyTable] = useState<string | null>(null);

  const handleToggleTrigger = async (
    tableName: string,
    isCurrentlyMonitored: boolean
  ) => {
    setBusyTable(tableName);
    try {
      const method = isCurrentlyMonitored ? "DELETE" : "POST";
      const actionEndpoint = isCurrentlyMonitored ? "detach" : "attach";

      const res = await fetch(
        `/api/v1/management/tables/${encodeURIComponent(
          tableName
        )}/${actionEndpoint}`,
        { method }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      await refresh();
      setNotice(
        isCurrentlyMonitored
          ? `Capture trigger detached from table '${tableName}'.`
          : `PL/pgSQL capture trigger attached to table '${tableName}'.`
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to update trigger status"
      );
    } finally {
      setBusyTable(null);
    }
  };

  return (
    <div className="page-container shell">
      {/* ─── Page Header ─────────────────────────────────── */}
      <div className="page-header-block">
        <div>
          <div className="eyebrow">
            <span className="orange-dot" /> CHANGE DATA CAPTURE (CDC) MANAGEMENT
          </div>
          <h1>
            Monitored <span>Tables</span>
          </h1>
          <p className="page-subtitle">
            Attach or detach generic row-level capture triggers across arbitrary PostgreSQL tables. Non-invasive design ensures zero downtime and no upstream schema modification.
          </p>
        </div>

        <button
          className="button subtle small"
          onClick={() => refresh()}
          title="Refresh database schema and event counts"
        >
          <RefreshCw size={13} />
          <span>Refresh Tables</span>
        </button>
      </div>

      {/* ─── Stats Bar ────────────────────────────────────── */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Database Target</span>
          <span className="stat-value" style={{ fontSize: "18px", paddingTop: "5px" }}>
            {status?.database?.connected ? "PostgreSQL 16+" : "In-Memory Simulator"}
          </span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Monitored Tables</span>
          <span className="stat-value">{tables.filter((t) => t.isMonitored).length}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Total Events Streamed</span>
          <span className="stat-value">{status?.totalEventsInLedger ?? 0}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Capture Mechanism</span>
          <span className="stat-value" style={{ fontSize: "16px", paddingTop: "6px" }}>
            PL/pgSQL Trigger
          </span>
        </div>
      </div>

      {/* ─── Monitored Tables Panel ───────────────────────── */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Database size={18} style={{ color: "var(--orange)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                Schema Tables in Schema `public`
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
                Rows modified in monitored tables are automatically serialized to JSONB and appended to `replaydb.replay_events`
              </p>
            </div>
          </div>
        </div>

        <div className="table-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>TABLE NAME</th>
                <th>SCHEMA</th>
                <th>CAPTURE STATUS</th>
                <th>TRIGGER PROCEDURE</th>
                <th>EVENTS CAPTURED</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t.name}>
                  <td>
                    <strong>{t.name}</strong>
                  </td>
                  <td>
                    <code style={{ fontFamily: "monospace", color: "var(--muted)" }}>
                      {t.schema || "public"}
                    </code>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        t.isMonitored ? "badge-green" : "badge-gray"
                      }`}
                    >
                      {t.isMonitored ? "Active (Monitored)" : "Unmonitored"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--muted)" }}>
                      {t.triggerName || "replaydb_capture_trigger"}
                    </span>
                  </td>
                  <td>
                    <strong>{t.eventCount}</strong> events
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        className="button subtle small"
                        style={{ padding: "6px 12px", fontSize: "11px" }}
                        disabled={busyTable === t.name}
                        onClick={() => handleToggleTrigger(t.name, t.isMonitored)}
                      >
                        {t.isMonitored ? (
                          <>
                            <Trash2 size={12} style={{ color: "#c94b29" }} />
                            <span>Detach</span>
                          </>
                        ) : (
                          <>
                            <Plus size={12} style={{ color: "#3b6343" }} />
                            <span>Attach</span>
                          </>
                        )}
                      </button>

                      <Link
                        href={`/studio?table=${t.name}&pk=1`}
                        className="text-link"
                        style={{ fontSize: "11px" }}
                      >
                        Replay Studio <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {!tables.length && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    No tables discovered in database schema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-panel-footer">
          <span>
            CDC Function: <code style={{ fontFamily: "monospace" }}>replaydb.capture_row_mutation()</code>
          </span>
          <span>Runs inside transaction boundary with negligible write latency</span>
        </div>
      </div>

      {/* ─── Architecture Explainer ────────────────────────── */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "24px",
          marginTop: "30px",
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", fontSize: "15px", fontWeight: 600 }}>
          How ReplayDB Triggers Work
        </h4>
        <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "12px", lineHeight: "1.7" }}>
          ReplayDB attaches an <code style={{ fontFamily: "monospace" }}>AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW</code> trigger to monitored business tables. When a write occurs, the trigger captures the row's <code style={{ fontFamily: "monospace" }}>OLD</code> and <code style={{ fontFamily: "monospace" }}>NEW</code> states as PostgreSQL JSONB objects, along with the 64-bit transaction ID (<code style={{ fontFamily: "monospace" }}>pg_current_xact_id()</code>), high-precision clock timestamp, and session metadata, then stores it in the append-only <code style={{ fontFamily: "monospace" }}>replaydb.replay_events</code> ledger.
        </p>

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "11px", color: "var(--muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={14} style={{ color: "#3b6343" }} />
            <span>Zero application code modifications</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={14} style={{ color: "#3b6343" }} />
            <span>Transaction rollbacks naturally discard uncommitted events</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle size={14} style={{ color: "#3b6343" }} />
            <span>Sub-millisecond trigger overhead</span>
          </div>
        </div>
      </div>
    </div>
  );
}
