"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import flagImage from "@/assets/images/American-Flag-On-White-Background-Wallpaper-Mural.jpg";
import Footer from "@/components/Footer";


export default function America250Client() {
  // 1. CivicWire Form State
  const [civicWireForm, setCivicWireForm] = useState({
    orgName: "",
    email: "",
    insightsNeeded: "",
  });
  const [civicWireSubmitting, setCivicWireSubmitting] = useState(false);
  const [civicWireSuccess, setCivicWireSuccess] = useState(false);

  // 2. Network Form State
  const [networkForm, setNetworkForm] = useState({
    name: "",
    contact: "",
    role: "Campus Partner",
    reason: "",
  });
  const [networkSubmitting, setNetworkSubmitting] = useState(false);
  const [networkSuccess, setNetworkSuccess] = useState(false);
  const [civicWireError, setCivicWireError] = useState("");
  const [networkError, setNetworkError] = useState("");

  // CivicWire Submit Handler
  const handleCivicWireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!civicWireForm.email || !civicWireForm.insightsNeeded) return;
    setCivicWireSubmitting(true);
    setCivicWireError("");
    try {
      const res = await fetch("/api/america250", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "civicwire", data: civicWireForm }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setCivicWireSuccess(true);
      } else {
        setCivicWireError(data.message || "Failed to submit request.");
      }
    } catch (err) {
      console.error(err);
      setCivicWireError("An unexpected error occurred. Please try again.");
    } finally {
      setCivicWireSubmitting(false);
    }
  };

  // Network Submit Handler
  const handleNetworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!networkForm.name || !networkForm.contact) return;
    setNetworkSubmitting(true);
    setNetworkError("");
    try {
      const res = await fetch("/api/america250", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "nomination", data: networkForm }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setNetworkSuccess(true);
      } else {
        setNetworkError(data.message || "Failed to submit nomination.");
      }
    } catch (err) {
      console.error(err);
      setNetworkError("An unexpected error occurred. Please try again.");
    } finally {
      setNetworkSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 font-sans selection:bg-rose-100 selection:text-rose-900">
      
      {/* ================= 1. HERO SECTION ================= */}
      <section className="relative bg-slate-900 text-white pt-28 pb-24 overflow-hidden">
        {/* Glow Blobs - 4th of July Themed (Red & Blue) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -right-1/4 w-[1000px] h-[1000px] rounded-full bg-linear-to-br from-rose-600/20 to-purple-600/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-linear-to-tr from-blue-600/20 to-slate-800/10 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          {/* Subtitle Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-rose-200 mb-6 backdrop-blur-md shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="text-slate-300">America250 & Civic Innovation</span>
          </div>

          {/* Main H1 Title */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Renewing the Promise of <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-rose-500 via-slate-100 to-blue-500">
              American Collaboration
            </span>
          </h1>

          {/* High-Level Value Proposition */}
          <p className="text-base md:text-xl text-slate-300 mb-6 max-w-3xl mx-auto leading-relaxed">
            As America celebrates 250 years, the Institute for Nonpartisan Innovation (INI) is building the civic infrastructure to help communities better understand themselves, connect across sectors, and create solutions together.
          </p>

          <p className="text-xs md:text-sm text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            INI connects civic leaders, students, researchers, and organizations through a shared network of collaboration, research, and real-time civic insights.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/directory"
              className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-rose-500/20 text-xs"
            >
              Explore the Civic Directory &rarr;
            </Link>
            <Link
              href="/partners"
              className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700 text-xs"
            >
              Join the INI Network &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 2. THE NEXT CHAPTER ================= */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Narrative Copy */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700">
                Civic Experiment
              </div>
              
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                The Next Chapter of the American Experiment
              </h2>

              <p className="text-slate-800 font-semibold text-sm md:text-base">
                Progress has always depended on people working together.
              </p>

              <div className="space-y-4 text-slate-600 text-sm md:text-base leading-relaxed">
                <p>
                  Today, however, important research is often disconnected from communities, local insights are difficult to access, and people seeking to make an impact struggle to find the right opportunities and partners.
                </p>
                <p>
                  INI helps bridge these gaps by creating a trusted, nonpartisan network where knowledge, people, and ideas can come together.
                </p>
              </div>

              {/* High-Fidelity Bullet Grid */}
              <ul className="grid grid-cols-1 gap-3.5 mt-6">
                {[
                  "Connect communities with trusted civic information",
                  "Expand access to local research and insights",
                  "Enable cross-campus and cross-community collaboration",
                  "Empower the next generation of civic leaders",
                  "Turn community knowledge into action"
                ].map((bullet, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs md:text-sm font-medium text-slate-700">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 font-bold border border-rose-100">
                      ✓
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Premium Visual Card */}
            <div className="lg:col-span-5 relative mt-6 lg:mt-0">
              <div className="absolute inset-0 bg-linear-to-tr from-rose-100 to-blue-50 rounded-3xl transform rotate-3 scale-105" />
              <div className="bg-white p-6 rounded-3xl shadow-xl relative border border-slate-100/60 space-y-6 overflow-hidden">
                {/* American Flag Mural Image */}
                <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50">
                  <Image
                    src={flagImage}
                    alt="American Flag Mural"
                    placeholder="blur"
                    fill
                    className="object-cover object-center opacity-95 transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-white via-transparent to-transparent" />
                </div>

                <h3 className="text-xl font-bold text-slate-900">A Growing Civic Network</h3>

                <div className="space-y-4">
                  <div className="pb-3 border-b border-slate-100 flex justify-between items-start gap-2">
                    <div>
                      <span className="block text-sm font-extrabold text-blue-600">25 CUNY Campuses Connected</span>
                      <span className="block text-xs text-slate-500">Building the foundation for cross-campus collaboration</span>
                    </div>
                  </div>
                  <div className="pb-3 border-b border-slate-100 flex justify-between items-start gap-2">
                    <div>
                      <span className="block text-sm font-extrabold text-rose-600">1,400+ Experts & Organizations</span>
                      <span className="block text-xs text-slate-500">Connecting people strengthening communities</span>
                    </div>
                  </div>
                  <div className="pb-3 border-b border-slate-100 flex justify-between items-start gap-2">
                    <div>
                      <span className="block text-sm font-extrabold text-slate-800">All 5 NYC Boroughs Engaged</span>
                      <span className="block text-xs text-slate-500">Starting in NYC and expanding nationwide</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="block text-sm font-extrabold text-indigo-600">Nonpartisan & Open</span>
                      <span className="block text-xs text-slate-500">Built for collaboration across sectors</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 italic leading-relaxed">
                  &ldquo;INI offers a shared coordination layer where academic rigor meets grassroots civic needs, creating a blueprint for the next century of civic innovation.&rdquo;
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 3. FOUR ROLES / PILLARS ================= */}
      <section className="bg-slate-100 border-y border-slate-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-xs font-bold text-rose-700 mb-3">
              Everyone Has a Role
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everyone Has a Role in Building Stronger Communities
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-2.5">
              By uniting diverse sectors, INI organizes collaboration that addresses real-world societal problems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Civic Leaders & Organizations",
                desc: "Access trusted research, community connections, and real-time civic insights to make informed decisions.",
                color: "border-rose-100 hover:border-rose-300",
                icon: (
                  <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
                bg: "bg-rose-50/50"
              },
              {
                title: "Students & Emerging Leaders",
                desc: "Discover opportunities to collaborate, learn, and create meaningful impact.",
                color: "border-blue-100 hover:border-blue-300",
                icon: (
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                ),
                bg: "bg-blue-50/50"
              },
              {
                title: "Researchers & Faculty",
                desc: "Connect academic knowledge with real-world community needs.",
                color: "border-indigo-100 hover:border-indigo-300",
                icon: (
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                bg: "bg-indigo-50/50"
              },
              {
                title: "Community Partners",
                desc: "Find collaborators, resources, and opportunities aligned with your mission.",
                color: "border-emerald-100 hover:border-emerald-300",
                icon: (
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
                bg: "bg-emerald-50/50"
              }
            ].map((pillar, idx) => (
              <div key={idx} className={`bg-white p-6 rounded-2xl border transition-all duration-300 ${pillar.color} flex flex-col justify-between hover:shadow-md`}>
                <div className="space-y-4">
                  <div className={`w-10 h-10 ${pillar.bg} rounded-xl flex items-center justify-center`}>
                    {pillar.icon}
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm leading-snug">{pillar.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 4. CIVICWIRE SECTION & FORM ================= */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700">
                Civic Insights
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Understand Your Community. <br />
                Strengthen Your Impact.
              </h2>
              <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                Through INI and CivicWire, communities and organizations can request real-time civic insights from across America.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-800">Need deeper local understanding?</p>
                <p className="text-xs text-slate-500">
                  Submit your research or information requests through CivicWire using the form on the right. We connect your inquiries with CUNY researchers and student fellows to deliver structured, action-oriented findings.
                </p>
              </div>
            </div>

            {/* Right: Interactive CivicWire Request Form */}
            <div className="lg:col-span-6 relative">
              <div className="absolute inset-0 bg-linear-to-tr from-blue-100/50 to-indigo-50/50 rounded-3xl transform rotate-1 scale-102" />
              
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl relative border border-slate-100/80">
                {civicWireSuccess ? (
                  <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-blue-50 border border-blue-200 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900">Request Submitted!</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Thank you for your request. We will review your inquiry and follow up at <strong className="text-slate-700">{civicWireForm.email}</strong> shortly.
                    </p>
                    <button
                      onClick={() => {
                        setCivicWireSuccess(false);
                        setCivicWireForm({ orgName: "", email: "", insightsNeeded: "" });
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      Submit another request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCivicWireSubmit} className="space-y-4">
                    <h3 className="text-lg font-extrabold text-slate-900">Request CivicWire Insights</h3>
                    
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Organization / Community Name</label>
                      <input
                        type="text"
                        value={civicWireForm.orgName}
                        onChange={(e) => setCivicWireForm({ ...civicWireForm, orgName: e.target.value })}
                        placeholder="e.g. Bronx Urban Alliance"
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">Contact Email *</label>
                      <input
                        type="email"
                        required
                        value={civicWireForm.email}
                        onChange={(e) => setCivicWireForm({ ...civicWireForm, email: e.target.value })}
                        placeholder="you@example.com"
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-700">What local insights do you need? *</label>
                      <textarea
                        required
                        rows={3}
                        value={civicWireForm.insightsNeeded}
                        onChange={(e) => setCivicWireForm({ ...civicWireForm, insightsNeeded: e.target.value })}
                        placeholder="Describe the issues or information your community needs help understanding..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none resize-none"
                      />
                    </div>

                    {civicWireError && (
                      <p className="text-xs font-bold text-rose-600 animate-pulse">{civicWireError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={civicWireSubmitting || !civicWireForm.email || !civicWireForm.insightsNeeded}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition-all disabled:opacity-50 text-xs shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {civicWireSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing Request...</span>
                        </>
                      ) : (
                        <span>Request Insights through CivicWire</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 5. CONNECT TO INI & NOMINATION FORM ================= */}
      <section className="py-20 bg-slate-950 text-white relative overflow-hidden border-t border-slate-900">
        {/* Flag theme glows */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-rose-600 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              <span className="inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-rose-300 uppercase tracking-widest">
                Network Growth
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Help Build the Network <br />
                for the Next 250 Years.
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Who else should be connected to INI? Share a person, organization, campus, or community partner who should be part of this movement.
              </p>
            </div>

            {/* Right: Nomination Form */}
            <div className="lg:col-span-6">
              <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
                
                {networkSuccess ? (
                  <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 text-rose-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-extrabold text-white">Nomination Shared!</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                      Thank you! We have received your suggestion for <strong className="text-slate-200">{networkForm.name}</strong> and will reach out to bring them into the ecosystem.
                    </p>
                    <button
                      onClick={() => {
                        setNetworkSuccess(false);
                        setNetworkForm({ name: "", contact: "", role: "Campus Partner", reason: "" });
                      }}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 underline"
                    >
                      Nominate someone else
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleNetworkSubmit} className="space-y-4 text-slate-300">
                    <h3 className="text-lg font-extrabold text-white">Nominate a Partner</h3>
                    
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-400">Name of Person / Organization *</label>
                      <input
                        type="text"
                        required
                        value={networkForm.name}
                        onChange={(e) => setNetworkForm({ ...networkForm, name: e.target.value })}
                        placeholder="e.g. Professor John Doe or City Tech Hub"
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">Contact (Email or Website) *</label>
                        <input
                          type="text"
                          required
                          value={networkForm.contact}
                          onChange={(e) => setNetworkForm({ ...networkForm, contact: e.target.value })}
                          placeholder="email@example.com"
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:border-rose-500"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-400">Role / Type</label>
                        <select
                          value={networkForm.role}
                          onChange={(e) => setNetworkForm({ ...networkForm, role: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-lg border border-slate-700 bg-slate-950 text-slate-300 outline-none focus:border-rose-500"
                        >
                          <option value="Campus Partner">Campus Partner</option>
                          <option value="Community Partner">Community Partner</option>
                          <option value="Researcher / Faculty">Researcher / Faculty</option>
                          <option value="Student Fellow">Student Fellow</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-400">Why should they be part of this movement?</label>
                      <textarea
                        rows={2}
                        value={networkForm.reason}
                        onChange={(e) => setNetworkForm({ ...networkForm, reason: e.target.value })}
                        placeholder="Tell us about their alignment or how they contribute..."
                        className="w-full text-xs p-2.5 rounded-lg border border-slate-700 bg-slate-950 text-white outline-none focus:border-rose-500 resize-none"
                      />
                    </div>

                    {networkError && (
                      <p className="text-xs font-bold text-rose-500 animate-pulse">{networkError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={networkSubmitting || !networkForm.name || !networkForm.contact}
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl transition-all disabled:opacity-50 text-xs shadow-md shadow-rose-500/10 cursor-pointer flex items-center justify-center gap-2"
                    >
                      {networkSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Nominating...</span>
                        </>
                      ) : (
                        <span>Share with INI</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
