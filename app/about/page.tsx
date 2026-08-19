import Link from "next/link";
import Footer from "@/components/Footer";


export const metadata = {
  title: "About INI | INI Collaboration Network",
  description: "Discover the history, mission, and milestones of the Institute for Nonpartisan Innovation (INI) and our student-powered civic collaboration network across CUNY.",
};

export default function AboutPage() {
  const milestones = [
    {
      date: "Fall 2024",
      title: "First Student Listening Session",
      location: "John Jay College",
      icon: "💡",
      description: "Co-hosted by Vngle and CUNY CIE, INI’s first student session explored what CUNY students wanted from career-connected opportunities—and helped shape the vision for a CUNY-centered think-and-do tank.",
      color: "from-indigo-500 to-blue-500",
      badgeColor: "bg-indigo-100 text-indigo-800",
    },
    {
      date: "Spring 2025",
      title: "Formal Public Launch",
      location: "Pier 57",
      icon: "🚀",
      description: "Successfully launched the INI initiative publicly, establishing our initial foundation and showcasing early student research projects to the broader NYC civic tech community.",
      color: "from-blue-500 to-indigo-500",
      badgeColor: "bg-blue-100 text-blue-800",
    },
    {
      date: "Fall 2025",
      title: "First Cross-Campus Gathering",
      location: "16 CUNY Campuses Connected",
      icon: "🤝",
      description: "Brought together faculty, student fellows, and civic leaders from 16 distinct CUNY campuses to share research models, identify academic synergies, and collaborate on shared urban challenges.",
      color: "from-emerald-500 to-teal-500",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      date: "Spring 2026",
      title: "Soft Launch of the Network Tool",
      location: "New York City College of Technology (City Tech)",
      icon: "🌐",
      description: "Deployed the first interactive version of the INI Collaboration Network platform, facilitating seamless search, mapping, and collaboration across the CUNY directory.",
      color: "from-purple-500 to-indigo-500",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      date: "Present",
      title: "Five Cohorts Activated",
      location: "Across the CUNY Ecosystem",
      icon: "🎓",
      description: "Actively training and coordinating our fifth consecutive student fellow cohort, building a sustainable, long-term human infrastructure for civic innovation in New York City.",
      color: "from-amber-500 to-orange-500",
      badgeColor: "bg-amber-100 text-amber-800",
    },
  ];

  const studentRoles = [
    {
      title: "Ecosystem Mapping",
      subtitle: "Research & Discovery",
      description: "Conducting critical research to identify active civic efforts, academic interests, and resources across all 25 CUNY campuses.",
      icon: (
        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      bg: "bg-blue-50/50 border-blue-100 hover:border-blue-300",
    },
    {
      title: "Platform Infrastructure",
      subtitle: "Data & Tech Stack",
      description: "Improving search functionality, mapping tools, AI integrations, and maintaining clean database layers for CUNY's 1400+ directory records.",
      icon: (
        <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      bg: "bg-emerald-50/50 border-emerald-100 hover:border-emerald-300",
    },
    {
      title: "Relationship Building",
      subtitle: "Community Outreach",
      description: "Connecting academic departments, student cohorts, and external community leaders to foster interdisciplinary networks.",
      icon: (
        <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      bg: "bg-purple-50/50 border-purple-100 hover:border-purple-300",
    },
    {
      title: "Civic Innovation",
      subtitle: "Applied Projects",
      description: "Deploying research models into real-world applications, testing policy frameworks, and developing public-interest technologies.",
      icon: (
        <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      bg: "bg-amber-50/50 border-amber-100 hover:border-amber-300",
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. HERO SECTION */}
      <section className="relative bg-slate-900 text-white pt-24 pb-20 overflow-hidden">
        {/* Glowing Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-blue-600/20 to-indigo-600/10 blur-3xl" />
          <div className="absolute -bottom-1/3 -left-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-600/25 to-slate-900/10 blur-3xl" />
        </div>

        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-semibold text-blue-200 mb-6 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            About INI
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            History of the <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Institute for Nonpartisan Innovation
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed">
            Founded in Fall 2024 to expand real-world, career-connected learning opportunities for CUNY students while enabling new forms of cross-campus collaboration rooted in civic impact.
          </p>
        </div>
      </section>

      {/* 2. CORE APPROACH */}
      <section className="max-w-5xl mx-auto px-6 -mt-8 relative z-20">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Distributed, Campus-Driven Model</h2>
            <p className="text-slate-600 leading-relaxed">
              INI operates through a distributed, campus-driven model — working directly with faculty, departments, students, and community partners across the CUNY ecosystem rather than through a single central office.
            </p>
          </div>
        </div>
      </section>

      {/* 3. HOW INI BEGAN */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How INI Began</h2>
            <div className="text-slate-600 text-base leading-relaxed space-y-4">
              <p>
                INI began with a belief in CUNY: some of New York City’s greatest talent, research, technology, and civic capacity already exist across its campuses. The opportunity is to better connect and activate them.
              </p>
              <p>
                The vision grew from more than six years of collaboration across CUNY—from advancing CUNY-developed technology alongside the Chair of Computer Science at John Jay College, to relationships with CUNY’s Tech Talent Pipeline, to Vngle founder and CUNY alum Blake Stoner’s time in the Craig Newmark Graduate School’s Executive Program centered on Innovation and Leadership.
              </p>
              <p>
                INI moved from vision to action at New York City College of Technology, launching its first student fellowship cohorts with CUNY 2X and expanding connections across campuses and New York City’s civic community.
              </p>
              <p>
                Today, INI.network is building connective infrastructure between CUNY and NYC’s civic community—bringing students, faculty, campuses, and community leaders closer together while making impactful civic, academic, and community initiatives easier to discover and connect across all five boroughs.
              </p>

              {/* Blake Stoner Quote Box */}
              <div className="bg-slate-100/80 p-6 rounded-2xl border border-slate-200/60 space-y-4">
                <h3 className="font-extrabold text-slate-900 text-base md:text-lg leading-snug">
                  INI is a bet on CUNY and a stronger civic innovation future for New York City.
                </h3>
                <blockquote className="text-slate-700 text-sm md:text-base leading-relaxed italic space-y-3">
                  <p>
                    “INI is a bet on what becomes possible when CUNY and New York City’s communities are more deeply connected—spurring collaboration across all five boroughs and giving students career-connected opportunities to contribute, build, and become civic leaders.
                  </p>
                  <p>
                    CUNY helped shape Vngle, and with most of our team now CUNY alumni, INI is our way of giving back—creating stronger pathways for opportunity and civic impact across the University and the city.”
                  </p>
                </blockquote>
                <div className="pt-3 border-t border-slate-200/60">
                  <div className="font-bold text-slate-900 text-sm">Blake Stoner</div>
                  <div className="text-xs text-slate-500 font-medium">Founder & CEO, Vngle | CUNY alum</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Core Projects Card */}
          <div className="lg:col-span-5 h-full">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-8 md:p-10 rounded-3xl shadow-xl relative overflow-hidden h-full flex flex-col justify-between border border-slate-800/80">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 mb-3 uppercase tracking-wider">
                    Foundation
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-white mb-6 tracking-tight">
                    Early Focus Areas
                  </h3>
                </div>
                
                <div className="flex-1 flex flex-col justify-around gap-4 my-auto">
                  <div className="flex gap-4.5 items-start p-4.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-2xl shadow-sm mt-0.5">
                      <span>🔑</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-100 text-base">National Provenance Tech</h4>
                      <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                        Deploying CUNY-developed provenance technology nationally to protect nonpartisan digital integrity and combat misinformation.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4.5 items-start p-4.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-2xl shadow-sm mt-0.5">
                      <span>🎓</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-100 text-base">Student Applied Research</h4>
                      <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                        Creating high-impact applied research, fellowship cohorts, and system implementation opportunities for CUNY students.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4.5 items-start p-4.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-2xl shadow-sm mt-0.5">
                      <span>🌍</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-slate-100 text-base">Civic Connection</h4>
                      <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                        Connecting academic research and university resources directly with real-world civic systems and local NYC communities.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer Callout */}
              <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between gap-4 text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Co-developed across 25 CUNY Campuses</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. STUDENT-POWERED NETWORK */}
      <section className="bg-slate-100 border-y border-slate-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">A Student-Powered Collaboration Network</h2>
            <p className="text-slate-600 text-lg">
              Every semester, INI student fellows from across CUNY help maintain, strengthen, and expand the collaboration network.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {studentRoles.map((role, idx) => (
              <div key={idx} className={`p-8 rounded-3xl bg-white border transition-all duration-300 hover:shadow-md flex flex-col items-center text-center ${role.bg}`}>
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100 mb-4">
                  {role.icon}
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg md:text-xl mb-1">{role.title}</h3>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{role.subtitle}</p>
                <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">{role.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-3xl shadow-lg text-center max-w-4xl mx-auto">
            <h3 className="text-xl font-bold mb-2">A Living Learning Environment</h3>
            <p className="text-blue-100 max-w-2xl mx-auto leading-relaxed">
              This structural foundation creates a living learning environment where CUNY students gain hands-on professional experience while helping strengthen New York City’s broader civic and academic ecosystem.
            </p>
          </div>
        </div>
      </section>

      {/* 5. TIMELINE / MILESTONES */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Growth & Milestones</h2>
          <p className="text-slate-600">A timeline of the development and expansion of the Institute for Nonpartisan Innovation.</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {milestones.map((item, idx) => (
            <div key={idx} className="flex flex-col md:flex-row items-stretch md:items-start gap-4 md:gap-8 group">
              {/* 1. Date Badge (Left Column on Desktop) */}
              <div className="hidden md:flex w-28 md:w-32 pt-6 justify-end shrink-0">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${item.badgeColor}`}>
                  {item.date}
                </span>
              </div>

              {/* 2. Timeline Spine & Bullet Node */}
              <div className="hidden md:flex flex-col items-center self-stretch shrink-0 relative">
                {/* Node Bullet */}
                <div className="w-5 h-5 rounded-full bg-white border-4 border-blue-600 shadow-sm z-10 mt-6 group-hover:scale-125 transition-transform" />
                {/* Connecting Line (except for last item) */}
                {idx !== milestones.length - 1 && (
                  <div className="w-1 bg-gradient-to-b from-blue-500 via-indigo-400 to-blue-300 rounded-full flex-1 my-1 shadow-xs" />
                )}
              </div>

              {/* 3. Milestone Card (Right Column) */}
              <div className="flex-1 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100/80 hover:shadow-md hover:border-slate-200 transition-all duration-300 flex flex-col items-center text-center">
                {/* Date for Mobile View */}
                <div className="md:hidden mb-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${item.badgeColor}`}>
                    {item.date}
                  </span>
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-2xl shadow-xs group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                
                {/* Title & Location */}
                <h3 className="font-extrabold text-slate-900 text-lg md:text-xl flex flex-col sm:flex-row sm:items-center justify-center gap-1 sm:gap-2 mb-2">
                  <span>{item.title}</span>
                  <span className="hidden sm:inline text-slate-300">|</span>
                  <span className="text-sm font-semibold text-slate-500">{item.location}</span>
                </h3>
                
                {/* Description */}
                <p className="text-slate-600 text-sm leading-relaxed max-w-xl mx-auto">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16 max-w-2xl mx-auto">
          <p className="text-slate-700 font-semibold leading-relaxed">
            Today, INI continues to grow as a collaborative civic infrastructure initiative designed to strengthen connections between research, students, faculty, and communities across New York City.
          </p>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="py-16 bg-slate-950 text-white text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-blue-600 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold mb-4">Want to explore our network?</h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Browse through 1,400+ active faculty members, search core research interests, and explore cross-campus connection paths in real-time.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/directory"
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
            >
              Search Directory
            </Link>
            <Link
              href="/partners"
              className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700"
            >
              Meet Campus Partners
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
