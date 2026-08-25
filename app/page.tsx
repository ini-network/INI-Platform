"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/Footer";

/**
 * SearchForm Component
 * Isolates search state to prevent full page re-renders on every keystroke.
 */
function SearchForm() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/directory?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
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
  );
}

/**
 * HomePage Component
 * Implements the redesigned landing page for the INI Collaboration Network.
 * Integrates premium visual aesthetics (sleek dark modes, smooth gradients, glowing glassmorphic elements)
 * while optimizing the core value proposition text for clarity, conciseness, and high-impact scanning.
 */
export default function HomePage() {

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
          <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/10 border border-white/15 text-lg md:text-xl font-bold text-indigo-200 mb-6 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            Unsiloing Collaboration Across 26 Campuses & 5 Boroughs
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

          {/* Demo Video Header & Video */}
          <div className="max-w-4xl mx-auto mb-10">
            <p className="text-sm md:text-base font-semibold text-indigo-200 mb-3 text-center sm:text-left flex items-center justify-center sm:justify-start gap-2">
              <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>See how INI.network works:</span>
            </p>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black aspect-video flex items-center justify-center">
              <video
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              >
                <source src="/assets/videos/INI Network Demo Video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          {/* Co-Powered Branding Statement */}
          <p className="text-xs md:text-sm text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed italic">
            Co-powered by CUNY campuses and{" "}
            <a
              href="https://vngle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-indigo-400 hover:text-indigo-300 underline decoration-indigo-400/60 hover:decoration-indigo-300 underline-offset-4 transition-colors not-italic inline-flex items-center gap-1"
            >
              <span>Vngle: The Civic Insights Company</span>
              <svg className="w-3.5 h-3.5 inline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            , connecting fragmented academic and civic efforts into a unified innovation ecosystem.
          </p>

          {/* Core Ecosystem Search Submission Form */}
          <SearchForm />
        </div>
      </section>



      {/* ================= 2. WHY THIS ECOSYSTEM MATTERS ================= */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">

          {/* Testimonial Quote by Arthur Chisolm */}
          <div className="mb-20">
            <div className="relative">
              {/* Offset backdrop wrapper to match ecosystem card styling */}
              <div className="absolute inset-0 bg-linear-to-tr from-indigo-100/80 to-emerald-100/80 rounded-3xl transform -rotate-1 scale-102 md:scale-103" />

              <div className="relative bg-white rounded-3xl p-10 md:p-14 border border-slate-100/60 shadow-xl overflow-hidden">
                {/* Decorative background gradients */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-linear-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

                <div className="relative flex flex-col md:flex-row gap-8 md:gap-10 items-start">
                  {/* Large Decorative Quote Icon */}
                  <div className="hidden md:flex w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100/80 items-center justify-center shrink-0 text-indigo-600">
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>

                  <div className="flex-1 space-y-8">
                    <blockquote className="space-y-4">
                      <span className="block text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                        “INI has changed lives
                      </span>
                      <p className="text-lg md:text-2xl text-slate-700 font-medium leading-relaxed">
                        by creating new ways for NYC to collaborate, while creating pathways for more of CUNY to discover the impact they can make in their communities.”
                      </p>
                    </blockquote>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-8 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-base md:text-lg">Arthur Chisolm</span>
                          <a
                            href="https://www.linkedin.com/feed/update/urn:li:activity:7395134427678339072/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[10px] md:text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-bold gap-1 bg-indigo-50/50 px-2.5 py-0.5 rounded border border-indigo-100/50"
                            aria-label="Arthur Chisolm LinkedIn update"
                          >
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                            <span>LinkedIn</span>
                          </a>
                        </div>
                        <div className="text-xs md:text-sm text-indigo-800 font-bold">
                          Founding INI Campus Partner
                        </div>
                        <div className="text-xs md:text-sm text-slate-500 font-medium">
                          Former Career & Academic Advisor, CUNY2X Tech at City Tech
                        </div>
                        <div className="text-xs md:text-sm text-slate-400 font-medium">
                          Helped pioneer INI’s first five student fellow cohorts
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Left Column: Narrative Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                The CUNY Opportunity
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Why a CUNY-Centric Innovation Hub Matters
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
            </div>

            {/* Right Column: Premium Visual Card */}
            <div className="lg:col-span-4 relative mt-6 lg:mt-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100 to-emerald-50 rounded-3xl transform rotate-3 scale-105" />
              <div className="bg-white p-6 rounded-3xl shadow-xl relative border border-slate-100/60 space-y-6 flex flex-col justify-center h-full">

                <div className="flex flex-row items-center justify-center gap-4 pb-5 border-b border-slate-100 text-center">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-sm md:text-base font-extrabold text-slate-900">A Unified Ecosystem</h3>
                    <p className="text-[11px] md:text-xs text-slate-500 mt-0.5">Connecting experts across NYC</p>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-center gap-4 pb-5 border-b border-slate-100 text-center">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-sm md:text-base font-extrabold text-slate-900">Accelerated Innovation</h3>
                    <p className="text-[11px] md:text-xs text-slate-500 mt-0.5">From research to real-world impact</p>
                  </div>
                </div>

                <div className="flex flex-row items-center justify-center gap-4 text-center">
                  <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 border border-purple-100">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-sm md:text-base font-extrabold text-slate-900">Civic Application</h3>
                    <p className="text-[11px] md:text-xs text-slate-500 mt-0.5">Empowering student & civic projects</p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Photo Showcase: INI at Baruch College */}
          <div className="mt-10 sm:mt-16 max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 sm:-inset-1.5 bg-linear-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 rounded-2xl sm:rounded-3xl blur-md sm:blur-lg opacity-70 group-hover:opacity-100 transition duration-500" />
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-lg sm:shadow-xl">
                <div className="relative aspect-16/10 sm:aspect-video w-full bg-slate-100">
                  <Image
                    src="/images/ini-baruch-capstone.jpg"
                    alt="Introducing INI at Baruch College through Dr. Angie Beeman’s Public Service Capstone course"
                    fill
                    className="object-cover object-[center_30%] sm:object-center transition-transform duration-500 group-hover:scale-[1.01]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 896px"
                  />
                </div>
              </div>
            </div>
            <p className="mt-2.5 sm:mt-3.5 px-2 text-center text-xs sm:text-sm text-slate-500 italic font-medium leading-relaxed">
              Introducing INI at Baruch College through Dr. Angie Beeman’s Public Service Capstone course.
            </p>
          </div>

          {/* Full-Width Quote Span */}
          <div className="mt-14 pt-8 border-t border-slate-100 text-center max-w-4xl mx-auto">
            <blockquote className="space-y-2">
              <p className="text-slate-800 font-bold text-base md:text-lg italic leading-relaxed">
                “We believe the future of civic innovation relies on making collaboration more visible, accessible, and actionable across NYC.”
              </p>
              <footer className="text-slate-500 font-bold text-xs md:text-sm tracking-wide">
                — INI Team
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* ================= 3. WHAT THE INI COLLABORATION NETWORK ENABLES ================= */}
      <section className="py-20 bg-slate-100/50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 mb-3">
              Core Capabilities
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              What the INI Collaboration Network Enables
            </h2>
            <p className="text-xs md:text-sm text-slate-600 max-w-2xl mx-auto mt-2.5 leading-relaxed">
              Connecting <strong className="text-slate-900 font-semibold">academic expertise, civic organizations, and community knowledge</strong> to create stronger opportunities and pathways for collaboration across New York City.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Enablement Card 1 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex flex-col text-center">
              <div className="flex flex-row items-center justify-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl shadow-sm shrink-0">
                  🌐
                </div>
                <h3 className="text-base md:text-lg font-extrabold text-slate-900 text-left">
                  Cross-Ecosystem Collaboration
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                Connect people, expertise, initiatives, and opportunities across <strong className="text-slate-800 font-medium">CUNY's campus system and NYC’s broader civic ecosystem.</strong>
              </p>
            </div>

            {/* Enablement Card 2 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex flex-col text-center">
              <div className="flex flex-row items-center justify-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl shadow-sm shrink-0">
                  ⚖️
                </div>
                <h3 className="text-base md:text-lg font-extrabold text-slate-900 text-left">
                  Research to Civic Impact
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                Bridge academic research and lived experience with <strong className="text-slate-800 font-medium">community-informed action and public problem-solving.</strong>
              </p>
            </div>

            {/* Enablement Card 3 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex flex-col text-center">
              <div className="flex flex-row items-center justify-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-2xl shadow-sm shrink-0">
                  🤝
                </div>
                <h3 className="text-base md:text-lg font-extrabold text-slate-900 text-left">
                  Community-Connected Innovation
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
                Strengthen collaboration between <strong className="text-slate-800 font-medium">campuses, civic organizations, community leaders, and the neighborhoods they serve.</strong>
              </p>
            </div>

          </div>

          {/* Visual Showcase: Cross-Ecosystem Collaboration Network Map */}
          <div className="mt-10 sm:mt-14 max-w-2xl mx-auto w-full px-1 sm:px-0">
            <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-emerald-500/20 via-indigo-500/20 to-purple-500/20 rounded-2xl sm:rounded-3xl blur-md opacity-70 group-hover:opacity-100 transition duration-500" />
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-1.5 sm:p-3 shadow-md sm:shadow-lg">
                <div className="relative aspect-1024/974 w-full bg-slate-50 rounded-xl sm:rounded-2xl overflow-hidden">
                  <Image
                    src="/images/ini-cuny-ecosystem-map.jpg"
                    alt="Map of CUNY Cross-Ecosystem Collaboration Network across NYC boroughs"
                    fill
                    className="object-contain transition-transform duration-500 group-hover:scale-[1.01]"
                    sizes="(max-width: 640px) 100vw, 672px"
                  />
                </div>
              </div>
            </div>
            <p className="mt-2.5 sm:mt-3.5 px-2 text-center text-xs sm:text-sm text-slate-500 italic font-medium leading-relaxed">
              By building connections across CUNY, we can help transform NYC into a more collaborative civic network
            </p>
          </div>
        </div>
      </section>

      {/* ================= 4. COLLABORATION INFRASTRUCTURE FOR NYC ================= */}
      <section className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-6">

          <div className="text-center mb-14">
            <div className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-xs font-bold text-purple-700 mb-3">
              INI Features
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Collaboration Infrastructure for NYC
            </h2>
            <p className="text-xs md:text-sm text-slate-600 max-w-xl mx-auto mt-2.5 leading-relaxed">
              Built to make <strong className="text-slate-900 font-semibold">finding expertise, discovering civic work, and forming meaningful connections</strong> across the city easier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Feature 1: Directory */}
            <Link
              href="/directory"
              className="group bg-slate-50/50 p-8 rounded-3xl border border-slate-200/80 hover:bg-white hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col text-center"
            >
              <div className="flex flex-row items-center justify-center gap-4 mb-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform shadow-sm shrink-0">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors text-left">
                  Expert & Civic Directory
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                Search a growing network of <strong className="text-slate-800 font-medium">faculty, researchers, civic leaders, organizations, and collaborators</strong> working across NYC.
              </p>
            </Link>

            {/* Feature 2: Network Map */}
            <Link
              href="/explore"
              className="group bg-slate-50/50 p-8 rounded-3xl border border-slate-200/80 hover:bg-white hover:border-emerald-300 hover:shadow-xl transition-all duration-300 flex flex-col text-center"
            >
              <div className="flex flex-row items-center justify-center gap-4 mb-4">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform shadow-sm shrink-0">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 group-hover:text-emerald-600 transition-colors text-left">
                  Interactive Network Map
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                Explore <strong className="text-slate-800 font-medium">people, organizations, initiatives, and collaboration opportunities</strong> across campuses, communities, and boroughs.
              </p>
            </Link>

            {/* Feature 3: AI Copilot */}
            <div className="group bg-slate-50/50 p-8 rounded-3xl border border-slate-200/80 hover:bg-white hover:border-amber-300 hover:shadow-xl transition-all duration-300 flex flex-col text-center">
              <div className="flex flex-row items-center justify-center gap-4 mb-4">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform shadow-sm shrink-0">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors text-left">
                  AI Collaboration Copilot
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                Get contextual guidance to discover <strong className="text-slate-800 font-medium">people, projects, expertise, and potential collaboration pathways</strong> across NYC’s civic ecosystem.
              </p>
            </div>

            {/* Feature 4: Public Data Map */}
            <Link
              href="/map"
              className="group bg-slate-50/50 p-8 rounded-3xl border border-slate-200/80 hover:bg-white hover:border-cyan-300 hover:shadow-xl transition-all duration-300 flex flex-col text-center"
            >
              <div className="flex flex-row items-center justify-center gap-4 mb-4">
                <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-2xl flex items-center justify-center border border-cyan-100 group-hover:scale-110 transition-transform shadow-sm shrink-0">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 group-hover:text-cyan-600 transition-colors text-left">
                  Public Data Map
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                Access recent neighborhood-level civic information across NYC—connecting local representatives, community reports, and ongoing issues so you can better understand what’s happening.
              </p>
            </Link>

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

          <p className="text-slate-300 text-xs md:text-sm mb-6 max-w-2xl mx-auto leading-relaxed">
            The <strong className="text-white font-bold">INI Collaboration Network</strong> is more than a directory or project board. It is emerging civic infrastructure designed to help <strong className="text-slate-100 font-semibold">people and institutions across New York City discover one another, reduce silos, and collaborate around shared challenges.</strong>
          </p>

          <p className="text-indigo-200 font-bold text-xs md:text-sm mb-10 max-w-xl mx-auto">
            Discover who’s working on what—and where you can plug in.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/directory"
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 text-xs"
            >
              Browse the Network
            </Link>
            <Link
              href="/explore"
              className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700 text-xs"
            >
              Explore the Map
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}