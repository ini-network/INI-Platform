import Link from "next/link";
import Image from "next/image";
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
      description: "Co-hosted by Vngle and CUNY CIE, the first session explored what students wanted from career-connected opportunities and helped shape the vision for INI.",
      color: "from-indigo-500 to-blue-500",
      badgeColor: "bg-indigo-100 text-indigo-800",
    },
    {
      date: "Spring 2025",
      title: "Public Launch",
      location: "Pier 57",
      icon: "🚀",
      description: "INI formally launched, bringing early student work and its broader civic innovation vision to New York City’s civic community.",
      color: "from-blue-500 to-indigo-500",
      badgeColor: "bg-blue-100 text-blue-800",
    },
    {
      date: "Fall 2025",
      title: "First Cross-Campus Gathering",
      location: "16 CUNY Campuses",
      icon: "🤝",
      description: "Faculty, students, and civic leaders from 16 campuses came together to surface shared interests and opportunities for collaboration.",
      color: "from-emerald-500 to-teal-500",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      date: "Spring 2026",
      title: "INI.network Soft Launch",
      location: "City Tech",
      icon: "🌐",
      description: "The first interactive version of the collaboration platform launched with tools for discovery, mapping, and network exploration.",
      color: "from-purple-500 to-indigo-500",
      badgeColor: "bg-purple-100 text-purple-800",
    },
    {
      date: "Present",
      title: "Five Student Cohorts Activated",
      location: "Across the CUNY Ecosystem",
      icon: "🎓",
      description: "INI continues developing career-connected fellowships while expanding the people, information, and relationships powering the network.",
      color: "from-amber-500 to-orange-500",
      badgeColor: "bg-amber-100 text-amber-800",
    },
  ];

  const studentRoles = [
    {
      title: "Ecosystem Mapping",
      subtitle: "Research & Discovery",
      description: "Identify civic initiatives, academic interests, expertise, and resources across CUNY & NYC.",
      icon: (
        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      bg: "bg-blue-50/50 border-blue-100 hover:border-blue-300",
    },
    {
      title: "Platform Infrastructure",
      subtitle: "Data & Technology",
      description: "Improve search, mapping, AI integrations, and the data infrastructure behind 1,400+ network records.",
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
      description: "Connect campuses, departments, students, and civic partners around shared interests and opportunities.",
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
      description: "Translate research and ideas into public-interest technologies, policy experiments, and real-world applications.",
      icon: (
        <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      bg: "bg-amber-50/50 border-amber-100 hover:border-amber-300",
    },
  ];

  const testimonialVideos = [
    { id: "DMbMEQB590g", name: "Roxana Remache", title: "Roxana Remache - INI Fellow Testimonial" },
    { id: "GvHyWCZDgpg", name: "Javaugn Lindsey", title: "Javaugn Lindsey - INI Fellow Testimonial" },
    { id: "XhWdcJjhGgo", name: "Assel Alkobaldi", title: "Assel Alkobaldi - INI Fellow Testimonial" },
    { id: "J_nUPiCgEdc", name: "Travis Crumble", title: "Travis Crumble - INI Fellow Testimonial" },
    { id: "Law-V7xB3zQ", name: "Randy Lucero", title: "Randy Lucero - INI Fellow Testimonial" },
    { id: "K2YJ1aKybj8", name: "Diamond Williams", title: "Diamond Williams - INI Fellow Testimonial" },
    { id: "FPWau0NK9YY", name: "Maurice Alexander", title: "Maurice Alexander - INI Fellow Testimonial" },
  ];

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. HERO SECTION */}
      <section className="relative bg-slate-900 text-white pt-20 pb-16 md:pt-24 md:pb-20 overflow-hidden">
        {/* Glowing Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-linear-to-br from-blue-600/20 to-indigo-600/10 blur-3xl" />
          <div className="absolute -bottom-1/3 -left-1/4 w-[700px] h-[700px] rounded-full bg-linear-to-tr from-emerald-600/25 to-slate-900/10 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Hero Copy */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-semibold text-blue-200 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                About INI
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
                History of the <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-emerald-400">
                  Institute for Nonpartisan Innovation
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed">
                Founded in Fall 2024, <strong>INI</strong> was created to better connect <strong>CUNY’s talent, research, and technology with the civic challenges shaping New York City</strong>—while expanding career-connected learning and collaboration across campuses and communities.
              </p>
            </div>

            {/* Right Column: Hero Photo Showcase */}
            <div className="lg:col-span-5 mt-4 lg:mt-0">
              <div className="relative group">
                <div className="absolute -inset-1 sm:-inset-1.5 bg-linear-to-tr from-blue-500/30 via-emerald-500/20 to-indigo-500/30 rounded-2xl sm:rounded-3xl blur-md sm:blur-lg opacity-80 group-hover:opacity-100 transition duration-500" />
                <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/15 bg-slate-800/80 backdrop-blur-md shadow-2xl">
                  <div className="relative aspect-4/3 w-full bg-slate-950/50">
                    <Image
                      src="/images/ini-john-jay-hackathon.jpg"
                      alt="CUNY alum Blake Stoner with winners of the Vngle-sponsored John Jay College hackathon that helped inspire INI"
                      fill
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
                      priority
                    />
                  </div>
                </div>
              </div>
              <p className="mt-3 px-1 text-center lg:text-left text-xs text-slate-400 italic font-medium leading-relaxed">
                CUNY alum Blake Stoner with winners of the Vngle-sponsored John Jay College hackathon that helped inspire INI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW INI BEGAN & EARLY FOUNDATIONS */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          {/* Left Narrative */}
          <div className="lg:col-span-7 space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">How INI Began</h2>
            <div className="text-slate-600 text-base leading-relaxed space-y-4">
              <p>
                INI grew from more than <strong>six years of collaboration across CUNY</strong>—from advancing CUNY-developed technology alongside the Chair of Computer Science at <strong>John Jay College</strong>, to relationships with <strong>CUNY’s Tech Talent Pipeline</strong>, to Vngle founder and CUNY alum <strong>Blake Stoner’s</strong> time in the <strong>Craig Newmark Graduate School’s Executive Program in News Innovation and Leadership</strong>.
              </p>
              <p>
                The idea was rooted in a simple belief: <strong>some of New York City’s greatest talent, research, technology, and civic capacity already exist across CUNY. The opportunity is to better connect and activate them.</strong>
              </p>
              <p>
                INI moved from vision to action at <strong>New York City College of Technology</strong>, launching its first five student fellowship cohorts with <strong>CUNY 2X</strong> and expanding connections across campuses and NYC’s civic community.
              </p>
              <p>
                Today, <strong>INI.network is building connective infrastructure between CUNY and New York City</strong>—making civic, academic, and community initiatives easier to discover and connect across all five boroughs.
              </p>

              {/* Blake Stoner Quote Box */}
              <div className="bg-slate-100/80 p-6 rounded-2xl border border-slate-200/60 space-y-4 mt-6">
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

            {/* A Distributed, Campus-Driven Model (Moved from top) */}
            <div className="mt-12 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">A Distributed, Campus-Driven Model</h2>
                <p className="text-slate-600 leading-relaxed">
                  INI grows through <strong>faculty, departments, students, campus leaders, and civic and community partners across CUNY and New York City</strong>—creating pathways for campus, community, and University-wide collaboration.
                </p>
              </div>
            </div>
          </div>

          {/* Right Core Projects Card (Early Foundations) */}
          <div className="lg:col-span-5 h-full">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-8 md:p-10 rounded-3xl shadow-xl relative overflow-hidden h-full flex flex-col justify-between border border-slate-800/80">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex-1 flex flex-col justify-between z-10 relative">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 mb-3 uppercase tracking-wider">
                    Foundation
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold text-white mb-6 tracking-tight">
                    Early Foundations
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    INI’s earliest work centered on three areas:
                  </p>
                </div>
                
                <div className="flex-1 flex flex-col justify-around gap-4 my-auto">
                  <div className="flex gap-4.5 items-start p-4.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 text-2xl shadow-sm mt-0.5">
                      <span>🔑</span>
                    </div>
                    <div className="space-y-1 ml-3">
                      <h4 className="font-extrabold text-slate-100 text-base">CUNY-Built Technology</h4>
                      <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                        Advancing CUNY-developed provenance technology into real-world applications supporting trusted information and digital integrity.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4.5 items-start p-4.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-2xl shadow-sm mt-0.5">
                      <span>🎓</span>
                    </div>
                    <div className="space-y-1 ml-3">
                      <h4 className="font-extrabold text-slate-100 text-base">Applied Learning</h4>
                      <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                        Creating fellowships, research, and implementation opportunities for CUNY students and faculty to collaborate on real-world challenges.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4.5 items-start p-4.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 text-2xl shadow-sm mt-0.5">
                      <span>🌍</span>
                    </div>
                    <div className="space-y-1 ml-3">
                      <h4 className="font-extrabold text-slate-100 text-base">Civic Connection</h4>
                      <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                        Connecting CUNY talent and resources with <strong>NYC communities, civic organizations, and public-interest challenges.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. BUILDING THE COLLABORATION NETWORK */}
      <section className="bg-slate-100 border-y border-slate-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Building the Collaboration Network</h2>
            <p className="text-slate-600 text-lg">
              Each semester, <strong>INI fellows help strengthen and expand the network</strong> while gaining hands-on experience across technology, research, communications, and civic engagement.
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
        </div>
      </section>

      {/* 4. TESTIMONIALS (WHAT INI MAKES POSSIBLE) */}
      <section className="bg-slate-100/70 border-y border-slate-200/80 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 mb-3.5 sm:mb-4">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Testimonials
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-3 sm:mb-4">
              What INI Makes Possible
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Hear from the CUNY campus partners and former student fellows helping build a more connected NYC civic innovation ecosystem.
            </p>
          </div>

          {/* 1. Campus Partner Testimonial */}
          <div className="mb-10 sm:mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-3 sm:mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>1. Campus Partner Testimonial</span>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-linear-to-r from-blue-500/20 via-indigo-500/20 to-emerald-500/20 rounded-2xl sm:rounded-3xl blur-md sm:blur-lg opacity-70 group-hover:opacity-100 transition duration-500" />
              <div className="relative bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 border border-slate-200/80 shadow-lg sm:shadow-xl overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
                  {/* Video Embed */}
                  <div className="lg:col-span-7">
                    <div className="relative aspect-video w-full rounded-xl sm:rounded-2xl overflow-hidden shadow-md bg-slate-900 border border-slate-100">
                      <iframe
                        src="https://www.youtube-nocookie.com/embed/XoJVvyXHsHY"
                        title="Arthur Chisolm - Campus Partner Testimonial"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full border-0"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  {/* Narrative & Quote */}
                  <div className="lg:col-span-5 space-y-3 sm:space-y-4">
                    <blockquote className="space-y-2 sm:space-y-3">
                      <span className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 leading-snug block">
                        “INI has changed lives”
                      </span>
                      <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed italic">
                        by creating new ways for NYC to collaborate, while creating pathways for more of CUNY to discover the impact they can make in their communities.
                      </p>
                    </blockquote>

                    <div className="pt-3 sm:pt-4 border-t border-slate-100 space-y-1">
                      <div className="font-extrabold text-slate-900 text-sm sm:text-base md:text-lg">
                        Arthur Chisolm
                      </div>
                      <div className="text-xs sm:text-sm text-blue-700 font-semibold">
                        Former Career & Academic Advisor, CUNY2X Tech at City Tech
                      </div>
                      <div className="text-[11px] sm:text-xs text-slate-500">
                        Helped pioneer INI’s first five student fellow cohorts
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Former Fellow Testimonials */}
          <div className="mb-10 sm:mb-14">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-4 sm:mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>2. Former Fellow Testimonials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {testimonialVideos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs sm:shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group"
                >
                  <div className="relative aspect-video w-full rounded-lg sm:rounded-xl overflow-hidden bg-slate-900 mb-2.5 sm:mb-3 shadow-xs border border-slate-100">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${video.id}`}
                      title={video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-auto pt-1">
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 line-clamp-1">
                      {video.name}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                      INI Fellow
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Closing Line & CTA */}
          <div className="bg-linear-to-r from-blue-50 via-indigo-50/50 to-emerald-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 border border-blue-100/80 text-center space-y-4 sm:space-y-6">
            <p className="text-base sm:text-lg md:text-xl font-bold text-slate-900 max-w-2xl mx-auto leading-relaxed">
              One network. Many perspectives. Growing impact across CUNY and New York City.
            </p>
            <div>
              <Link
                href="/partners"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm md:text-base rounded-xl transition-all shadow-md hover:shadow-lg shadow-blue-500/25"
              >
                <span>Join the Network</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
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
      </section>

      {/* 5. CALL TO ACTION */}
      <section className="py-16 bg-slate-950 text-white text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-blue-600 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold mb-4">Explore the Network</h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Discover <strong>1,400+ faculty, researchers, civic collaborators, and network connections</strong> across CUNY and New York City.
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
              Join as a Campus Partner
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
