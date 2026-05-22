"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";

export default function HomePage() {
    const router = useRouter();

    // Track the user-entered keyword query prior to submission redirect
    const [searchQuery, setSearchQuery] = useState("");

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            // Route to the directory page with the applied keyword search query parameter
            router.push(`/directory?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <div
            className="h-full w-full overflow-y-auto bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">

            {/* 1. HERO SECTION */}
            <section className="relative bg-slate-900 text-white pt-32 pb-24 overflow-hidden">
                {/* Abstract Background Decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div
                        className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/10 blur-3xl"/>
                    <div
                        className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-emerald-600/20 to-slate-800/10 blur-3xl"/>
                </div>

                <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
                    <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-blue-200 mb-8 backdrop-blur-md shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                        Empowering the CUNY Ecosystem
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                        Unsiloing Collaboration <br className="hidden md:block"/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Across 25 Campuses.
            </span>
                    </h1>

                    <p className="text-lg md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                        The Institute for Nonpartisan Innovation (INI) platform bridges the gap between civic actors,
                        researchers, and student projects. Discover talent, visualize connections, and turn ideas into
                        action.
                    </p>

                    {/* Core Search Submission Form */}
                    <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
                        <div
                            className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div
                            className="relative flex flex-col sm:flex-row items-center bg-white rounded-xl shadow-2xl p-2 transition-all focus-within:ring-4 focus-within:ring-blue-500/30">
                            <svg className="hidden sm:block w-6 h-6 text-slate-400 ml-4" fill="none"
                                 stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search for 'Sustainability', 'Hunter College', or skills..."
                                className="hero-search-input w-full py-4 px-4 text-slate-900 outline-none text-lg bg-transparent placeholder:text-slate-400"
                            />
                            <button
                                type="submit"
                                className="w-full sm:w-auto bg-slate-900 hover:bg-blue-600 text-white font-bold py-3.5 px-8 rounded-lg transition-colors whitespace-nowrap shadow-md"
                            >
                                Search Directory
                            </button>
                        </div>
                    </form>
                </div>
            </section>

            {/* 2. WHY IT MATTERS */}
            <section className="py-24 bg-white relative">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
                                Why This Platform Matters
                            </h2>
                            <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                                <p>
                                    The City University of New York (CUNY) is composed of <strong>25 unique
                                    campuses</strong> and institutions, housing an immense density of talent. Yet,
                                    groundbreaking research, innovative student projects, and critical civic initiatives
                                    often remain isolated within their own silos.
                                </p>
                                <p>
                                    We believe that the most pressing urban challenges can only be solved through
                                    cross-disciplinary and cross-campus collaboration.
                                </p>
                                <p>
                                    This platform is designed to break down those barriers—acting as a centralized
                                    intelligence layer that connects you with the right experts, uncovers hidden
                                    academic synergies, and accelerates impactful civic action.
                                </p>
                            </div>
                        </div>

                        {/* Visual Decorative Element for 'Why it matters' */}
                        <div className="relative">
                            <div
                                className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-emerald-50 rounded-3xl transform rotate-3 scale-105"/>
                            <div
                                className="bg-white p-8 rounded-3xl shadow-xl relative border border-slate-100 space-y-6">
                                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                                    <div
                                        className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">A Unified Ecosystem</h3>
                                        <p className="text-slate-500">Connecting experts across NYC</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                                    <div
                                        className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Accelerated Innovation</h3>
                                        <p className="text-slate-500">From research to real-world impact</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Civic Application</h3>
                                        <p className="text-slate-500">Empowering student & civic projects</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. CORE FEATURES (What it is) */}
            <section className="py-24 bg-slate-50 border-t border-slate-200">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                            Everything You Need to Collaborate
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Our suite of integrated tools is engineered to make finding partners and managing
                            cross-campus initiatives effortless.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Feature 1: Directory */}
                        <Link href="/directory"
                              className="group bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all duration-300">
                            <div
                                className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">Expert
                                Directory</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Search a comprehensively indexed database of <strong>1,400+ active faculty, staff, and
                                researchers</strong>. Find the exact expertise you need in seconds.
                            </p>
                        </Link>

                        {/* Feature 2: Network Map */}
                        <Link href="/explore"
                              className="group bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-300 transition-all duration-300">
                            <div
                                className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors">Interactive
                                Network Map</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Visually explore the CUNY ecosystem. Uncover hidden connections, structural
                                relationships, and overlapping interests across the 25 campuses.
                            </p>
                        </Link>

                        {/* Feature 3: Collaboration Hub */}
                        <Link href="/collab"
                              className="group bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all duration-300">
                            <div
                                className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-purple-600 transition-colors">Collaboration
                                Hub</h3>
                            <p className="text-slate-600 leading-relaxed">
                                A dedicated workspace to post opportunities, form cross-disciplinary teams, and align on
                                project goals with verified civic and academic partners.
                            </p>
                        </Link>

                        {/* Feature 4: AI Copilot */}
                        <div
                            className="group bg-white p-8 rounded-3xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all duration-300 relative overflow-hidden cursor-default">
                            <div className="absolute top-0 right-0 p-4">
                <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
                  Always Available
                </span>
                            </div>
                            <div
                                className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">AI
                                Copilot</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Have a question about a specific researcher or campus initiative? Our deeply integrated
                                AI Copilot is contextually aware and ready to guide you.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* 4. FOOTER CTA */}
            <section className="py-20 bg-slate-900 text-center px-6 border-t border-slate-800">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Ready to break the silos?</h2>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link href="/directory"
                          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20">
                        Browse Directory
                    </Link>
                    <Link href="/explore"
                          className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700">
                        View Network Map
                    </Link>
                </div>
            </section>

        </div>
    );
}