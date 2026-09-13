import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ReplayDB — A way back.",
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
      <body>{children}</body>
    </html>
  );
}
