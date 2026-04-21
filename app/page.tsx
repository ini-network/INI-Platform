"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { INTEREST_BUCKETS } from "@/lib/taxonomy";
import ProfileModal, { GraphNode, GraphLink } from "@/components/ProfileModal";
import { createClient } from '../utils/supabase/client';
import Copilot from "@/components/Copilot";

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
        const { data, error } = await supabase
          .from('contacts')
          .select(`*, contact_domains (domains (domain_name))`);

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
         const granularTagsInFolder = INTEREST_BUCKETS[selectedFocus] || [];
         focusMatch = granularTagsInFolder.some(tag => person.domains.includes(tag));
      }

      return keywordMatch && campusMatch && focusMatch;
    });
  }, [allContacts, searchQuery, selectedCampus, selectedFocus]);

  const uniqueCampuses = Array.from(new Set(allContacts.map(c => c.campus).filter(Boolean))).sort();
  const uniqueFocusAreas = Object.keys(INTEREST_BUCKETS);

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
    if (!microMapContact) return { nodes: [], links: [], hiddenCount: 0 };

    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const addedNodes = new Set<string>();
    const addedLinks = new Set<string>();
    let hiddenCount = 0;

    const safeAddLink = (s: string, t: string) => {
      const key = `${s}->${t}`;
      const reverseKey = `${t}->${s}`;
      if (!addedLinks.has(key) && !addedLinks.has(reverseKey)) {
        addedLinks.add(key);
        links.push({ source: s, target: t });
      }
    };

    // 1. Add the Center Person
    nodes.push({
      id: microMapContact.id,
      name: microMapContact.name,
      group: "center",
      val: 12,
      color: "#fbbf24",
      title: `CENTER: ${microMapContact.name}`
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
        nodes.push({ id: topic, name: topic, group: "topic_hub", val: 8, color: "#0ea5e9", title: `INTEREST: ${topic} (Click to expand)` });
        addedNodes.add(topic);
      }
      safeAddLink(microMapContact.id, topic);

      // Add the connected people
      allContacts.forEach(other => {
        if (other.id === microMapContact.id || !other.domains?.includes(topic)) return;

        const shouldExpand = isGraphExpanded || expandedNodes.has(topic) || isSmallNetwork;

        if (shouldExpand) {
          if (!addedNodes.has(other.id)) {
            nodes.push({ id: other.id, name: other.name, group: "person", val: 5, color: "#ff0000", title: `CONTACT: ${other.name}` });
            addedNodes.add(other.id);
          }
          safeAddLink(topic, other.id);
        } else {
          // We only count them as hidden if they aren't already on the map from another topic
          if (!addedNodes.has(other.id)) {
            hiddenCount++;
          }
        }
      });
    });

    // Approximate hidden count adjustment so we don't over-count people sharing multiple topics
    const adjustedHiddenCount = Math.floor(hiddenCount / (microMapContact.domains?.length || 1));

    return { nodes, links, hiddenCount: adjustedHiddenCount };
  }, [allContacts, microMapContact, isGraphExpanded, expandedNodes]);


  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden font-sans relative">

      {/* DIRECTORY */}
      <div className="w-full h-full p-8 overflow-y-auto bg-white">

        {/* Header with Navigation Tabs */}
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-800">🏙️ CUNY Civic Discovery</h1>
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
            <Link href="/" className="px-4 py-2 bg-white shadow rounded text-sm font-semibold text-slate-800">
              Workspace
            </Link>
            <Link href="/explore" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
              Map Explorer
            </Link>
            <Link href="/collab" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
              Collaboration Hub
            </Link>
            <Link href="/profile" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
              My Profile
            </Link>
            <Link href="/contribute" className="px-4 py-2 text-slate-500 rounded text-sm font-semibold hover:bg-slate-200 transition-colors">
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
                <h3 className="text-lg font-bold text-blue-900">{person.name}</h3>
                <p className="text-sm text-slate-600 font-medium mb-2">{person.campus} | {person.role_title}</p>
                {person.affiliation && <p className="text-sm text-slate-700"><span className="font-semibold">🏢 Title:</span> {person.affiliation}</p>}
                {person.domains && person.domains.length > 0 && <p className="text-sm text-slate-700"><span className="font-semibold">🎯 Focus:</span> {person.domains.join(", ")}</p>}

                {person.capabilities && <p className="text-sm text-slate-700"><span className="font-semibold">🛠️ Skillset:</span> {person.capabilities}</p>}

                {person.notes && (
                  <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-600 italic">
                      <span className="font-semibold not-italic text-slate-700">📝 Notes:</span> {person.notes}
                    </p>
                  </div>
                )}

                {/* FULLY RESTORED SAVE CONTACT BUTTON */}
                <button
                  onClick={async () => {
                    try {
                      const supabase = createClient();
                      const { error } = await supabase
                        .from('saved_contacts')
                        .insert([{ contact_id: person.id }]);

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
      }} />

      {/* MAP MODAL OVERLAY */}
      {inspectContact && microMapContact && (
        <ProfileModal
          contact={inspectContact}
          onClose={() => { setInspectContact(null); setMicroMapContact(null); setExpandedNodes(new Set()); }}
          showGraph={true}
          graphData={{ nodes: microGraphData.nodes, links: microGraphData.links }}
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
              const { error } = await supabase
                .from('saved_contacts')
                .insert([{ contact_id: id }]);

              if (error) throw error;
              alert(`⭐ Saved ${inspectContact.name} to your profile!`);
            } catch (e) {
              console.error("Failed to save contact", e);
            }
          }}
        />
      )}
    </div>
  );
}