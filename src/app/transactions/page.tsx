"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Search,
  ArrowRight,
  ArrowUpRight,
  Database,
  Clock,
  User,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  GitCommit,
  AlertCircle,
} from "lucide-react";
import { useReplay } from "@/context/replay-context";
import { ReplayEvent, TransactionGroup } from "@/lib/types/event";

const time = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });

function TransactionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { ledger, revision } = useReplay();

  const urlTx = searchParams.get("txId");
  const [selectedTxId, setSelectedTxId] = useState<string>(urlTx || "402");
  const [searchTx, setSearchTx] = useState<string>(urlTx || "402");
  const [txData, setTxData] = useState<TransactionGroup | null>(null);
  const [correlated, setCorrelated] = useState<TransactionGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync if URL txId changes
  useEffect(() => {
    if (urlTx && urlTx !== selectedTxId) {
      setSelectedTxId(urlTx);
      setSearchTx(urlTx);
    }
  }, [urlTx]);

  // Fetch transaction details and temporal correlation
  useEffect(() => {
    if (!selectedTxId) return;

    setLoading(true);
    setError("");

    Promise.all([
      fetch(`/api/v1/transactions/${encodeURIComponent(selectedTxId)}`).then(
        (r) => r.json()
      ),
      fetch(
        `/api/v1/transactions/correlate?nearTxId=${encodeURIComponent(
          selectedTxId
        )}&windowMs=2000`
      ).then((r) => r.json()),
    ])
      .then(([singleRes, corrRes]) => {
        if (singleRes.success) {
          setTxData(singleRes.data);
        } else {
          setTxData(null);
          setError(singleRes.error || `Transaction #${selectedTxId} not found.`);
        }

        if (corrRes.success) {
          setCorrelated(corrRes.data?.correlatedTransactions || []);
        } else {
          setCorrelated([]);
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load transaction forensics.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedTxId, revision]);

  // Unique list of recent transaction IDs from the ledger
  const recentTxs = Array.from(
    new Set(ledger.map((e) => e.transactionId))
  ).slice(0, 8);

  const handleSelectTx = (id: string) => {
    setSelectedTxId(id);
    setSearchTx(id);
    router.push(`/transactions?txId=${id}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTx.trim()) {
      handleSelectTx(searchTx.trim());
    }
  };

  const isIncident = selectedTxId === "402";

  return (
    <div className="page-container shell">
      {/* ─── Page Header ─────────────────────────────────── */}
      <div className="page-header-block">
        <div>
          <div className="eyebrow">
            <span className="orange-dot" /> POST-INCIDENT FORENSICS
          </div>
          <h1>
            Transaction <span>Blast Radius</span>
          </h1>
          <p className="page-subtitle">
            Inspect all cross-table row modifications committed within a single PostgreSQL transaction boundary. Detect unlogged side-effects and concurrent race conditions.
          </p>
        </div>

        {/* Tx Search Bar */}
        <form onSubmit={handleSearchSubmit} className="search-box" style={{ margin: 0 }}>
          <Search size={15} />
          <input
            placeholder="Search Tx ID (e.g. 402)…"
            value={searchTx}
            onChange={(e) => setSearchTx(e.target.value)}
            style={{ width: "200px" }}
          />
        </form>
      </div>

      {/* ─── Quick Transaction Pills ──────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "28px" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>
          SELECT TRANSACTION:
        </span>

        <button
          className={`badge ${selectedTxId === "402" ? "badge-orange" : "badge-gray"}`}
          onClick={() => handleSelectTx("402")}
          style={{ cursor: "pointer", padding: "6px 12px" }}
        >
          <AlertTriangle size={12} />
          <span>Tx 402 (Incident Simulation)</span>
        </button>

        {recentTxs
          .filter((t) => t !== "402")
          .map((id) => (
            <button
              key={id}
              className={`badge ${selectedTxId === id ? "badge-orange" : "badge-gray"}`}
              onClick={() => handleSelectTx(id)}
              style={{ cursor: "pointer", padding: "6px 12px" }}
            >
              Tx {id}
            </button>
          ))}
      </div>

      {error && (
        <div className="error-banner" style={{ marginBottom: "24px" }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ─── Transaction Summary Stats ─────────────────────── */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-label">Transaction ID</span>
          <div className="stat-value" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>#{selectedTxId}</span>
            {isIncident && <span className="badge badge-orange">Rogue Batch</span>}
          </div>
        </div>

        <div className="stat-item">
          <span className="stat-label">Total Mutations</span>
          <span className="stat-value">{txData?.totalOperations ?? (loading ? "…" : 0)}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Tables Affected</span>
          <span className="stat-value">{txData?.tablesMutated?.length ?? (loading ? "…" : 0)}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Commit Timestamp</span>
          <span className="stat-value" style={{ fontSize: "17px", paddingTop: "5px" }}>
            {txData?.timestamp ? `${time(txData.timestamp)} UTC` : "—"}
          </span>
        </div>
      </div>

      {/* ─── Blast Radius Mutations Grid ───────────────────── */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Layers size={18} style={{ color: "var(--orange)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                Blast Radius: Committed Row Mutations
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
                Atomic write set captured by PL/pgSQL CDC triggers for Tx #{selectedTxId}
              </p>
            </div>
          </div>

          <span className="count-badge">
            {txData?.events?.length ?? 0} operations in commit
          </span>
        </div>

        <div className="card-panel-body">
          {loading ? (
            <p className="empty-state">Analyzing transaction write set…</p>
          ) : txData?.events && txData.events.length > 0 ? (
            <div className="blast-tree">
              {txData.events.map((event) => (
                <div key={event.eventId} className="blast-node">
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
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

                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 600 }}>
                        {event.tableName} <span style={{ color: "var(--muted)", fontWeight: 400 }}>#{event.recordPk}</span>
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                        Event #{event.eventId} · Captured at {time(event.recordedAt)} UTC by {event.dbUser}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    {event.newState && (
                      <div style={{ fontSize: "11px", color: "var(--muted)", maxWidth: "320px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        {JSON.stringify(event.newState)}
                      </div>
                    )}

                    <Link
                      href={`/studio?table=${event.tableName}&pk=${event.recordPk}`}
                      className="button subtle small"
                      title="Reconstruct this record in Replay Studio"
                    >
                      <span>Replay in Studio</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              No mutations recorded for transaction #{selectedTxId}. Ensure triggers are attached to tables.
            </p>
          )}
        </div>

        {txData?.clientQuery && (
          <div className="card-panel-footer">
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Terminal size={14} />
              <strong>Client Query:</strong>
              <code style={{ fontFamily: "monospace" }}>{txData.clientQuery}</code>
            </span>
          </div>
        )}
      </div>

      {/* ─── Temporal Window Clustering ────────────────────── */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Clock size={18} style={{ color: "var(--muted)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                Temporal Correlation Window (±2000ms)
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
                Other transactions committed near this timestamp to detect concurrent race conditions
              </p>
            </div>
          </div>
        </div>

        <div className="card-panel-body" style={{ padding: 0 }}>
          <table className="ledger-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>TRANSACTION</th>
                <th>TIMESTAMP (UTC)</th>
                <th>TABLES MUTATED</th>
                <th>OPERATIONS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {correlated.length > 0 ? (
                correlated.map((tx) => (
                  <tr
                    key={tx.transactionId}
                    className={tx.transactionId === selectedTxId ? "active-row" : ""}
                  >
                    <td>
                      <strong>Tx #{tx.transactionId}</strong>
                      {tx.transactionId === "402" && (
                        <span className="badge badge-orange" style={{ marginLeft: "8px" }}>
                          Demo Incident
                        </span>
                      )}
                    </td>
                    <td>{time(tx.timestamp)}</td>
                    <td>{tx.tablesMutated.join(", ") || "—"}</td>
                    <td>{tx.totalOperations} rows</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => handleSelectTx(tx.transactionId)}
                      >
                        Inspect Blast Radius <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No concurrent transactions found within the temporal window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="page-container shell"><p className="empty-state">Loading Forensics…</p></div>}>
      <TransactionsContent />
    </Suspense>
  );
}
