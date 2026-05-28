"use client";

import {useState, useMemo, useRef} from "react";
import {useRouter} from "next/navigation";
import NetworkMap, {ForceGraphMethods} from "@/components/NetworkMap";
import {createClient} from "@/utils/supabase/client";
import MiniMapModal from "@/components/MiniMapModal";

interface MatchDashboardProps {
    initialContact: any;
    allContacts: any[];
    initialMatches: any[];
}

export default function MatchesDashboard({initialContact, allContacts, initialMatches}: MatchDashboardProps) {
    const router = useRouter();
    const fgRef = useRef<ForceGraphMethods | null>(null);

    const [matches, setMatches] = useState(initialMatches);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState({text: "", type: ""});
    const [isGraphExpanded, setIsGraphExpanded] = useState(false);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [activeMapContact, setActiveMapContact] = useState<any | null>(null);

    // --- Sub-graph Generation Pipeline (Copied from MiniMapModal) ---
    const microGraphData = useMemo(() => {
        if (!initialContact) return {nodes: [], links: [], hiddenCount: 0};

        const nodes: any[] = [];
        const links: any[] = [];
        const addedNodes = new Set<string>();
        const addedLinks = new Set<string>();
        let hiddenCount = 0;

        const createPersonTooltip = (c: any, isCenter = false) => {
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

        // 1. Ingest Focal Center Node
        nodes.push({
            id: initialContact.id,
            name: initialContact.name,
            group: "center",
            val: 12,
            color: "#fbbf24",
            title: createPersonTooltip(initialContact, true)
        });
        addedNodes.add(initialContact.id);

        const networkContacts = allContacts.filter(other =>
            other.id !== initialContact.id &&
            other.domains?.some((d: string) => initialContact.domains?.includes(d))
        );
        const isSmallNetwork = networkContacts.length <= 15;

        // 2. Iterate through Focal Node's Interests to construct Hubs and Connections
        initialContact.domains?.forEach((topic: string) => {
            if (!addedNodes.has(topic)) {
                nodes.push({
                    id: topic, name: topic, group: "topic_hub", val: 8, color: "#0ea5e9",
                    title: `<div style="text-align: center;"><strong>${topic}</strong><br/><span style="font-size: 10px; color: #94a3b8;">Interest Hub (Click to expand)</span></div>`
                });
                addedNodes.add(topic);
            }
            safeAddLink(initialContact.id, topic);

            allContacts.forEach(other => {
                if (other.id === initialContact.id || !other.domains?.includes(topic)) return;

                const shouldExpand = isGraphExpanded || expandedNodes.has(topic) || isSmallNetwork;

                if (shouldExpand) {
                    if (!addedNodes.has(other.id)) {
                        nodes.push({
                            id: other.id, name: other.name, group: "person", val: 5, color: "#ff0000",
                            title: createPersonTooltip(other)
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

        const adjustedHiddenCount = Math.floor(hiddenCount / (initialContact.domains?.length || 1));

        return {nodes, links, hiddenCount: adjustedHiddenCount};
    }, [allContacts, initialContact, isGraphExpanded, expandedNodes]);

    const handleGenerateMatches = async () => {
        setIsGenerating(true);
        setMessage({text: "", type: ""});

        try {
            const res = await fetch("/api/user/matchmaker", {method: "POST"});
            const data = await res.json();

            if (!res.ok) {
                if (res.status === 429) {
                    setMessage({text: data.message, type: "warning"});
                } else {
                    setMessage({text: data.message || "Failed to generate matches.", type: "error"});
                }
            } else {
                setMessage({text: data.message, type: "success"});
                // Force a hard refresh to get the new matches from the server
                router.refresh();
            }
        } catch (error) {
            setMessage({text: "Network error occurred.", type: "error"});
        } finally {
            setIsGenerating(false);
        }
    };

    const handleZoomIn = () => {
        fgRef.current?.zoom(1.5, 400);
    };
    const handleZoomOut = () => {
        fgRef.current?.zoom(0.66, 400);
    };
    const handleFitMap = () => {
        fgRef.current?.zoomToFit(400, 50);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] w-full bg-slate-50 overflow-hidden font-sans">

            {/* LEFT SIDEBAR: AI Matches Feed */}
            <div
                className="w-1/3 h-full bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h1 className="text-2xl font-black text-slate-800 mb-2">My Matches</h1>
                    <p className="text-sm text-slate-500 font-medium mb-4">
                        View your AI-computed synergies based on complementary skillsets and shared interests. AI
                        matches are automatically saved to this feed. To save a contact for later, you can add them to
                        your <a href="/profile" className="text-blue-600 hover:underline">Saved Contacts vault</a>.
                    </p>

                    <button
                        onClick={handleGenerateMatches}
                        disabled={isGenerating}
                        className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
                    >
                        {isGenerating ? "Analyzing Directory..." : "Generate New Matches (Daily)"}
                    </button>

                    {message.text && (
                        <div className={`mt-3 p-3 text-sm font-bold rounded-lg border ${
                            message.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                message.type === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    "bg-red-50 text-red-600 border-red-200"
                        }`}>
                            {message.text}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {matches.length === 0 ? (
                        <div className="text-center text-slate-500 text-sm py-10">
                            No matches found yet. Generate new matches to discover synergies!
                        </div>
                    ) : (
                        matches.map((match) => (
                            <div key={match.id}
                                 className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-slate-800 text-lg">{match.otherPerson.name}</h3>
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md">
                                        {(match.score * 100).toFixed(0)}% Match
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 mb-4 space-y-1">
                                    {match.otherPerson.role_title && <p>💼 {match.otherPerson.role_title}</p>}
                                    {match.otherPerson.campus && <p>📍 {match.otherPerson.campus}</p>}
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-sm font-medium text-slate-700 italic">"{match.rationale}"</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                                    {match.otherPerson.email_contact && (
                                        <a href={`mailto:${match.otherPerson.email_contact}`}
                                           className="text-blue-600 text-sm font-bold hover:underline">
                                            ✉️ Contact {match.otherPerson.name.split(' ')[0]}
                                        </a>
                                    )}
                                    <button
                                        onClick={async () => {
                                            try {
                                                const supabase = createClient();
                                                const {data: {user}} = await supabase.auth.getUser();
                                                if (!user) {
                                                    alert("You must be logged in to save contacts.");
                                                    return;
                                                }
                                                const {error} = await supabase.from('saved_contacts').insert([{
                                                    contact_id: match.otherPerson.id,
                                                    user_id: user.id
                                                }]);
                                                if (error) {
                                                    if (error.code === '23505') {
                                                        alert(`⭐ ${match.otherPerson.name} is already in your vault!`);
                                                        return;
                                                    }
                                                    throw error;
                                                }
                                                alert(`⭐ Saved ${match.otherPerson.name} to your vault!`);
                                            } catch (e) {
                                                console.error("Failed to save contact", e);
                                                alert("Could not save contact right now.");
                                            }
                                        }}
                                        className="text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold rounded-lg hover:bg-slate-800 hover:text-white transition-colors shadow-sm ml-auto"
                                    >
                                        ⭐ Save to Vault
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* RIGHT PANE: Network Map */}
            <div className="flex-1 h-full relative bg-slate-900">
                <div
                    className="absolute top-6 left-6 z-20 bg-slate-800/90 p-4 rounded-xl shadow-lg border border-slate-700 backdrop-blur">
                    <h2 className="text-white font-bold mb-1">Your Network Map</h2>
                    <p className="text-xs text-slate-400">Centered on your profile and interests.</p>
                </div>

                {(microGraphData.hiddenCount > 0 || isGraphExpanded) && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                        <button
                            onClick={() => {
                                setIsGraphExpanded(!isGraphExpanded);
                                if (isGraphExpanded) setExpandedNodes(new Set());
                            }}
                            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all ${
                                isGraphExpanded ? "bg-slate-700 text-white" : "bg-pink-500 text-white"
                            }`}
                        >
                            {isGraphExpanded ? "Collapse Network" : `Expand Network (${microGraphData.hiddenCount} Hidden)`}
                        </button>
                    </div>
                )}

                <div
                    className="absolute bottom-8 right-8 z-20 flex flex-col space-y-2 bg-slate-800/80 p-2 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700">
                    <button onClick={handleZoomIn}
                            className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none"
                            title="Zoom In">➕
                    </button>
                    <button onClick={handleFitMap}
                            className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none"
                            title="Fit to Screen">⛶
                    </button>
                    <button onClick={handleZoomOut}
                            className="text-white hover:bg-slate-700 p-3 rounded-lg font-bold text-lg leading-none"
                            title="Zoom Out">➖
                    </button>
                </div>

                {microGraphData.nodes.length > 0 && (
                    <div className="absolute inset-0">
                        <NetworkMap
                            ref={fgRef}
                            graphData={{nodes: microGraphData.nodes, links: microGraphData.links}}
                            onNodeClick={(node: any) => {
                                const nodeId = String(node.id);
                                if (node.group === "person" || node.group === "center") {
                                    const clickedPerson = allContacts.find((c: any) => c.id === nodeId);
                                    if (clickedPerson) setActiveMapContact(clickedPerson);
                                } else if (node.group === "topic_hub" || node.group === "location_hub") {
                                    setExpandedNodes(prev => {
                                        const newSet = new Set(prev);
                                        if (newSet.has(nodeId)) newSet.delete(nodeId);
                                        else newSet.add(nodeId);
                                        return newSet;
                                    });
                                }
                            }}
                            onZoom={() => {
                            }}
                            nodeRelSize={5}
                            nodeLabel="title"
                            linkColor={() => "rgba(255, 255, 255, 0.4)"}
                            linkWidth={1.5}
                            linkDirectionalParticles={1}
                            linkDirectionalParticleSpeed={0.005}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                                const n = node as any;
                                const size = (n.val || 5) + 1;
                                ctx.beginPath();
                                ctx.arc(n.x, n.y, size, 0, 2 * Math.PI, false);
                                ctx.fillStyle = n.color || "#cccccc";
                                ctx.fill();

                                if (globalScale >= 1.5 || (n.val && n.val >= 8)) {
                                    const label = n.name || "";
                                    const fontSize = Math.max(12 / globalScale, 2);
                                    ctx.font = `${fontSize}px Sans-Serif`;
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'top';
                                    ctx.fillStyle = '#ffffff';
                                    ctx.fillText(label, n.x, n.y + size + 4);
                                }
                            }}
                        />
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

                            if (error) throw error;
                            alert(`⭐ Saved contact to your vault!`);
                        } catch (e) {
                            console.error("Failed to save contact", e);
                            alert("Could not save contact right now.");
                        }
                    }}
                />
            )}
        </div>
    );
}
