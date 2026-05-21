"use client";

import Link from "next/link";
import {useState, useEffect} from "react";
import {createClient} from "@/utils/supabase/client";
import MiniMapModal from "@/components/MiniMapModal";
import {ContactProfile} from "@/components/ProfileModal";

// --- CORE DATA CONSTANTS ---
const CUNY_LOCATIONS = [
    "Baruch College", "Borough of Manhattan Community College (BMCC)", "Bronx Community College",
    "Brooklyn College", "City College of New York (CCNY)", "College of Staten Island (CSI)",
    "Craig Newmark Graduate School of Journalism", "CUNY Advanced Science Research Center (ASRC)",
    "CUNY Graduate Center", "CUNY Graduate School of Public Health (SPH)",
    "CUNY School of Labor and Urban Studies (SLU)", "CUNY School of Law",
    "CUNY School of Professional Studies (SPS)", "Hostos Community College",
    "Hunter College", "John Jay College of Criminal Justice", "Kingsborough Community College",
    "LaGuardia Community College", "Lehman College", "Macaulay Honors College",
    "Medgar Evers College", "New York City College of Technology (City Tech)",
    "Queens College", "Queensborough Community College", "Stella and Charles Guttman Community College",
    "York College", "Tech Incubator at Queens College", "CUNY Start", "Tech in Residence Corps"
].sort();

const INTEREST_CATEGORIES = [
    "Education & Student Success",
    "Government, Policy & Law",
    "Public Health & Wellness",
    "Community Engagement & Organizing",
    "Economic Development & Labor",
    "Arts, Culture & Humanities",
    "Environment & Sustainability",
    "Technology & Data",
    "Research & Academia",
    "Social Justice & Equity",
    "Urban Planning & Housing",
    "Media, Journalism & Storytelling",
    "Other / Cross-Cutting"
];

// --- INTERFACES ---
interface SavedContact {
    id: string;
    contact: {
        id: string;
        name: string;
        campus: string | null;
        role_title: string | null;
        affiliation: string | null;
        capabilities: string | null;
        notes: string | null;
        email_contact: string | null;
        contact_domains: { domains: { domain_name: string } }[]
    };
}


/**
 * ProfilePage component manages the user's dashboard interface.
 * Features:
 * 1. Edit Profile: Form interface that binds to 'contacts' and integrates a multi-table database relation for micro-tags and communities.
 * 2. Saved Contacts: A secure curated vault storage sync'd with the user's supabase auth account.
 * 
 * Target Audience: Junior developers. Assumes a baseline 4-year CS degree. Focuses on illustrating
 * data normalization, Supabase's non-blocking transaction patterns, caching, and state synchronization.
 */
export default function ProfilePage() {
    // Curated contact entries saved by the logged-in user in their private vault.
    const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
    // Full directory profile list used to initialize local node-edge relations in the MiniMap modal.
    const [allContacts, setAllContacts] = useState<ContactProfile[]>([]);
    // Holds the selected contact mapped onto the active MiniMap overlay view.
    const [activeMapContact, setActiveMapContact] = useState<ContactProfile | null>(null);
    const [isLoadingContacts, setIsLoadingContacts] = useState(true);

    // Profile Visibility State
    const [hasProfile, setHasProfile] = useState(false);
    const [contactId, setContactId] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(true);

    // Dashboard State switching: controls Edit Profile vs. Saved Contacts vault layout.
    const [activeTab, setActiveTab] = useState<"form" | "vault">("form");

    // Form submission processing feedback states.
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    // Smart Tag Taxonomy System State (micro-interests and skills catalog).
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [existingTags, setExistingTags] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Communities Served demographic tags.
    const [communities, setCommunities] = useState<string[]>([]);
    const [communityInput, setCommunityInput] = useState("");

    // Normalized React Form State bindings matching the 'contacts' Supabase table layout.
    const [formData, setFormData] = useState({
        contact_name: "", email: "", campus: "", role_title: "", affiliation: "",
        url: "", capabilities: "", communities_served: "", needs_challenges: "",
        opportunity_ideas: "", notes: "", interest_category: ""
    });

    /**
     * Lifecyle hook executing asynchronous initialization sequences:
     * 1. Fetches current session security credentials to shield against rogue route updates.
     * 2. Resolves private saved list from relational bridge table 'saved_contacts'.
     * 3. Syncs current user's profile card from 'contacts' (locking profile data to session email).
     * 4. Populates suggestions autocomplete buffer from central 'domains' taxonomy table.
     * 5. Pulls full directory to build the cached dataset for the mini-map network visualizer.
     */
    useEffect(() => {
        const fetchData = async () => {
            try {
                const supabase = createClient();

                // 1. Get the user & catch auth errors to prevent the logout bug
                const {data: {user}, error: authError} = await supabase.auth.getUser();

                if (authError || !user) {
                    setSavedContacts([]);
                    setIsLoadingContacts(false);
                    return; // Graceful exit if logged out
                }

                // 2. Fetch the User's Vault Contacts (Relational inner-join query mapping bridge to master records)
                const {data: savedData, error: savedError} = await supabase
                    .from('saved_contacts')
                    .select(`
            id,
            contact:contacts (
              id, name, campus, role_title, affiliation, capabilities, notes, email_contact,
              contact_domains ( domains ( domain_name ) )
            )
          `)
                    .eq('user_id', user.id);

                if (!savedError && savedData) {
                    setSavedContacts(savedData as unknown as SavedContact[]);
                }

                // 3. Fetch User's Profile Visibility Status AND Data
                if (user.email) {
                    setFormData(prev => ({...prev, email: user.email || ""})); // Lock email

                    const {data: contactProfile} = await supabase
                        .from('contacts')
                        .select(`*, contact_domains( domains(domain_name) )`)
                        .eq('email_contact', user.email)
                        .maybeSingle();

                    if (contactProfile) {
                        setHasProfile(true);
                        setContactId(contactProfile.id);
                        setIsPublic(contactProfile.is_public ?? true);

                        // Auto-fill standard fields
                        setFormData({
                            contact_name: contactProfile.name || "",
                            email: contactProfile.email_contact || user.email || "",
                            campus: contactProfile.campus || "",
                            role_title: contactProfile.role_title || "",
                            affiliation: contactProfile.affiliation || "",
                            url: contactProfile.url || "",
                            capabilities: contactProfile.capabilities || "",
                            communities_served: contactProfile.communities_served || "",
                            needs_challenges: "",
                            opportunity_ideas: "",
                            notes: contactProfile.notes || "",
                            interest_category: contactProfile.interest_category || ""
                        });

                        // Auto-fill Communities
                        if (contactProfile.communities_served) {
                            setCommunities(contactProfile.communities_served.split(',').map((s: string) => s.trim()).filter(Boolean));
                        }

                        // Auto-fill Micro-Tags
                        if (contactProfile.contact_domains) {
                            const existingProfileTags = contactProfile.contact_domains.map((cd: {
                                domains: { domain_name: string }
                            }) => cd.domains?.domain_name).filter(Boolean);
                            setTags(existingProfileTags);
                        }
                    }
                }

                // 4. NEW: Fetch all existing domains for the autofill system to drive input autocomplete UI
                const {data: domainsData} = await supabase
                    .from('domains')
                    .select('domain_name');

                if (domainsData) {
                    // Extract just the string names and remove any empty ones
                    const formattedTags = domainsData.map(d => d.domain_name).filter(Boolean);
                    setExistingTags(formattedTags);
                }

                // 5. NEW: Fetch entire network directory to power the Mini-Map
                const {data: allContactsData} = await supabase
                    .from('contacts')
                    .select(`*, contact_domains (domains (domain_name))`)
                    .eq('is_public', true);

                if (allContactsData) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const formatted = allContactsData.map((c: any) => ({
                        ...c,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        domains: c.contact_domains?.map((cd: any) => cd.domains?.domain_name).filter(Boolean) || []
                    }));
                    setAllContacts(formatted);
                }

            } catch (e) {
                console.error("Failed to load data", e);
            } finally {
                setIsLoadingContacts(false);
            }
        };
        fetchData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({...formData, [e.target.name]: e.target.value});
    };

    const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const newTag = tagInput.trim();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const handleAddCommunity = (newComm: string) => {
        const trimmed = newComm.trim();
        if (trimmed && !communities.includes(trimmed)) {
            setCommunities([...communities, trimmed]);
        }
        setCommunityInput("");
    };

    const removeCommunity = (commToRemove: string) => {
        setCommunities(communities.filter(c => c !== commToRemove));
    };

    const handleRemoveSavedContact = async (savedContactId: string) => {
        if (!window.confirm("Remove this contact from your vault?")) return;

        try {
            const supabase = createClient();
            const {error} = await supabase
                .from('saved_contacts')
                .delete()
                .eq('id', savedContactId);

            if (error) throw error;

            // Instantly remove it from the UI
            setSavedContacts(prev => prev.filter(c => c.id !== savedContactId));
        } catch (err) {
            console.error("Failed to remove saved contact:", err);
            alert("Could not remove contact. Please try again.");
        }
    };

    /**
     * Toggles the user profile card's visibility state (`is_public`) in the public contacts directory.
     * Prevents database corruption or session mismatches by querying against the locked authenticated email.
     */
    const handleToggleVisibility = async () => {
        if (!formData.email) return;
        setIsSubmitting(true);
        setSubmitStatus("idle");

        try {
            const supabase = createClient();
            const newVisibility = !isPublic;

            const {data, error} = await supabase
                .from('contacts')
                .update({is_public: newVisibility})
                .eq('email_contact', formData.email) // Foolproof match against locked email
                .select(); // Removed .single() to prevent crashes

            if (error) throw error;
            if (!data || data.length === 0) throw new Error("Could not find matching profile to update.");

            setIsPublic(newVisibility);
        } catch (error: unknown) {
            const err = error as { message?: string; details?: string };
            const errorMsg = err?.message || err?.details || String(error);
            console.error("Error details:", errorMsg);
            setErrorMessage(errorMsg || "An unexpected error occurred.");
            setSubmitStatus("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Profile Update Form Submission pipeline.
     * Implements a transactional synchronizer using a secure sequential pipeline:
     * 1. Compiles secondary fields (Needs, Challenges, Opportunities) into the single 'notes' text block.
     * 2. Upserts the 'contacts' record (using onConflict: id).
     * 3. Executes the "Wipe-and-Replace" tag synchronization strategy for relational micro-tags:
     *    a) Wipes all old bridge associations in 'contact_domains' for the 'contact_id'.
     *    b) Upserts new domains to the shared lookup directory 'domains', ignoring duplicate names.
     *    c) Fetches resolved IDs from the global 'domains' table matching current tag lists.
     *    d) Bulks inserts linking rows back into 'contact_domains' mapping 'contact_id' -> 'domain_id'.
     * 4. Auto-links the created profile record inside the auth metadata 'users' table via 'linked_contact_id'.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.interest_category) {
            setErrorMessage("Please select a Primary Interest Category.");
            setSubmitStatus("error");
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus("idle");

        let combinedNotes = formData.notes;
        if (formData.needs_challenges) combinedNotes += `\n\n[Needs/Challenges]: ${formData.needs_challenges}`;
        if (formData.opportunity_ideas) combinedNotes += `\n\n[Opportunities]: ${formData.opportunity_ideas}`;

        try {
            const supabase = createClient();
            const generatedContactId = contactId || crypto.randomUUID(); // Use existing ID if they have one

            // 1. Upsert the person
            const {data: newContact, error: contactError} = await supabase
                .from('contacts')
                .upsert([{
                    id: generatedContactId,
                    name: formData.contact_name,
                    email_contact: formData.email,
                    campus: formData.campus,
                    role_title: formData.role_title,
                    affiliation: formData.affiliation,
                    url: formData.url,
                    capabilities: formData.capabilities,
                    communities_served: communities.join(', '), // NEW: Saves communities as string
                    notes: combinedNotes.trim(),
                    interest_category: formData.interest_category,
                    is_public: hasProfile ? isPublic : true // Keeps current visibility if editing
                }], {onConflict: 'id'})
                .select('id')
                .single();

            if (contactError) throw contactError;

            // 2. Handle the Smart Tags (Wipe & Replace Strategy)
            if (newContact) {
                // Wipe old tags to ensure perfect sync if user removed any
                await supabase.from('contact_domains').delete().eq('contact_id', newContact.id);

                if (tags.length > 0) {
                    const domainsToInsert = tags.map(t => ({domain_name: t}));
                    const {error: domainErr} = await supabase.from('domains').upsert(domainsToInsert, {
                        onConflict: 'domain_name',
                        ignoreDuplicates: true
                    });

                    if (domainErr) throw new Error("Failed to save domains: " + domainErr.message);

                    const {data: domainRecords} = await supabase
                        .from('domains')
                        .select('id, domain_name')
                        .in('domain_name', tags);

                    if (domainRecords && domainRecords.length > 0) {
                        const bridgeInserts = domainRecords.map(d => ({
                            contact_id: newContact.id,
                            domain_id: d.id
                        }));
                        // Just insert since we wiped the old ones clean
                        const {error: bridgeErr} = await supabase.from('contact_domains').insert(bridgeInserts);
                        if (bridgeErr) throw new Error("Failed to link domains: " + bridgeErr.message);
                    }
                }
            }

            // --- NEW FIX: Link the profile to the user table ---
            const {data: {user: currentUser}} = await supabase.auth.getUser();
            if (currentUser && newContact) {
                const {error: userUpdateError} = await supabase
                    .from('users')
                    .upsert({
                        id: currentUser.id,
                        linked_contact_id: newContact.id,
                        email: currentUser.email, // Safe to include
                        name: formData.contact_name // Optional, syncs their name
                    });

                if (userUpdateError) {
                    console.error("Failed to link profile to user:", userUpdateError);
                    // You might want to throw here, but logging is safer to not break the UI
                }
            }
// ---------------------------------------------------

            setSubmitStatus("success");
            setHasProfile(true);
            if (newContact) setContactId(newContact.id);

            setFormData({
                contact_name: "", email: "", campus: "", role_title: "", affiliation: "",
                url: "", capabilities: "", communities_served: "", needs_challenges: "",
                opportunity_ideas: "", notes: "", interest_category: ""
            });
            setTags([]);
            window.scrollTo(0, 0);

        } catch (error: unknown) {
            const err = error as { message?: string; details?: string };
            const errorMsg = err?.message || err?.details || String(error);
            console.error("Error details:", errorMsg);
            setErrorMessage(errorMsg || "An unexpected error occurred.");
            setSubmitStatus("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddTag = (newTag: string) => {
        const trimmed = newTag.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
        }
        setTagInput("");
        setShowSuggestions(false);
    };


    return (
        // UPDATED: h-screen to h-full
        <div className="flex flex-col md:flex-row h-full w-full bg-slate-50 overflow-hidden font-sans">

            {/* SIDEBAR */}
            <div
                className="md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
                <div
                    className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between md:flex-col md:items-start md:space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">User Dashboard</h2>
                </div>

                <div className="flex md:flex-col p-2 md:p-4 gap-2 overflow-x-auto md:overflow-visible">
                    <button onClick={() => setActiveTab("form")}
                            className={`flex-1 md:flex-none text-left px-4 py-3 text-sm font-bold rounded-lg transition-colors whitespace-nowrap ${activeTab === "form" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>✍️
                        Edit Profile
                    </button>
                    <button onClick={() => setActiveTab("vault")}
                            className={`flex-1 md:flex-none text-left px-4 py-3 text-sm font-bold rounded-lg transition-colors whitespace-nowrap flex justify-between items-center ${activeTab === "vault" ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"}`}>
                        <span>⭐ Saved Contacts</span>
                        <span
                            className="bg-slate-200 text-slate-600 py-0.5 px-2 rounded-full text-[10px] ml-2">{savedContacts.length}</span>
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
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
                                <div
                                    className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <span className="text-4xl mb-4 block">📭</span>
                                    <p className="text-slate-500 font-medium text-lg">Your vault is empty.</p>
                                    <p className="text-sm text-slate-400 mt-2">Go to the Workspace and click &quot;Save
                                        Contact&quot; to build your network.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {savedContacts.map((item) => (
                                        <div key={item.id}
                                             className="p-5 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col relative group">

                                            <h3 className="text-lg font-bold text-blue-900">{item.contact.name}</h3>
                                            <p className="text-sm font-medium text-slate-600 mb-2">{item.contact.campus} | {item.contact.role_title}</p>

                                            {item.contact.affiliation && <p className="text-sm text-slate-700"><span
                                                className="font-semibold">🏢 Title:</span> {item.contact.affiliation}
                                            </p>}
                                            {item.contact.contact_domains && item.contact.contact_domains.length > 0 &&
                                                <p className="text-sm text-slate-700"><span
                                                    className="font-semibold">🎯 Focus:</span> {item.contact.contact_domains.map(cd => cd.domains?.domain_name).filter(Boolean).join(", ")}
                                                </p>}

                                            {item.contact.capabilities && <p className="text-sm text-slate-700"><span
                                                className="font-semibold">🛠️ Skillset:</span> {item.contact.capabilities}
                                            </p>}

                                            {item.contact.notes && (
                                                <div
                                                    className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                                                    <p className="text-sm text-slate-600 italic">
                                                        <span
                                                            className="font-semibold not-italic text-slate-700">📝 Notes:</span> {item.contact.notes}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="mt-auto pt-4 flex flex-wrap">
                                                <button
                                                    onClick={() => handleRemoveSavedContact(item.id)}
                                                    className="mt-4 mr-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 px-4 py-1.5 rounded-lg hover:bg-rose-600 hover:text-white font-semibold transition-all"
                                                >
                                                    🗑️ Remove Contact
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        if (!item.contact.email_contact) {
                                                            alert(`No public email address is listed for ${item.contact.name}.`);
                                                            return;
                                                        }
                                                        const subject = encodeURIComponent(`Connecting via INI Civic Network`);
                                                        const body = encodeURIComponent(`Hi ${item.contact.name},\n\nI found your profile on the INI Civic Network and would love to connect to discuss potential collaboration.\n\nBest,\n[Your Name]`);
                                                        window.location.href = `mailto:${item.contact.email_contact}?subject=${subject}&body=${body}`;
                                                    }}
                                                    className="mt-4 mr-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white font-semibold transition-all"
                                                >
                                                    ✉️ Connect
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        const mappedContact: ContactProfile = {
                                                            ...item.contact,
                                                            domains: item.contact.contact_domains?.map((cd) => cd.domains?.domain_name).filter(Boolean) || []
                                                        };
                                                        setActiveMapContact(mappedContact);
                                                    }}
                                                    className="mt-4 text-sm text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white font-semibold transition-all"
                                                >
                                                    🗺️ View Connections Map
                                                </button>
                                            </div>
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
                                <h1 className="text-3xl font-bold text-slate-800 mb-2">Directory Profile</h1>
                                <p className="text-slate-600">Manage your public civic profile so collaborators can find
                                    you.</p>
                            </div>

                            {/* NEW: VISIBILITY TOGGLE */}
                            {hasProfile && (
                                <div
                                    className="mb-6 p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between bg-slate-50 border-slate-200 shadow-sm">
                                    <div className="mb-4 sm:mb-0 text-center sm:text-left">
                                        <p className="font-bold text-slate-700">
                                            Directory Status: {isPublic ?
                                            <span className="text-emerald-600">Visible</span> :
                                            <span className="text-slate-400">Hidden</span>}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">Control whether your profile card
                                            appears on the Map.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleToggleVisibility}
                                        disabled={isSubmitting}
                                        className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${isPublic ? "bg-rose-100 text-rose-700 hover:bg-rose-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                                    >
                                        {isPublic ? "Unpublish Profile" : "Publish Profile"}
                                    </button>
                                </div>
                            )}

                            {submitStatus === "success" && (
                                <div
                                    className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-medium flex items-center">
                                    <span className="text-xl mr-3">✅</span> Profile successfully published to the Civic
                                    Network!
                                </div>
                            )}

                            {submitStatus === "error" && (
                                <div
                                    className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl font-medium">
                                    ❌ Error: {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}
                                  className="space-y-8 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">

                                {/* Core Identity */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest border-b pb-2">Core
                                        Identity</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name
                                                *</label>
                                            <input required name="contact_name" value={formData.contact_name}
                                                   onChange={handleInputChange}
                                                   className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Email /
                                                LinkedIn *</label>
                                            <input required name="email" value={formData.email} readOnly
                                                   title="Change your email through your account settings."
                                                   className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-100 text-slate-500 outline-none cursor-not-allowed"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Role /
                                                Title</label>
                                            <input name="role_title" value={formData.role_title}
                                                   onChange={handleInputChange}
                                                   className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Campus /
                                                Location *</label>
                                            <input required name="campus" list="campus-options" value={formData.campus}
                                                   onChange={handleInputChange}
                                                   placeholder="Search or type new location..."
                                                   className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                                   autoComplete="off"/>
                                            <datalist id="campus-options">
                                                {CUNY_LOCATIONS.map((loc) => <option key={loc} value={loc}/>)}
                                            </datalist>
                                        </div>

                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Program / Org
                                                Affiliation</label>
                                            <input name="affiliation" value={formData.affiliation}
                                                   onChange={handleInputChange}
                                                   className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                                        </div>
                                    </div>
                                </div>

                                {/* TAXONOMY SYSTEM */}
                                <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">Network
                                        Discovery</h3>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Primary Interest
                                            Category *</label>
                                        <p className="text-[10px] text-slate-500 mb-2">This determines how you appear on
                                            the high-level ecosystem map.</p>
                                        <select required name="interest_category" value={formData.interest_category}
                                                onChange={handleInputChange}
                                                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                            <option value="">Select a core category...</option>
                                            {INTEREST_CATEGORIES.map(cat => <option key={cat}
                                                                                    value={cat}>{cat}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Specific
                                            Interests & Expertise (Micro-Tags)</label>
                                        <p className="text-[10px] text-slate-500 mb-2">Type specific topics and
                                            press <b>Enter</b> to add.</p>

                                        {/* NEW: AUTOCOMPLETE TAG SYSTEM */}
                                        <div className="relative">
                                            <div
                                                className="border border-slate-300 rounded-lg p-2 bg-white flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                                                {tags.map(tag => (
                                                    <span key={tag}
                                                          className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2.5 py-1 rounded text-xs font-bold shadow-sm">
                            {tag}
                                                        <button type="button" onClick={() => removeTag(tag)}
                                                                className="hover:text-red-600 focus:outline-none">✕</button>
                          </span>
                                                ))}
                                                <input
                                                    type="text"
                                                    value={tagInput}
                                                    onChange={(e) => {
                                                        setTagInput(e.target.value);
                                                        setShowSuggestions(true);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === ",") {
                                                            e.preventDefault();
                                                            if (tagInput) handleAddTag(tagInput);
                                                        }
                                                    }}
                                                    onFocus={() => setShowSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                    placeholder={tags.length === 0 ? "Type a tag and press Enter..." : ""}
                                                    className="flex-1 outline-none text-sm min-w-[120px] bg-transparent"
                                                />
                                            </div>

                                            {/* Dropdown Menu */}
                                            {showSuggestions && tagInput.trim() !== "" && (
                                                <ul className="absolute z-50 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                                                    {existingTags
                                                        .filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
                                                        .slice(0, 6) // Limit to top 6 suggestions
                                                        .map(matchedTag => (
                                                            <li
                                                                key={matchedTag}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault(); // Prevents input blur from firing before click registers
                                                                    handleAddTag(matchedTag);
                                                                }}
                                                                className="p-3 hover:bg-blue-50 hover:text-blue-700 cursor-pointer text-sm font-bold text-slate-700 border-b border-slate-50 last:border-0 transition-colors"
                                                            >
                                                                {matchedTag}
                                                            </li>
                                                        ))}

                                                    {/* Allow them to clearly see they are creating a new tag */}
                                                    {!existingTags.some(t => t.toLowerCase() === tagInput.toLowerCase()) && (
                                                        <li className="p-3 text-sm text-slate-500 italic bg-slate-50">
                                                            Press Enter to create new tag: <span
                                                            className="font-bold text-slate-700">&quot;{tagInput}&quot;</span>
                                                        </li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Extended Details */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest border-b pb-2">Extended
                                        Details</h3>
                                    <div className="space-y-6">

                                        {/* NEW: COMMUNITIES SERVED TAG SYSTEM */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Communities
                                                Served</label>
                                            <p className="text-[10px] text-slate-500 mb-2">Type a demographic or
                                                community and press <b>Enter</b>.</p>
                                            <div
                                                className="border border-slate-300 rounded-lg p-2 bg-white flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                                                {communities.map(comm => (
                                                    <span key={comm}
                                                          className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2.5 py-1 rounded text-xs font-bold shadow-sm">
                                                        {comm}
                                                        <button type="button" onClick={() => removeCommunity(comm)}
                                                                className="hover:text-red-600 focus:outline-none">✕</button>
                                                    </span>
                                                ))}
                                                <input
                                                    type="text"
                                                    value={communityInput}
                                                    onChange={(e) => setCommunityInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === ",") {
                                                            e.preventDefault();
                                                            if (communityInput) handleAddCommunity(communityInput);
                                                        }
                                                    }}
                                                    placeholder={communities.length === 0 ? "e.g., Disabled Students, Bronx residents..." : ""}
                                                    className="flex-1 outline-none text-sm min-w-[150px] bg-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Capabilities
                                                / Expertise</label>
                                            <textarea name="capabilities" value={formData.capabilities}
                                                      onChange={handleInputChange} rows={2}
                                                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Notes /
                                                Insights</label>
                                            <textarea name="notes" value={formData.notes} onChange={handleInputChange}
                                                      rows={3}
                                                      className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting}
                                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all ${isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl"}`}>
                                    {hasProfile ? "💾 Save Profile Updates" : "🚀 Publish Profile"}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* MAP MODAL OVERLAY */}
            {activeMapContact && (
                <MiniMapModal
                    initialContact={activeMapContact}
                    allContacts={allContacts}
                    onClose={() => setActiveMapContact(null)}
                    onSaveContact={async (id) => {
                        try {
                            const supabase = createClient();
                            const {data: {user}} = await supabase.auth.getUser();

                            if (!user) return alert("You must be logged in to save contacts.");

                            const {data: existing} = await supabase
                                .from('saved_contacts')
                                .select('id')
                                .eq('contact_id', id)
                                .eq('user_id', user.id)
                                .maybeSingle();

                            if (existing) return alert(`⭐ This contact is already in your vault!`);

                            const {error} = await supabase.from('saved_contacts').insert([{
                                contact_id: id,
                                user_id: user.id
                            }]);
                            if (error) throw error;
                            alert(`⭐ Saved contact to your vault!`);
                        } catch (e) {
                            console.error("Failed to save contact", e);
                        }
                    }}
                />
            )}
        </div>
    );
}