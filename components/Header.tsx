"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client"; // Handles browser-side Supabase client initialization
import { User } from "@supabase/supabase-js";

/**
 * Header Component
 * Implements the global navigation bar.
 * Dynamically queries and listens to the active Supabase user session to toggle between standard sign-in
 * links and the dropdown profile menu (`UserMenu`). Includes path-aware highlights.
 */
export default function Header() {
    const pathname = usePathname(); // Resolves current URL path segment to highlight active nav link
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);
    const [isAdminOpen, setIsAdminOpen] = useState(false);
    const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const adminDropdownRef = useRef<HTMLDivElement>(null);
    const directoryDropdownRef = useRef<HTMLDivElement>(null);

    // Auto-close mobile menu when navigating
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // --- Supabase Session Synchronization ---
    // Subscribes to authentication state changes on load to support dynamic auth transitions
    // without needing a full window refresh.
    useEffect(() => {
        // 1. Resolve existing user session synchronously/asynchronously on mount
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        // 2. Establish a persistent auth listener subscription for sign-in/sign-out events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        // 3. Clean up the listener subscription on component unmount to prevent memory leaks
        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    // Close dropdowns when user clicks outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (adminDropdownRef.current && !adminDropdownRef.current.contains(event.target as Node)) {
                setIsAdminOpen(false);
            }
            if (directoryDropdownRef.current && !directoryDropdownRef.current.contains(event.target as Node)) {
                setIsDirectoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Check if current user is an authorized admin
    const email = user?.email || "";
    const isInternal = email.endsWith("@vngle.com");
    const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "riverajeremiah10@gmail.com";
    const isAllowedAdmin = adminEmailsEnv
        .split(",")
        .map(e => e.trim().toLowerCase())
        .filter(Boolean)
        .includes(email.toLowerCase());
    const isAdmin = !!user && (isInternal || isAllowedAdmin);

    // Declares structural navigation paths
    const navLinks = [
        { name: "Home", href: "/", protected: false },
        { name: "Join", href: "/partners", protected: false },
        { name: "History", href: "/about", protected: false },
    ];

    return (
        <header className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* Logo / Home Branding */}
                    <div className="shrink-0 flex items-center">
                        <Link href="/"
                            className="text-xl font-black text-slate-900 tracking-tight transition-transform hover:scale-105">
                            INI<span className="text-blue-600">.network</span>
                        </Link>
                    </div>

                    {/* Navigtion Links (Hidden on small mobile viewports, using md:flex) */}
                    <nav className="hidden md:flex space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                        {navLinks.map((link) => {
                            // Checks if current path matches link href exactly for state highlights
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    title={link.protected && !user ? "Sign in required to access" : undefined}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}

                        {/* Directory Dropdown */}
                        <div className="relative flex items-center" ref={directoryDropdownRef}>
                            <button
                                onClick={() => setIsDirectoryOpen(!isDirectoryOpen)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 focus:outline-none ${["/directory", "/explore", "/matches"].includes(pathname)
                                        ? "bg-white text-blue-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                    }`}
                            >
                                <span>Directory</span>
                                <svg
                                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isDirectoryOpen ? "rotate-180" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isDirectoryOpen && (
                                <div className="absolute left-0 mt-2 top-full w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 p-1.5 space-y-1">
                                    <Link
                                        href="/directory"
                                        onClick={() => setIsDirectoryOpen(false)}
                                        className={`block px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors ${pathname === "/directory" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                    >
                                        Directory
                                    </Link>
                                    <Link
                                        href={user ? "/explore" : "/login?redirectReason=auth_required&from=/explore"}
                                        onClick={() => setIsDirectoryOpen(false)}
                                        className={`block px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors ${pathname === "/explore" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                    >
                                        Network View {!user && "🔒"}
                                    </Link>
                                    <Link
                                        href={user ? "/matches" : "/login?redirectReason=auth_required&from=/matches"}
                                        onClick={() => setIsDirectoryOpen(false)}
                                        className={`block px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors ${pathname === "/matches" ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                                    >
                                        My Matches {!user && "🔒"}
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Public Data Map - Construction */}
                        <button
                            onClick={() => alert("We're evolving the public data. Returning soon!")}
                            className="px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 focus:outline-none text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        >
                            🚧 Public Data Map
                        </button>

                        {/* Admin Portal Dropdown */}
                        {isAdmin && (
                            <div className="relative flex items-center" ref={adminDropdownRef}>
                                <button
                                    onClick={() => setIsAdminOpen(!isAdminOpen)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 focus:outline-none ${pathname.startsWith("/admin")
                                        ? "bg-white text-blue-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                        }`}
                                >
                                    <span>⚙️ Admin</span>
                                    <svg
                                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isAdminOpen ? "rotate-180" : ""}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isAdminOpen && (
                                    <div className="absolute left-0 mt-2 top-full w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 p-1.5 space-y-1">
                                        <div className="px-3.5 py-2 border-b border-slate-100/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Admin Tools
                                        </div>
                                        <Link
                                            href="/admin/matches"
                                            onClick={() => setIsAdminOpen(false)}
                                            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors ${pathname === "/admin/matches"
                                                ? "bg-blue-50 text-blue-700"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                }`}
                                        >
                                            <span className="text-sm">🤖</span> Matchmaker Admin
                                        </Link>
                                        <Link
                                            href="/admin/marketing"
                                            onClick={() => setIsAdminOpen(false)}
                                            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors ${pathname === "/admin/marketing"
                                                ? "bg-blue-50 text-blue-700"
                                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                }`}
                                        >
                                            <span className="text-sm">📢</span> Marketing Broadcasts
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </nav>

                    {/* Right Section: Auth & Mobile Menu Toggle */}
                    <div className="flex items-center gap-2">
                        {/* Authentication State Section */}
                        <div className="flex items-center">
                            {/* CONDITIONAL RENDERING: Show UserMenu if logged in, otherwise show Login link */}
                            {user ? (
                                <UserMenu />
                            ) : (
                                <Link
                                    href="/login"
                                    className="px-3.5 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Sign In
                                </Link>
                            )}
                        </div>

                        {/* Mobile Menu Toggle Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none md:hidden transition-colors border border-slate-100"
                            aria-expanded={isMobileMenuOpen}
                            aria-label="Toggle main menu"
                        >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {isMobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                </div>
            </div>

            {/* Mobile Navigation Drawer (visible only on mobile when menu is open) */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-xl animate-in slide-in-from-top duration-200 absolute w-full top-full left-0">
                    <div className="px-4 pt-3 pb-6 space-y-1.5 max-h-[80vh] overflow-y-auto">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`block px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}

                        {/* Directory Mobile Links */}
                        <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5">
                            <div className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                📁 Directory Features
                            </div>
                            <Link href="/directory" onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-3 rounded-xl text-sm font-bold transition-all ${pathname === "/directory" ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                                Directory
                            </Link>
                            <Link href={user ? "/explore" : "/login?redirectReason=auth_required&from=/explore"} onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-3 rounded-xl text-sm font-bold transition-all ${pathname === "/explore" ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                                Network View {!user && "🔒"}
                            </Link>
                            <Link href={user ? "/matches" : "/login?redirectReason=auth_required&from=/matches"} onClick={() => setIsMobileMenuOpen(false)} className={`block px-4 py-3 rounded-xl text-sm font-bold transition-all ${pathname === "/matches" ? "bg-blue-50 text-blue-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                                My Matches {!user && "🔒"}
                            </Link>
                        </div>
                        
                        {/* Public Data Map Mobile - Construction */}
                        <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5">
                            <button onClick={() => alert("We're evolving the public data. Returning soon!")} className="w-full text-left block px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                                🚧 Public Data Map
                            </button>
                        </div>

                        {/* Admin Portal section inside Mobile Menu */}
                        {isAdmin && (
                            <div className="pt-4 mt-4 border-t border-slate-100 space-y-1.5">
                                <div className="px-4 py-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    ⚙️ Admin Tools
                                </div>
                                <Link
                                    href="/admin/matches"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${pathname === "/admin/matches"
                                        ? "bg-blue-50 text-blue-700 shadow-sm"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <span className="text-sm">🤖</span> Matchmaker Admin
                                </Link>
                                <Link
                                    href="/admin/marketing"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${pathname === "/admin/marketing"
                                        ? "bg-blue-50 text-blue-700 shadow-sm"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <span className="text-sm">📢</span> Marketing Broadcasts
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}