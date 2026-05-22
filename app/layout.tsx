"use client"; // Add this to use hooks

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { usePathname } from "next/navigation"; // Import usePathname
import Copilot from "@/components/Copilot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">

        {/* Only render Header if NOT on the login page */}
        {!isLoginPage && <Header />}

        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>

        {/* Render global AI Copilot on all pages except the login page */}
        {!isLoginPage && <Copilot />}
      </body>
    </html>
  );
}