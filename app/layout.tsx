import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Arquivos locais de propósito: o next/font/google quebra o build quando
// o Google devolve a fonte sem extensão no nome do arquivo.
const fraunces = localFont({
  src: "./fonts/fraunces-latin.woff2",
  weight: "400 600",
  variable: "--font-fraunces",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Finacap Research",
  description: "Dashboard de equity research — Finacap",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="antialiased bg-surface-soft text-ink font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
