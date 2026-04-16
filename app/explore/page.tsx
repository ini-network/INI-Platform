// src/app/explore/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from 'next/dynamic';

// --- STRICT TYPESCRIPT INTERFACES ---
interface Contact {
  "Contact Name": string;
  "Program/Org Affiliation"?: string;
  "Notes / Insights"?: string;
  "Campus"?: string;
  "Civic Domains"?: string;
  "Capabilities / Expertise"?: string;
  "Role/Title"?: string;
  [key: string]: string | undefined;
}

// A unified type that satisfies both your data AND the physics engine's internal velocity requirements
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

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

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
  "Education & Youth Development": ["Education", "Youth", "Mentorship", "K-12", "Curriculum", "Pedagogy", "Schools", "Student", "Teaching", "Learning"],
  "Justice, Policy & Government": ["Justice", "Policy", "Government", "Law", "Advocacy", "Human Rights", "Criminal", "Immigration", "Police", "Voting", "Civic"],
  "Health & Wellness": ["Health", "Wellness", "Medicine", "Mental Health", "Public Health", "Care", "Disability", "Nursing"],
  "Community & Civic Engagement": ["Community", "Engagement", "Outreach", "Organizing", "Neighborhood", "Housing", "Mutual Aid", "Volunteer"],
  "Economic Empowerment & Workforce": ["Economic", "Workforce", "Labor", "Employment", "Finance", "Business", "Career", "Poverty", "Industry"],
  "Arts, Media & Culture": ["Arts", "Media", "Culture", "Design", "History", "Literature", "Theater", "Music", "Journalism", "Communication"],
  "Environment & Sustainability": ["Environment", "Sustainability", "Climate", "Food Security", "Food Justice", "Food Policy", "Ecology", "Energy", "Green", "Urban Planning"],
  "Technology, Data & Innovation": ["Technology", "Data", "Innovation", "AI", "Digital", "Engineering", "Computer Science", "STEM", "Tech", "Cyber"],
  "Research & Social Sciences": ["Research", "Social Science", "Sociology", "Psychology", "Anthropology", "Evaluation", "Data Collection", "Study"],
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
  const [allContacts, setAllContacts] = useState<Contact[]>([]);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Map Controls Reference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  // Navigation State
  const [viewType, setViewType] = useState<"topic" | "location" | "person">("location");
  const [locationSubFilter, setLocationSubFilter] = useState<"cuny" | "partner">("cuny");

  // Selection State
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedFocusDomain, setSelectedFocusDomain] = useState("");
  const [selectedSpecificFocus, setSelectedSpecificFocus] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  // Load user's sidebar preference safely
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

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const resContacts = await fetch("/api/contacts");
        const dataContacts = await resContacts.json();
        if (Array.isArray(dataContacts)) setAllContacts(dataContacts);
      } catch (error) {
        console.error("Failed to load directory data:", error);
      }
    };
    fetchInitialData();
  }, []);

  const uniqueLocations = Array.from(new Set(allContacts.map(c => c["Campus"]).filter(Boolean))).sort() as string[];
  const cunyOptions = uniqueLocations.filter(loc => CUNY_LIST.some(c => loc.toLowerCase().includes(c.toLowerCase())));
  const partnerOptions = uniqueLocations.filter(loc => !CUNY_LIST.some(c => loc.toLowerCase().includes(c.toLowerCase())));

  const allDomainsRaw = allContacts.flatMap(c => (c["Civic Domains"] || "").split(",").map((d: string) => d.trim())).filter(Boolean);
  const uniqueFocusAreas = Array.from(new Set(allDomainsRaw)).sort() as string[];

  const allPeopleOptions = Array.from(new Set(allContacts.map(c => c["Contact Name"]).filter(Boolean))).sort() as string[];

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

  // Map Navigation Handlers
  const handleZoomIn = () => { fgRef.current?.zoom(1.5, 400); };
  const handleZoomOut = () => { fgRef.current?.zoom(0.66, 400); };
  const handleFitMap = () => { fgRef.current?.zoomToFit(400, 50); };

  // --- MACRO GRAPH GENERATOR ---
  const exploreGraphData = useMemo(() => {
    const nodes: LibNode[] = [];
    const links: GraphLink[] = [];
    const addedNodes = new Set<string>();

    if (viewType === "person" && selectedPerson) {
      const centerPerson = allContacts.find(c => c["Contact Name"] === selectedPerson);
      if (!centerPerson) return { nodes, links };

      nodes.push({ id: selectedPerson, name: selectedPerson, group: "center", val: 12, color: "#fbbf24", title: `PERSON: ${selectedPerson}` });
      addedNodes.add(selectedPerson);

      const location = centerPerson["Campus"];
      if (location && !addedNodes.has(location)) {
         const isCuny = CUNY_LIST.some(c => location.toLowerCase().includes(c.toLowerCase()));
         nodes.push({ id: location, name: location, group: "location_hub", val: 8, color: isCuny ? "#10b981" : "#a855f7", title: `LOCATION: ${location}` });
         addedNodes.add(location);
         links.push({ source: selectedPerson, target: location });
      }

      if (centerPerson["Civic Domains"]) {
        const topics = centerPerson["Civic Domains"].split(",").map((d: string) => d.trim()).filter(Boolean);
        topics.forEach((topic: string) => {
          if (!addedNodes.has(topic)) {
            nodes.push({ id: topic, name: topic, group: "topic_hub", val: 7, color: "#0ea5e9", title: `INTEREST: ${topic}` });
            addedNodes.add(topic);
          }
          links.push({ source: selectedPerson, target: topic });

          allContacts.forEach(other => {
            const otherId = other["Contact Name"];
            if (!otherId || otherId === selectedPerson || addedNodes.has(otherId)) return;
            if (other["Civic Domains"]?.includes(topic)) {
              nodes.push({ id: otherId, name: otherId, group: "person", val: 3, color: "#94a3b8", title: `${otherId} | ${other["Campus"]}` });
              addedNodes.add(otherId);
              links.push({ source: otherId, target: topic });
            }
          });
        });
      }
      return { nodes, links };
    }

    const targetNodes = viewType === "location" ? [selectedLocation] : [selectedSpecificFocus];
    const mainTarget = targetNodes[0];

    if (!mainTarget) return { nodes, links };

    const isTopic = viewType === "topic";
    const centerColor = isTopic ? "#0ea5e9" : (locationSubFilter === "cuny" ? "#10b981" : "#a855f7");

    nodes.push({ id: mainTarget, name: mainTarget, group: isTopic ? "topic_hub" : "location_hub", val: 12, color: centerColor, title: `${isTopic ? 'INTEREST' : 'LOCATION'}: ${mainTarget}` });
    addedNodes.add(mainTarget);

    allContacts.forEach(person => {
      const personId = person["Contact Name"];
      if (!personId) return;

      const hasLocationMatch = person["Campus"] === mainTarget;
      const hasTopicMatch = person["Civic Domains"]?.includes(mainTarget);

      if ((viewType === "location" && hasLocationMatch) || (viewType === "topic" && hasTopicMatch)) {
        if (!addedNodes.has(personId)) {
          nodes.push({ id: personId, name: personId, group: "person", val: 3, color: "#fbbf24", title: `${personId} | ${person["Campus"]} (${person["Role/Title"]})` });
          addedNodes.add(personId);
        }
        links.push({ source: personId, target: mainTarget });

        if (viewType === "location" && person["Civic Domains"]) {
          person["Civic Domains"].split(",").map((d: string) => d.trim()).forEach((topic: string) => {
            if (!topic) return;
            if (!addedNodes.has(topic)) {
              nodes.push({ id: topic, name: topic, group: "topic_hub", val: 5, color: "#0ea5e9", title: `INTEREST: ${topic}` });
              addedNodes.add(topic);
            }
            links.push({ source: personId, target: topic });
          });
        }
      }
    });

    return { nodes, links };
  }, [allContacts, viewType, selectedLocation, selectedSpecificFocus, selectedPerson, locationSubFilter]);

  return (
    <div className="flex h-screen w-full bg-slate-900 overflow-hidden font-sans">

      {/* LEFT SIDEBAR: NAVIGATION (Collapsible) */}
      <div className={`${isSidebarOpen ? "w-1/4" : "hidden"} h-full bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl transition-all duration-300 flex-shrink-0`}>
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
              <div>
                  <h1 className="text-2xl font-bold text-slate-800 mb-1">🔭 Explorer</h1>
                  <Link href="/" className="text-sm text-blue-600 hover:underline font-medium">
                      ← Back to Workspace
                  </Link>
              </div>

              {/* The new Label + Button Stack */}
              <div className="flex flex-col items-center">
                  <span
                      className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-tighter">Hide Controls</span>
                  <button
                      onClick={toggleSidebar}
                      className="p-2 bg-slate-100 hover:bg-slate-800 hover:text-white text-slate-500 rounded-lg transition-all border border-slate-200 shadow-sm"
                      title="Hide"
                  >
                      <span className="font-bold">◀</span>
                  </button>
              </div>
          </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <div>
            <div className="flex bg-slate-100 p-1 rounded-xl flex-col space-y-1">
              <div className="flex space-x-1">
                <button
                  onClick={() => { setViewType("location"); setSelectedLocation(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${viewType === "location" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  By Location
                </button>
                <button
                  onClick={() => { setViewType("topic"); setSelectedSpecificFocus(""); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${viewType === "topic" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  By Interest
                </button>
              </div>
              <button
                onClick={() => { setViewType("person"); setSelectedPerson(""); }}
                className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${viewType === "person" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                By Person
              </button>
            </div>
          </div>

          {/* Location Logic */}
          {viewType === "location" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-3 block">Location Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setLocationSubFilter("cuny"); setSelectedLocation(""); }}
                    className={`py-2 text-xs font-bold border-2 rounded-lg ${locationSubFilter === "cuny" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-100 text-slate-400"}`}
                  >
                    CUNY Campuses
                  </button>
                  <button
                    onClick={() => { setLocationSubFilter("partner"); setSelectedLocation(""); }}
                    className={`py-2 text-xs font-bold border-2 rounded-lg ${locationSubFilter === "partner" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-100 text-slate-400"}`}
                  >
                    Community Partners
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Search Location</label>
                <SearchableDropdown
                  options={locationSubFilter === "cuny" ? cunyOptions : partnerOptions}
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder="Type to search locations..."
                />
              </div>
            </div>
          )}

          {/* Interest Logic */}
          {viewType === "topic" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <label className="text-xs font-bold uppercase text-blue-500 mb-2 block">🔍 Global Keyword Search</label>
                <FuzzySearchDropdown
                  options={uniqueFocusAreas}
                  value={selectedSpecificFocus}
                  onChange={(val) => {
                    setSelectedSpecificFocus(val);
                    setSelectedFocusDomain("");
                  }}
                  placeholder="e.g., &apos;Food Justice&apos;"
                />
              </div>

              <div className="flex items-center">
                <div className="flex-1 border-t border-slate-200"></div>
                <span className="px-3 text-xs font-bold text-slate-400 uppercase">OR BROWSE FOLDERS</span>
                <div className="flex-1 border-t border-slate-200"></div>
              </div>

              <div>
                <div className="flex flex-col space-y-1">
                  {Object.keys(INTEREST_BUCKETS).map(domain => (
                    <button
                      key={domain}
                      onClick={() => handleDomainClick(domain)}
                      className={`p-2.5 text-left text-xs font-bold rounded-lg border-2 transition-all ${selectedFocusDomain === domain ? "border-slate-400 bg-slate-100 text-slate-800" : "border-slate-100 text-slate-500 hover:border-slate-200"}`}
                    >
                      📁 {domain}
                    </button>
                  ))}
                </div>
              </div>

              {selectedFocusDomain && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Select Specific Interest</label>
                  <SearchableDropdown
                    options={filteredFocusOptions}
                    value={selectedSpecificFocus}
                    onChange={setSelectedSpecificFocus}
                    placeholder={`Search within ${selectedFocusDomain}...`}
                  />
                </div>
              )}
            </div>
          )}

          {/* Person Logic */}
          {viewType === "person" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-2">
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 mb-2 block">Search Directory</label>
                <SearchableDropdown
                  options={allPeopleOptions}
                  value={selectedPerson}
                  onChange={setSelectedPerson}
                  placeholder="Type a name..."
                />
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
                <div className="flex items-center text-xs"><span className="w-3 h-3 rounded-full bg-amber-400 mr-2"></span> Person</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANE: THE UNIVERSE */}
      <div className={`h-full relative flex items-center justify-center bg-slate-900 transition-all duration-300 ${isSidebarOpen ? "w-3/4" : "w-full"}`}>

        {/* Toggle Button when Sidebar is closed */}
        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="absolute top-6 left-6 z-20 bg-slate-800/90 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur border border-slate-700 hover:bg-slate-700 transition-colors font-bold flex items-center space-x-2"
          >
            <span>▶</span>
            <span className="text-sm uppercase tracking-wide">Show Controls</span>
          </button>
        )}

        {/* Map Navigation Controls */}
        {exploreGraphData.nodes.length > 0 && (
          <div className="absolute bottom-8 right-8 z-20 flex flex-col space-y-2 bg-slate-800/80 p-2 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
            <button onClick={handleZoomIn} className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none" title="Zoom In">➕</button>
            <button onClick={handleFitMap} className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none" title="Fit to Screen">⛶</button>
            <button onClick={handleZoomOut} className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none" title="Zoom Out">➖</button>
          </div>
        )}

        {exploreGraphData.nodes.length === 0 ? (
          <div className="bg-slate-800/80 p-8 rounded-2xl text-center border border-slate-700 shadow-2xl animate-fade-in">
            <p className="text-white text-xl font-bold mb-2">Awaiting Instructions 🔭</p>
            <p className="text-slate-400 text-sm">Select a location, interest, or person from the sidebar to generate a map.</p>
          </div>
        ) : (
          <div className="absolute inset-0">
            <ForceGraph2D
                  ref={fgRef}
                  onNodeClick={(node: LibNode) => {
                    if (node.group === "person" || (viewType === "person" && node.group === "center")) {
                      const personData = allContacts.find(c => c["Contact Name"] === node.id);
                      if (personData) setActiveContact(personData);
                    }
                  }}
                  graphData={exploreGraphData}
                  nodeRelSize={5}
                  linkDirectionalParticles={1}
                  linkDirectionalParticleSpeed={0.005}
                  nodeLabel="title"
                  cooldownTime={3000}
                  linkColor={() => "rgba(255, 255, 255, 0.2)"}
                  linkWidth={1.2}
                  nodeCanvasObject={(node: LibNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    if (node.x === undefined || node.y === undefined || node.val === undefined) return;

                    const size = node.val + 1;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color || "#cccccc";
                    ctx.fill();

                    if (node.val >= 8 || globalScale > 1.8) {
                      const label = node.name || "";
                      const fontSize = Math.max(12 / globalScale, 2);
                      ctx.font = `${fontSize}px Sans-Serif`;
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'top';

                      const textWidth = ctx.measureText(label).width;
                      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
                      ctx.fillRect(node.x - textWidth / 2 - 2, node.y + size + 2, textWidth + 4, fontSize + 4);

                      ctx.fillStyle = '#ffffff';
                      ctx.fillText(label, node.x, node.y + size + 4);
                    }
                  }}
                />
          </div>
        )}
      </div>
        {/* ==========================================
          THE PROFILE CARD MODAL (OVERLAY)
          ========================================== */}
      {activeContact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

            <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{activeContact["Contact Name"]}</h2>
                <p className="text-slate-500 font-medium">{activeContact["Campus"]} | {activeContact["Role/Title"]}</p>
              </div>
              <button
                onClick={() => setActiveContact(null)}
                className="bg-white hover:bg-slate-100 text-slate-400 px-3 py-1 rounded-lg border border-slate-200 font-bold transition-colors shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
              {activeContact["Program/Org Affiliation"] && (
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Title</h3>
                  <p className="text-slate-800 font-semibold text-lg">🏢 {activeContact["Program/Org Affiliation"]}</p>
                </div>
              )}

              <div>
                <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {activeContact["Civic Domains"]?.split(",").map((d: string, i: number) => (
                    <span key={i} className="bg-sky-50 text-sky-700 text-xs px-3 py-1.5 rounded-full font-bold border border-sky-100">{d.trim()}</span>
                  ))}
                </div>
              </div>

              {activeContact["Capabilities / Expertise"] && (
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Skillset</h3>
                  <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">{activeContact["Capabilities / Expertise"]}</p>
                </div>
              )}

              {activeContact["Notes / Insights"] && (
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 mb-2 tracking-widest">Notes</h3>
                  <p className="text-sm text-slate-600 italic border-l-4 border-slate-200 pl-4 py-2">
                    {activeContact["Notes / Insights"]}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-auto border-t border-slate-100 p-6 flex gap-3 bg-slate-50/50">
              <button className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors shadow-sm">
                ⭐ Save Contact
              </button>
              <button className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                ✉️ Express Interest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}