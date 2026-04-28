"use client";

import {useState, useEffect, useMemo, useRef} from "react";
import ProfileModal, {GraphNode, GraphLink} from "@/components/ProfileModal";
import {createClient} from '@/utils/supabase/client';
import Copilot from "@/components/Copilot";

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

// 1. UPDATED INTERFACE
interface Contact {
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

// --- CUSTOM COLLAPSIBLE FOLDER DROPDOWN ---
const FolderDropdown = ({groups, selected, onChange}: {
    groups: Record<string, string[]>,
    selected: string,
    onChange: (val: string) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleFolder = (folder: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents the dropdown from closing when clicking a folder
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
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white text-left flex justify-between items-center focus:ring-2 focus:ring-blue-500 outline-none"
            >
                <span className="truncate font-medium">{selected === "All" ? "All Focus Areas" : selected}</span>
                <span className="text-xs text-slate-400">▼</span>
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2">
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

export default function Home() {

    // Master List & Filters
    const [allContacts, setAllContacts] = useState<Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCampus, setSelectedCampus] = useState("All");
    const [selectedFocus, setSelectedFocus] = useState("All");

    // State for the Micro Map & Modal
    const [microMapContact, setMicroMapContact] = useState<Contact | null>(null);
    const [inspectContact, setInspectContact] = useState<Contact | null>(null);
    const [isGraphExpanded, setIsGraphExpanded] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set()); // Tracks clicked hubs

    // --- INITIAL DATA FETCH ---
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const supabase = createClient();
                const {data, error} = await supabase
                    .from('contacts')
                    .select(`*, contact_domains (domains (domain_name))`)
                    .eq('is_public', true);
                if (error) throw error;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formattedData: Contact[] = (data as any[]).map((c) => ({
                    ...c,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    domains: c.contact_domains.map((cd: any) => cd.domains.domain_name)
                }));
                setAllContacts(formattedData);
            } catch (error) {
                console.error("Failed to load directory data:", error);
            }
        };
        fetchInitialData();
    }, []);

    // --- DYNAMIC FILTERING ---
    const displayedContacts = useMemo(() => {
        return allContacts.filter((person) => {
            const keywordMatch = searchQuery === "" ||
                (person.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (person.affiliation?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (person.notes?.toLowerCase() || "").includes(searchQuery.toLowerCase());

            const campusMatch = selectedCampus === "All" || person.campus === selectedCampus;

            let focusMatch = selectedFocus === "All";
            if (selectedFocus !== "All" && person.domains && person.domains.length > 0) {
                // Now it just does a direct, exact match check against the database strings
                focusMatch = person.domains.includes(selectedFocus);
            }

            return keywordMatch && campusMatch && focusMatch;
        });
    }, [allContacts, searchQuery, selectedCampus, selectedFocus]);

    const uniqueCampuses = Array.from(new Set(allContacts.map(c => c.campus).filter(Boolean))).sort();
    const uniqueFocusAreas = Array.from(new Set(allContacts.flatMap(c => c.domains))).filter(Boolean).sort();

    // --- CATEGORIZATION LOGIC ---
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
            // Check the focus string against each bucket's keywords defined in INTEREST_BUCKETS
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

        // Clean up empty folders
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) delete groups[key];
        });

        return groups;
    }, [uniqueFocusAreas]);

    // Trigger when launching a new map center
    const launchMap = (person: Contact) => {
        const connectedPeople = allContacts.filter(c => c.id !== person.id && c.domains?.some(d => person.domains?.includes(d)));

        // Auto-expand only if there are 15 or fewer connected contacts
        if (connectedPeople.length > 15) {
            setIsGraphExpanded(false);
        } else {
            setIsGraphExpanded(true);
        }

        setExpandedNodes(new Set()); // Reset manual node expansions on new map
        setMicroMapContact(person);
        setInspectContact(person);
    };

    const microGraphData = useMemo(() => {
        if (!microMapContact) return {nodes: [], links: [], hiddenCount: 0};

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const addedNodes = new Set<string>();
        const addedLinks = new Set<string>();
        let hiddenCount = 0;

        // --- NEW: HTML Tooltip Generator ---
        const createPersonTooltip = (c: Contact, isCenter = false) => {
            const parts = [];
            if (c.campus) parts.push(`Locale: ${c.campus}`);
            if (c.affiliation) parts.push(`Affiliation: ${c.affiliation}`);
            const details = parts.length > 0 ? `<br/><span style="font-size: 11px; color: #cbd5e1; font-weight: normal;">${parts.join(' | ')}</span>` : '';
            const prefix = isCenter ? `<span style="display: block; font-size: 9px; color: #fbbf24; margin-bottom: 2px;">CENTER PROFILE</span>` : '';
            return `<div style="text-align: center; font-family: sans-serif; padding: 2px;">${prefix}<strong>${c.name}</strong>${details}</div>`;
        };

        const safeAddLink = (s: string, t: string) => {
            const key = `${s}->${t}`;
            const reverseKey = `${t}->${s}`;
            if (!addedLinks.has(key) && !addedLinks.has(reverseKey)) {
                addedLinks.add(key);
                links.push({source: s, target: t});
            }
        };

        // 1. Add the Center Person
        nodes.push({
            id: microMapContact.id,
            name: microMapContact.name,
            group: "center",
            val: 12,
            color: "#fbbf24",
            title: createPersonTooltip(microMapContact, true) // <-- Updated
        });
        addedNodes.add(microMapContact.id);

        // 2. Determine if the network is small enough to auto-expand
        const networkContacts = allContacts.filter(other =>
            other.id !== microMapContact.id &&
            other.domains?.some(d => microMapContact.domains?.includes(d))
        );
        const isSmallNetwork = networkContacts.length <= 15;

        // 3. Map out the shared Topics and the People attached to them
        microMapContact.domains?.forEach(topic => {

            // Add the Topic Node
            if (!addedNodes.has(topic)) {
                nodes.push({
                    id: topic, name: topic, group: "topic_hub", val: 8, color: "#0ea5e9",
                    title: `<div style="text-align: center;"><strong>${topic}</strong><br/><span style="font-size: 10px; color: #94a3b8;">Interest Hub (Click to expand)</span></div>` // <-- Updated
                });
                addedNodes.add(topic);
            }
            safeAddLink(microMapContact.id, topic);

            // Add the connected people
            allContacts.forEach(other => {
                if (other.id === microMapContact.id || !other.domains?.includes(topic)) return;

                const shouldExpand = isGraphExpanded || expandedNodes.has(topic) || isSmallNetwork;

                if (shouldExpand) {
                    if (!addedNodes.has(other.id)) {
                        nodes.push({
                            id: other.id, name: other.name, group: "person", val: 5, color: "#ff0000",
                            title: createPersonTooltip(other) // <-- Updated
                        });
                        addedNodes.add(other.id);
                    }
                    safeAddLink(topic, other.id);
                } else {
                    if (!addedNodes.has(other.id)) {
                        hiddenCount++;
                    }
                }
            });
        });

        const adjustedHiddenCount = Math.floor(hiddenCount / (microMapContact.domains?.length || 1));

        return {nodes, links, hiddenCount: adjustedHiddenCount};
    }, [allContacts, microMapContact, isGraphExpanded, expandedNodes]);


    return (
        <div className="flex h-full w-full bg-slate-50 overflow-hidden font-sans relative">

            {/* DIRECTORY */}
            <div className="w-full h-full p-8 overflow-y-auto bg-white">

                {/* Filter UI */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="flex flex-col">
                        <label className="text-xs font-bold uppercase text-slate-400 mb-1">Campus</label>
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
                        <label className="text-xs font-bold uppercase text-slate-400 mb-1">Focus Area</label>
                        <FolderDropdown
                            groups={groupedFocusAreas}
                            selected={selectedFocus}
                            onChange={setSelectedFocus}
                        />
                    </div>

                    <div className="col-span-2 flex flex-col">
                        <label className="text-xs font-bold uppercase text-slate-400 mb-1">Keyword Search</label>
                        <input
                            type="text"
                            placeholder="Search names, orgs, or notes..."
                            className="border border-slate-200 rounded-lg p-2 text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <h2 className="text-xl font-semibold mb-4 text-slate-700">🗂️ Civic Directory</h2>

                {/* Render Directory Cards */}
                {displayedContacts.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 text-slate-600 p-6 rounded-xl text-center">
                        <p className="font-medium">No contacts match your filters.</p>
                    </div>
                ) : (
                    <div className="space-y-4 pb-8">
                        <p className="text-sm text-slate-500">Showing {displayedContacts.length} Matches</p>

                        {displayedContacts.slice(0, 50).map((person, index) => (
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

                                {/* FULLY RESTORED SAVE CONTACT BUTTON */}
                                <button
                                    onClick={async () => {
                                        try {
                                            const supabase = createClient();
                                            const {error} = await supabase
                                                .from('saved_contacts')
                                                .insert([{contact_id: person.id}]);

                                            if (error) throw error;
                                            alert(`⭐ Saved ${person.name} to your profile!`);
                                        } catch (e) {
                                            console.error("Failed to save contact", e);
                                            alert("Could not save contact right now.");
                                        }
                                    }}
                                    className="mt-4 mr-2 text-sm text-slate-700 bg-slate-100 border border-slate-200 px-4 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white font-semibold transition-all"
                                >
                                    ⭐ Save Contact
                                </button>

                                {/* NEW: DIRECT EMAIL BUTTON */}
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

                                <button
                                    onClick={() => launchMap(person)}
                                    className="mt-4 text-sm text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white font-semibold transition-all"
                                >
                                    🗺️ View Connections Map
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* NEW FLOATING COPILOT */}
            <Copilot onInspectProfile={(name) => {
                const found = allContacts.find(c => c.name === name);
                if (found) {
                    setInspectContact(found); // Opens the modal
                    // Only change the map center if one isn't currently active
                    if (!microMapContact) setMicroMapContact(found);
                }
            }}/>

            {/* MAP MODAL OVERLAY */}
            {inspectContact && microMapContact && (
                <ProfileModal
                    contact={inspectContact}
                    onClose={() => {
                        setInspectContact(null);
                        setMicroMapContact(null);
                        setExpandedNodes(new Set());
                    }}
                    showGraph={true}
                    graphData={{nodes: microGraphData.nodes, links: microGraphData.links}}
                    isGraphExpanded={isGraphExpanded}
                    hiddenCount={microGraphData.hiddenCount}
                    onToggleGraph={() => {
                        setIsGraphExpanded(!isGraphExpanded);
                        if (isGraphExpanded) setExpandedNodes(new Set()); // Clear specific node memory if collapsing all
                    }}

                    // TRAVERSAL AND EXPAND LOGIC
                    onNodeClick={(node) => {
                        const nodeId = String(node.id);
                        if (node.group === "person" || node.group === "center") {
                            const clickedPerson = allContacts.find((c) => c.id === nodeId);
                            if (clickedPerson) setInspectContact(clickedPerson);
                        } else if (node.group === "topic_hub" || node.group === "location_hub") {
                            setExpandedNodes(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(nodeId)) newSet.delete(nodeId);
                                else newSet.add(nodeId);
                                return newSet;
                            });
                        }
                    }}
                    onRecenter={(person) => launchMap(person as Contact)}

                    onSaveContact={async (id) => {
                        try {
                            const supabase = createClient();
                            const {data: {user}} = await supabase.auth.getUser();

                            if (!user) return alert("You must be logged in to save contacts.");

                            const {error} = await supabase
                                .from('saved_contacts')
                                .insert([{contact_id: id, user_id: user.id}]);

                            if (error) {
                                if (error.code === '23505') {
                                    // FIXED: Changed activeContact to inspectContact
                                    alert(`⭐ ${inspectContact.name} is already in your vault!`);
                                    return;
                                }
                                throw error;
                            }
                            // FIXED: Changed activeContact to inspectContact
                            alert(`⭐ Saved ${inspectContact.name} to your vault!`);
                        } catch (e) {
                            console.error("Failed to save contact", e);
                        }
                    }}
                />
            )}
        </div>
    );
}