"use client";

/**
 * Directory Page
 * 
 * Implements a searchable and filterable database view of CUNY and Community Partner contacts.
 * Incorporates:
 * 1. URL search parameter extraction ('?q=...') to pre-fill search terms.
 * 2. Supabase Integration for real-time contact retrieval.
 * 3. HSL customized folder dropdown filtering based on hierarchical focus domains.
 * 4. Progressive disclosure modals featuring 2D force-directed interactive connection maps.
 * 5. Persistent local-storage onboarding guides.
 */

import Link from "next/link";
import {useState, useEffect, useMemo, useRef, Suspense} from "react";
import {useSearchParams} from "next/navigation";
import MiniMapModal from "@/components/MiniMapModal";
import {createClient} from '@/utils/supabase/client';

// Mapping dictionary for keywords to group miscellaneous skills and domains into standard folder buckets
const INTEREST_BUCKETS: Record<string, string[]> = {
    "Education & Student Success": ["Education", "Youth", "Mentorship", "K-12", "Curriculum", "Pedagogy", "Schools", "Student", "Teaching", "Learning"],
    "Government, Policy & Law": ["Justice", "Policy", "Government", "Law", "Advocacy", "Human Rights", "Criminal", "Immigration", "Police", "Voting", "Civic"],
    "Public Health & Wellness": ["Health", "Wellness", "Medicine", "Mental Health", "Public Health", "Care", "Disability", "Nursing"],
    "Community Engagement & Organizing": ["Community", "Engagement", "Outreach", "Organizing", "Neighborhood", "Housing", "Mutual Aid", "Volunteer"],
    "Economic Development & Labor": ["Economic", "Workforce", "Labor", "Employment", "Finance", "Business", "Career", "Poverty", "Industry"],
    "Arts, Culture & Humanities": ["Arts", "Media", "Culture", "Design", "History", "Literature", "Theater", "Music", "Journalism", "Communication"],
    "Environment & Sustainability": ["Environment", "Sustainability", "Climate", "Food Security", "Food Justice", "Food Policy", "Ecology", "Energy", "Green", "Urban Planning"],
    "Technology & Data": ["Technology", "Data", "Innovation", "AI", "Digital", "Engineering", "Computer Science", "STEM", "Tech", "Cyber"],
    "Research & Academia": ["Research", "Social Science", "Sociology", "Psychology", "Anthropology", "Evaluation", "Data Collection", "Study"],
    "Social Justice & Equity": [],
    "Urban Planning & Housing": [],
    "Media, Journalism & Storytelling": []
};

// Strongly-typed interface representing the database schema for a network contact
export interface Contact {
    id: string;
    name: string;
    campus?: string | null;
    role_title?: string | null;
    affiliation?: string | null;
    capabilities?: string | null;
    communities_served?: string | null;
    notes?: string | null;
    email_contact?: string | null;
    url?: string | null;
    domains: string[];
}

/**
 * InfoTooltip Component
 * Implements modern micro-interactions (hover, transitions) providing rich contextual guidance.
 */
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
 * FolderDropdown Component
 * Implements a collapsible multi-level dropdown resembling directory files and folders.
 */
const FolderDropdown = ({groups, selected, onChange}: {
    groups: Record<string, string[]>,
    selected: string,
    onChange: (val: string) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Event listener capturing document clicks to close dropdown instances when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleFolder = (folder: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents close behaviors bubbling to parent triggers
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folder)) next.delete(folder);
            else next.add(folder);
            return next;
        });
    };

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full border-[1.5px] border-slate-500 rounded-lg p-2.5 text-sm bg-white text-slate-900 text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500 outline-none"
            >
                <span className="truncate font-medium">{selected === "All" ? "All Focus Areas" : selected}</span>
                <span className="text-xs text-slate-400">▼</span>
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 w-full mt-1 bg-white border-[1.5px] border-slate-500 rounded-lg shadow-xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    <button
                        onClick={() => handleSelect("All")}
                        className={`w-full text-left p-3 text-sm font-bold border-b border-slate-100 hover:bg-slate-50 transition-colors ${selected === "All" ? "text-blue-600 bg-blue-50/50" : "text-slate-700"}`}
                    >
                        All Focus Areas
                    </button>

                    {Object.entries(groups).map(([folder, items]) => (
                        <div key={folder} className="border-b border-slate-50 last:border-0">
                            <button
                                onClick={(e) => toggleFolder(folder, e)}
                                className="w-full text-left p-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex justify-between items-center transition-colors"
                            >
                                <span className="truncate pr-2">📁 {folder}</span>
                                <span
                                    className="text-slate-400 text-[10px]">{expandedFolders.has(folder) ? "▲" : "▼"}</span>
                            </button>

                            {expandedFolders.has(folder) && (
                                <div className="bg-slate-50/80 pb-2 border-t border-slate-100/50">
                                    {items.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => handleSelect(item)}
                                            className={`w-full text-left pl-9 pr-3 py-2 text-sm hover:bg-blue-50 transition-colors ${selected === item ? "text-blue-700 font-bold bg-blue-50" : "text-slate-600 font-medium"}`}
                                        >
                                            {item}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/**
 * DirectoryClient Component
 * Main search, filter, and rendering logic block.
 * Encapsulated to run safely below dynamic URL routing boundaries.
 */
export default function DirectoryClient({ initialContacts }: { initialContacts: Contact[] }) {
    const searchParams = useSearchParams();
    
    // Read the query parameter 'q' to pre-load queries from the landing page
    const query = searchParams.get("q") || "";

    // master list state storing un-filtered network records fetched from Supabase
    const [allContacts, setAllContacts] = useState<Contact[]>(initialContacts);
    const [isLoading, setIsLoading] = useState(false);
    
    // Filtering states
    const [searchQuery, setSearchQuery] = useState(query);
    const [selectedCampus, setSelectedCampus] = useState("All");
    const [selectedFocus, setSelectedFocus] = useState("All");

    // Tracks selected contact to map on interactive Modal
    const [activeMapContact, setActiveMapContact] = useState<Contact | null>(null);

    // Tour onboarding step tracking (-1 represents not visible, 0 is welcome, >0 is active steps)
    const [tourStep, setTourStep] = useState<number>(-1);

    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Track active user login state dynamically
    useEffect(() => {
        const supabase = createClient();
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setIsLoggedIn(!!user);
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setIsLoggedIn(!!session?.user);
            }
        );
        return () => subscription.unsubscribe();
    }, []);

    // Listen for AI Copilot inspect-profile click requests globally
    useEffect(() => {
        const handleInspectEvent = (e: Event) => {
            const customEvent = e as CustomEvent<{ name: string }>;
            const name = customEvent.detail.name;
            const found = allContacts.find(c => c.name === name);
            if (found) {
                setActiveMapContact(found);
            }
        };
        window.addEventListener("inspect-profile", handleInspectEvent);
        return () => window.removeEventListener("inspect-profile", handleInspectEvent);
    }, [allContacts]);

    // Initial effect executing local-storage onboarding logic checks
    useEffect(() => {
        const hasVisitedBefore = localStorage.getItem("hasVisitedBefore");
        const hasSeen = localStorage.getItem("hasSeenTutorial");
        if (!hasVisitedBefore) {
            localStorage.setItem("hasVisitedBefore", "true");
            if (!hasSeen) {
                setTourStep(0); // Prompt modal only if it is the very first visit/session
            }
        }
    }, []);

    const startTour = () => setTourStep(1);
    const endTour = () => {
        setTourStep(-1);
        localStorage.setItem("hasSeenTutorial", "true");
    };

    // Synchronizes searchQuery when navigating or when the query parameters update in the browser URL bar
    useEffect(() => {
        if (query) {
            setSearchQuery(query);
        }
    }, [query]);

    // Perform filter computations client-side. Memoized to optimize render frequencies
    const displayedContacts = useMemo(() => {
        return allContacts.filter((person) => {
            const keywordMatch = searchQuery === "" ||
                (person.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (person.affiliation?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (person.notes?.toLowerCase() || "").includes(searchQuery.toLowerCase());

            const campusMatch = selectedCampus === "All" || person.campus === selectedCampus;

            let focusMatch = selectedFocus === "All";
            if (selectedFocus !== "All" && person.domains && person.domains.length > 0) {
                focusMatch = person.domains.includes(selectedFocus);
            }

            return keywordMatch && campusMatch && focusMatch;
        });
    }, [allContacts, searchQuery, selectedCampus, selectedFocus]);

    // Extract unique campuses and focus domains from the dataset dynamically to generate UI selectors
    const uniqueCampuses = Array.from(new Set(allContacts.map(c => c.campus).filter(Boolean))).sort();
    const uniqueFocusAreas = Array.from(new Set(allContacts.flatMap(c => c.domains))).filter(Boolean).sort();

    // Categorization logic parsing focus domains into hierarchical folders
    const groupedFocusAreas = useMemo(() => {
        const groups: Record<string, string[]> = {
            "Education & Student Success": [],
            "Government, Policy & Law": [],
            "Public Health & Wellness": [],
            "Community Engagement & Organizing": [],
            "Economic Development & Labor": [],
            "Arts, Culture & Humanities": [],
            "Environment & Sustainability": [],
            "Technology & Data": [],
            "Research & Academia": [],
            "Social Justice & Equity": [],
            "Urban Planning & Housing": [],
            "Media, Journalism & Storytelling": [],
            "Other / Cross-Cutting": []
        };

        uniqueFocusAreas.forEach(focus => {
            let placed = false;
            // Iterate over standard interest categories searching for keyword inclusions
            for (const [category, keywords] of Object.entries(INTEREST_BUCKETS)) {
                if (keywords.some(kw => (focus as string).toLowerCase().includes(kw.toLowerCase()))) {
                    groups[category].push(focus as string);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                groups["Other / Cross-Cutting"].push(focus as string);
            }
        });

        // Filter out categories that didn't receive any dynamic matching records
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) delete groups[key];
        });

        return groups;
    }, [uniqueFocusAreas]);

    return (
        <div className="flex h-full w-full bg-slate-50 overflow-hidden font-sans relative">

            {/* DIRECTORY LISTING */}
            <div className="w-full h-full p-8 overflow-y-auto bg-white">
                <span className="ml-2 text-[10px] md:text-xs font-medium text-blue-500">
                   INI.network maps publicly available information about subject matter expertise of CUNY individuals and resources to make collaboration across CUNY and NYC easier. Inclusion does not imply affiliation nor endorsement of INI. <strong>If your information is inaccurate or if you want your information removed please contact the INI director at: jaime@vngle.com.</strong>
               </span>
               <br/>
               <br/>
                {/* Filters Input Panel */}
                <div className={`relative rounded-xl transition-all duration-300 ${tourStep === 1 ? 'z-[100] bg-white p-4 shadow-2xl ring-4 ring-blue-400/50 -m-4 mb-2' : 'mb-6'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                            <label className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center">
                                Campus
                                <InfoTooltip text="Filter the directory to only show contacts affiliated with a specific CUNY campus." />
                            </label>
                            <select
                                className="border border-slate-200 rounded-lg p-2 text-sm bg-white"
                                value={selectedCampus}
                                onChange={(e) => setSelectedCampus(e.target.value)}
                            >
                                <option value="All">All CUNY Campuses</option>
                                {uniqueCampuses.map(campus => (
                                    <option key={campus as string} value={campus as string}>{campus as string}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center">
                                Focus Area
                                <InfoTooltip text="Select a primary field of work or interest to find specialized professionals." />
                            </label>
                            <FolderDropdown
                                groups={groupedFocusAreas}
                                selected={selectedFocus}
                                onChange={setSelectedFocus}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 flex flex-col">
                            <label className="text-xs font-bold uppercase text-slate-400 mb-1 flex items-center">
                                Keyword Search
                                <InfoTooltip text="Search across names, organizations, capabilities, and notes to find exact matches." />
                            </label>
                            <input
                                type="text"
                                placeholder="Search names, orgs, or notes..."
                                className="border border-slate-200 rounded-lg p-2 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {tourStep === 1 && (
                        <div className="absolute top-full left-0 mt-4 bg-white rounded-xl shadow-xl p-5 w-80 z-[101] animate-in fade-in slide-in-from-top-4 border border-blue-100">
                            <h3 className="font-bold text-blue-900 mb-2">1. Powerful Filters</h3>
                            <p className="text-sm text-slate-600 mb-4">Quickly narrow down the directory by selecting a specific campus, focus area, or typing keywords.</p>
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

                {/* Main Cards Listing container */}
                <div className={`relative rounded-xl transition-all duration-300 ${tourStep === 2 ? 'z-[100] bg-white p-4 shadow-2xl ring-4 ring-blue-400/50 -m-4' : ''}`}>
                    <h2 className="text-xl font-semibold mb-4 text-slate-700 flex items-center">
                        🗂️ Civic Directory
                        <InfoTooltip text="This is the main list of contacts matching your filters. You can save them to your vault or view their network map." />
                    </h2>

                    {tourStep === 2 && (
                        <div className="absolute top-0 right-0 -mt-4 bg-white rounded-xl shadow-xl p-5 w-80 z-[101] animate-in fade-in slide-in-from-right-4 border border-blue-100">
                            <h3 className="font-bold text-blue-900 mb-2">2. Discover & Connect</h3>
                            <p className="text-sm text-slate-600 mb-4">Browse profiles, save important contacts to your personal vault, or reach out directly to collaborate.</p>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400">Step 2 of 3</span>
                                <div className="flex gap-2">
                                    <button onClick={endTour} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2">Skip</button>
                                    <button onClick={() => setTourStep(3)} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700">Next</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Directory Cards Rendering Pipeline */}
                    {isLoading ? (
                        <div className="bg-slate-50 border border-slate-200 text-slate-600 p-8 rounded-xl text-center flex flex-col items-center justify-center">
                            <div className="flex space-x-2 mb-4">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <p className="font-medium text-slate-500">Loading directory...</p>
                        </div>
                    ) : displayedContacts.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 text-slate-600 p-6 rounded-xl text-center">
                            <p className="font-medium">No contacts match your filters.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 pb-8">
                            <p className="text-sm text-slate-500">Showing {displayedContacts.length} Matches</p>

                            {displayedContacts.slice(0, isLoggedIn ? 50 : 6).map((person, index) => {
                                 if (!isLoggedIn && index === 5) {
                                     return (
                                         <div key="premium-gate-card" className="relative overflow-hidden bg-slate-900 text-white rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center text-center border border-slate-800 min-h-[320px] transition-all hover:shadow-2xl">
                                             {/* Decorative Background Shapes */}
                                             <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900 to-indigo-900/40 opacity-70 pointer-events-none" />
                                             <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />
                                             <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
                                             
                                             <div className="relative z-10 max-w-lg flex flex-col items-center">
                                                 <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center text-3xl mb-4 border border-blue-500/20 shadow-inner animate-pulse">
                                                     🔒
                                                 </div>
                                                 <h3 className="text-2xl font-black tracking-tight mb-2 bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent">Unlock the Civic Directory</h3>
                                                 <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                                                     You are viewing a guest preview of the network. Log in or create a free account to browse all <span className="font-bold text-blue-300">{displayedContacts.length} available contacts</span>, access secure connection maps, and connect directly with civic leaders.
                                                 </p>
                                                 <Link
                                                     href="/login"
                                                     className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-extrabold px-8 py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                                                 >
                                                     Log In / Sign Up
                                                 </Link>
                                             </div>
                                         </div>
                                     );
                                 }

                                 return (
                                     <div key={index}
                                          className="p-5 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                         <h3 className="text-lg font-bold text-blue-900">{person.name}</h3>
                                         <p className="text-sm text-slate-600 font-medium mb-2">{person.campus} | {person.role_title}</p>
                                         {person.affiliation && <p className="text-sm text-slate-700"><span
                                             className="font-semibold">🏢 Title:</span> {person.affiliation}</p>}
                                         {person.domains && person.domains.length > 0 &&
                                             <p className="text-sm text-slate-700"><span
                                                 className="font-semibold">🎯 Focus:</span> {person.domains.join(", ")}</p>}

                                         {person.capabilities && <p className="text-sm text-slate-700"><span
                                             className="font-semibold">🛠️ Skillset:</span> {person.capabilities}</p>}

                                         {person.notes && (
                                             <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                 <p className="text-sm text-slate-600 italic">
                                                     <span
                                                         className="font-semibold not-italic text-slate-700">📝 Notes:</span> {person.notes}
                                                 </p>
                                             </div>
                                         )}

                                         {/* Save Bookmark Action */}
                                         <button
                                             onClick={async () => {
                                                 try {
                                                     const supabase = createClient();
                                                     const { data: { user } } = await supabase.auth.getUser();

                                                     if (!user) {
                                                         alert("You must be logged in to save contacts.");
                                                         return;
                                                     }

                                                     // Insert save record, checking Supabase unique constraint violations
                                                     const {error} = await supabase
                                                         .from('saved_contacts')
                                                         .insert([{contact_id: person.id, user_id: user.id}]);

                                                     if (error) {
                                                         if (error.code === '23505') {
                                                             alert(`⭐ ${person.name} is already in your vault!`);
                                                             return;
                                                         }
                                                         throw error;
                                                     }
                                                     alert(`⭐ Saved ${person.name} to your vault!`);
                                                 } catch (e) {
                                                     console.error("Failed to save contact", e);
                                                     alert("Could not save contact right now.");
                                                 }
                                             }}
                                             className="mt-4 mr-2 text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white font-semibold transition-all"
                                         >
                                             ⭐ Save Contact
                                         </button>

                                         {/* Direct Mail Integration */}
                                         <button
                                             onClick={() => {
                                                 if (!person.email_contact) {
                                                     alert(`No public email address is listed for ${person.name}.`);
                                                     return;
                                                 }
                                                 const subject = encodeURIComponent(`Connecting via INI Civic Network`);
                                                 const body = encodeURIComponent(`Hi ${person.name},\n\nI found your profile on the INI Civic Network and would love to connect to discuss potential collaboration.\n\nBest,\n[Your Name]`);
                                                 window.location.href = `mailto:${person.email_contact}?subject=${subject}&body=${body}`;
                                             }}
                                             className="mt-4 mr-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-lg hover:bg-emerald-600 hover:text-white font-semibold transition-all"
                                         >
                                             ✉️ Connect
                                         </button>

                                         {/* Trigger connection mapping overlay */}
                                         <button
                                             onClick={() => setActiveMapContact(person)}
                                             className="mt-4 text-sm text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white font-semibold transition-all"
                                         >
                                             🗺️ View Connections Map
                                         </button>
                                     </div>
                                 );
                             })}
                         </div>
                    )}
                </div>
            </div>

            {/* AI Copilot Panel */}
            <div className={`relative transition-all duration-300 ${tourStep === 3 ? 'z-[100]' : 'z-50'}`}>
                {tourStep === 3 && (
                    <div className="fixed bottom-24 right-8 bg-white rounded-xl shadow-2xl p-5 w-80 z-[101] animate-in fade-in slide-in-from-bottom-4 border border-blue-400 ring-4 ring-blue-400/20">
                        <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                            <span>🤖</span> 3. AI Copilot
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">Need help finding someone specific? Ask the AI Copilot to analyze the network and suggest the best connections.</p>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-400">Step 3 of 3</span>
                            <button onClick={endTour} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700">Finish Tour</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Visual force connection map Overlay */}
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

                            const { data: existing } = await supabase
                                .from('saved_contacts')
                                .select('id')
                                .eq('contact_id', id)
                                .eq('user_id', user.id)
                                .maybeSingle();

                            if (existing) {
                                alert(`⭐ This contact is already in your vault!`);
                                return;
                            }

                            const {error} = await supabase
                                .from('saved_contacts')
                                .insert([{contact_id: id, user_id: user.id}]);

                            alert(`⭐ Saved contact to your vault!`);
                        } catch (e) {
                            console.error("Failed to save contact", e);
                        }
                    }}
                />
            )}

            {/* Active Tour Background Blur mask */}
            {tourStep > 0 && (
                <div className="fixed inset-0 z-[90] bg-slate-900/40 pointer-events-none transition-opacity duration-300" />
            )}

            {/* Initial Welcome Modal */}
            {tourStep === 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl mb-4">
                            👋
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-3">Welcome to INI Civic Network!</h2>
                        <p className="text-slate-600 mb-6 leading-relaxed">
                            This platform helps you discover, connect, and collaborate with civic professionals across the CUNY network. 
                            <br/><br/>
                            Would you like a quick tour to see how everything works?
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={endTour} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                                Skip for now
                            </button>
                            <button onClick={startTour} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
                                Start Tour
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restart Tour button indicator */}
            <button 
                onClick={() => setTourStep(0)}
                className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-full shadow-lg hover:bg-blue-50 hover:text-blue-600 hover:scale-105 transition-all group"
                title="Restart Tutorial"
            >
                <span className="text-xl">❓</span>
                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible whitespace-nowrap transition-all pointer-events-none">
                    Restart Tutorial
                </span>
            </button>
        </div>
    );
}