// src/app/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
// Dynamic import for the physics engine to prevent server-side crashes
import dynamic from 'next/dynamic';
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// Define the shape of a Contact to replace "any"
interface Contact {
  "Contact Name": string;
  "Program/Org Affiliation"?: string;
  "Notes / Insights"?: string;
  "Campus"?: string;
  "Civic Domains"?: string;
  "Capabilities / Expertise"?: string;
  "Role/Title"?: string;
  [key: string]: string | undefined; // Allow other properties
}

// Define the shape of a Graph Node to replace "any"
interface GraphNode {
  id: string;
  name: string;
  group: string;
  val: number;
  title: string;
  x?: number;
  y?: number;
  color?: string;
}

interface GraphLink {
  source: string;
  target: string;
}

export default function Home() {
  // --- STATE MANAGEMENT ---
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Master List & Filters
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("All");
  const [selectedFocus, setSelectedFocus] = useState("All");

  // Micro Map State (If this holds a person's data, the modal opens)
  const [microMapContact, setMicroMapContact] = useState<Contact | null>(null);

  // --- INITIAL DATA FETCH ---
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

  // --- DYNAMIC FILTERING (List View) ---
  const displayedContacts = useMemo(() => {
    return allContacts.filter((person) => {
      const keywordMatch = searchQuery === "" ||
        (person["Contact Name"]?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (person["Program/Org Affiliation"]?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (person["Notes / Insights"]?.toLowerCase() || "").includes(searchQuery.toLowerCase());

      const campusMatch = selectedCampus === "All" || person["Campus"] === selectedCampus;
      const focusMatch = selectedFocus === "All" || (person["Civic Domains"] && person["Civic Domains"].includes(selectedFocus));

      return keywordMatch && campusMatch && focusMatch;
    });
  }, [allContacts, searchQuery, selectedCampus, selectedFocus]);

  // Extract unique filter options automatically
  const uniqueCampuses = Array.from(new Set(allContacts.map(c => c["Campus"]).filter(Boolean))).sort();
  const allDomains = allContacts.flatMap(c => (c["Civic Domains"] || "").split(",").map((d: string) => d.trim())).filter(Boolean);
  const uniqueFocusAreas = Array.from(new Set(allDomains)).sort();

  // --- MICRO MAP GRAPH GENERATOR ---
  const microGraphData = useMemo(() => {
    if (!microMapContact) return { nodes: [], links: [] };

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const addedNodes = new Set<string>();

    const centerId = microMapContact["Contact Name"];

    if (!centerId) return { nodes, links };

    // 1. Center Node
    const centerOrgOrTitle = microMapContact["Program/Org Affiliation"] || microMapContact["Role/Title"];
    nodes.push({
      id: centerId,
      name: microMapContact["Contact Name"],
      group: "center",
      val: 8,
      title: `${microMapContact["Contact Name"]} - ${microMapContact["Campus"]} | ${centerOrgOrTitle}`
    });
    addedNodes.add(centerId);

    if (microMapContact["Civic Domains"]) {
      const topics = microMapContact["Civic Domains"].split(",").map((d: string) => d.trim()).filter(Boolean);

      topics.forEach((topic: string) => {
        nodes.push({
          id: topic,
          name: topic,
          group: "topic_hub",
          val: 6,
          title: `FOCUS AREA: ${topic}`
        });

        // Bridge Center Person to Topic
        addedNodes.add(topic);
        links.push({ source: centerId, target: topic });

        allContacts.forEach(otherPerson => {
          const otherId = otherPerson["Contact Name"];

          if (!otherId || otherId === centerId || addedNodes.has(otherId)) return;

          if (otherPerson["Civic Domains"] && otherPerson["Civic Domains"].includes(topic)) {
            const otherOrgOrTitle = otherPerson["Program/Org Affiliation"] || otherPerson["Role/Title"];

            nodes.push({
              id: otherId,
              name: otherPerson["Contact Name"],
              group: otherPerson["Campus"] || "Unknown",
              val: 3,
              title: `${otherPerson["Contact Name"]} - ${otherPerson["Campus"]} | ${otherOrgOrTitle}`
            });
            addedNodes.add(otherId);
            links.push({ source: otherId, target: topic });
          }
        });
      });
    }

    return { nodes, links };
  }, [microMapContact, allContacts]);


  // --- COPILOT LOGIC ---
  const askCopilot = async () => {
    if (!prompt) return;

    const newHistory = [...chatHistory, { role: "user", content: prompt }];
    setChatHistory(newHistory);
    setIsLoading(true);
    setPrompt("");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: newHistory[newHistory.length - 1].content }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setChatHistory([...newHistory, { role: "ai", content: data.insight }]);
        if (data.matches.length > 0) {
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           const names = data.matches.map((m: any) => m["Contact Name"]);
           setSearchQuery(names.join("|"));
        }
      } else {
        setChatHistory([...newHistory, { role: "ai", content: "Error: " + data.message }]);
      }
    } catch (error) {
      setChatHistory([...newHistory, { role: "ai", content: "Failed to connect to Python server." }]);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">

      {/* LEFT PANE: DIRECTORY (70%) */}
      <div className="w-2/3 h-full p-8 overflow-y-auto border-r border-slate-200 bg-white">

        {/* Header with New Navigation Tabs */}
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-800">🏙️ CUNY Civic Discovery</h1>
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
            <Link href="/" className="px-4 py-2 bg-white shadow rounded text-sm font-semibold text-slate-800">
              Workspace
            </Link>
            <Link href="/explore" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
              Map Explorer
            </Link>
            <Link href="/hub" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
              Join Us
            </Link>
          </div>
        </div>

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
            <select
              className="border border-slate-200 rounded-lg p-2 text-sm bg-white"
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value)}
            >
              <option value="All">All Focus Areas</option>
              {uniqueFocusAreas.map(focus => (
                <option key={focus as string} value={focus as string}>{focus as string}</option>
              ))}
            </select>
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
              <div key={index} className="p-5 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-blue-900">{person["Contact Name"]}</h3>
                <p className="text-sm text-slate-600 font-medium mb-2">{person["Campus"]} | {person["Role/Title"]}</p>
                {person["Program/Org Affiliation"] && <p className="text-sm text-slate-700"><span className="font-semibold">🏢 Title:</span> {person["Program/Org Affiliation"]}</p>}
                {person["Civic Domains"] && <p className="text-sm text-slate-700"><span className="font-semibold">🎯 Focus:</span> {person["Civic Domains"]}</p>}

                {/* RENAMED: Capabilities -> Skillset */}
                {person["Capabilities / Expertise"] && <p className="text-sm text-slate-700"><span className="font-semibold">🛠️ Skillset:</span> {person["Capabilities / Expertise"]}</p>}

                {/* ADDED: Raw Notes Block */}
                {person["Notes / Insights"] && (
                  <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-600 italic">
                      <span className="font-semibold not-italic text-slate-700">📝 Notes:</span> {person["Notes / Insights"]}
                    </p>
                  </div>
                )}

                {/* MICRO MAP TRIGGER BUTTON */}
                <button
                  onClick={() => setMicroMapContact(person)}
                  className="mt-4 text-sm text-blue-600 bg-blue-50 border border-blue-100 px-4 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white font-semibold transition-all"
                >
                  🗺️ View Connections Map
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT PANE: AI COPILOT (30%) */}
      <div className="w-1/3 h-full flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-bold text-slate-800">🤖 Civic Copilot</h2>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chatHistory.map((msg, index) => (
            <div key={index} className={`p-4 rounded-xl max-w-[90%] text-sm shadow-sm whitespace-pre-wrap ${
              msg.role === "user" ? "bg-blue-600 text-white ml-auto" : "bg-white border border-slate-200 text-slate-800 mr-auto"
            }`}>
              {msg.content}
            </div>
          ))}
          {isLoading && <div className="text-slate-400 text-sm animate-pulse ml-2">Analyzing network...</div>}
        </div>

        <div className="p-4 bg-white border-t border-slate-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && askCopilot()}
              placeholder="Ask Copilot to find partners..."
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={askCopilot}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Ask
            </button>
          </div>
        </div>
      </div>

      {/* ==========================================
          THE MICRO MAP MODAL (OVERLAY)
          ========================================== */}
      {microMapContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-8">
          <div className="bg-white w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">

            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{microMapContact["Contact Name"]}&apos;s Network</h2>
                <p className="text-slate-500">{microMapContact["Campus"]} | {microMapContact["Role/Title"]}</p>
              </div>
              <button
                onClick={() => setMicroMapContact(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold transition-colors"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 p-6 bg-slate-50 border-r border-slate-100 flex flex-col space-y-6 overflow-y-auto">
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Focus Areas</h3>
                  <div className="flex flex-wrap gap-2">
                    {microMapContact["Civic Domains"]?.split(",").map((d: string, i: number) => (
                      <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-medium">{d.trim()}</span>
                    ))}
                  </div>
                </div>

                {/* RENAMED: Capabilities -> Skillset in Modal */}
                {microMapContact["Capabilities / Expertise"] && (
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Skillset</h3>
                    <p className="text-sm text-slate-700">{microMapContact["Capabilities / Expertise"]}</p>
                  </div>
                )}

                {/* ADDED: Notes in Modal */}
                {microMapContact["Notes / Insights"] && (
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Notes</h3>
                    <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3 py-1 bg-white rounded-r-md">
                      {microMapContact["Notes / Insights"]}
                    </p>
                  </div>
                )}

                {/* Collaboration & Ask Buttons */}
                <div className="mt-auto border-t border-slate-200 pt-6 space-y-3">
                  <button className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg hover:bg-slate-700 transition-colors shadow-sm">
                    ⭐ Save Contact
                  </button>
                  <button className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                    ✉️ Express Interest
                  </button>
                </div>
              </div>

              <div className="w-2/3 h-full min-h-[600px] relative bg-slate-900 overflow-hidden flex items-center justify-center">
                <div className="absolute top-4 left-4 z-10 text-white/60 text-xs font-medium pointer-events-none bg-slate-800/50 p-2 rounded backdrop-blur">
                  Connections are bridged by shared Focus Areas.
                </div>

                <ForceGraph2D
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  graphData={microGraphData as any}
                  nodeAutoColorBy="group"
                  nodeRelSize={5}
                  linkDirectionalParticles={1}
                  linkDirectionalParticleSpeed={0.005}
                  nodeLabel="title"
                  cooldownTime={3000}
                  onEngineStop={() => console.log("Physics settled.")}
                  width={800}
                  height={600}
                  linkColor={() => "rgba(255, 255, 255, 0.4)"}
                  linkWidth={1.5}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
                    const size = node.val + 1;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color || "#cccccc";
                    ctx.fill();

                    const label = node.name;
                    const fontSize = Math.max(12 / globalScale, 2);
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';

                    const textWidth = ctx.measureText(label).width;
                    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
                    ctx.fillRect(
                      node.x - textWidth / 2 - 2,
                      node.y + size + 2,
                      textWidth + 4,
                      fontSize + 4
                    );

                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(label, node.x, node.y + size + 4);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}