"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Database,
  History,
  GitBranch,
  Play,
  Layers,
  Activity,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useReplay } from "@/context/replay-context";

export default function LandingPage() {
  const sculpture = useRef<HTMLDivElement>(null);
  const { status, action, busy } = useReplay();
  const router = useRouter();

  return (
    <main>
      {/* ─── Hero Section ─────────────────────────────────── */}
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
            Your database has a story. Rewind historical moments,
            <br className="desktop-break" /> understand atomic transaction changes, and
            explore counterfactual timelines without touching production state.
          </p>
          <div className="hero-actions">
            <Link href="/studio" className="button orange">
              Launch Replay Studio <ArrowUpRight size={18} />
            </Link>
            <a className="text-link" href="#how-it-works">
              <span className="play-outline">
                <Play size={12} />
              </span>{" "}
              Meet ReplayDB
            </a>
          </div>
          <div className="hero-note">
            <span className="tiny-line" /> Built for PostgreSQL 16+ · Deterministic TypeScript Engine · Zero Upstream Intrusion
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
              `${(e.clientX - r.left - r.width / 2) / 35}deg`
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

      {/* ─── Principles Strip ──────────────────────────────── */}
      <div className="principles shell">
        <span>YOUR DATA. WITH A MEMORY.</span>
        <Link href="/studio" className="text-link">
          <History size={16} /> Rewind any moment
        </Link>
        <Link href="/transactions" className="text-link">
          <Layers size={16} /> Understand every commit
        </Link>
        <Link href="/branches" className="text-link">
          <GitBranch size={16} /> Explore counterfactuals
        </Link>
      </div>

      {/* ─── Product Modules Hub ───────────────────────────── */}
      <section className="shell" style={{ paddingTop: "70px", paddingBottom: "50px" }}>
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 / PLATFORM MODULES</div>
            <h2 style={{ fontSize: "38px", margin: "10px 0 0", letterSpacing: "-1.5px" }}>
              Explore the system.
              <br />
              <span style={{ fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--orange)" }}>
                Engineered for forensics.
              </span>
            </h2>
          </div>
          <p style={{ color: "var(--muted)", maxWidth: "420px", fontSize: "13px", lineHeight: "1.6" }}>
            ReplayDB divides historical database analysis into dedicated, specialized views. Jump directly to what you need to investigate.
          </p>
        </div>

        <div className="page-hub-grid">
          <Link href="/studio" className="hub-card">
            <div>
              <div className="hub-card-top">
                <div className="hub-icon-box">
                  <History size={22} />
                </div>
                <span className="badge badge-orange">Core Tool</span>
              </div>
              <h3>Replay Studio</h3>
              <p>
                Interactive timeline scrubber with millisecond precision. Reconstruct the state of any table row at any historical point-in-time and compute deep field diffs.
              </p>
            </div>
            <span className="hub-card-link">
              Open Replay Studio <ArrowUpRight size={14} />
            </span>
          </Link>

          <Link href="/transactions" className="hub-card">
            <div>
              <div className="hub-card-top">
                <div className="hub-icon-box">
                  <Layers size={22} />
                </div>
                <span className="badge badge-gray">Forensics</span>
              </div>
              <h3>Transaction Forensics</h3>
              <p>
                Investigate atomic transaction boundaries and blast radius. Group multi-table writes committed together and isolate production anomalies like Tx 402.
              </p>
            </div>
            <span className="hub-card-link">
              Inspect Transactions <ArrowUpRight size={14} />
            </span>
          </Link>

          <Link href="/branches" className="hub-card">
            <div>
              <div className="hub-card-top">
                <div className="hub-icon-box">
                  <GitBranch size={22} />
                </div>
                <span className="badge badge-green">Sandbox</span>
              </div>
              <h3>Counterfactual Branches</h3>
              <p>
                Ask "what if?" Fork virtual timelines with target transactions omitted. Compare reality side-by-side with an alternative, uncorrupted database state.
              </p>
            </div>
            <span className="hub-card-link">
              Explore Branches <ArrowUpRight size={14} />
            </span>
          </Link>

          <Link href="/ledger" className="hub-card">
            <div>
              <div className="hub-card-top">
                <div className="hub-icon-box">
                  <Search size={22} />
                </div>
                <span className="badge badge-gray">Ledger</span>
              </div>
              <h3>Historical Ledger</h3>
              <p>
                Tamper-proof append-only audit trail. Search, filter, and inspect raw JSON snapshots across all monitored tables with full transaction and user attribution.
              </p>
            </div>
            <span className="hub-card-link">
              View Event Ledger <ArrowUpRight size={14} />
            </span>
          </Link>

          <Link href="/tables" className="hub-card">
            <div>
              <div className="hub-card-top">
                <div className="hub-icon-box">
                  <Database size={22} />
                </div>
                <span className="badge badge-gray">Setup</span>
              </div>
              <h3>Schema Management</h3>
              <p>
                Monitor application tables with zero downtime. Dynamically attach or detach PL/pgSQL CDC capture triggers without altering business schemas.
              </p>
            </div>
            <span className="hub-card-link">
              Manage Tables <ArrowUpRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* ─── Demo Incident Strip ───────────────────────────── */}
      <section className="shell" style={{ paddingBottom: "50px" }}>
        <div className="demo-strip demo-guide">
          <div className="demo-symbol">
            <Activity size={21} />
          </div>
          <div>
            <strong>Try the guided incident investigation</strong>
            <p>
              Start with normal data, introduce the safe demo incident, then inspect every affected record and test the recovery plan. Nothing touches a production database.
            </p>
            <ol className="demo-steps" aria-label="Guided demo steps">
              <li><span>1</span> Inject the safe demo incident</li>
              <li><span>2</span> Review the affected transaction</li>
              <li><span>3</span> Compare a recovery timeline</li>
            </ol>
          </div>
          <div className="demo-actions">
            <button
              className="text-link"
              disabled={busy}
              onClick={() => action("seed")}
            >
              Reset demo baseline
            </button>
            <button
              className="button outline small"
              disabled={busy}
              onClick={async () => {
                await action("inject_bug");
                router.push("/transactions?txId=402");
              }}
            >
              {busy ? "Preparing incident…" : "Start incident investigation"}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── How It Works Narrative ────────────────────────── */}
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
              text: "Scrub through a record’s lifecycle and see exactly what your data looked like at any captured moment with microsecond resolution.",
            },
            {
              n: "02",
              icon: Layers,
              title: "Connect the dots.",
              text: "See field-level changes and follow a transaction across tables. Discover cascading side-effects within atomic boundaries.",
            },
            {
              n: "03",
              icon: GitBranch,
              title: "Find another ending.",
              text: "Leave an errant transaction out. Reconstruct an alternative timeline and compare it directly with what actually happened.",
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

      {/* ─── Closing Banner ────────────────────────────────── */}
      <section className="closing shell">
        <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
        <h2>
          Hindsight.
          <br />
          <em>Now on demand.</em>
        </h2>
        <Link href="/studio" className="button dark">
          Launch Replay Studio <ArrowUpRight size={18} />
        </Link>
        <span className="closing-asterisk" aria-hidden="true">
          ✳
        </span>
      </section>
    </main>
  );
}
