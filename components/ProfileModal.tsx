"use client";

import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

// 1. We tell TypeScript exactly what a Node and Link look like
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

export interface ContactProfile {
  "Contact Name": string;
  "Campus"?: string;
  "Role/Title"?: string;
  "Program/Org Affiliation"?: string;
  "Civic Domains"?: string;
  "Capabilities / Expertise"?: string;
  "Notes / Insights"?: string;
  "Email/Phone/LinkedIn"?: string;
  ID?: string;
  // Replaced 'any' with a safer string type
  [key: string]: string | undefined;
}

interface ProfileModalProps {
  contact: ContactProfile;
  onClose: () => void;
  onSaveContact?: (contactId: string) => Promise<void> | void;
  showGraph?: boolean;
  // 2. Replaced 'any[]' with our strict types
  graphData?: { nodes: GraphNode[]; links: GraphLink[] };
}

export default function ProfileModal({
  contact,
  onClose,
  onSaveContact,
  showGraph = false,
  graphData = { nodes: [], links: [] }
}: ProfileModalProps) {

  const handleSave = () => {
    if (onSaveContact) {
      const contactId = contact.ID || contact["Contact Name"];
      onSaveContact(contactId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-8">
      <div className={`bg-white w-full ${showGraph ? 'max-w-5xl' : 'max-w-2xl'} h-[85vh] md:h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative transition-all`}>

        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{contact["Contact Name"]}</h2>
            <p className="text-slate-500 font-medium">{contact["Campus"]} | {contact["Role/Title"]}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold transition-colors"
          >
            ✕ Close
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          <div className={`w-full ${showGraph ? 'md:w-1/3 border-r' : 'md:w-full'} p-6 bg-slate-50 border-slate-100 flex flex-col space-y-6 overflow-y-auto`}>

            {contact["Program/Org Affiliation"] && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Affiliation</h3>
                <p className="text-sm font-semibold text-slate-700">{contact["Program/Org Affiliation"]}</p>
              </div>
            )}

            {contact["Email/Phone/LinkedIn"] && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Contact</h3>
                <p className="text-sm font-semibold text-blue-600">{contact["Email/Phone/LinkedIn"]}</p>
              </div>
            )}

            {contact["Civic Domains"] && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Focus Areas</h3>
                <div className="flex flex-wrap gap-2">
                  {contact["Civic Domains"].split(",").map((d: string, i: number) => (
                    <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">
                      {d.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {contact["Capabilities / Expertise"] && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Skillset</h3>
                <p className="text-sm text-slate-700">{contact["Capabilities / Expertise"]}</p>
              </div>
            )}

            {contact["Notes / Insights"] && (
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Notes</h3>
                <p className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3 py-1 bg-white rounded-r-md">
                  {contact["Notes / Insights"]}
                </p>
              </div>
            )}

            <div className="mt-auto border-t border-slate-200 pt-6 space-y-3 shrink-0">
              <button
                onClick={handleSave}
                className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
              >
                ⭐ Save Contact
              </button>
              <button className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                ✉️ Express Interest
              </button>
            </div>
          </div>

          {showGraph && (
            <div className="hidden md:flex w-2/3 h-full relative bg-slate-900 overflow-hidden items-center justify-center">
              <div className="absolute top-4 left-4 z-10 text-white/60 text-xs font-medium pointer-events-none bg-slate-800/50 p-2 rounded backdrop-blur">
                Connections are bridged by shared Focus Areas.
              </div>

              <ForceGraph2D
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                graphData={graphData as any}
                nodeRelSize={5}
                linkDirectionalParticles={1}
                linkDirectionalParticleSpeed={0.005}
                nodeLabel="title"
                cooldownTime={3000}
                width={800}
                height={600}
                linkColor={() => "rgba(255, 255, 255, 0.4)"}
                linkWidth={1.5}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
                  const size = node.val + 1;

                  // 1. Draw the Circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node.color || "#94a3b8";
                  ctx.fill();

                  // 2. Zoom Context Logic: Draw clean text without the background box
                  if (globalScale >= 1.5) {
                    const label = node.name;
                    const fontSize = Math.max(12 / globalScale, 2);
                    ctx.font = `${fontSize}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';

                    // Draw the text directly in white for maximum contrast on the dark map
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(label, node.x, node.y + size + 4);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}