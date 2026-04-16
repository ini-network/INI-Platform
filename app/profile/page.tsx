// src/app/profile/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { INTEREST_BUCKETS } from "@/lib/taxonomy";

interface SavedContact {
  "Contact Name": string;
  "Campus"?: string;
  "Role/Title"?: string;
  "Program/Org Affiliation"?: string;
  "Civic Domains"?: string;
  "Capabilities / Expertise"?: string;
  "Notes / Insights"?: string;
  "Email/Phone/LinkedIn"?: string;
}

export default function ProfilePage() {
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Dashboard State
  const [activeTab, setActiveTab] = useState<"form" | "vault">("form");

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Strict Taxonomy State
  const [selectedDomains, setSelectedDomains] = useState<Set<string>>(new Set());
  const [otherDomain, setOtherDomain] = useState("");

  // Standard Form Fields
  const [formData, setFormData] = useState({
    contact_name: "", email: "", campus: "", role_title: "", affiliation: "",
    url: "", capabilities: "", communities_served: "", needs_challenges: "",
    opportunity_ideas: "", ini_alignments: "", notes: ""
  });

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await fetch("/api/saved_contacts");
        const data = await res.json();
        if (Array.isArray(data)) setSavedContacts(data);
      } catch (e) {
        console.error("Failed to load saved contacts", e);
      } finally {
        setIsLoadingContacts(false);
      }
    };
    fetchSaved();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDomainToggle = (tag: string) => {
    const newDomains = new Set(selectedDomains);
    if (newDomains.has(tag)) newDomains.delete(tag);
    else newDomains.add(tag);
    setSelectedDomains(newDomains);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    const domainString = Array.from(selectedDomains).join(", ");
    const finalNotes = otherDomain.trim()
      ? `${formData.notes}\n\n[Suggested New Domains]: ${otherDomain}`.trim()
      : formData.notes;

    const payload = { ...formData, civic_domains: domainString, notes: finalNotes, category: "User Generated" };

    try {
      const res = await fetch("/api/publish_profile", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && result.status === "success") {
        setSubmitStatus("success");
        setFormData({
          contact_name: "", email: "", campus: "", role_title: "", affiliation: "",
          url: "", capabilities: "", communities_served: "", needs_challenges: "",
          opportunity_ideas: "", ini_alignments: "", notes: ""
        });
        setSelectedDomains(new Set());
        setOtherDomain("");
        window.scrollTo(0, 0);
      } else {
        throw new Error(result.message || "Failed to publish profile");
      }
    } catch (error: any) {
      setSubmitStatus("error");
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 overflow-hidden font-sans">

      {/* DESKTOP SIDEBAR / MOBILE TOP BAR */}
      <div className="md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between md:flex-col md:items-start md:space-y-4">
          <h2 className="text-xl font-bold text-slate-800">User Dashboard</h2>
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            ← Back to Map
          </Link>
        </div>

        {/* Navigation Controls */}
        <div className="flex md:flex-col p-2 md:p-4 gap-2 overflow-x-auto md:overflow-visible">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 md:flex-none text-left px-4 py-3 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === "form" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            ✍️ Edit Profile
          </button>
          <button
            onClick={() => setActiveTab("vault")}
            className={`flex-1 md:flex-none text-left px-4 py-3 text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex justify-between items-center ${activeTab === "vault" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}
          >
            <span>⭐ Saved Contacts</span>
            <span className="bg-slate-200 text-slate-600 py-0.5 px-2 rounded-full text-[10px] ml-2">{savedContacts.length}</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT CANVAS */}
      <div className="flex-1 h-full overflow-y-auto p-4 md:p-8">
        <div className="max-w-5xl mx-auto">

          {/* ================= VAULT VIEW ================= */}
          {activeTab === "vault" && (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Saved Contacts</h1>
                <p className="text-slate-600">Your curated list of civic network connections.</p>
              </div>

              {isLoadingContacts ? (
                <p className="text-slate-400 text-sm animate-pulse">Loading your network...</p>
              ) : savedContacts.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-4xl mb-4 block">📭</span>
                  <p className="text-slate-500 font-medium text-lg">Your vault is empty.</p>
                  <p className="text-sm text-slate-400 mt-2">Go to the Workspace and click "Save Contact" to build your network.</p>
                  <Link href="/" className="mt-6 inline-block bg-blue-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-blue-700">Explore Network</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {savedContacts.map((contact, i) => (
                    <div key={i} className="p-6 border border-slate-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-all flex flex-col">
                      <h3 className="font-bold text-blue-900 text-xl">{contact["Contact Name"]}</h3>
                      <p className="text-sm font-medium text-slate-500 mb-4">{contact["Campus"]} | {contact["Role/Title"]}</p>

                      <div className="space-y-2 mb-4 flex-1">
                        {contact["Program/Org Affiliation"] && <p className="text-sm text-slate-700"><span className="font-semibold">🏢 Title:</span> {contact["Program/Org Affiliation"]}</p>}
                        {contact["Email/Phone/LinkedIn"] && <p className="text-sm text-slate-700"><span className="font-semibold">✉️ Contact:</span> {contact["Email/Phone/LinkedIn"]}</p>}
                        {contact["Capabilities / Expertise"] && <p className="text-sm text-slate-700"><span className="font-semibold">🛠️ Skillset:</span> {contact["Capabilities / Expertise"]}</p>}
                      </div>

                      {contact["Notes / Insights"] && (
                        <div className="mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <p className="text-sm text-slate-600 italic leading-relaxed">
                            <span className="font-semibold not-italic text-slate-700">📝 Notes:</span> {contact["Notes / Insights"]}
                          </p>
                        </div>
                      )}

                      {contact["Civic Domains"] && (
                        <div className="flex flex-wrap gap-1 mt-auto pt-4 border-t border-slate-100">
                          {contact["Civic Domains"].split(",").map((d, idx) => (
                            <span key={idx} className="bg-sky-50 text-sky-700 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider border border-sky-100">
                              {d.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= FORM VIEW ================= */}
          {activeTab === "form" && (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-2">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Join the Network</h1>
                <p className="text-slate-600">Publish your civic profile to the public directory so collaborators can find you.</p>
              </div>

              {submitStatus === "success" && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center">
                  <span className="text-xl mr-3">✅</span> Profile successfully published to the Civic Network!
                </div>
              )}

              {submitStatus === "error" && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl font-medium">
                  ❌ Error: {errorMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                {/* Core Identity */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest border-b pb-2">Core Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label><input required name="contact_name" value={formData.contact_name} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Email / LinkedIn *</label><input required name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Role / Title</label><input name="role_title" value={formData.role_title} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Campus / Location *</label><input required name="campus" value={formData.campus} onChange={handleInputChange} placeholder="e.g. City Tech" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Program / Org Affiliation</label><input name="affiliation" value={formData.affiliation} onChange={handleInputChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Website URL</label><input name="url" value={formData.url} onChange={handleInputChange} placeholder="https://" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  </div>
                </div>

                {/* Strict Taxonomy Grid */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest border-b pb-2">Civic Domains (Select all that apply)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                    {Object.entries(INTEREST_BUCKETS).map(([folder, tags]) => (
                      tags.length > 0 && (
                        <div key={folder}>
                          <p className="text-xs font-bold text-slate-800 mb-2">{folder}</p>
                          <div className="flex flex-wrap gap-2">
                            {tags.map(tag => (
                              <button
                                type="button" key={tag} onClick={() => handleDomainToggle(tag)}
                                className={`text-[10px] px-2.5 py-1.5 rounded font-bold uppercase tracking-wider transition-all border ${selectedDomains.has(tag) ? "bg-blue-600 text-white border-blue-700 shadow-sm" : "bg-white text-slate-500 border-slate-300 hover:border-blue-400"}`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>

                  <div className="mt-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Other Domains (Please Specify)</label>
                    <input value={otherDomain} onChange={(e) => setOtherDomain(e.target.value)} placeholder="e.g. AI Ethics, Transit Equity" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" />
                    <p className="text-[10px] text-slate-400 mt-1">Custom domains will be reviewed for future inclusion in the map filters.</p>
                  </div>
                </div>

                {/* Extended Details */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest border-b pb-2">Extended Details</h3>
                  <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Capabilities / Expertise</label><textarea name="capabilities" value={formData.capabilities} onChange={handleInputChange} rows={2} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Communities Served</label><textarea name="communities_served" value={formData.communities_served} onChange={handleInputChange} rows={2} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Needs / Challenges</label><textarea name="needs_challenges" value={formData.needs_challenges} onChange={handleInputChange} rows={2} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Opportunity Ideas</label><textarea name="opportunity_ideas" value={formData.opportunity_ideas} onChange={handleInputChange} rows={2} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-700 mb-1">Notes / Insights</label><textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl"}`}>
                  {isSubmitting ? "Publishing to Directory..." : "🚀 Publish Profile"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}