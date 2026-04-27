"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user and listen for auth changes
  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown if user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsOpen(false);
    router.push("/login");
    router.refresh(); // Forces Next.js to update the page state
  };

  // --- LOGGED OUT STATE ---
  if (!user) {
    return (
      <Link
        href="/login"
        className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
      >
        Log In / Sign Up
      </Link>
    );
  }

  // --- LOGGED IN STATE ---
  // Grab the first letter of their email for the avatar (fallback to 'U')
  const initial = user.email ? user.email.charAt(0).toUpperCase() : "U";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-black border-2 border-blue-200 hover:ring-4 hover:ring-blue-100 hover:border-blue-400 transition-all focus:outline-none shadow-sm"
      >
        {initial}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">

          {/* User Info Header */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Signed in as</p>
            <p className="text-sm font-bold text-slate-800 truncate">{user.email}</p>
          </div>

          {/* Main Links */}
          <div className="p-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-slate-600 font-bold rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <span className="mr-3 text-lg">👤</span> My Public Profile
            </Link>
            <Link
              href="/account"
              onClick={() => setIsOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-slate-600 font-bold rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <span className="mr-3 text-lg">⚙️</span> Account Settings
            </Link>
          </div>

          {/* Sign Out Footer */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={handleSignOut}
              className="flex items-center w-full text-left px-4 py-2.5 text-sm text-rose-600 font-bold rounded-xl hover:bg-rose-100 transition-colors"
            >
               <span className="mr-3 text-lg">🚪</span> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}