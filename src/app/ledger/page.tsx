"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  Database,
  Filter,
  Check,
  X,
  Code,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useReplay } from "@/context/replay-context";
import { ReplayEvent } from "@/lib/types/event";

const time = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });

export default function LedgerPage() {
  const { ledger, tables } = useReplay();

  const [search, setSearch] = useState("");
  const [selectedOp, setSelectedOp] = useState<string>("ALL");
  const [selectedTable, setSelectedTable] = useState<string>("ALL");
  const [inspectEvent, setInspectEvent] = useState<ReplayEvent | null>(null);

  const filtered = ledger.filter((event) => {
    if (selectedOp !== "ALL" && event.operationType !== selectedOp) return false;
    if (selectedTable !== "ALL" && event.tableName !== selectedTable) return false;

    const query = search.toLowerCase();
    return (
      event.tableName.toLowerCase().includes(query) ||
      event.recordPk.toLowerCase().includes(query) ||
      event.transactionId.toLowerCase().includes(query) ||
      event.operationType.toLowerCase().includes(query) ||
      (event.clientQuery && event.clientQuery.toLowerCase().includes(query))
    );
  });

  return (
    <div className="page-container shell">
      {/* ─── Page Header ─────────────────────────────────── */}
      <div className="page-header-block">
        <div>
          <div className="eyebrow">
            <span className="orange-dot" /> APPEND-ONLY RELATIONAL LOG
          </div>
          <h1>
            Historical <span>Ledger</span>
          </h1>
          <p className="page-subtitle">
            Every database mutation streamed in real time via PL/pgSQL CDC triggers. Filter by table, transaction boundary, or operation type with sub-second retrieval.
          </p>
        </div>

        {/* Global Search */}
        <div className="search-box" style={{ margin: 0 }}>
          <Search size={15} />
          <input
            placeholder="Search events, tables, Tx IDs, PKs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "240px" }}
          />
        </div>
      </div>

      {/* ─── Filter Bar ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          flexWrap: "wrap",
          marginBottom: "24px",
          padding: "14px 18px",
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>
          <Filter size={13} />
          <span>FILTER:</span>
        </div>

        {/* Operation type buttons */}
        {["ALL", "INSERT", "UPDATE", "DELETE"].map((op) => (
          <button
            key={op}
            className={`badge ${
              selectedOp === op
                ? "badge-orange"
                : "badge-gray"
            }`}
            onClick={() => setSelectedOp(op)}
            style={{ cursor: "pointer", padding: "5px 10px" }}
          >
            {op}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "11px", color: "var(--muted)" }}>Table:</label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid var(--line)",
              fontSize: "11px",
              background: "#fafaf7",
            }}
          >
            <option value="ALL">All Tables ({tables.length})</option>
            {tables.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ─── Event Table ──────────────────────────────────── */}
      <div className="card-panel">
        <div className="card-panel-header">
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
            Audit Event Stream
          </h3>
          <span className="count-badge">
            Showing {filtered.length} of {ledger.length} events
          </span>
        </div>

        <div className="table-scroll">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>EVENT ID</th>
                <th>TABLE / RECORD</th>
                <th>OPERATION</th>
                <th>TRANSACTION</th>
                <th>USER</th>
                <th>RECORDED AT (UTC)</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.eventId}>
                  <td>
                    <strong>#{event.eventId}</strong>
                  </td>
                  <td>
                    <strong>{event.tableName}</strong>
                    <span className="record-number" style={{ marginLeft: "6px" }}>
                      #{event.recordPk}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        event.operationType === "INSERT"
                          ? "badge-green"
                          : event.operationType === "DELETE"
                          ? "badge-orange"
                          : "badge-gray"
                      }`}
                    >
                      {event.operationType}
                    </span>
                  </td>
                  <td>
                    Tx {event.transactionId}
                    {event.transactionId === "402" && (
                      <span className="badge badge-orange" style={{ marginLeft: "6px" }}>
                        Incident
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)" }}>{event.dbUser || "postgres"}</td>
                  <td>{time(event.recordedAt)}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        className="text-link"
                        style={{ fontSize: "11px" }}
                        onClick={() => setInspectEvent(event)}
                      >
                        <Code size={12} /> JSON
                      </button>

                      <Link
                        href={`/studio?table=${event.tableName}&pk=${event.recordPk}`}
                        className="text-link"
                        style={{ fontSize: "11px" }}
                      >
                        Replay <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}

              {!filtered.length && (
                <tr>
                  <td colSpan={7} className="empty-state">
                    {search || selectedOp !== "ALL" || selectedTable !== "ALL"
                      ? "No events match the active filters."
                      : "No historical events recorded in ledger yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-panel-footer">
          <span>
            Storage: PostgreSQL <code style={{ fontFamily: "monospace" }}>replaydb.replay_events</code> (JSONB)
          </span>
          <span>Immutable Ledger Guaranteed by Foreign Triggers</span>
        </div>
      </div>

      {/* ─── Event JSON Inspector Modal ───────────────────── */}
      {inspectEvent && (
        <div
          className="modal-theme"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "20px",
          }}
          onClick={() => setInspectEvent(null)}
        >
          <div
            style={{
              background: "#fff",
              width: "min(650px, 100%)",
              borderRadius: "10px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                borderBottom: "1px solid var(--line)",
                paddingBottom: "12px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "17px" }}>
                  Event #{inspectEvent.eventId} Raw Payload
                </h3>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                  {inspectEvent.tableName} #{inspectEvent.recordPk} · Tx {inspectEvent.transactionId}
                </span>
              </div>
              <button
                onClick={() => setInspectEvent(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <pre
              className="json-dump"
              style={{ maxHeight: "400px", overflowY: "auto" }}
            >
              {JSON.stringify(inspectEvent, null, 2)}
            </pre>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "16px",
              }}
            >
              <Link
                href={`/studio?table=${inspectEvent.tableName}&pk=${inspectEvent.recordPk}`}
                className="button dark small"
                onClick={() => setInspectEvent(null)}
              >
                Inspect in Replay Studio <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
