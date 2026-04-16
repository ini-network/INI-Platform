"use client";

import Link from "next/link";
import { useState } from "react";

export default function ContributorsHub() {
  const [isApplying, setIsApplying] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
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

        {/* Dynamic Section: Either show the Pitch OR the Form */}
        {!isApplying ? (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-xl font-bold mb-6 text-slate-800">📋 Who we are looking for</h3>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="mb-4"><strong>💻 Developers:</strong> Python, React, Next.js, and AI API integration.</p>
                <p><strong>📊 Data Analysts:</strong> Cleaning and mapping CUNY research datasets.</p>
              </div>
              <div>
                <p className="mb-4"><strong>🎨 Designers:</strong> Improving the researcher discovery UX.</p>
                <p><strong>⚖️ Policy Experts:</strong> Ensuring nonpartisan data integrity.</p>
              </div>
            </div>

            <div className="border-t pt-6 text-center">
              <h4 className="font-bold text-lg mb-2">Ready to contribute?</h4>
              <p className="text-slate-600 mb-4">Join the team building civic infrastructure for 25 CUNY campuses.</p>
              <button
                onClick={() => setIsApplying(true)}
                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full hover:bg-blue-700 transition-transform hover:scale-105"
              >
                Apply to Join the Team
              </button>
            </div>
          </div>
        ) : (
          /* THE APPLICATION FORM */
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">📝 Contributor Application</h3>
              <button onClick={() => setIsApplying(false)} className="text-slate-500 hover:text-slate-800 text-sm">
                Cancel
              </button>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Application Submitted!"); setIsApplying(false); }}>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name*" required className="border border-slate-300 rounded-lg p-3 w-full" />
                <input type="email" placeholder="CUNY Email*" required className="border border-slate-300 rounded-lg p-3 w-full" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select required className="border border-slate-300 rounded-lg p-3 w-full bg-white">
                  <option value="">Select CUNY College...</option>
                  <option>City Tech</option>
                  <option>Hunter College</option>
                  <option>John Jay</option>
                </select>
                <input type="text" placeholder="GitHub Profile Link (Optional)" className="border border-slate-300 rounded-lg p-3 w-full" />
              </div>
              <textarea placeholder="Tell us about your experience with open-source or CUNY research." className="border border-slate-300 rounded-lg p-3 w-full h-32"></textarea>
              <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg hover:bg-slate-700">
                Submit Application
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}