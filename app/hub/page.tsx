"use client";

import Link from "next/link";

export default function ContributorsHub() {
  // Replace the URL below with your actual Google Form link
  const GOOGLE_FORM_URL = "https://forms.gle/your-form-id-here";

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-black">
      {/* Top Navigation */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold text-slate-800">🤝 Join the Discovery Network</h1>
        <Link href="/" className="text-blue-600 hover:underline font-medium">
          ← Back to Workspace
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">

        {/* Mission Statement */}
        <div className="bg-blue-600 text-white p-8 rounded-2xl shadow-md">
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-blue-50 text-lg">
            The <strong>Institute for Nonpartisan Innovation (INI)</strong> is developing a first-of-its-kind
            open-source discovery engine to bridge the gap between CUNY researchers, students, and civic leaders.
          </p>
        </div>

        {/* Main Opportunities Card */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">

          {/* Section 1: Broad Categories */}
          <h3 className="text-xl font-bold mb-6">📋 Who we are looking for</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <p className="mb-4"><strong>💻 Developers:</strong> Python, React, Next.js, and AI API integration.</p>
              <p><strong>📊 Data Analysts:</strong> Cleaning and mapping CUNY research datasets.</p>
            </div>
            <div>
              <p className="mb-4"><strong>🎨 Designers:</strong> Improving the researcher discovery UX.</p>
              <p><strong>⚖️ Policy Experts:</strong> Ensuring nonpartisan data integrity.</p>
            </div>
          </div>

          {/* Internal Divider */}
          <hr className="my-8 border-slate-100" />

          {/* Section 2: Specific Roles */}
          <h3 className="text-xl font-bold mb-6">Roles Available</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
              <p className="text-sm"><strong>UX Designer:</strong> Crafting intuitive interfaces for the research discovery engine.</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
              <p className="text-sm"><strong>CUNY Community Checker:</strong> Ensuring data integrity and accuracy through meticulous validation and data entry.</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
              <p className="text-sm"><strong>Campus Network Liaison:</strong> Expanding our reach across the 25 campuses and facilitating cross-CUNY connections.</p>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" />
              <p className="text-sm"><strong>Project Lead:</strong> Guiding team workflows, setting milestones, and overseeing tool delivery.</p>
            </div>
          </div>

          {/* Section 3: Call to Action */}
          <div className="border-t pt-8 text-center">
            <h4 className="font-bold text-lg mb-2">Ready to contribute?</h4>
            <p className="text-slate-600 mb-6">Join the team building civic infrastructure for 25 CUNY campuses.</p>
            <a
              href={GOOGLE_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white font-bold py-3 px-10 rounded-full hover:bg-blue-700 transition-transform hover:scale-105"
            >
              Apply to Join the Team
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}