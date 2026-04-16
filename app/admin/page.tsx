"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "INI_ADMIN_2026") {
      setIsAuthenticated(true);
    } else {
      alert("⚠️ Unauthorized: Incorrect password.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      {/* Top Navigation */}
      <div className="max-w-5xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">📊 INI Admin Dashboard</h1>
        <Link href="/" className="text-blue-600 hover:underline font-medium">
          ← Back to Workspace
        </Link>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* THE PASSWORD LOCK */}
        {!isAuthenticated ? (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md mx-auto mt-20">
            <h2 className="text-xl font-bold mb-4 text-slate-800">Admin Access Required</h2>
            <form onSubmit={handleLogin} className="flex flex-col space-y-4">
              <input
                type="password"
                placeholder="Enter password..."
                className="border border-slate-300 rounded-lg p-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="submit" className="bg-slate-800 text-white font-bold py-2 rounded-lg hover:bg-slate-700">
                Unlock Database
              </button>
            </form>
          </div>
        ) : (
          /* THE ADMIN DASHBOARD (Unlocked) */
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-2">👥 Registered Users</h2>
              <p className="text-sm text-slate-500 mb-4">We will connect this to FastAPI to load live user data soon.</p>
              {/* Placeholder table */}
              <div className="h-40 bg-slate-100 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                Live Data Table Goes Here
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-2">🗂️ Manage Network Contacts</h2>
              <p className="text-sm text-slate-500 mb-4">Live database editing interface will go here.</p>
              <div className="h-64 bg-slate-100 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                Interactive Datagrid Goes Here
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}