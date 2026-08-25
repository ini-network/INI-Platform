import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 py-16 px-6 md:px-8 relative overflow-hidden shrink-0">
      {/* Decorative Gradient Background Blur */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute bottom-0 right-0 w-100 h-100 bg-indigo-600 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-0 left-0 w-75 h-75 bg-blue-600 rounded-full blur-[80px] -translate-x-1/3 -translate-y-1/3" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 pb-12 border-b border-slate-900">

          {/* Main Brand & Branding Statement Column */}
          <div className="md:col-span-6 space-y-5">
            <Link
              href="/"
              className="inline-block text-2xl font-black text-white tracking-tight hover:scale-[1.02] transition-transform"
            >
              INI<span className="text-blue-500">.network</span>
            </Link>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-lg font-medium">
              INI is a CUNY-centered civic innovation initiative co-powered by{" "}
              <a
                href="https://vngle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-blue-400 underline underline-offset-4 decoration-slate-700 hover:decoration-blue-400 transition-all"
              >
                Vngle: The Civic Insights Company
              </a>
              , connecting campuses, communities, and real-time civic insights across NYC.
            </p>

            {/* Flashy LinkedIn Follow Button */}
            <div className="pt-2">
              <a
                href="https://www.linkedin.com/showcase/vnglecuny/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-linear-to-r from-[#0A66C2] via-blue-600 to-indigo-600 text-white font-bold text-xs md:text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden border border-blue-400/30"
              >
                {/* Shimmer sweep effect */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 ease-in-out pointer-events-none" />

                {/* LinkedIn Icon */}
                <div className="w-6 h-6 rounded-lg bg-white text-[#0A66C2] flex items-center justify-center p-1 shadow-sm shrink-0">
                  <svg className="w-full h-full fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </div>

                <span className="tracking-wide">Follow INI on LinkedIn</span>

                <svg className="w-4 h-4 text-blue-200 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links Columns */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Ecosystem
            </h4>
            <ul className="space-y-3 text-xs md:text-sm font-semibold">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-white transition-colors">
                  Civic Directory
                </Link>
              </li>
              <li>
                <Link href="/map" className="hover:text-white transition-colors">
                  Public Data Map
                </Link>
              </li>
              <li>
                <Link href="/explore" className="hover:text-white transition-colors">
                  Network View
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Initiative
            </h4>
            <ul className="space-y-3 text-xs md:text-sm font-semibold">
              <li>
                <Link href="/history" className="hover:text-white transition-colors">
                  About INI
                </Link>
              </li>
              <li>
                <Link href="/partners" className="hover:text-white transition-colors">
                  Join the Network
                </Link>
              </li>
              <li>
                <Link href="/america250" className="hover:text-white transition-colors">
                  America 250
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom Metadata & Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] md:text-xs text-slate-500 font-medium">
          <p>© {new Date().getFullYear()} Institute for Nonpartisan Innovation (INI). All rights reserved.</p>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Empowering NYC civic collaboration</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
