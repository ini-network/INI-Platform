"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from '../../utils/supabase/client';
import ProfileModal from "@/components/ProfileModal";
import NetworkMap, { ForceGraphMethods } from "@/components/NetworkMap";

// --- STRICT TYPESCRIPT INTERFACES ---
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

interface LibNode {
  id?: string | number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
  name?: string;
  group?: string;
  val?: number;
  title?: string;
  color?: string;
  [key: string]: unknown;
}

interface GraphLink {
  source: string | number;
  target: string | number;
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

const CUNY_LIST = [
  "Borough of Manhattan Community College", "BMCC", "Baruch",
  "Bronx Community College", "Brooklyn College", "City College", "CCNY",
  "College of Staten Island", "CSI", "Graduate Center", "Guttman",
  "Hostos", "Hunter", "John Jay", "Kingsborough", "LaGuardia",
  "Lehman", "Macaulay", "Medgar Evers", "New York City College of Technology",
  "City Tech", "Queens College", "Queensborough", "York College",
  "CUNY School of Law", "CUNY Law", "School of Professional Studies", "SPS",
  "School of Public Health", "SPH", "Labor and Urban Studies", "SLU",
  "Journalism", "Craig Newmark"
];

const INTEREST_BUCKETS: Record<string, string[]> = {
  "Education & Student Success": ["Education", "Youth", "Mentorship", "K-12", "Curriculum", "Pedagogy", "Schools", "Student", "Teaching", "Learning"],
  "Government, Policy & Law": ["Policy", "Government", "Law", "Criminal", "Immigration", "Police", "Voting", "Civic", "Legislation"],
  "Public Health & Wellness": ["Health", "Wellness", "Medicine", "Mental Health", "Public Health", "Care", "Disability", "Nursing"],
  "Community Engagement & Organizing": ["Community", "Engagement", "Outreach", "Organizing", "Neighborhood", "Mutual Aid", "Volunteer"],
  "Economic Development & Labor": ["Economic", "Workforce", "Labor", "Employment", "Finance", "Business", "Career", "Poverty", "Industry"],
  "Arts, Culture & Humanities": ["Arts", "Culture", "Design", "History", "Literature", "Theater", "Music", "Communication"],
  "Environment & Sustainability": ["Environment", "Sustainability", "Climate", "Food Security", "Food Justice", "Food Policy", "Ecology", "Energy", "Green"],
  "Technology & Data": ["Technology", "Data", "Innovation", "AI", "Digital", "Engineering", "Computer Science", "STEM", "Tech", "Cyber"],
  "Research & Academia": ["Research", "Social Science", "Sociology", "Psychology", "Anthropology", "Evaluation", "Data Collection", "Study"],
  "Social Justice & Equity": ["Justice", "Equity", "Equality", "Diversity", "Inclusion", "Human Rights", "Civil Rights", "Advocacy", "Liberation"],
  "Urban Planning & Housing": ["Urban Planning", "Housing", "Zoning", "Real Estate", "Architecture", "Transportation", "Transit", "Infrastructure", "Urban Design"],
  "Media, Journalism & Storytelling": ["Media", "Journalism", "Storytelling", "Podcast", "News", "Publishing", "Reporting", "Documentary", "Broadcast"],
  "Other / Cross-Cutting": []
};

// --- CUSTOM FUZZY SEARCH DROPDOWN ---
const FuzzySearchDropdown = ({ options, value, onChange, placeholder }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string }) => {
  const [search, setSearch] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSearch(value);
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (opt: string) => {
    setSearch(opt);
    onChange(opt);
    setIsOpen(false);
  };

  const searchLower = search.toLowerCase();
  const tokens = searchLower.split(" ").filter(w => w.length > 2);
  const filtered = options.filter(opt => {
    if (!search) return false;
    const optLower = opt.toLowerCase();
    if (optLower.includes(searchLower)) return true;
    if (tokens.length > 1) return tokens.some(token => optLower.includes(token));
    return false;
  });

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full border border-blue-300 rounded-lg p-3 bg-blue-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none placeholder-blue-400 font-medium"
        placeholder={placeholder}
        value={search}
        onChange={handleTextChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={(e) => {
           if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0]);
        }}
      />
      {isOpen && filtered.length > 0 && search !== filtered[0] && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.map(opt => (
            <li
              key={opt}
              className="p-3 hover:bg-slate-100 cursor-pointer text-sm font-medium text-slate-700 border-b border-slate-50 last:border-0"
              onMouseDown={() => handleSelect(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- STANDARD SEARCHABLE DROPDOWN ---
const SearchableDropdown = ({ options, value, onChange, placeholder }: { options: string[], value: string, onChange: (val: string) => void, placeholder: string }) => {
  const [search, setSearch] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setSearch(value);
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (opt: string) => {
    setSearch(opt);
    onChange(opt);
    setIsOpen(false);
  };

  const filtered = options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full border border-slate-300 rounded-lg p-3 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
        placeholder={placeholder}
        value={search}
        onChange={handleTextChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={(e) => {
           if (e.key === 'Enter' && filtered.length > 0) handleSelect(filtered[0]);
        }}
      />
      {isOpen && filtered.length > 0 && search !== filtered[0] && (
        <ul className="absolute z-50 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {filtered.map(opt => (
            <li key={opt} className="p-3 hover:bg-slate-100 cursor-pointer text-sm font-medium text-slate-700" onMouseDown={() => handleSelect(opt)}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function ExploreMap() {
  const [globalSubFilter, setGlobalSubFilter] = useState<"cuny" | "partner" | "all">("cuny");
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<ForceGraphMethods | null>(null);

  // Navigation & Search State - ADDED "global"
  const [viewType, setViewType] = useState<"topic" | "location" | "person" | "global">("location");
  const [locationSubFilter, setLocationSubFilter] = useState<"cuny" | "partner">("cuny");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedFocusDomain, setSelectedFocusDomain] = useState("");
  const [selectedSpecificFocus, setSelectedSpecificFocus] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [copilotSearch, setCopilotSearch] = useState("");

  // Graph Display & Interaction State
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [isGlobalExpanded, setIsGlobalExpanded] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // --- TUTORIAL / ONBOARDING STATE ---
  const [tourStep, setTourStep] = useState<number>(-1);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [guestInspectCount, setGuestInspectCount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Dynamic user auth state tracking
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
        handleInspectContact(found);
      }
    };
    window.addEventListener("inspect-profile", handleInspectEvent);
    return () => window.removeEventListener("inspect-profile", handleInspectEvent);
  }, [allContacts, isLoggedIn, guestInspectCount]);

  // Show onboarding tutorial only on the user's first visit/session
  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem("hasVisitedExploreBefore");
    const hasSeen = localStorage.getItem("hasSeenExploreTutorial");
    if (!hasVisitedBefore) {
      localStorage.setItem("hasVisitedExploreBefore", "true");
      if (!hasSeen) {
        setTourStep(0); // Show Welcome Modal only on first session
      }
    }
  }, []);

  const startTour = () => setTourStep(1);
  const endTour = () => {
    setTourStep(-1);
    localStorage.setItem("hasSeenExploreTutorial", "true");
  };

  useEffect(() => {
    const savedSidebarState = localStorage.getItem("exploreSidebarOpen");
    if (savedSidebarState !== null) {
      setTimeout(() => setIsSidebarOpen(savedSidebarState === "true"), 0);
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem("exploreSidebarOpen", String(newState));
  };

  const handleInspectContact = (contact: Contact) => {
    if (!isLoggedIn) {
      if (guestInspectCount >= 2) {
        setShowLoginPrompt(true);
        return;
      }
      setGuestInspectCount(prev => prev + 1);
    }
    setActiveContact(contact);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
            .from('contacts')
            .select(`*, contact_domains (domains (domain_name))`)
            .eq('is_public', true);
        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedData: Contact[] = (data as unknown as Array<Contact & { contact_domains: { domains: { domain_name: string } }[] }>).map((c) => ({
          ...c,
          domains: c.contact_domains.map((cd) => cd.domains.domain_name)
        }));

        setAllContacts(formattedData);
      } catch (error) {
        console.error("Failed to load directory data:", error);
      }
    };
    fetchInitialData();
  }, []);

  // Filter Extractions
  const uniqueLocations = Array.from(new Set(allContacts.map(c => c.campus).filter(Boolean))).sort() as string[];
  const cunyOptions = uniqueLocations.filter(loc => CUNY_LIST.some(c => loc.toLowerCase().includes(c.toLowerCase())));
  const partnerOptions = uniqueLocations.filter(loc => !CUNY_LIST.some(c => loc.toLowerCase().includes(c.toLowerCase())));

  const allDomainsRaw = allContacts.flatMap(c => c.domains).filter(Boolean);
  const uniqueFocusAreas = Array.from(new Set(allDomainsRaw)).sort() as string[];

  const allPeopleOptions = Array.from(new Set(allContacts.map(c => c.name).filter(Boolean))).sort() as string[];

  const filteredFocusOptions = useMemo(() => {
    if (!selectedFocusDomain) return [];
    if (selectedFocusDomain === "Other / Cross-Cutting") {
      const allKeywords = Object.values(INTEREST_BUCKETS).flat();
      return uniqueFocusAreas.filter(focus => !allKeywords.some(kw => focus.toLowerCase().includes(kw.toLowerCase())));
    }
    const keywords = INTEREST_BUCKETS[selectedFocusDomain] || [];
    return uniqueFocusAreas.filter(focus => keywords.some(kw => focus.toLowerCase().includes(kw.toLowerCase())));
  }, [selectedFocusDomain, uniqueFocusAreas]);

  const handleDomainClick = (domain: string) => {
    setSelectedFocusDomain(domain);
    setSelectedSpecificFocus("");
  };

  const handleZoomIn = () => { fgRef.current?.zoom(1.5, 400); };
  const handleZoomOut = () => { fgRef.current?.zoom(0.66, 400); };
  const handleFitMap = () => { fgRef.current?.zoomToFit(400, 50); };

  // --- UPGRADED "PERSON-CENTRIC" GRAPH ALGORITHM ---
  /**
   * DYNAMIC SUB-GRAPH GENERATION PIPELINE
   * 
   * Leverages React `useMemo` to construct a dynamic bipartite graph structure (nodes & links)
   * tailored to the active filter state and chosen `viewType`. Memoization is critical here
   * to prevent expensive sub-graph regeneration computations and force-graph engine resets
   * during slider interactions or cursor hover events.
   * 
   * Resolves four distinctive visualization hierarchies:
   * 1. Person Centric: Center Person -> Shared Interests -> Collateral Peer Researchers.
   * 2. Location Centric: Institution Hub -> Affiliated Researchers -> Auxiliary Interests.
   * 3. Topic Centric: Interest Hub -> Active Researchers -> Auxiliary Interests.
   * 4. Global Ecosystem: Macro scale bird's-eye view linking campus/partner nodes to major topics.
   */
  const { nodes, links, hiddenCount } = useMemo(() => {
    let filteredContacts = allContacts;
    if (copilotSearch) {
      filteredContacts = allContacts.filter(c => copilotSearch.includes(c.name));
    }

    const graphNodes: LibNode[] = [];
    const graphLinks: GraphLink[] = [];
    
    // Deduplication sets to prevent redundant coordinate computation or rendering crashes in react-force-graph
    const addedNodes = new Set<string>();
    const addedLinks = new Set<string>();
    let currentlyHiddenContacts = 0;

    // --- NEW: HTML Tooltip Generator ---
    /**
     * Generates a premium dark-themed HTML tooltip for nodes.
     * Injects context-relevant metadata (locale, affiliation, and focus tags) for progressive disclosure.
     */
    const createPersonTooltip = (c: Contact, isCenter = false) => {
      const parts = [];
      if (c.campus) parts.push(`Locale: ${c.campus}`);
      if (c.affiliation) parts.push(`Affiliation: ${c.affiliation}`);
      const details = parts.length > 0 ? `<br/><span style="font-size: 11px; color: #cbd5e1; font-weight: normal;">${parts.join(' | ')}</span>` : '';
      const prefix = isCenter ? `<span style="display: block; font-size: 9px; color: #fbbf24; margin-bottom: 2px;">CENTER PROFILE</span>` : '';
      return `<div style="text-align: center; font-family: sans-serif; padding: 2px;">${prefix}<strong>${c.name}</strong>${details}</div>`;
    };

    /**
     * Prevents duplicate bidirectional linkages in D3's link array.
     * Ensures consistent link mapping (e.g., 'A -> B' and 'B -> A' are unified) which avoids
     * force simulation coordinate calculation loop bugs or double-rendering links.
     */
    const safeAddLink = (s: string, t: string) => {
      const key = `${s}->${t}`;
      const reverseKey = `${t}->${s}`;
      if (!addedLinks.has(key) && !addedLinks.has(reverseKey)) {
        addedLinks.add(key);
        graphLinks.push({ source: s, target: t });
      }
    };

    /**
     * State gate controlling dynamic depth expansion.
     * Auto-expands secondary branches if the target node is globally expanded, explicitly clicked/expanded,
     * or if the total localized sub-graph is small enough (<= 25 items) to display without visual clutter.
     */
    const shouldExpandChildren = (parentNodeId: string, isSmallNetwork: boolean) => {
      return isGlobalExpanded || expandedNodes.has(parentNodeId) || isSmallNetwork;
    };

    // --- 1. PERSON VIEW (Center Person -> Topics -> Other People) ---
    if (viewType === "person" && selectedPerson) {
      const centerPerson = filteredContacts.find(c => c.name === selectedPerson);
      if (!centerPerson) return { nodes: graphNodes, links: graphLinks, hiddenCount: 0 };

      // Append Center Anchor (highest weight, designated with a premium amber center marker)
      graphNodes.push({ id: centerPerson.id, name: centerPerson.name, group: "center", val: 12, color: "#fbbf24", title: createPersonTooltip(centerPerson, true) });
      addedNodes.add(centerPerson.id);

      const networkContacts = filteredContacts.filter(other => other.id !== centerPerson.id && other.domains?.some(d => centerPerson.domains?.includes(d)));
      const isSmallNetwork = networkContacts.length <= 25;

      centerPerson.domains?.forEach(topic => {
        // Map connecting topics as immediate primary orbits
        if (!addedNodes.has(topic)) {
          graphNodes.push({ id: topic, name: topic, group: "topic_hub", val: 8, color: "#0ea5e9", title: `<div style="text-align: center;"><strong>${topic}</strong></div>` });
          addedNodes.add(topic);
        }
        safeAddLink(centerPerson.id, topic);

        // Map secondary orbits: Peer researchers sharing this specific topic hub
        filteredContacts.forEach(other => {
          if (other.id === centerPerson.id || !other.domains?.includes(topic)) return;

          if (shouldExpandChildren(topic, isSmallNetwork)) {
            if (!addedNodes.has(other.id)) {
              graphNodes.push({ id: other.id, name: other.name, group: "person", val: 4, color: "#ff0000", title: createPersonTooltip(other) });
              addedNodes.add(other.id);
            }
            safeAddLink(topic, other.id);
          } else {
            currentlyHiddenContacts++;
          }
        });
      });
    }

    // --- 2. LOCATION VIEW (Center Location -> Affiliated People -> Their Topics) ---
    else if (viewType === "location" && selectedLocation) {
      const locId = `loc_${selectedLocation}`;
      graphNodes.push({ id: locId, name: selectedLocation, group: "center", val: 12, color: "#ec4899", title: `<div style="text-align: center;"><strong>${selectedLocation}</strong></div>` });
      addedNodes.add(locId);

      const networkContacts = filteredContacts.filter(c => c.campus === selectedLocation);

      networkContacts.forEach(person => {
        if (!addedNodes.has(person.id)) {
          graphNodes.push({ id: person.id, name: person.name, group: "person", val: 6, color: "#ff0000", title: createPersonTooltip(person) });
          addedNodes.add(person.id);
        }
        safeAddLink(locId, person.id);

        const isPersonExpanded = isGlobalExpanded || expandedNodes.has(person.id);
        if (isPersonExpanded) {
          person.domains?.forEach(topic => {
            if (!addedNodes.has(topic)) {
              graphNodes.push({ id: topic, name: topic, group: "topic_hub", val: 4, color: "#0ea5e9", title: `<div style="text-align: center;"><strong>${topic}</strong></div>` });
              addedNodes.add(topic);
            }
            safeAddLink(person.id, topic);
          });
        } else {
          if (person.domains?.length) currentlyHiddenContacts += person.domains.length;
        }
      });
    }

    // --- 3. TOPIC VIEW (Center Topic -> Subscribed People -> Other Topics) ---
    else if (viewType === "topic" && selectedSpecificFocus) {
      const topicId = selectedSpecificFocus;
      graphNodes.push({ id: topicId, name: topicId, group: "center", val: 12, color: "#0ea5e9", title: `<div style="text-align: center;"><strong>${topicId}</strong></div>` });
      addedNodes.add(topicId);

      const networkContacts = filteredContacts.filter(c => c.domains?.includes(topicId));

      networkContacts.forEach(person => {
        if (!addedNodes.has(person.id)) {
          graphNodes.push({ id: person.id, name: person.name, group: "person", val: 5, color: "#ff0000", title: createPersonTooltip(person) });
          addedNodes.add(person.id);
        }
        safeAddLink(topicId, person.id);

        const isPersonExpanded = isGlobalExpanded || expandedNodes.has(person.id);
        if (isPersonExpanded) {
          person.domains?.forEach(otherTopic => {
            if (otherTopic !== topicId) {
              if (!addedNodes.has(otherTopic)) {
                graphNodes.push({ id: otherTopic, name: otherTopic, group: "topic_hub", val: 3, color: "#38bdf8", title: `<div style="text-align: center;"><strong>${otherTopic}</strong></div>` });
                addedNodes.add(otherTopic);
              }
              safeAddLink(person.id, otherTopic);
            }
          });
        } else {
          if (person.domains && person.domains.length > 1) currentlyHiddenContacts += (person.domains.length - 1);
        }
      });
    }

    // --- 4. GLOBAL ECOSYSTEM VIEW (All Hubs -> People -> Topics) ---
    else if (viewType === "global") {
      let globalContacts = filteredContacts;
      if (globalSubFilter === "cuny") {
        globalContacts = filteredContacts.filter(c => c.campus && CUNY_LIST.some(cuny => c.campus!.toLowerCase().includes(cuny.toLowerCase())));
      } else if (globalSubFilter === "partner") {
        globalContacts = filteredContacts.filter(c => c.campus && !CUNY_LIST.some(cuny => c.campus!.toLowerCase().includes(cuny.toLowerCase())));
      }

      globalContacts.forEach(person => {
        const isExpanded = isGlobalExpanded || expandedNodes.has(`loc_${person.campus}`);

        if (isExpanded) {
          if (!addedNodes.has(person.id)) {
            graphNodes.push({ id: person.id, name: person.name, group: "person", val: 4, color: "#ff0000", title: createPersonTooltip(person) });
            addedNodes.add(person.id);
          }

          if (person.campus) {
            const locId = `loc_${person.campus}`;
            if (!addedNodes.has(locId)) {
              graphNodes.push({ id: locId, name: person.campus, group: "location_hub", val: 8, color: "#ec4899", title: `<div style="text-align: center;"><strong>${person.campus}</strong></div>` });
              addedNodes.add(locId);
            }
            safeAddLink(locId, person.id);
          }

          person.domains?.forEach(topic => {
            if (!addedNodes.has(topic)) {
              graphNodes.push({ id: topic, name: topic, group: "topic_hub", val: 5, color: "#0ea5e9", title: `<div style="text-align: center;"><strong>${topic}</strong></div>` });
              addedNodes.add(topic);
            }
            safeAddLink(person.id, topic);
          });
        } else {
          if (person.campus) {
            const locId = `loc_${person.campus}`;
            if (!addedNodes.has(locId)) {
              graphNodes.push({ id: locId, name: person.campus, group: "location_hub", val: 10, color: "#ec4899", title: `<div style="text-align: center;"><strong>${person.campus}</strong></div>` });
              addedNodes.add(locId);
            }
          }
          currentlyHiddenContacts++;
        }
      });
    }

    return { nodes: graphNodes, links: graphLinks, hiddenCount: currentlyHiddenContacts };
  }, [allContacts, copilotSearch, viewType, selectedLocation, selectedSpecificFocus, selectedPerson, isGlobalExpanded, expandedNodes]);

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden font-sans">

      {/* LEFT SIDEBAR */}
      <div className={`${isSidebarOpen ? "w-1/4" : "hidden"} h-full bg-white border-r border-slate-200 flex flex-col ${tourStep === 1 ? 'z-[100]' : 'z-10'} shadow-xl transition-all duration-300 flex-shrink-0`}>
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
              <div>
                  <h1 className="text-2xl font-bold text-slate-800 mb-1 flex items-center">
                      🔭 Explorer
                      <InfoTooltip text="The Explorer allows you to visually map and traverse the civic network using an interactive force-directed graph." />
                  </h1>
                  <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">
                      ← Back to Workspace
                  </Link>
              </div>
              <div className="flex flex-col items-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-tighter">Hide Controls</span>
                  <button onClick={toggleSidebar} className="p-2 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-500 rounded-lg transition-all border border-slate-200 shadow-sm" title="Hide">
                      <span className="font-bold">◀</span>
                  </button>
              </div>
          </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">

          {/* UPDATED: 2x2 Toggle Grid including Global View */}
          <div className={`relative transition-all duration-300 ${tourStep === 1 ? 'bg-white p-3 rounded-xl shadow-2xl ring-4 ring-blue-400/50 -m-3 mb-2' : ''}`}>
            <div className="flex flex-col space-y-2 bg-slate-100 p-1.5 rounded-xl relative z-10">
              <div className="flex space-x-1">
                <button onClick={() => { setViewType("location"); setSelectedLocation(""); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${viewType === "location" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  By Location
                </button>
                <button onClick={() => { setViewType("topic"); setSelectedSpecificFocus(""); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${viewType === "topic" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  By Interest
                </button>
              </div>
              <div className="flex space-x-1">
                <button onClick={() => { setViewType("person"); setSelectedPerson(""); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${viewType === "person" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  By Person
                </button>
                <button onClick={() => { setViewType("global"); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${viewType === "global" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  🌍 Global Map
                </button>
              </div>
            </div>

            {tourStep === 1 && (
              <div className="absolute top-full left-0 mt-4 bg-white rounded-xl shadow-xl p-5 w-80 z-[101] animate-in fade-in slide-in-from-top-4 border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-2">1. Choose Your View</h3>
                <p className="text-sm text-slate-600 mb-4">Start by selecting how you want to center the network: by location, specific interest, person, or observing the entire global ecosystem at once.</p>
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

          {viewType === "global" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-sm">
                <h3 className="text-emerald-800 font-bold mb-2">🌍 The Ecosystem View</h3>
                <p className="text-sm text-emerald-700/80 font-medium mb-4">
                  A high-level constellation of how locations connect to focus areas. Click any node to expand it.
                </p>

                <label className="text-xs font-bold uppercase text-emerald-800/60 mb-2 block">Filter Ecosystem</label>
                <div className="flex flex-col space-y-2">
                  <button onClick={() => { setGlobalSubFilter("cuny"); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`py-2 text-xs font-bold border-2 rounded-lg transition-all ${globalSubFilter === "cuny" ? "border-emerald-500 bg-white text-emerald-700 shadow-sm" : "border-emerald-200/50 text-emerald-600 hover:bg-emerald-100/50"}`}>
                    CUNY Campuses
                  </button>
                  <button onClick={() => { setGlobalSubFilter("partner"); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`py-2 text-xs font-bold border-2 rounded-lg transition-all ${globalSubFilter === "partner" ? "border-purple-500 bg-white text-purple-700 shadow-sm" : "border-emerald-200/50 text-emerald-600 hover:bg-emerald-100/50"}`}>
                    Community Partners
                  </button>
                  <button onClick={() => { setGlobalSubFilter("all"); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`py-2 text-xs font-bold border-2 rounded-lg transition-all ${globalSubFilter === "all" ? "border-blue-500 bg-white text-blue-700 shadow-sm" : "border-emerald-200/50 text-emerald-600 hover:bg-emerald-100/50"}`}>
                    Full Ecosystem
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewType === "location" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center">
                  Location Type
                  <InfoTooltip text="Filter the search list to either CUNY campuses or external community partner organizations." />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setLocationSubFilter("cuny"); setSelectedLocation(""); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`py-2 text-xs font-bold border-2 rounded-lg ${locationSubFilter === "cuny" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400"}`}>
                    CUNY Campuses
                  </button>
                  <button onClick={() => { setLocationSubFilter("partner"); setSelectedLocation(""); setIsGlobalExpanded(false); setExpandedNodes(new Set()); }} className={`py-2 text-xs font-bold border-2 rounded-lg ${locationSubFilter === "partner" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-100 text-slate-400"}`}>
                    Community Partners
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-2 flex items-center">
                  Search Location
                  <InfoTooltip text="Select a specific location to view all associated people and their focus areas." />
                </label>
                <SearchableDropdown options={locationSubFilter === "cuny" ? cunyOptions : partnerOptions} value={selectedLocation} onChange={setSelectedLocation} placeholder="Type to search locations..." />
              </div>
            </div>
          )}

          {viewType === "topic" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="text-xs font-bold uppercase text-blue-500 mb-2 block">🔍 Global Keyword Search</label>
                <FuzzySearchDropdown options={uniqueFocusAreas} value={selectedSpecificFocus} onChange={(val) => { setSelectedSpecificFocus(val); setSelectedFocusDomain(""); }} placeholder="e.g., 'Food Justice'" />
              </div>
              <div className="flex items-center">
                <div className="flex-1 border-t border-slate-200"></div>
                <span className="px-3 text-xs font-bold text-slate-400 uppercase">OR BROWSE FOLDERS</span>
                <div className="flex-1 border-t border-slate-200"></div>
              </div>
              <div>
                <div className="flex flex-col space-y-1">
                  {Object.keys(INTEREST_BUCKETS).map(domain => (
                    <button key={domain} onClick={() => handleDomainClick(domain)} className={`p-2.5 text-left text-xs font-bold rounded-lg border-2 transition-all ${selectedFocusDomain === domain ? "border-slate-400 bg-slate-100 text-slate-800" : "border-slate-100 text-slate-500 hover:border-slate-200"}`}>
                      📁 {domain}
                    </button>
                  ))}
                </div>
              </div>
              {selectedFocusDomain && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Select Specific Interest</label>
                  <SearchableDropdown options={filteredFocusOptions} value={selectedSpecificFocus} onChange={setSelectedSpecificFocus} placeholder={`Search within ${selectedFocusDomain}...`} />
                </div>
              )}
            </div>
          )}

          {viewType === "person" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Search Directory</label>
                <SearchableDropdown options={allPeopleOptions} value={selectedPerson} onChange={setSelectedPerson} placeholder="Type a name..." />
              </div>
            </div>
          )}

          <div className="mt-auto pt-8 border-t border-slate-100">
            <div className="p-4 bg-slate-900 rounded-xl text-white">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Map Legend</h4>
              <div className="space-y-2">
                <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></span> CUNY Campus</div>
                <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span> Community Partner</div>
                <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-sky-500 mr-2"></span> Interest / Focus</div>
                <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-[#ff0000] mr-2"></span> Person</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: THE GRAPH */}
      <div className={`h-full relative flex flex-col bg-slate-900 transition-all duration-300 ${isSidebarOpen ? "w-3/4" : "w-full"} ${tourStep === 2 ? 'z-[100] ring-inset ring-4 ring-blue-400/50 shadow-2xl' : 'z-0'}`}>
        {!isSidebarOpen && (
          <button onClick={toggleSidebar} className="absolute top-6 left-6 z-20 bg-slate-800/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur border border-slate-700 hover:bg-slate-700 transition-colors font-bold flex items-center space-x-2">
            <span>▶</span><span className="text-sm uppercase tracking-wide">Show Controls</span>
          </button>
        )}

        {nodes.length > 0 && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex gap-4 bg-slate-800/90 p-3 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur">
              <span className="text-white text-sm font-medium self-center px-2">
                {viewType === 'global' ? 'Hierarchy: Location ➔ Person ➔ Topic' :
                 `Hierarchy: ${viewType === 'person' ? 'Person ➔ Topic ➔ Shared Contact' : viewType === 'location' ? 'Location ➔ Person ➔ Topic' : 'Topic ➔ Person ➔ Other Topics'}`}
              </span>

              {hiddenCount > 0 ? (
                <button
                  onClick={() => {
                    // NEW: Performance Warning check before unleashing the global map
                    if (viewType === 'global') {
                      const confirmLoad = window.confirm("Loading the entire network at once may momentarily slow down your browser. Are you sure you want to expand all nodes?");
                      if (!confirmLoad) return;
                    }
                    setIsGlobalExpanded(true);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all bg-pink-500 text-white hover:bg-pink-400"
                >
                  Expand All Contacts ({hiddenCount} Hidden)
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsGlobalExpanded(false);
                    setExpandedNodes(new Set());
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all bg-slate-700 text-white hover:bg-slate-600"
                >
                  Collapse All Contacts
                </button>
              )}
          </div>
        )}

        {nodes.length > 0 && (
          <div className="absolute bottom-8 right-8 z-20 flex flex-col space-y-2 bg-slate-800/80 p-2 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
            <button onClick={handleZoomIn} className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none" title="Zoom In">➕</button>
            <button onClick={handleFitMap} className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none" title="Fit to Screen">⛶</button>
            <button onClick={handleZoomOut} className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none" title="Zoom Out">➖</button>
          </div>
        )}

        {nodes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-slate-800/80 p-8 rounded-2xl text-center border border-slate-700 shadow-2xl animate-fade-in">
              <p className="text-white text-xl font-bold mb-2">{viewType === "global" ? "Loading Ecosystem..." : "Awaiting Instructions 🔭"}</p>
              <p className="text-slate-400 text-sm">{viewType === "global" ? "Generating the full network..." : "Select a location, interest, or person from the sidebar to generate a map."}</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <NetworkMap
              ref={fgRef}
              onNodeClick={(node: LibNode) => {
                const nodeId = String(node.id);

                if (node.group === "person" || node.group === "center") {
                  const pData = allContacts.find(c => c.id === nodeId || c.name === node.name);
                  if (pData) handleInspectContact(pData);
                }
                else if (node.group === "topic_hub" || node.group === "location_hub") {
                  setExpandedNodes(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(nodeId)) {
                      newSet.delete(nodeId);
                    } else {
                      newSet.add(nodeId);
                    }
                    return newSet;
                  });
                }
              }}
              graphData={{ nodes, links }}
              nodeRelSize={5}
              nodeLabel="title"
              linkColor={() => "rgba(255, 255, 255, 0.2)"}
              linkWidth={1.5}
              linkDirectionalParticles={viewType === "global" ? 0 : 1}
              linkDirectionalParticleSpeed={0.005}
              nodeCanvasObject={(node: LibNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                if (node.x === undefined || node.y === undefined || node.val === undefined) return;
                
                // --- CUSTOM circular node canvas drawing routine ---
                ctx.beginPath();
                // Draw circle: arc(x, y, radius, startAngle, endAngle, counterclockwise)
                ctx.arc(node.x, node.y, node.val + 1, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color || "#cccccc";
                ctx.fill();

                // --- ADAPTIVE TYPOGRAPHY OVERLAP CHECKER & LABEL DRAWING ---
                // Only render text labels for primary/important hubs (val >= 6) OR when zoomed in enough (globalScale > 1.5).
                // Prevents dense visual clutter/collisions when viewing the whole network at a distance.
                if (node.val >= 6 || globalScale > 1.5) {
                  // Normalize font size dynamically relative to camera zoom to maintain readable pixel height.
                  ctx.font = `${Math.max(12 / globalScale, 2)}px Sans-Serif`;
                  ctx.textAlign = 'center'; 
                  ctx.textBaseline = 'top';
                  ctx.fillStyle = '#ffffff';
                  // Offset label text slightly below the node circle boundary radius to prevent overlap
                  ctx.fillText(node.name || "", node.x, node.y + node.val + 4);
                }
              }}
            />
          </div>
        )}

        {tourStep === 2 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl p-6 w-96 z-[101] animate-in zoom-in-95 border border-blue-100 text-center">
            <div className="text-4xl mb-3">🕸️</div>
            <h3 className="font-bold text-blue-900 mb-2 text-lg">2. Interactive Network Map</h3>
            <p className="text-sm text-slate-600 mb-6">Nodes represent people, locations, and interests. Click on nodes to expand their connections, pan around, and zoom in/out to explore the ecosystem visually.</p>
            <div className="flex justify-between items-center text-left">
              <span className="text-xs font-semibold text-slate-400">Step 2 of 3</span>
              <div className="flex gap-2">
                <button onClick={endTour} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2">Skip</button>
                <button onClick={() => setTourStep(3)} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700">Next</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INSPECT CARD OVERLAY (Traverse Flow) */}
      {activeContact && (
        <ProfileModal
          contact={activeContact}
          onClose={() => setActiveContact(null)}
          showGraph={false}

          isNodeExpanded={expandedNodes.has(activeContact.id)}
          onToggleExpandNode={() => {
            setExpandedNodes(prev => {
              const newSet = new Set(prev);
              if (newSet.has(activeContact.id)) {
                newSet.delete(activeContact.id);
              } else {
                newSet.add(activeContact.id);
              }
              return newSet;
            });
          }}

          onRecenter={(person) => {
            setViewType("person");
            setSelectedPerson(person.name);
            setIsGlobalExpanded(false);
            setExpandedNodes(new Set());
            setActiveContact(null);
          }}

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
                  alert(`⭐ ${activeContact.name} is already in your vault!`);
                  return;
              }

              const { error } = await supabase
                .from('saved_contacts')
                .insert([{ contact_id: id, user_id: user.id }]); // <-- ID attached here!

              alert(`⭐ Saved ${activeContact.name} to your profile!`);
            } catch (e) {
              console.error("Failed to save contact", e);
            }
          }}
        />
      )}

      {/* FLOATING COPILOT */}
      <div className={`relative transition-all duration-300 ${tourStep === 3 ? 'z-[100]' : 'z-50'}`}>
        {tourStep === 3 && (
          <div className="fixed bottom-24 right-8 bg-white rounded-xl shadow-2xl p-5 w-80 z-[101] animate-in fade-in slide-in-from-bottom-4 border border-blue-400 ring-4 ring-blue-400/20">
            <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <span>🤖</span> 3. AI Copilot
            </h3>
            <p className="text-sm text-slate-600 mb-4">Need help analyzing the map? Ask the Copilot to find specific people, organizations, or skills within the current network.</p>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400">Step 3 of 3</span>
              <button onClick={endTour} className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700">Finish Tour</button>
            </div>
          </div>
        )}
      </div>

      {/* TOUR BACKDROP */}
      {tourStep > 0 && (
        <div className="fixed inset-0 z-[90] bg-slate-900/60 pointer-events-none transition-opacity duration-300" />
      )}

      {/* WELCOME MODAL */}
      {tourStep === 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mb-4">🗺️</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Welcome to the Explorer!</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              This visual map allows you to discover how people, locations, and interests are connected across the civic network.
              <br/><br/>
              Would you like a quick tour to learn how to navigate the graph?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={endTour} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Skip for now</button>
              <button onClick={startTour} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors">Start Tour</button>
            </div>
          </div>
        </div>
      )}


      {/* PREMIUM GATE MODAL */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative overflow-hidden bg-slate-900 border border-slate-800 text-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Background elements */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center text-3xl mb-4 border border-blue-500/20 shadow-inner">
                🔒
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2 bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text text-transparent">Unlock Network Connections</h2>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                You've reached the free guest limit for profile details. Log in or create a free account to unlock unlimited profile views, direct emails, bookmarking, and custom interactive pathways.
              </p>
              
              <div className="flex flex-col gap-3 w-full">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-extrabold px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 w-full"
                >
                  Log In / Sign Up
                </Link>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="py-3 text-slate-400 hover:text-white text-sm font-semibold transition-colors"
                >
                  Close & Keep Exploring
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESTART TOUR BUTTON */}
      <button onClick={() => setTourStep(0)} className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-full shadow-lg hover:bg-blue-50 hover:text-blue-600 hover:scale-105 transition-all group" title="Restart Tutorial">
        <span className="text-xl">❓</span>
        <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible whitespace-nowrap transition-all pointer-events-none">Restart Tutorial</span>
      </button>
    </div>
  );
}