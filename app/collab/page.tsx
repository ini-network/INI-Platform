"use client";
import Link from "next/link";
import {useState, useEffect, useMemo} from "react";
import {createClient} from "@/utils/supabase/client";
import {INTEREST_BUCKETS} from "@/lib/taxonomy";
import ProfileModal, {ContactProfile} from "@/components/ProfileModal";

// --- INTERFACES ---

/**
 * Interface representing a structured collaboration feed item.
 * Utilizes a nested `author` dictionary mapping to relational Supabase joins 
 * between 'collaboration_posts' and 'contacts' tables.
 */
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
    // Nesting resolved relational values loaded via Supabase's inner joins
    author: {
        id: string;
        name: string;
        campus: string | null;
        role_title: string | null;
        affiliation: string | null;
        capabilities: string | null;
        notes: string | null;
        email_contact: string | null;
        contact_domains: { domains: { domain_name: string } }[];
    };
}

// --- TOOLTIP COMPONENT FOR PROGRESSIVE DISCLOSURE ---
const InfoTooltip = ({ text }: { text: string }) => {
    return (
        <div className="group relative inline-flex items-center justify-center ml-2 align-middle">
            <button type="button" className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors">
                ?
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2.5 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[9999] text-center pointer-events-none font-normal">
                {text}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-800"></div>
            </div>
        </div>
    );
};

/**
 * CollaborationHub Component
 * Manages the civic needs and offers feed. Features active search filtering,
 * post creation gates based on active directory profiles, and a step-by-step 
 * state-machine driving the first-time user onboarding tour.
 */
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

    const [currentUserContactId, setCurrentUserContactId] = useState<string | null>(null);

    // --- TUTORIAL / ONBOARDING STATE MACHINE ---
    // Controls step progression for guided walkthrough overlay. Saves state locally in localStorage.
    const [tourStep, setTourStep] = useState<number>(-1);

    useEffect(() => {
        const hasSeen = localStorage.getItem("hasSeenCollabTutorial");
        if (!hasSeen) setTourStep(0); // Launch Welcome Modal
    }, []);

    const startTour = () => setTourStep(1);
    const endTour = () => {
        setTourStep(-1);
        localStorage.setItem("hasSeenCollabTutorial", "true");
    };

    /**
     * INITIAL DATA RETRIEVAL PIPELINE
     * 
     * Orchestrates two asynchronous processes:
     * 1. Auth check: Fetch current user, look up their profile link `linked_contact_id`
     *    inside `public.users` schema. Blocks post authorship unless a public profile is linked.
     * 2. Opportunities Feed: Retrieves unexpired collaboration items with a complex join filter,
     *    ensuring the author's public publishing flag is toggled on (`contacts.is_public == true`).
     */
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const supabase = createClient();

                // Check secure user session details
                const {data: {user}} = await supabase.auth.getUser();
                if (user) {
                    // Match auth context with directory contacts database records
                    const {data: userData} = await supabase
                        .from('users')
                        .select('linked_contact_id')
                        .eq('id', user.id)
                        .single();

                    if (userData?.linked_contact_id) {
                        setCurrentUserContactId(userData.linked_contact_id);
                        // Auto-fill author ID parameters
                        setFormData(prev => ({...prev, author_id: userData.linked_contact_id}));
                    }
                }

                // 1. Fetch unexpired feed posts using nested Supabase join mappings
                const {data: postData, error: postError} = await supabase
                    .from('collaboration_posts')
                    .select(`
            *,
            author:contacts!inner (
              id, name, campus, role_title, affiliation, capabilities, notes, email_contact,
              contact_domains ( domains ( domain_name ) )
            )
          `)
                    .eq('contacts.is_public', true) // <-- Ensure author directory card is active
                    .gt('expires_at', new Date().toISOString())
                    .order('created_at', {ascending: false});

                if (postError) throw postError;
                setPosts(postData as CollaborationPost[]);

                // 2. Fetch lightweight directory index mapping names to IDs for author bindings
                const {data: contactData} = await supabase
                    .from('contacts')
                    .select('id, name')
                    .eq('is_public', true)
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

            const {data, error} = await supabase
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
            setFormData({...formData, title: "", description: ""});

        } catch (error) {
            console.error("Failed to post:", error);
            alert("Failed to create post. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- DELETE POST LOGIC ---
    const handleDeletePost = async (postId: string) => {
        const isConfirmed = window.confirm("Are you sure you want to delete this post? This cannot be undone.");
        if (!isConfirmed) return;

        try {
            const supabase = createClient();
            const {error} = await supabase
                .from('collaboration_posts')
                .delete()
                .eq('id', postId);

            if (error) throw error;

            // Instantly remove the post from the UI without reloading the page
            setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));

        } catch (error) {
            console.error("Failed to delete post:", error);
            alert("Failed to delete the post. Please try again.");
        }
    };

    return (
        <div className="flex flex-col h-screen w-full bg-slate-50 overflow-hidden font-sans">

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto">

                    {/* PAGE HEADER & CONTROLS */}
                    <div className={`relative transition-all duration-300 ${tourStep === 3 ? 'z-[100] bg-white p-4 rounded-xl shadow-2xl ring-4 ring-blue-400/50 -m-4 mb-4' : 'mb-8'} flex flex-col md:flex-row justify-between items-start md:items-end gap-4`}>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center">
                                Active Opportunities
                                <InfoTooltip text="This hub displays real-time needs and offers from across the network. Filter, post, or connect directly." />
                            </h2>
                            <p className="text-slate-500 font-medium mt-1">Discover calls for collaboration or offer
                                your expertise.</p>
                        </div>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5"
                        >
                            + Create Post
                        </button>
                        
                        {tourStep === 3 && (
                            <div className="absolute top-full right-0 mt-4 bg-white rounded-xl shadow-xl p-5 w-80 z-[101] animate-in fade-in slide-in-from-top-4 border border-blue-100 text-left">
                                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2"><span>📢</span> 3. Share With The Network</h3>
                                <p className="text-sm text-slate-600 mb-4 whitespace-normal">Have an opportunity or need help? Click "Create Post" to broadcast it to the community. Posts automatically expire after your chosen duration.</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-400">Step 3 of 3</span>
                                    <button onClick={endTour} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700">Finish Tour</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FILTER BAR */}
                    <div className={`relative transition-all duration-300 ${tourStep === 1 ? 'z-[100] bg-white p-4 rounded-2xl shadow-2xl ring-4 ring-blue-400/50 -mx-4 mb-8' : 'bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-8'} flex flex-wrap gap-4`}>
                        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                            <button onClick={() => setTypeFilter("All")}
                                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === "All" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>All
                                Posts
                            </button>
                            <button onClick={() => setTypeFilter("Need")}
                                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === "Need" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Needs
                            </button>
                            <button onClick={() => setTypeFilter("Offer")}
                                    className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${typeFilter === "Offer" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Offers
                            </button>
                        </div>

                        <select
                            value={focusFilter}
                            onChange={(e) => setFocusFilter(e.target.value)}
                            className="flex-1 border border-slate-200 rounded-xl p-3 text-sm font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="All">Filter by Focus Area...</option>
                            {uniqueFocusAreas.map(focus => <option key={focus} value={focus}>{focus}</option>)}
                        </select>

                        {tourStep === 1 && (
                            <div className="absolute top-full left-0 mt-4 bg-white rounded-xl shadow-xl p-5 w-80 z-[101] animate-in fade-in slide-in-from-top-4 border border-blue-100">
                                <h3 className="font-bold text-blue-900 mb-2">1. Filter Opportunities</h3>
                                <p className="text-sm text-slate-600 mb-4">Toggle between "Needs" and "Offers", or select a specific focus area to quickly find relevant posts.</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-400">Step 1 of 3</span>
                                    <div className="flex gap-2">
                                        <button onClick={endTour} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2">Skip</button>
                                        <button onClick={() => setTourStep(2)} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700">Next</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* THE FEED */}
                    <div className={`relative transition-all duration-300 ${tourStep === 2 ? 'z-[100] bg-white p-4 rounded-2xl shadow-2xl ring-4 ring-blue-400/50 -mx-4' : ''}`}>
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-pulse text-slate-400 font-bold">Loading Opportunities...</div>
                        </div>
                    ) : displayedPosts.length === 0 ? (
                        <div className="text-center p-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
                            <span className="text-5xl mb-4 block">📭</span>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">No posts found</h3>
                            <p className="text-slate-500">Be the first to post a need or offer in this category!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {displayedPosts.map((post) => (
                                <div key={post.id}
                                     className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6">

                                    {/* Left Column: Context & Author */}
                                    <div
                                        className="md:w-1/3 shrink-0 flex flex-col items-start border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-6">
                    <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 ${post.post_type === 'Need' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
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
                                                    domains: post.author.contact_domains?.map((cd) => (cd as {
                                                        domains: { domain_name: string }
                                                    }).domains.domain_name) || []
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
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded">{post.focus_area}</span>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                                    ⏱️ Expires {new Date(post.expires_at).toLocaleDateString()}
                                                </span>

                                                {/* Only show the Delete button if the current user authored the post */}
                                                {currentUserContactId === post.author_id && (
                                                    <button
                                                        onClick={() => handleDeletePost(post.id)}
                                                        className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-1 rounded hover:bg-rose-600 hover:text-white transition-colors"
                                                        title="Delete this post"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-2xl font-bold text-slate-900 mb-3">{post.title}</h3>
                                        <p className="text-slate-600 text-sm leading-relaxed mb-6 whitespace-pre-wrap flex-1">
                                            {post.description}
                                        </p>

                                        <button
                                            onClick={() => {
                                                if (!post.author.email_contact) {
                                                    alert(`No email address is listed for ${post.author.name}.`);
                                                    return;
                                                }
                                                const subject = encodeURIComponent(`Regarding your INI Network post: ${post.title}`);
                                                const body = encodeURIComponent(`Hi ${post.author.name},\n\nI saw your post "${post.title}" on the INI Collaboration Hub and I'm very interested in discussing it further.\n\nBest,\n[Your Name]`);

                                                window.location.href = `mailto:${post.author.email_contact}?subject=${subject}&body=${body}`;
                                            }}
                                            className="mt-auto self-start bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                                        >
                                            ✉️ Express Interest
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {tourStep === 2 && (
                        <div className="absolute top-0 right-0 -mt-4 bg-white rounded-xl shadow-xl p-5 w-80 z-[101] animate-in fade-in slide-in-from-right-4 border border-blue-100">
                            <h3 className="font-bold text-blue-900 mb-2">2. Browse & Connect</h3>
                            <p className="text-sm text-slate-600 mb-4">Review active posts. You can inspect the author's full profile or click "Express Interest" to email them directly.</p>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400">Step 2 of 3</span>
                                <div className="flex gap-2">
                                    <button onClick={endTour} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2">Skip</button>
                                    <button onClick={() => setTourStep(3)} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700">Next</button>
                                </div>
                            </div>
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* ==========================================
          CREATE POST MODAL OVERLAY
          ========================================== */}
            {isCreateOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div
                        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h2 className="text-xl font-bold text-slate-800">Create a Post</h2>
                            <button onClick={() => setIsCreateOpen(false)}
                                    className="text-slate-400 hover:text-slate-700 font-bold">✕ Close
                            </button>
                        </div>

                        <form onSubmit={handleCreatePost} className="p-6 md:p-8 space-y-6 max-h-[75vh] overflow-y-auto">

                            {/* REAL AUTH CHECK */}
                            {!currentUserContactId ? (
                                <div
                                    className="bg-rose-50 border border-rose-200 p-5 rounded-2xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-sm font-bold text-rose-800 text-center sm:text-left">
                                        You haven&#39;t published a directory profile yet. You need a public profile to
                                        author a post.
                                    </p>
                                    <Link
                                        href="/profile"
                                        className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        Create Profile
                                    </Link>
                                </div>
                            ) : null}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Post Type</label>
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        <button type="button"
                                                onClick={() => setFormData({...formData, post_type: "Need"})}
                                                className={`flex-1 py-2 text-sm font-bold rounded ${formData.post_type === "Need" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}>Need
                                        </button>
                                        <button type="button"
                                                onClick={() => setFormData({...formData, post_type: "Offer"})}
                                                className={`flex-1 py-2 text-sm font-bold rounded ${formData.post_type === "Offer" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"}`}>Offer
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Primary Focus
                                        Area</label>
                                    <select required value={formData.focus_area}
                                            onChange={e => setFormData({...formData, focus_area: e.target.value})}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                        {uniqueFocusAreas.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Headline</label>
                                <input required value={formData.title}
                                       onChange={e => setFormData({...formData, title: e.target.value})}
                                       placeholder={formData.post_type === "Need" ? "e.g., Seeking UI Developer for Civic Tech Project" : "e.g., Offering Free Mapping Workshops for CUNY Orgs"}
                                       className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Details & Context</label>
                                <textarea required value={formData.description}
                                          onChange={e => setFormData({...formData, description: e.target.value})}
                                          rows={4}
                                          placeholder="Describe exactly what you are looking for or providing..."
                                          className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"/>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Relevant Campus
                                        (Optional)</label>
                                    <input value={formData.campus}
                                           onChange={e => setFormData({...formData, campus: e.target.value})}
                                           placeholder="e.g., Hunter College"
                                           className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Keep Active
                                        For</label>
                                    <select value={formData.duration_days}
                                            onChange={e => setFormData({...formData, duration_days: e.target.value})}
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="7">7 Days</option>
                                        <option value="14">14 Days</option>
                                        <option value="30">30 Days</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    // Now disabled if they aren't linked OR if currently submitting
                                    disabled={isSubmitting || !currentUserContactId}
                                    className={`flex-[2] py-3 text-white font-bold rounded-xl transition-all ${
                                        (isSubmitting || !currentUserContactId) ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-md"
                                    }`}
                                >
                                    {isSubmitting ? "Posting..." : !currentUserContactId ? "Profile Link Required" : "Publish to Hub"}
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
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();

                            if (!user) return alert("You must be logged in to save contacts.");

                            const { data: existing } = await supabase
                                .from('saved_contacts')
                                .select('id')
                                .eq('contact_id', id)
                                .eq('user_id', user.id)
                                .maybeSingle();

                            if (existing) {
                                alert(`⭐ ${inspectContact.name} is already in your vault!`);
                                return;
                            }

                            const { error } = await supabase
                                .from('saved_contacts')
                                .insert([{ contact_id: id, user_id: user.id }]);

                            alert(`⭐ Saved ${inspectContact.name} to your vault!`);
                        } catch (e) {
                            console.error("Failed to save contact", e);
                        }
                    }}
                />
            )}

            {/* TOUR BACKDROP */}
            {tourStep > 0 && (
                <div className="fixed inset-0 z-[90] bg-slate-900/60 pointer-events-none transition-opacity duration-300" />
            )}

            {/* WELCOME MODAL */}
            {tourStep === 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-4">🤝</div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Welcome to the Collab Hub!</h2>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            This is the space to find active project needs, offer your expertise, and build meaningful partnerships across the civic network.
                            <br/><br/>
                            Would you like a quick tour?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={endTour} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Skip for now</button>
                            <button onClick={startTour} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">Start Tour</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESTART TOUR BUTTON */}
            <button 
                onClick={() => setTourStep(0)} 
                className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-full shadow-lg hover:bg-blue-50 hover:text-blue-600 hover:scale-105 transition-all group" 
                title="Restart Tutorial"
            >
                <span className="text-xl">❓</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible whitespace-nowrap transition-all pointer-events-none">Restart Tutorial</span>
            </button>

        </div>
    );
}