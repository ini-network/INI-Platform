import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header"; // <-- Import the new Header

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Updated to your actual project details
export const metadata: Metadata = {
  title: "INI Civic Network",
  description: "CUNY Civic Innovation Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      {/* h-screen and overflow-hidden are critical here.
        They lock the window size so your Workspace and Map components
        can handle their own internal scrolling cleanly.
      */}
      <body className="flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">

        {/* THE GLOBAL HEADER */}
        <Header />

        {/* THE PAGE CONTENT */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>

      </body>
    </html>
  );
}