"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { INTEREST_BUCKETS } from "@/lib/taxonomy";
import ProfileModal, { ContactProfile } from "@/components/ProfileModal";

// --- INTERFACES ---
interface CollaborationPost {
  id: string;
  author_id: string;
  post_type: "Need" | "Offer";
  title: string;
  description: string;
  focus_area: string;
  campus: string | null;
  expires_at: string;
  created_at: string;
  // This comes from the Supabase join
  author: {
    id: string;
    name: string;
    campus: string | null;
    role_title: string | null;
    affiliation: string | null;
    capabilities: string | null;
    notes: string | null;
    email_contact: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contact_domains: any[];
  };
}

export default function CollaborationHub() {
  // Feed State
  const [posts, setPosts] = useState<CollaborationPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter State
  const [typeFilter, setTypeFilter] = useState<"All" | "Need" | "Offer">("All");
  const [focusFilter, setFocusFilter] = useState("All");

  // Inspect Profile State
  const [inspectContact, setInspectContact] = useState<ContactProfile | null>(null);

  // Create Post Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allContacts, setAllContacts] = useState<{ id: string; name: string }[]>([]); // For simulating Auth

  // Form State
  const [formData, setFormData] = useState({
    author_id: "",
    post_type: "Need",
    title: "",
    description: "",
    focus_area: "Technology, Data & Innovation",
    campus: "",
    duration_days: "14"
  });

  const uniqueFocusAreas = Object.keys(INTEREST_BUCKETS);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();

        // 1. Fetch Posts (Only unexpired, sorted newest first)
        const { data: postData, error: postError } = await supabase
          .from('collaboration_posts')
          .select(`
            *,
            author:contacts (
              id, name, campus, role_title, affiliation, capabilities, notes, email_contact,
              contact_domains ( domains ( domain_name ) )
            )
          `)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (postError) throw postError;
        setPosts(postData as CollaborationPost[]);

        // 2. Fetch lightweight contacts list for the "Post As" demo dropdown
        const { data: contactData } = await supabase
          .from('contacts')
          .select('id, name')
          .order('name');

        if (contactData) setAllContacts(contactData);

      } catch (error) {
        console.error("Error fetching hub data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- FILTERING LOGIC ---
  const displayedPosts = useMemo(() => {
    return posts.filter(post => {
      const typeMatch = typeFilter === "All" || post.post_type === typeFilter;
      const focusMatch = focusFilter === "All" || post.focus_area === focusFilter;
      return typeMatch && focusMatch;
    });
  }, [posts, typeFilter, focusFilter]);


  // --- CREATE POST LOGIC ---
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.author_id) return alert("Please select your profile to post.");

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Calculate Expiration Date
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(formData.duration_days));

      const { data, error } = await supabase
        .from('collaboration_posts')
        .insert([{
          author_id: formData.author_id,
          post_type: formData.post_type,
          title: formData.title,
          description: formData.description,
          focus_area: formData.focus_area,
          campus: formData.campus || null,
          expires_at: expirationDate.toISOString()
        }])
        .select(`
          *,
          author:contacts (
            id, name, campus, role_title, affiliation, capabilities, notes, email_contact,
            contact_domains ( domains ( domain_name ) )
          )
        `)
        .single();

      if (error) throw error;

      // Unshift adds it to the very top of our local feed
      setPosts(prev => [data as CollaborationPost, ...prev]);
      setIsCreateOpen(false);

      // Reset Form
      setFormData({ ...formData, title: "", description: "" });

    } catch (error) {
      console.error("Failed to post:", error);
      alert("Failed to create post. Check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">

      {/* NAVIGATION HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 shrink-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">🤝 Collaboration Hub</h1>
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
            <Link href="/" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
                Workspace
            </Link>
            <Link href="/explore" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
                Map Explorer
            </Link>
            <Link href="/profile" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
                My Profile
            </Link>
            <Link href="/contribute" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
              Join Us
            </Link>
            <span className="px-4 py-2 bg-white shadow rounded text-sm font-semibold text-slate-800">Collaboration Hub</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto">

          {/* PAGE HEADER & CONTROLS */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Active Opportunities</h2>
              <p className="text-slate-500 font-medium mt-1">Discover calls for collaboration or offer your expertise.</p>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
            >
              + Create Post
            </button>
          </div>

          {/* FILTER BAR */}
          <div className="flex flex-wrap gap-4 mb-8 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
              <button onClick={() => setTypeFilter("All")} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === "All" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>All Posts</button>
              <button onClick={() => setTypeFilter("Need")} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === "Need" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Needs</button>
              <button onClick={() => setTypeFilter("Offer")} className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === "Offer" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Offers</button>
            </div>

            <select
              value={focusFilter}
              onChange={(e) => setFocusFilter(e.target.value)}
              className="flex-1 border border-slate-200 rounded-xl p-3 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">Filter by Focus Area...</option>
              {uniqueFocusAreas.map(focus => <option key={focus} value={focus}>{focus}</option>)}
            </select>
          </div>

          {/* THE FEED */}
          {isLoading ? (
            <div className="flex justify-center p-12"><div className="animate-pulse text-slate-400 font-bold">Loading Opportunities...</div></div>
          ) : displayedPosts.length === 0 ? (
            <div className="text-center p-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <span className="text-5xl mb-4 block">📭</span>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No posts found</h3>
              <p className="text-slate-500">Be the first to post a need or offer in this category!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedPosts.map((post) => (
                <div key={post.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">

                  {/* Left Column: Context & Author */}
                  <div className="md:w-1/3 shrink-0 flex flex-col items-start border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 ${post.post_type === 'Need' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {post.post_type === 'Need' ? '🔴 Seeking Help' : '🟢 Offering Help'}
                    </span>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight mb-1">{post.author.name}</h4>
                    <p className="text-sm font-medium text-slate-500">{post.author.role_title || "Civic Leader"}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-1">📍 {post.campus || post.author.campus || "NYC"}</p>

                    <button
                      onClick={() => {
                        // Map the complex domain structure to a flat array for the ProfileModal
                        const mappedContact: ContactProfile = {
                          ...post.author,
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          domains: post.author.contact_domains?.map((cd: any) => cd.domains.domain_name) || []
                        };
                        setInspectContact(mappedContact);
                      }}
                      className="mt-6 w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-sm transition-colors"
                    >
                      Inspect Profile
                    </button>
                  </div>

                  {/* Right Column: The Post Content */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">{post.focus_area}</span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        ⏱️ Expires {new Date(post.expires_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{post.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap flex-1">
                      {post.description}
                    </p>

                    <button
                      onClick={() => alert(`In production, this would open an email draft to ${post.author.email_contact || "this user"}. For now, click 'Inspect Profile' to see their details!`)}
                      className="mt-auto self-start bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                    >
                      ✉️ Express Interest
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          CREATE POST MODAL OVERLAY
          ========================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">Create a Post</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕ Close</button>
            </div>

            <form onSubmit={handleCreatePost} className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">

              {/* TEMP AUTH DROPDOWN */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                <label className="block text-xs font-black uppercase text-amber-800 mb-2">Simulate Login (Who are you?)</label>
                <select required value={formData.author_id} onChange={e => setFormData({...formData, author_id: e.target.value})} className="w-full p-2 rounded-lg border border-amber-300 text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                  <option value="">Select your profile...</option>
                  {allContacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Post Type</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button type="button" onClick={() => setFormData({...formData, post_type: "Need"})} className={`flex-1 py-2 text-sm font-bold rounded ${formData.post_type === "Need" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}>Need</button>
                    <button type="button" onClick={() => setFormData({...formData, post_type: "Offer"})} className={`flex-1 py-2 text-sm font-bold rounded ${formData.post_type === "Offer" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>Offer</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Primary Focus Area</label>
                  <select required value={formData.focus_area} onChange={e => setFormData({...formData, focus_area: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {uniqueFocusAreas.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Headline</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder={formData.post_type === "Need" ? "e.g., Seeking UI Developer for Civic Tech Project" : "e.g., Offering Free Mapping Workshops for CUNY Orgs"} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Details & Context</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} placeholder="Describe exactly what you are looking for or providing..." className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relevant Campus (Optional)</label>
                  <input value={formData.campus} onChange={e => setFormData({...formData, campus: e.target.value})} placeholder="e.g., Hunter College" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Keep Active For</label>
                  <select value={formData.duration_days} onChange={e => setFormData({...formData, duration_days: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all ${isSubmitting ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {isSubmitting ? "Posting..." : "Publish to Hub"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          INSPECT PROFILE MODAL (Reused!)
          ========================================== */}
      {inspectContact && (
        <ProfileModal
          contact={inspectContact}
          onClose={() => setInspectContact(null)}
          showGraph={false} // No graph needed on the hub page
          onSaveContact={async (id) => {
            try {
              const res = await fetch("/api/save_contact", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: id })
              });
              if (res.ok) alert(`⭐ Saved ${inspectContact.name} to your vault!`);
            } catch (e) {
              console.error("Failed to save contact");
            }
          }}
        />
      )}

    </div>
  );
}