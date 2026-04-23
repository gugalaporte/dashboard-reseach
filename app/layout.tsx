import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finacap Research",
  description: "Dashboard de equity research — Finacap",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-surface-soft text-ink">{children}</body>
    </html>
  );
}
