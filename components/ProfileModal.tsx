"use client";

import NetworkMap, { ForceGraphMethods } from "@/components/NetworkMap";
import { useState, useRef } from "react";

// --- TYPESCRIPT SCHEMAS & CONTRACTS ---

/**
 * Node structure for the mini-graph visualizer.
 * Incorporates D3 physics simulation optional coordinates (x, y) 
 * projected onto a 2D Euclidean coordinate space during calculation.
 */
export interface GraphNode {
  id: string;
  name: string;
  group: string;
  val: number;
  title: string;
  x?: number;
  y?: number;
  color?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

/**
 * Standard public directory profile DTO.
 */
export interface ContactProfile {
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
  domains?: string[];
}

interface ProfileModalProps {
  contact: ContactProfile;
  onClose: () => void;
  onSaveContact?: (contactId: string) => Promise<void> | void; // Vault bookmarking callback
  onRecenter?: (contact: ContactProfile) => void;               // Redraws the main network around this focus
  showGraph?: boolean;                                          // Controls 2-pane visualizer split screen layout
  graphData?: { nodes: GraphNode[]; links: GraphLink[] };
  onNodeClick?: (node: GraphNode) => void;
  isGraphExpanded?: boolean;
  onToggleGraph?: () => void;
  hiddenCount?: number;
  isNodeExpanded?: boolean;
  onToggleExpandNode?: () => void;                              // Multi-tier lazy loading map toggle
}

/**
 * ProfileModal Component
 * Renders a full side-draw profile detail overlay. If showGraph is active,
 * splits the view to render an isolated local subgraph focusing exclusively on the 
 * selected contact's immediate network connections.
 */
export default function ProfileModal({
  contact,
  onClose,
  onSaveContact,
  onRecenter,
  showGraph = false,
  graphData = { nodes: [], links: [] },
  onNodeClick,
  isGraphExpanded = true,
  onToggleGraph,
  hiddenCount = 0,
  isNodeExpanded = false,
  onToggleExpandNode
}: ProfileModalProps) {

  const handleSave = () => {
    if (onSaveContact) onSaveContact(contact.id);
  };

  /**
   * INITIATE DIRECT INBOX REACHOUT (MAILTO TRIGGER)
   * 
   * Assembles a structured mailto link using URI-escaped variables.
   * Prompts the browser to launch the user's default OS desktop/web email app.
   * Pre-populates the subject and message body with contextual civic network references
   * to lower interaction barriers and improve collaboration velocity.
   */
  const handleExpressInterest = () => {
    if (!contact.email_contact) {
      alert(`No public email address is listed for ${contact.name}.`);
      return;
    }
    const subject = encodeURIComponent(`Connecting via INI Civic Network`);
    const body = encodeURIComponent(`Hi ${contact.name},\n\nI found your profile on the INI Civic Network and would love to connect to discuss potential collaboration.\n\nBest,\n[Your Name]`);

    // Assigning location.href triggers browser navigation to mailto scheme handler
    window.location.href = `mailto:${contact.email_contact}?subject=${subject}&body=${body}`;
  };

  // Imperative controllers for D3 force map viewport manipulations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<ForceGraphMethods | null>(null);
  const handleZoomIn = () => { mapRef.current?.zoom(1.5, 400); };
  const handleZoomOut = () => { mapRef.current?.zoom(0.66, 400); };
  const handleFitMap = () => { mapRef.current?.zoomToFit(400, 50); };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8">
      <div className={`bg-white w-full ${showGraph ? 'max-w-6xl' : 'max-w-2xl'} h-[85vh] md:h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative transition-all`}>

        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{contact.name}</h2>
            <p className="text-slate-500 font-medium">
              {contact.campus || 'No Campus'} {contact.role_title ? `| ${contact.role_title}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold transition-colors">
            ✕ Close
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
          {/* SIDEBAR DETAILS */}
          <div className={`w-full ${showGraph ? 'md:w-1/3 border-b md:border-b-0 md:border-r' : 'md:w-full'} p-6 bg-slate-50 border-slate-200 flex flex-col space-y-6 md:overflow-y-auto shrink-0`}>

            {contact.affiliation && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Affiliation</h3>
                <p className="text-sm font-semibold text-slate-700">{contact.affiliation}</p>
              </div>
            )}

            {contact.email_contact && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Contact</h3>
                <p className="text-sm font-semibold text-blue-600">{contact.email_contact}</p>
              </div>
            )}

            {contact.domains && contact.domains.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Focus Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {contact.domains.map((d: string, i: number) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {contact.capabilities && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Skillset</h3>
                <p className="text-sm text-slate-700">{contact.capabilities}</p>
              </div>
            )}

            {contact.notes && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Notes</h3>
                <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3 py-1 bg-white rounded-r-md">
                  {contact.notes}
                </p>
              </div>
            )}

            {/* BUTTON LAYOUT */}
            <div className="mt-auto border-t border-slate-200 pt-6 space-y-3 shrink-0">
              {onToggleExpandNode && (
                <button onClick={onToggleExpandNode} className={`w-full border font-bold py-2.5 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 ${isNodeExpanded ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}>
                  {isNodeExpanded ? "📉 Collapse Network on Map" : "📈 Expand Network on Map"}
                </button>
              )}

              {onRecenter && (
                <button onClick={() => onRecenter(contact)} className="w-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold py-2.5 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm flex items-center justify-center gap-2">
                  📍 Center Map on {contact.name.split(" ")[0]}
                </button>
              )}

              <button onClick={handleSave} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-lg hover:bg-slate-700 transition-colors shadow-sm">
                ⭐ Save Contact
              </button>

              {/* NEW EXPRESS INTEREST BUTTON */}
              <button onClick={handleExpressInterest} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                ✉️ Express Interest
              </button>
            </div>
          </div>

          {/* GRAPH VISUALIZATION */}
          {showGraph && (
            <div className="flex w-full md:w-2/3 h-[400px] md:h-full relative bg-slate-900 overflow-hidden items-center justify-center shrink-0">
              <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
                <div className="text-white/60 text-xs font-medium pointer-events-none bg-slate-800/50 p-2 rounded backdrop-blur">
                  Connections are bridged by shared Focus Areas.
                </div>
                {onToggleGraph && (
                  <div className="pointer-events-auto">
                    <button onClick={onToggleGraph} className={`px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-lg ${isGraphExpanded ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-pink-500 text-white hover:bg-pink-400'}`}>
                      <span className="md:hidden">{isGraphExpanded ? "Collapse" : `Expand (${hiddenCount})`}</span>
                      <span className="hidden md:inline">{isGraphExpanded ? "Collapse Contacts" : `Show Hidden Contacts (${hiddenCount})`}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-4 z-20 bg-slate-800/60 p-2.5 rounded-xl backdrop-blur-md border border-slate-700 pointer-events-none">
                <div className="space-y-1.5">
                  <div className="flex items-center text-[10px] font-bold text-white/90">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] mr-2 shadow-[0_0_8px_#fbbf24]"></span> CENTER
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-white/90">
                    <span className="w-3 h-3 rounded-full bg-[#ff0000] mr-2"></span> PERSON
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-white/90">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9] mr-2"></span> FOCUS AREA
                  </div>
                  <div className="flex items-center text-[10px] font-bold text-white/90">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ec4899] mr-2"></span> LOCATION
                  </div>
                </div>
              </div>

              <NetworkMap
                ref={mapRef}
                graphData={graphData}
                repulsion={-150}
                distance={60}
                onNodeClick={(node: unknown) => onNodeClick && onNodeClick(node as GraphNode)}
                nodeRelSize={5}
                linkDirectionalParticles={1}
                linkDirectionalParticleSpeed={0.005}
                nodeLabel="title"
                cooldownTime={3000}
                linkColor={() => "rgba(255, 255, 255, 0.4)"}
                linkWidth={1.5}
                
                /**
                 * HIGH-PERFORMANCE 2D GRAPHICS CONTEXT DRAWER
                 * 
                 * To maximize framerate performance on physics ticks, we draw individual node
                 * shapes directly using HTML5 Canvas 2D Context primitives rather than heavy DOM/SVG objects.
                 * 
                 * Calculates exact coordinate offsets on tick shifts:
                 * 1. ctx.arc draws a circle centered at n.x, n.y with a customized size based on n.val.
                 * 2. Labels are conditionally drawn only at high zoom thresholds (globalScale >= 1.5) 
                 *    to prevent label overlap clutter when zoomed far away.
                 * 3. Font scaling math (12 / globalScale) ensures uniform relative label sizing.
                 */
                nodeCanvasObject={(node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
                  const n = node as GraphNode & { x: number; y: number };
                  const size = n.val + 1;
                  ctx.beginPath();
                  ctx.arc(n.x, n.y, size, 0, 2 * Math.PI, false);
                  ctx.fillStyle = n.color || "#94a3b8";
                  ctx.fill();

                  // Progressive disclosure for labels: hide text labels if zoomed out to save graphics compute cycles
                  if (globalScale >= 1.5) {
                    const label = n.name;
                    const fontSize = Math.max(12 / globalScale, 2);
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillStyle = '#ffffff';
                    // Offset label below circle by node radius + padding (4px)
                    ctx.fillText(label, n.x, n.y + size + 4);
                  }
                }}
              />

              {graphData && graphData.nodes.length > 0 && (
                <div className="absolute bottom-4 right-4 z-20 flex flex-col space-y-1.5 md:space-y-2 bg-slate-800/80 p-1 md:p-1.5 rounded-lg md:rounded-xl shadow-xl backdrop-blur-md border border-slate-700 pointer-events-auto">
                  <button onClick={handleZoomIn} className="text-white hover:bg-slate-700 p-2 md:p-2.5 rounded text-xs md:text-sm font-bold leading-none" title="Zoom In">➕</button>
                  <button onClick={handleFitMap} className="text-white hover:bg-slate-700 p-2 md:p-2.5 rounded text-xs md:text-sm font-bold leading-none" title="Fit to Box">⛶</button>
                  <button onClick={handleZoomOut} className="text-white hover:bg-slate-700 p-2 md:p-2.5 rounded text-xs md:text-sm font-bold leading-none" title="Zoom Out">➖</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}