"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";

export default function Header() {
  const pathname = usePathname();

  // Core navigation links (Main Tools & Info)
  const navLinks = [
    { name: "Workspace", href: "/" },
    { name: "Map Explorer", href: "/explore" },
    { name: "Collaboration Hub", href: "/collab" },
    { name: "Join Us", href: "/contribute" },
  ];

  return (
    <header className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Brand */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-black text-slate-900 tracking-tight transition-transform hover:scale-105">
              INI<span className="text-blue-600">.network</span>
            </Link>
          </div>

          {/* Core Navigation */}
          <nav className="hidden md:flex space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    isActive
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Actions */}
          <div className="flex items-center">
            <UserMenu />
          </div>

        </div>
      </div>
    </header>
  );
}