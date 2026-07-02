import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900 py-16 px-6 md:px-8 relative overflow-hidden shrink-0">
      {/* Decorative Gradient Background Blur */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-indigo-600 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-blue-600 rounded-full blur-[80px] -translate-x-1/3 -translate-y-1/3" />
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
                <Link href="/explore" className="hover:text-white transition-colors">
                  Map Explorer
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
                <Link href="/about" className="hover:text-white transition-colors">
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
