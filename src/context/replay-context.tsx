"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { MonitoredTableInfo, ReplayEvent } from "@/lib/types/event";
import { MutationModal } from "@/components/mutation/mutation-modal";

export type SystemStatus = {
  database: { connected: boolean; mode: string };
  totalEventsInLedger: number;
};

interface ReplayContextValue {
  status: SystemStatus | null;
  tables: MonitoredTableInfo[];
  ledger: ReplayEvent[];
  busy: boolean;
  error: string;
  notice: string;
  revision: number;
  refresh: () => Promise<void>;
  action: (actionName: "seed" | "inject_bug") => Promise<void>;
  setError: (err: string) => void;
  setNotice: (msg: string) => void;
  openMutationModal: () => void;
}

const ReplayContext = createContext<ReplayContextValue | undefined>(undefined);

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(json.error || "Unable to connect. Please try again.");
  }
  return json.data as T;
}

export function ReplayProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [tables, setTables] = useState<MonitoredTableInfo[]>([]);
  const [ledger, setLedger] = useState<ReplayEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [isMutationOpen, setIsMutationOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [system, monitored, globalEvents] = await Promise.all([
        api<SystemStatus>("/api/v1/system/status"),
        api<MonitoredTableInfo[]>("/api/v1/management/tables"),
        api<ReplayEvent[]>("/api/v1/history/events?limit=250"),
      ]);
      setStatus(system);
      setTables(monitored);
      setLedger(globalEvents);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load system state");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

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
      setRevision((r) => r + 1);
      setNotice(
        actionName === "seed"
          ? "Demo restored to baseline transactions."
          : "Rogue transaction 402 injected. Check Transactions or Studio to investigate."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ReplayContext.Provider
      value={{
        status,
        tables,
        ledger,
        busy,
        error,
        notice,
        revision,
        refresh,
        action,
        setError,
        setNotice,
        openMutationModal: () => setIsMutationOpen(true),
      }}
    >
      {children}
      <div className="modal-theme">
        <MutationModal
          isOpen={isMutationOpen}
          onClose={() => setIsMutationOpen(false)}
          monitoredTables={tables.map((t) => t.name)}
          onMutationSuccess={() => {
            setRevision((r) => r + 1);
            setNotice("Mutation committed. Your temporal timeline is updated.");
          }}
        />
      </div>
      {notice && (
        <div className="toast" role="status">
          <span>✓</span>
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ✕
          </button>
        </div>
      )}
    </ReplayContext.Provider>
  );
}

export function useReplay() {
  const context = useContext(ReplayContext);
  if (!context) {
    throw new Error("useReplay must be used within a ReplayProvider");
  }
  return context;
}
