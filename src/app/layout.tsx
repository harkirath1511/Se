import type { Metadata } from "next";
import "./globals.css";
import { ReplayProvider } from "@/context/replay-context";
import { SiteHeader } from "@/components/navigation/site-header";
import { SiteFooter } from "@/components/navigation/site-footer";

export const metadata: Metadata = {
  title: "ReplayDB — Temporal Database Debugging & Time-Travel Replay",
  description:
    "Your database has a story. Rewind every change, understand every version, and explore another outcome with ReplayDB for PostgreSQL.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ReplayProvider>
          <div className="min-h-screen flex flex-col justify-between">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </ReplayProvider>
      </body>
    </html>
  );
}
