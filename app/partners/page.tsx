"use client";

import {useState, useEffect, Suspense} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import Footer from "@/components/Footer";


// Static Intake Funnel Target URL
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/1VXaj8YPklVva7zJ92ZBA7EZg3Aw2LGhZ5PMiuNFMQyc/edit?ts=69de7307";
const INI_EMAIL = "ini@vngle.com";

const emailSubject = "CUNY Partnership Inquiry - INI Platform";
const emailBody = `Hello INI Team,

I am writing to express interest in collaborating with the Institute for Nonpartisan Innovation (INI) as a CUNY Campus Partner/Faculty member.

Name: 
Title/Role: 
CUNY Campus/Department: 

I would like to discuss:
- Coursework project integration
- Co-developing research or technology
- Student engagement pathways
- Cross-campus collaboration

Regards,`;

// Let JavaScript handle all the encoding automatically!
const PARTNER_MAILTO = `mailto:${INI_EMAIL}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

function PartnersDashboardContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<"partners" | "student">("partners");

    // Dynamically switch tab on load if ?tab=student is passed
    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam === "student") {
            setActiveTab("student");
        }
    }, [searchParams]);

    // --- CAMPUS PARTNERS DATA ---
    const collaborationAreas = [
        {
            badge: "🔬 Featured Policy Lab",
            logo: "/images/consumer-reports-logo.png",
            title: "Consumer Protection & Policy Research",
            partner: "Consumer Reports",
            description: "Collaborating to address critical health, equity, and environmental issues through student-driven local research.",
            details: "CUNY students helped gather real-world insights on toxic chemicals in beauty products across NYC, contributing to research informing New York State's Beauty Justice legislation.",
            color: "border-blue-200/60 bg-blue-50/30 hover:border-blue-400",
            badgeColor: "bg-blue-100 text-blue-800",
        },
        {
            badge: "📊 Civic Insights Engine",
            logo: "/images/vngle-logo.png",
            title: "Real-Time Civic Insights",
            partner: "Vngle: The Civic Insights Company",
            description: "Giving CUNY faculty and campuses access to real-time, community-informed civic insights that can strengthen research, teaching, and applied projects.",
            details: "Through Vngle’s CivicWire, faculty and students can explore emerging community needs, develop research around real-world signals, and connect academic expertise to public-interest reporting, policy questions, and local decision-making.",
            color: "border-purple-200/60 bg-purple-50/30 hover:border-purple-400",
            badgeColor: "bg-purple-100 text-purple-800",
            bullets: [
                "Applied Research",
                "Real-Time Civic Data",
                "Policy Insights",
                "Community Decision-Making"
            ]
        }
    ];

    const campusPillars = [
        {
            title: "Faculty",
            focus: "Research & Mentorship",
            description: "Integrate applied civic challenges into coursework, co-develop research or technology, and mentor student fellows.",
            icon: (
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
            )
        },
        {
            title: "Students",
            focus: "Fellowships & Labs",
            description: "Gain career-connected experience through paid opportunities, course-credit civic technology labs, or community initiatives.",
            icon: (
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
            )
        },
        {
            title: "Programs & Offices",
            focus: "Career & Workforce Pathways",
            description: "Partner with INI to expand experiential learning, internships, and career-connected opportunities.",
            icon: (
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
            )
        }
    ];

    const strategicValues = [
        {
            num: "01",
            title: "Career-Connected Learning",
            description: "Expand hands-on opportunities that build in-demand research, technology, collaboration, and civic problem-solving skills."
        },
        {
            num: "02",
            title: "Cross-Campus Synergy",
            description: "Unlocking structural pathways for faculty and researchers at different campuses to discover overlapping interests and pool resources."
        },
        {
            num: "03",
            title: "Real-World Community Impact",
            description: "Connect academic expertise more directly with NYC organizations, communities, and public challenges."
        },
        {
            num: "04",
            title: "Civic Innovation Leadership",
            description: "Strengthen CUNY's role as a citywide engine for public-interest technology and civic innovation."
        }
    ];

    // --- STUDENT OPPORTUNITIES DATA ---
    const studentCategories = [
        {
            role: "💻 Technology",
            skills: "Software development, AI, APIs, and civic technology.",
        },
        {
            role: "📊 Data & Research",
            skills: "Data analysis, mapping, research, and visualization.",
        },
        {
            role: "🎨 Design & Communications",
            skills: "UX/UI, storytelling, content, and digital engagement.",
        },
        {
            role: "🏙 Civic & Community Engagement",
            skills: "Policy research, outreach, partnerships, and campus organizing.",
        }
    ];

    const specificRoles = [
        {
            title: "Social Media Strategist",
            desc: "Help amplify INI’s projects and impact across CUNY and NYC through social media, digital storytelling, and campaign content.",
        },
        {
            title: "Network Engineer",
            desc: "Help evolve the active infrastructure behind INI.network, improving platform functionality, integrations, data flows, and network capabilities.",
        },
        {
            title: "UX Designer",
            desc: "Design intuitive experiences that make civic information, people, and collaboration opportunities easier to discover and navigate.",
        },
        {
            title: "Network Ambassador",
            desc: "Research and verify network information while building connections across CUNY—surfacing faculty, initiatives, organizations, and opportunities that strengthen the broader network.",
        }
    ];

    return (
        <div className="flex flex-col md:flex-row h-full w-full bg-slate-50 overflow-hidden font-sans">

            {/* SIDEBAR TABS */}
            <div
                className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0 z-10">
                <div
                    className="hidden md:flex p-6 border-b border-slate-100 bg-slate-50 justify-between md:flex-col md:items-start md:space-y-4">
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Engagement Hub</h2>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Get Involved
                            with INI</p>
                    </div>
                </div>

                <div className="flex md:flex-col p-2 md:p-4 gap-2 overflow-x-auto md:overflow-visible">
                    <button
                        onClick={() => setActiveTab("partners")}
                        className={`flex-1 md:flex-none text-left px-4 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                            activeTab === "partners"
                                ? "bg-indigo-50 text-indigo-700 shadow-sm font-extrabold"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                    >
                        🤝 Campus Partners & Faculty
                    </button>
                    <button
                        onClick={() => setActiveTab("student")}
                        className={`flex-1 md:flex-none text-left px-4 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap ${
                            activeTab === "student"
                                ? "bg-indigo-50 text-indigo-700 shadow-sm font-extrabold"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        }`}
                    >
                        🎓 Student Fellows (Join Us)
                    </button>
                </div>
            </div>

            {/* VIEWPORT AREA */}
            <div className="flex-1 h-full relative overflow-hidden">

                {/* ================= CAMPUS PARTNERS VIEW ================= */}
                <div
                    className={`absolute inset-0 overflow-y-auto selection:bg-indigo-100 selection:text-indigo-900 transition-opacity duration-300 ${
                        activeTab === "partners"
                            ? "opacity-100 z-10 pointer-events-auto"
                            : "opacity-0 z-0 pointer-events-none"
                    }`}
                    aria-hidden={activeTab !== "partners"}
                >
                    <div className="animate-in fade-in duration-300">
                        {/* Hero Header */}
                        <section className="relative bg-slate-900 text-white pt-16 pb-16 overflow-hidden">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div
                                    className="absolute -top-1/4 -left-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/10 blur-3xl"/>
                                <div
                                    className="absolute -bottom-1/3 -right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-600/25 to-slate-900/10 blur-3xl"/>
                            </div>

                            <div className="max-w-4xl mx-auto px-6 relative z-10">
                                <div
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-indigo-200 mb-4 backdrop-blur-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                    Faculty & Institutional Alliances
                                </div>

                                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                                    Partnering with CUNY to <br/>
                                    <span
                                        className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                    Advance Civic Innovation
                  </span>
                                </h1>

                                <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
                                    INI helps CUNY faculty, students, and campus programs turn academic expertise into
                                    real-world civic impact through applied research, student fellowships, and cross-campus
                                    collaboration.
                                </p>
                            </div>
                        </section>

                        {/* What INI Enables */}
                        <section className="max-w-4xl mx-auto px-6 -mt-8 relative z-20">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 space-y-4">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-extrabold text-slate-900 mb-0.5">What INI
                                            Enables</h2>
                                        <p className="text-slate-600 text-sm leading-relaxed">
                                            INI organizes fellowships, implementation labs, and applied projects that connect
                                            students and faculty with external partners around real civic challenges aligned with
                                            campus strengths.
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-4">
                                    <p className="text-slate-600 text-xs leading-relaxed">
                                        <strong>Fellowship Impact:</strong> Each semester, INI fellows across CUNY help expand
                                        the collaboration network while contributing to civic technology, public-interest
                                        research, and community initiatives.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Example Collaboration Areas */}
                        <section className="max-w-4xl mx-auto px-6 py-12">
                            <div className="mb-10 text-center sm:text-left">
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Example
                                    Collaboration Areas</h2>
                                <p className="text-slate-500 text-sm">See how CUNY talent can contribute to civic challenges with citywide and statewide
                                    impact.</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {collaborationAreas.map((collab, idx) => (
                                    <div key={idx}
                                         className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-md flex flex-col justify-between ${collab.color}`}>
                                        <div>
                                            <div className="flex items-center justify-between gap-3 mb-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${collab.badgeColor}`}>
                                                    {collab.badge}
                                                </span>
                                                {collab.logo && (
                                                    <div className="h-11 px-4 py-1.5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center shrink-0">
                                                        <img
                                                            src={collab.logo}
                                                            alt={collab.partner}
                                                            className="h-7.5 w-auto max-w-30 object-contain"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-xl font-extrabold text-slate-900 mb-1 leading-snug">
                                                {collab.title}
                                            </h3>

                                            <p className="text-[10px] font-bold text-indigo-600 mb-4 uppercase tracking-wider">
                                                Partner: {collab.partner}
                                            </p>

                                            <p className="text-slate-700 font-medium text-xs leading-relaxed mb-3">
                                                {collab.description}
                                            </p>

                                            <p className="text-slate-600 text-xs leading-relaxed mb-4">
                                                {collab.details}
                                            </p>
                                        </div>

                                        {collab.bullets && (
                                            <div className="border-t border-purple-200/40 pt-4 mt-2">
                                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Key
                                                    Focus Pillars</h4>
                                                <ul className="grid grid-cols-1 gap-1.5">
                                                    {collab.bullets.map((bullet, i) => (
                                                        <li key={i}
                                                            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                                                            <span
                                                                className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"/>
                                                            {bullet}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* How INI Works with Campuses */}
                        <section className="bg-slate-100 border-y border-slate-200 py-12">
                            <div className="max-w-4xl mx-auto px-6">
                                <div className="text-center sm:text-left mb-10">
                                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">How INI
                                        Works with Campuses</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                    {campusPillars.map((pillar, idx) => (
                                        <div key={idx}
                                             className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm">
                                            <div
                                                className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 shrink-0">
                                                {pillar.icon}
                                            </div>
                                            <h3 className="font-extrabold text-slate-900 text-base mb-0.5">{pillar.title}</h3>
                                            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-3">{pillar.focus}</p>
                                            <p className="text-xs text-slate-600 leading-relaxed">{pillar.description}</p>
                                        </div>
                                    ))}
                                </div>

                                <div
                                    className="bg-white border border-slate-200 p-6 rounded-2xl max-w-2xl mx-auto shadow-sm text-center">
                                    <h3 className="font-extrabold text-slate-900 mb-4 uppercase text-[10px] tracking-wider">
                                        Participation can include:
                                    </h3>
                                    <div className="flex flex-wrap justify-center gap-3">
                                        <span
                                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                            💰 Stipends
                                        </span>
                                        <span
                                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                            🎓 Academic Credit
                                        </span>
                                        <span
                                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            💼 Internships
                                        </span>
                                        <span
                                            className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                            🔬 Applied Labs
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Value to CUNY */}
                        <section className="max-w-4xl mx-auto px-6 py-12">
                            <div className="mb-10 text-center sm:text-left">
                                <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Value to CUNY</h2>
                                <p className="text-slate-500 text-sm">Strengthening and amplifying existing campus
                                    initiatives through structural civic support.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {strategicValues.map((value, idx) => (
                                    <div key={idx}
                                         className="flex gap-4 items-start bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:border-slate-200 transition-all">
                                        <div className="text-2xl font-black text-indigo-100 shrink-0 select-none">
                                            {value.num}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-900 text-base mb-1">{value.title}</h3>
                                            <p className="text-slate-600 text-xs leading-relaxed">{value.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Call to Action for Leadership */}
                        <section className="max-w-4xl mx-auto px-6 mb-4">
                            <div
                                className="relative rounded-2xl p-6 md:p-10 bg-gradient-to-br from-indigo-900 via-slate-950 to-slate-950 text-white shadow-xl overflow-hidden border border-white/5">
                                <div
                                    className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"/>
                                <div className="relative z-10">
                  <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-indigo-300 border border-white/10 mb-4 uppercase tracking-wider">
                    For Faculty & Campus Leadership
                  </span>

                                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">
                                        Build With INI
                                    </h2>

                                    <p className="text-slate-300 text-xs md:text-sm mb-6 leading-relaxed max-w-xl">
                                        We welcome faculty, research centers, departments, and campus programs across CUNY to
                                        co-develop opportunities for students, research, technology, and civic impact.
                                    </p>

                                    <div className="border-t border-white/10 pt-4 mb-6">
                                        <h3 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-3">Potential
                                            collaborations include:</h3>
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                                            <li className="flex items-center gap-2"><span
                                                className="text-indigo-400">✓</span> Student fellowships and career pathways
                                            </li>
                                            <li className="flex items-center gap-2"><span
                                                className="text-indigo-400">✓</span> Coursework and applied projects
                                            </li>
                                            <li className="flex items-center gap-2"><span
                                                className="text-indigo-400">✓</span> Research or technology development
                                            </li>
                                            <li className="flex items-center gap-2"><span
                                                className="text-indigo-400">✓</span> Cross-campus initiatives
                                            </li>
                                        </ul>
                                    </div>

                                    <a
                                        href={PARTNER_MAILTO}
                                        className="inline-block bg-white text-indigo-900 font-extrabold py-3 px-6 rounded-xl hover:bg-indigo-50 transition-all hover:scale-105 shadow-md shadow-black/25 text-xs text-center"
                                    >
                                        Explore a Partnership
                                    </a>
                                </div>
                            </div>
                        </section>
                    </div>
                    <Footer />
                </div>

                {/* ================= STUDENT OPPORTUNITIES VIEW ================= */}
                <div
                    className={`absolute inset-0 overflow-y-auto selection:bg-indigo-100 selection:text-indigo-900 transition-opacity duration-300 ${
                        activeTab === "student"
                            ? "opacity-100 z-10 pointer-events-auto"
                            : "opacity-0 z-0 pointer-events-none"
                    }`}
                    aria-hidden={activeTab !== "student"}
                >
                    <div className="animate-in fade-in duration-300">
                        {/* Hero Header */}
                        <section className="relative bg-slate-900 text-white pt-16 pb-16 overflow-hidden">
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div
                                    className="absolute -top-1/4 -right-1/4 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/10 blur-3xl"/>
                                <div
                                    className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-600/25 to-slate-900/10 blur-3xl"/>
                            </div>

                            <div className="max-w-4xl mx-auto px-6 relative z-10">
                                <div
                                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-emerald-200 mb-4 backdrop-blur-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    CUNY Student Opportunities
                                </div>

                                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2 leading-tight">
                                    Build Your Career. <br/>
                                    <span
                                        className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-400">
                    Strengthen NYC.
                  </span>
                                </h1>

                                <h2 className="text-base md:text-lg font-bold text-emerald-300 mb-4">
                                    Join the INI Student Fellowship Network
                                </h2>

                                <p className="text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">
                                    Each semester, INI Fellows from across CUNY gain career-connected experience while
                                    building technology, research, and collaboration infrastructure that strengthens civic
                                    innovation across New York City.
                                </p>
                            </div>
                        </section>

                        {/* What You'll Work On */}
                        <section className="max-w-4xl mx-auto px-6 -mt-8 relative z-20">
                            <div
                                className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 rounded-2xl shadow-lg">
                                <h2 className="text-lg font-extrabold mb-1">What You'll Work On</h2>
                                <p className="text-emerald-50 text-xs md:text-sm leading-relaxed max-w-3xl">
                                    INI connects CUNY students, researchers, faculty, and civic leaders around real-world
                                    challenges. Fellows contribute their skills to projects spanning technology, data, design,
                                    research, and community engagement.
                                </p>
                            </div>
                        </section>

                        {/* Who we are looking for */}
                        <section className="max-w-4xl mx-auto px-6 py-12">
                            <div className="mb-10 text-center sm:text-left">
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Who We're
                                    Looking For</h2>
                                <p className="text-slate-500 text-sm">We welcome students across CUNY with skills or interests in:</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                                {studentCategories.map((cat, idx) => (
                                    <div key={idx}
                                         className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-sm flex items-start gap-4">
                                        <div
                                            className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                            <span className="text-sm">✓</span>
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-900 text-sm mb-1">{cat.role}</h3>
                                            <p className="text-xs text-slate-600 leading-relaxed">{cat.skills}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <hr className="border-slate-200 my-8"/>

                            {/* Fellowship Roles */}
                            <div className="mb-10 text-center sm:text-left">
                                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">Fellowship
                                    Roles</h2>
                                <p className="text-slate-500 text-sm">Roles vary by semester and project needs, with opportunities including:</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {specificRoles.map((role, idx) => (
                                    <div key={idx}
                                         className="bg-slate-50/50 p-5 rounded-xl border border-slate-200/40 hover:border-slate-200 transition-all flex items-start gap-3">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0"/>
                                        <div>
                                            <h4 className="font-extrabold text-slate-900 text-sm mb-1">{role.title}</h4>
                                            <p className="text-xs text-slate-600 leading-relaxed">{role.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Student Call to Action */}
                        <section className="max-w-4xl mx-auto px-6 mb-4">
                            <div className="bg-white border border-slate-200 p-8 rounded-2xl shadow-sm text-center">
                                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Ready to Contribute?</h3>
                                <p className="text-emerald-700 font-bold text-sm mb-2">
                                    Build your skills while helping CUNY and NYC collaborate better.
                                </p>
                                <p className="text-slate-600 text-xs md:text-sm mb-6 max-w-md mx-auto leading-relaxed">
                                    Join a growing network of CUNY students gaining real-world experience through civic
                                    technology, research, and community-connected innovation.
                                </p>
                                <a
                                    href={GOOGLE_FORM_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block bg-emerald-600 text-white font-extrabold py-3 px-8 rounded-xl hover:bg-emerald-700 transition-all hover:scale-105 shadow-md shadow-emerald-500/10 text-xs"
                                >
                                    Apply to Join the Team
                                </a>
                            </div>
                        </section>
                    </div>
                    <Footer />
                </div>
            </div>
        </div>
    );
}

export default function CampusPartnersPage() {
    return (
        <Suspense fallback={
            <div className="h-full w-full flex items-center justify-center bg-slate-50">
                <p className="text-slate-400 text-sm animate-pulse">Loading Hub...</p>
            </div>
        }>
            <PartnersDashboardContent/>
        </Suspense>
    );
}
