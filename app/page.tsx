"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * HomePage Component
 * Implements the redesigned landing page for the INI Collaboration Network.
 * Integrates premium visual aesthetics (sleek dark modes, smooth gradients, glowing glassmorphic elements)
 * while optimizing the core value proposition text for clarity, conciseness, and high-impact scanning.
 */
export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/directory?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">

      {/* ================= 1. HERO SECTION ================= */}
      <section className="relative bg-slate-900 text-white pt-28 pb-24 overflow-hidden">
        {/* Immersive Glowing Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-emerald-600/20 to-slate-800/10 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          {/* Subtitle Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-200 mb-6 backdrop-blur-md shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Unsiloing Collaboration Across 25 Campuses & 5 Boroughs
          </div>

          {/* Main H1 Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Powering Civic Innovation <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
              Across New York City
            </span>
          </h1>

          {/* High-Level Value Proposition */}
          <p className="text-base md:text-xl text-slate-300 mb-6 max-w-3xl mx-auto leading-relaxed">
            The Institute for Nonpartisan Innovation (INI) Collaboration Network helps faculty, students, and community partners discover expertise, build cross-campus partnerships, and turn research into real-world civic impact.
          </p>

          {/* Co-Powered Branding Statement */}
          <p className="text-xs md:text-sm text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed italic">
            Co-powered by CUNY campuses and <span className="font-bold text-slate-300">Vngle: The Civic Insights Company</span>, connecting fragmented academic and civic efforts into a unified innovation ecosystem.
          </p>

          {/* Core Ecosystem Search Submission Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex flex-col sm:flex-row items-center bg-white rounded-xl shadow-2xl p-2 transition-all focus-within:ring-4 focus-within:ring-indigo-500/30">
              <svg className="hidden sm:block w-6 h-6 text-slate-400 ml-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for 'Sustainability', 'Hunter College', skills..."
                className="hero-search-input w-full py-3.5 px-4 text-slate-900 outline-none text-base bg-transparent placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3 px-8 rounded-lg transition-colors whitespace-nowrap shadow-md"
              >
                Search Directory
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ================= 2. WHY THIS PLATFORM MATTERS ================= */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Column: Narrative Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                The CUNY Opportunity
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Why This Platform Matters
              </h2>

              <div className="space-y-4 text-slate-600 text-sm md:text-base leading-relaxed">
                <p>
                  CUNY represents one of the world’s largest concentrations of public talent, research, and lived experience. Yet, valuable work often remains siloed across campuses, departments, and organizations.
                </p>
                <p>
                  The INI Collaboration Network creates a shared collaboration layer where institutions and communities can:
                </p>
              </div>

              {/* High-Fidelity Bullet Grid */}
              <ul className="grid grid-cols-1 gap-3.5 mt-6">
                {[
                  "Discover aligned faculty, researchers, and civic organizations",
                  "Build interdisciplinary and cross-campus teams",
                  "Identify overlapping research and community priorities",
                  "Accelerate research into civic and policy impact",
                  "Strengthen partnerships between campuses and communities"
                ].map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs md:text-sm font-medium text-slate-700">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold border border-emerald-100">
                      ✓
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <p className="pt-4 border-t border-slate-100 text-slate-800 font-semibold text-xs md:text-sm italic">
                "We believe the future of civic innovation depends on making collaboration more visible, accessible, and actionable across NYC."
              </p>
            </div>

            {/* Right Column: Premium Visual Card */}
            <div className="lg:col-span-5 relative mt-6 lg:mt-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-emerald-50 rounded-3xl transform rotate-3 scale-105" />
              <div className="bg-white p-6 rounded-3xl shadow-xl relative border border-slate-100/60 space-y-6">

                <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">A Unified Ecosystem</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Connecting experts across NYC</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Accelerated Innovation</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">From research to real-world impact</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 border border-purple-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Civic Application</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Empowering student & civic projects</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 3. WHAT THE PLATFORM ENABLES ================= */}
      <section className="py-20 bg-slate-100/50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 mb-3">
              Core Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              What the Platform Enables
            </h2>
            <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto mt-2.5">
              Empowering active, community-led innovation pathways across academic and urban boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Enablement Card 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 text-indigo-600 font-extrabold">
                🌐
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Cross-Campus Collaboration</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect expertise, initiatives, and opportunities across CUNY’s 25-campus system.
              </p>
            </div>

            {/* Enablement Card 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 text-emerald-600 font-extrabold">
                ⚖️
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Research to Civic Impact</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bridge academic insight with community-informed action and public problem-solving.
              </p>
            </div>

            {/* Enablement Card 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center mb-4 text-purple-600 font-extrabold">
                🤝
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-2">Community-Connected Innovation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Strengthen collaboration between faculty, students, and trusted civic partners across NYC.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 4. COLLABORATION INFRASTRUCTURE BUILT FOR CUNY ================= */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">

          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-bold text-purple-700 mb-3">
              Platform Features
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Collaboration Infrastructure Built for CUNY
            </h2>
            <p className="text-xs md:text-sm text-slate-500 max-w-xl mx-auto mt-2.5">
              Built systematically to make finding partners and mapping connections effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Feature 1: Directory */}
            <Link
              href="/directory"
              className="group bg-slate-50/50 p-6 rounded-3xl border border-slate-200/80 hover:bg-white hover:border-indigo-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-5 border border-indigo-100 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                Expert Directory
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Search a growing database of faculty, researchers, staff, and civic collaborators. Discover CUNY talent in seconds.
              </p>
            </Link>

            {/* Feature 2: Network Map */}
            <Link
              href="/explore"
              className="group bg-slate-50/50 p-6 rounded-3xl border border-slate-200/80 hover:bg-white hover:border-emerald-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-5 border border-emerald-100 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">
                Interactive Network Map
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visualize relationships, research clusters, and collaboration opportunities across campuses in real-time.
              </p>
            </Link>

            {/* Feature 3: Collaboration Hub */}
            {/* <Link 
              href="/collab"
              className="group bg-slate-50/50 p-6 rounded-3xl border border-slate-200/80 hover:bg-white hover:border-purple-300 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-5 border border-purple-100 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                Collaboration Hub
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Form teams, share active civic/research opportunities, and coordinate cross-campus initiatives.
              </p>
            </Link> */}

            {/* Feature 4: AI Copilot */}
            <div className="group bg-slate-50/50 p-6 rounded-3xl border border-slate-200/80 hover:bg-white hover:border-amber-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden cursor-default md:col-span-2 md:max-w-md md:mx-auto w-full">
              <div className="absolute top-0 right-0 p-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 shadow-sm border border-amber-200/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                  Always Available
                </span>
              </div>
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-5 border border-amber-100 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 mb-2 group-hover:text-amber-600 transition-colors">
                AI Collaboration Copilot
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Receive contextual guidance on researchers, initiatives, and collaboration pathways across the CUNY ecosystem.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 5. FOOTER CTA: STRENGTHEN NYC ECOSYSTEM ================= */}
      <section className="py-20 bg-slate-950 text-center px-6 relative overflow-hidden border-t border-slate-900">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-indigo-600 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-4">
            Ecosystem Infrastructure
          </span>

          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            Built to Strengthen NYC’s Civic Ecosystem
          </h2>

          <p className="text-slate-400 text-xs md:text-sm mb-10 max-w-xl mx-auto leading-relaxed">
            The INI Collaboration Network is more than a directory or project board. It is emerging civic infrastructure designed to help New York City collaborate at the scale today’s urban challenges demand.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/directory"
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-xs"
            >
              Browse Directory
            </Link>
            <Link
              href="/explore"
              className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700 text-xs"
            >
              View Network Map
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}