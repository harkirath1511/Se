import Link from "next/link";
import { History, ArrowUpRight } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="shell">
      <Link className="wordmark" href="/">
        <History size={20} />
        replay<span>db</span>
      </Link>
      <span>Deterministic Temporal Database Debugger & Replay Engine for PostgreSQL.</span>
      <div className="footer-links">
        <Link href="/studio">Studio</Link>
        <Link href="/transactions">Transactions</Link>
        <Link href="/branches">Branches</Link>
        <Link href="/ledger">Ledger</Link>
        <a
          href="https://github.com/harkirath1511/Se"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <ArrowUpRight size={13} />
        </a>
      </div>
    </footer>
  );
}
