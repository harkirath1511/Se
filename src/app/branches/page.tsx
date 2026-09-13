"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  GitBranch,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { useReplay } from "@/context/replay-context";
import { BranchSpec, ReplayEvent } from "@/lib/types/event";
import { BranchComparison } from "@/lib/engine/branch";
import { BranchModal } from "@/components/branch/branch-modal";

const display = (value: unknown) =>
  value === undefined
    ? "—"
    : value === null
    ? "null"
    : typeof value === "object"
    ? JSON.stringify(value)
    : String(value);

export default function BranchesPage() {
  const { tables, ledger, revision, setNotice } = useReplay();

  const [branches, setBranches] = useState<BranchSpec[]>([]);
  const [selectedTable, setSelectedTable] = useState("users");
  const [recordPk, setRecordPk] = useState("1");
  const [excludedTxInput, setExcludedTxInput] = useState("402");
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<BranchComparison | null>(null);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [recordEvents, setRecordEvents] = useState<ReplayEvent[]>([]);

  // Fetch defined branches
  useEffect(() => {
    fetch("/api/v1/branches")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setBranches(json.data || []);
        }
      })
      .catch(() => {});
  }, [revision]);

  // Fetch events for selected table and PK to run simulation
  useEffect(() => {
    fetch(
      `/api/v1/history/records/${encodeURIComponent(selectedTable)}/${encodeURIComponent(
        recordPk
      )}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setRecordEvents(json.data?.events || []);
        }
      })
      .catch(() => {});
  }, [selectedTable, recordPk, revision]);

  const handleRunSimulation = async () => {
    setLoading(true);
    setComparison(null);

    try {
      const excludedArray = excludedTxInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Create branch on the fly
      const createRes = await fetch("/api/v1/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchName: `sandbox-omit-${excludedArray.join("-") || "none"}`,
          baseTimestamp: new Date(0).toISOString(),
          excludedTransactions: excludedArray,
        }),
      });

      const branchJson = await createRes.json();
      if (!branchJson.success) throw new Error(branchJson.error);

      const branchId = branchJson.data.branchId;

      // Compare record state
      const compRes = await fetch(
        `/api/v1/branches/${branchId}/state/${encodeURIComponent(
          selectedTable
        )}?recordPk=${encodeURIComponent(recordPk)}`
      );

      const compJson = await compRes.json();
      if (!compJson.success) throw new Error(compJson.error);

      setComparison(compJson.data);
      setNotice("Simulation executed. Counterfactual state materialized.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container shell">
      {/* ─── Page Header ─────────────────────────────────── */}
      <div className="page-header-block">
        <div>
          <div className="eyebrow">
            <span className="orange-dot" /> COUNTERFACTUAL ANALYSIS
          </div>
          <h1>
            Branch <span>Sandboxes</span>
          </h1>
          <p className="page-subtitle">
            What if a bug had never happened? Omit errant transaction IDs, fold downstream history forward, and evaluate state recovery without risking production integrity.
          </p>
        </div>

        <button
          className="button dark small"
          onClick={() => setBranchModalOpen(true)}
        >
          <Plus size={14} />
          <span>New Named Branch</span>
        </button>
      </div>

      {/* ─── Simulation Sandbox Console ────────────────────── */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <GitBranch size={18} style={{ color: "var(--orange)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                Interactive Counterfactual Simulator
              </h3>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--muted)" }}>
                Define what to exclude and observe how state recalculates
              </p>
            </div>
          </div>
        </div>

        <div className="card-panel-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "6px" }}>
                Target Table
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "#fff",
                }}
              >
                {tables.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.eventCount} events)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "6px" }}>
                Record PK
              </label>
              <input
                value={recordPk}
                onChange={(e) => setRecordPk(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                }}
                placeholder="e.g. 1"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, marginBottom: "6px" }}>
                Transactions to Omit (comma separated)
              </label>
              <input
                value={excludedTxInput}
                onChange={(e) => setExcludedTxInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                }}
                placeholder="e.g. 402, 403"
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button
                className="button orange small"
                onClick={handleRunSimulation}
                disabled={loading}
                style={{ width: "100%", padding: "10px" }}
              >
                {loading ? "Replaying Timeline…" : "Execute Sandbox Replay"}
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Comparison Output */}
          {comparison ? (
            <div style={{ marginTop: "24px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                  paddingBottom: "12px",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    className={`badge ${
                      comparison.diverged ? "badge-orange" : "badge-green"
                    }`}
                  >
                    {comparison.diverged ? "DIVERGED STATE" : "IDENTICAL TIMELINE"}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Comparing Reality vs Alternative Timeline for {selectedTable} #{recordPk}
                  </span>
                </div>

                <Link
                  href={`/studio?table=${selectedTable}&pk=${recordPk}`}
                  className="text-link"
                  style={{ fontSize: "11px" }}
                >
                  View in Studio <ArrowUpRight size={13} />
                </Link>
              </div>

              {/* Side by side state comparison */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    background: "#fcf8f7",
                    border: "1px solid #eddcd7",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#b84323",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AlertTriangle size={14} /> Actual State in Database (with Tx #{excludedTxInput})
                  </div>
                  <pre className="json-dump" style={{ background: "#2e1e1b" }}>
                    {JSON.stringify(comparison.actualState, null, 2)}
                  </pre>
                </div>

                <div
                  style={{
                    background: "#f4f9f4",
                    border: "1px solid #d4e5d6",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#306138",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <ShieldCheck size={14} /> Counterfactual State (Tx #{excludedTxInput} Omitted)
                  </div>
                  <pre className="json-dump" style={{ background: "#1c281e" }}>
                    {JSON.stringify(comparison.branchedState, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Field Differential Table */}
              <h4 style={{ margin: "0 0 10px 0", fontSize: "14px" }}>
                Recovered / Diverged Fields
              </h4>
              <div className="table-scroll">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>FIELD</th>
                      <th>STATUS</th>
                      <th>REALITY VALUE</th>
                      <th>COUNTERFACTUAL RECOVERY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.diffs.map((d) => (
                      <tr key={d.field}>
                        <td>
                          <strong>{d.field}</strong>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              d.status === "modified"
                                ? "badge-orange"
                                : d.status === "added"
                                ? "badge-green"
                                : "badge-gray"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td>
                          <del style={{ color: "#c94b29" }}>{display(d.oldValue)}</del>
                        </td>
                        <td>
                          <ins style={{ color: "#2d6a4f", fontWeight: 600 }}>
                            {display(d.newValue)}
                          </ins>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
              <GitBranch size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: "13px" }}>
                Select a table, enter the record ID, and click <strong>Execute Sandbox Replay</strong> to simulate the timeline without transaction #{excludedTxInput}.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Active Branches Ledger ────────────────────────── */}
      <div className="card-panel">
        <div className="card-panel-header">
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
            Configured Branches
          </h3>
          <span className="count-badge">{branches.length} active branches</span>
        </div>

        <div className="card-panel-body" style={{ padding: 0 }}>
          <table className="ledger-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>BRANCH NAME</th>
                <th>EXCLUDED TRANSACTIONS</th>
                <th>CREATED AT</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {branches.length > 0 ? (
                branches.map((b) => (
                  <tr key={b.branchId}>
                    <td>
                      <strong>{b.branchName}</strong>
                      <div style={{ fontSize: "10px", color: "var(--muted)" }}>
                        ID: {b.branchId}
                      </div>
                    </td>
                    <td>
                      {b.excludedTransactions.length > 0 ? (
                        b.excludedTransactions.map((tx) => (
                          <span
                            key={tx}
                            className="badge badge-orange"
                            style={{ marginRight: "6px" }}
                          >
                            Tx #{tx}
                          </span>
                        ))
                      ) : (
                        <span className="badge badge-gray">None</span>
                      )}
                    </td>
                    <td>{new Date(b.createdAt).toLocaleString()}</td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => {
                          setExcludedTxInput(b.excludedTransactions.join(", "));
                          handleRunSimulation();
                        }}
                      >
                        Simulate Branch <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-state">
                    No custom branches defined yet. Click "New Named Branch" or use the simulator above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BranchModal
        isOpen={branchModalOpen}
        onClose={() => setBranchModalOpen(false)}
        tableName={selectedTable}
        recordPk={recordPk}
        allTransactions={Array.from(new Set(ledger.map((e) => e.transactionId)))}
        events={recordEvents}
      />
    </div>
  );
}
