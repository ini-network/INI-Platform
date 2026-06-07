"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface CopilotProps {
  // Callback triggered when a user clicks on an AI-suggested collaborator's profile tag in the chat window
  onInspectProfile?: (contactName: string) => void;
}

type ChatMessage = {
  role: string;
  content: string;
  // Optional array containing metadata of matched profiles resolved by the Python NLP Discovery Engine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matches?: any[];
};

/**
 * Copilot Component
 * Implements a floating AI assistant sidebar that interfaces with the local FastAPI microservice (/api/copilot).
 * Features automatic personalized greetings based on Supabase user metadata and dynamic quick-access buttons 
 * for NLP-derived search recommendations.
 */
export default function Copilot({ onInspectProfile }: CopilotProps) {
  // Sidebar visibility and API loading states
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");

  // Set a generic fallback initially
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi there! I'm your AI Copilot. Ask me anything about the CUNY Civic Network or your data." }
  ]);

  // --- Fetch User Data for Greeting ---
  // Queries the local Supabase client on mount to resolve a personalized greeting name.
  // Prioritizes OAuth metadata full_name over standard email handles, with safe fallbacks.
  useEffect(() => {
    const fetchUserGreeting = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        let firstName = "there";

        if (user.user_metadata?.full_name) {
          // Grab just the first name if available
          firstName = user.user_metadata.full_name.split(" ")[0];
        } else if (user.email) {
          // Fallback to capitalizing the start of their email
          const prefix = user.email.split("@")[0];
          firstName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        }

        // Overwrite the initial generic greeting
        setMessages([
          {
            role: "assistant",
            content: `Hi ${firstName}! I'm your AI Copilot. Ask me anything about the CUNY Civic Network or your data.`
          }
        ]);
      }
    };

    fetchUserGreeting();
  }, []);

  /**
   * Dispatches the chat prompt to the FastAPI microservice.
   * Performs an asynchronous POST request, parses the returned RAG insights and fuzzy matches, 
   * and appends both to the interactive message thread.
   */
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMessage }),
      });

      const data = await response.json();

      if (data.status === "success") {
        setMessages([...newMessages, {
          role: "assistant",
          content: data.insight,
          matches: data.matches
        }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: "Error: " + data.message }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: "assistant", content: "Failed to connect to AI server. Make sure Python is running!" }]);
    }

    setIsLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-6 md:left-auto md:right-6 z-[100] p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 border border-white/20 flex items-center justify-center ${
          isOpen ? "bg-slate-800 text-white rotate-90" : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
        }`}
        title="Toggle AI Copilot"
      >
        {isOpen ? <span className="font-bold text-xl leading-none">✕</span> : <span className="font-bold text-xl leading-none">✨</span>}
      </button>

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 md:w-[400px] bg-white/85 backdrop-blur-2xl shadow-[-10px_0_30px_rgba(0,0,0,0.1)] border-l border-white/40 z-[90] flex flex-col transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-5 border-b border-slate-200/50 flex items-center justify-between bg-white/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">AI</div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Copilot</h2>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">System Assistant</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white border border-slate-100 text-slate-700 rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>

              {msg.matches && msg.matches.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-w-[85%]">
                  {msg.matches.map((match, i) => {
                    const name = match["Contact Name"] || match.name;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (onInspectProfile) {
                            onInspectProfile(name);
                          } else {
                            window.dispatchEvent(new CustomEvent("inspect-profile", { detail: { name } }));
                          }
                        }}
                        className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full hover:bg-blue-600 hover:text-white transition-colors shadow-sm flex items-center gap-1"
                      >
                        <span>👤</span> {name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 text-slate-400 p-3 rounded-2xl text-sm rounded-bl-none animate-pulse">
                Analyzing network...
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-white/60 border-t border-slate-200/50">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="Ask Copilot to find partners..."
              className="w-full bg-white border border-slate-300 rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-full transition-colors"
            >
              <span className="text-sm leading-none font-bold">↑</span>
            </button>
          </form>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[80] sm:hidden" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
}