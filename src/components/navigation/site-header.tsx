"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  History,
  ArrowUpRight,
  Database,
  RefreshCw,
  Bug,
  Plus,
  GitBranch,
  Layers,
  Activity,
  Menu,
  X,
} from "lucide-react";
import { useReplay } from "@/context/replay-context";

export function SiteHeader() {
  const pathname = usePathname();
  const { status, action, openMutationModal, busy, error, refresh, setError } = useReplay();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: "Overview", href: "/" },
    { label: "Studio", href: "/studio" },
    { label: "Transactions", href: "/transactions" },
    { label: "Branches", href: "/branches" },
    { label: "Ledger", href: "/ledger" },
    { label: "Tables", href: "/tables" },
  ];

  const isConnected = status?.database?.connected;

  return (
    <header className="site-header shell">
      <div className="header-brand-group">
        <Link href="/" className="wordmark" aria-label="ReplayDB home">
          <span className="brand-mark">
            <History size={20} />
          </span>
          replay<span>db</span>
          <sup>®</sup>
        </Link>

        {status && (
          <div className="header-status-pill" title={isConnected ? "PostgreSQL database connected" : "In-memory temporal simulation mode"}>
            <span className={isConnected ? "green-dot" : "orange-dot"} />
            <span>{isConnected ? "PostgreSQL Live" : "In-Memory Mode"}</span>
            <span className="pill-divider">·</span>
            <span className="pill-count">{status.totalEventsInLedger} events</span>
          </div>
        )}
      </div>

      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
        <span>Menu</span>
      </button>

      <nav className={menuOpen ? "mobile-nav-open" : ""} aria-label="Main navigation">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={isActive ? "active-nav" : ""}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="header-actions">
        <button
          className="button subtle small header-action-btn"
          onClick={() => action("seed")}
          disabled={busy}
          title="Reset database to baseline records"
        >
          <RefreshCw size={13} className={busy ? "spin" : ""} />
          <span>Reset</span>
        </button>

        <button
          className="button outline small header-action-btn incident-btn"
          onClick={() => action("inject_bug")}
          disabled={busy}
          title="Inject corrupted Tx 402 into the database"
        >
          <Bug size={13} />
          <span>Simulate Bug</span>
        </button>

        <button
          className="button dark small"
          onClick={openMutationModal}
          disabled={busy}
        >
          <Plus size={14} />
          <span>New Mutation</span>
        </button>
      </div>
      {error && (
        <div className="app-error" role="alert">
          <span>Couldn’t load ReplayDB data. Check the connection and try again.</span>
          <button type="button" onClick={() => { setError(""); refresh(); }}>Retry</button>
          <button type="button" aria-label="Dismiss error" onClick={() => setError("")}>×</button>
        </div>
      )}
    </header>
  );
}
