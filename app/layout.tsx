"use client"; // Add this to use hooks

import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { usePathname } from "next/navigation"; // Import usePathname
import Copilot from "@/components/Copilot";

// Map feature global imports
import "mapbox-gl/dist/mapbox-gl.css";
import "./map-styles/design-system.css";
import "./map-styles/redesign.css";
import { NewsModalHost } from "@/components/map-feature/news/news-modal-host";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The map feature's design system types in Inter (via --font-inter); load it
// here so the map keeps its own typography without touching the site's Geist.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login"; // Check if path is /login

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}>
      <body className="flex flex-col h-dvh overflow-hidden bg-slate-50 text-slate-900 font-sans">

        {/* Only render Header if NOT on the login page */}
        {!isLoginPage && <Header />}

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>

        {/* Render global AI Copilot on all pages except the login page */}
        {!isLoginPage && <Copilot />}

        {/* Global modals for map feature */}
        <NewsModalHost />
      </body>
    </html>
  );
}