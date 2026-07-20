import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

import { NewsModalHost } from "../components/news/news-modal-host";

import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";
// Canonical editorial design system — imported LAST so it unifies the two
// stacked legacy palettes onto one warm-paper, civic-green system.
import "./design-system.css";
// Redesign (Mapbox shell + borough overview + deep-dive). Scoped to .cs-* classes.
import "./redesign.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

// viewport-fit:cover so env(safe-area-inset-*) resolves to real values (needed by
// the phone bottom tab bar to clear the iOS home indicator). Visually inert on
// desktop/tablet — no layout shift above 640.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export const metadata: Metadata = {
  title: "Vngle / Civic Signal NYC",
  description: "Civic issue intelligence for New York City.",
  icons: {
    icon: "/brand/vngle-icon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning style={{ height: '100dvh', margin: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
        <NewsModalHost />
      </body>
    </html>
  );
}
