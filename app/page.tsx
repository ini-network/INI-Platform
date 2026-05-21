"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Route to your directory page with the applied keyword search filter
      router.push(`/directory?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // --- MOCK DATA FOR PLACEHOLDERS ---
  const opportunities = [
    { id: 1, title: "Urban Sustainability Seed Grant", source: "NYC EDC", domain: "Environment", deadline: "Closes in 5 days" },
    { id: 2, title: "Community Health Data Initiative", source: "Grants.gov", domain: "Public Health", deadline: "Closes in 12 days" },
    { id: 3, title: "Affordable Housing Tech RFP", source: "NYC HPD", domain: "Housing", deadline: "Closes in 3 weeks" },
  ];

  const civicWireReports = [
    { id: 1, title: "Tenant organizing meeting documented", location: "Bronx, NY", hash: "0x8F...3A9C", time: "2 hours ago" },
    { id: 2, title: "Community garden zoning dispute", location: "Harlem, NY", hash: "0x4B...1F2E", time: "5 hours ago" },
    { id: 3, title: "Transit accessibility audit completed", location: "Queens, NY", hash: "0x7C...9D8B", time: "1 day ago" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* 1. HERO SECTION (The "Why" & The "Search") */}
      <section className="bg-slate-900 text-white pt-24 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            The Pulse of NYC’s Civic Ecosystem.
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Connect with CUNY expertise, discover live funding opportunities, and explore blockchain-verified grassroots insights—all in one place.
          </p>

          {/* The "Pro" Search Bar */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto relative mb-8">
            <div className="flex items-center bg-white rounded-xl shadow-lg p-2 focus-within:ring-4 ring-blue-500/30 transition-all">
              <svg className="w-6 h-6 text-slate-400 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for 'Urban Sustainability' or 'Hunter College'..."
                className="w-full py-4 px-4 text-slate-900 outline-none text-lg bg-transparent"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </form>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/explore" className="text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 py-2.5 px-6 rounded-lg transition-colors border border-slate-700">
              Explore the Map
            </Link>
            <Link href="/intel" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
              View All Opportunities &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THE "LIVE INTELLIGENCE" FEED (Bento Box) */}
      <section className="max-w-6xl mx-auto px-6 py-16 -mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Left Column: Opportunities */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Opportunities
              </h2>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Via Gov Portals</span>
            </div>

            <div className="space-y-4">
              {opportunities.map((opp) => (
                <div key={opp.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-blue-200 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{opp.title}</h3>
                    <span className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded-md">{opp.source}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      {opp.domain}
                    </span>
                    <span className="text-emerald-600 font-medium">{opp.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: CivicWire */}
          <div className="bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-xl">📡</span>
                CivicWire Insights
              </h2>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 border border-blue-400/30 px-2 py-1 rounded">Live Feed</span>
            </div>

            <div className="space-y-4">
              {civicWireReports.map((report) => (
                <div key={report.id} className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer">
                  <h3 className="font-bold text-slate-100 mb-2">{report.title}</h3>
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-slate-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {report.location} • {report.time}
                    </span>
                    {/* Blockchain Verification Badge */}
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      {report.hash}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 3. NETWORK AT A GLANCE (Social Proof) */}
      <section className="bg-white py-16 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Powering a network of</p>
          <div className="text-5xl md:text-7xl font-extrabold text-slate-800 tracking-tight mb-8">
            1,342 <span className="text-2xl md:text-3xl font-bold text-slate-400 block mt-2">Researchers & Civic Operators</span>
          </div>

          {/* Campus Logos Placeholder Area */}
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {/* Replace these divs with actual img tags or SVG components of CUNY logos */}
            <div className="h-10 w-32 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 w-40 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 w-28 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-10 w-36 bg-slate-200 rounded animate-pulse"></div>
          </div>
          <p className="text-slate-500 font-medium mt-6">Spanning 25 CUNY Campuses & NYC Institutions</p>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-800">How the Ecosystem Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">

          {/* Step 1 */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Discover</h3>
            <p className="text-slate-600 leading-relaxed">Search our verified network for specific skills, campuses, or subject matter experts across the city.</p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Monitor</h3>
            <p className="text-slate-600 leading-relaxed">Follow live, blockchain-verified CivicWire reports and open RFPs tailored specifically to your domain.</p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Coordinate</h3>
            <p className="text-slate-600 leading-relaxed">Use the network to match ground-truth insights with the academic power needed to turn ideas into action.</p>
          </div>

        </div>
      </section>

    </div>
  );
}