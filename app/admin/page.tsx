"use client";

import Link from "next/link";

/**
 * Disabled AdminDashboard
 * Database editing and admin dashboard features have been disabled.
 */
export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Secure Lock Icon Badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-4xl mb-6 shadow-inner">
          🔒
        </div>
        
        <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-2">Dashboard Disabled</h1>
        <p className="text-sm text-slate-400 mb-8 px-4">
          The general administrative dashboard has been deprecated and disabled. Interactive database edits and user lists have been locked.
        </p>

        {/* Info Box */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mb-8 text-left text-xs text-slate-500 space-y-2">
          <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-1">Administrative Notice</p>
          <p>• Direct database mutations must be executed securely through the Supabase Editor.</p>
          <p>• To trigger AI Matchmaking or send emails, please use the dedicated <Link href="/admin/matches" className="text-blue-400 hover:underline">Matchmaker Admin</Link> dashboard.</p>
        </div>

        {/* Return Button */}
        <Link
          href="/"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
        >
          🏠 Return to Network
        </Link>
      </div>
    </div>
  );
}