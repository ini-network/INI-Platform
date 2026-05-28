"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import UserMenu from "./UserMenu";
import {useEffect, useState} from "react";
import {createClient} from "@/utils/supabase/client"; // Handles browser-side Supabase client initialization
import {User} from "@supabase/supabase-js";

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

    // --- Supabase Session Synchronization ---
    // Subscribes to authentication state changes on load to support dynamic auth transitions
    // without needing a full window refresh.
    useEffect(() => {
        // 1. Resolve existing user session synchronously/asynchronously on mount
        const getUser = async () => {
            const {data: {user}} = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        // 2. Establish a persistent auth listener subscription for sign-in/sign-out events
        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        // 3. Clean up the listener subscription on component unmount to prevent memory leaks
        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    // Declares structural navigation paths
    const navLinks = [
        {name: "Home", href: "/"},
        ...(user ? [{name: "My Matches", href: "/matches"}] : []),
        {name: "Directory", href: "/directory"},
        {name: "Map Explorer", href: "/explore"},
        {name: "Collaboration Hub", href: "/collab"},
        {name: "Join Us", href: "/partners"},
        {name: "About", href: "/about"},
    ];

    return (
        <header className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">

                    {/* Logo / Home Branding */}
                    <div className="flex-shrink-0 flex items-center">
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
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                        isActive ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                    }`}
                                >
                                    {link.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Authentication State Section */}
                    <div className="flex items-center">
                        {/* CONDITIONAL RENDERING: Show UserMenu if logged in, otherwise show Login link */}
                        {user ? (
                            <UserMenu/>
                        ) : (
                            <Link
                                href="/login"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>

                </div>
            </div>
        </header>
    );
}