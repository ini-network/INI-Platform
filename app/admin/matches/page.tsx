"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function MatchesDashboard() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [matches, setMatches] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isComputing, setIsComputing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
    const [statusMessage, setStatusMessage] = useState<{type: 'success'|'error', text: string} | null>(null);

    // Manual Resend Email Tester States
    const [isTesterOpen, setIsTesterOpen] = useState(false);
    const [testEmailTo, setTestEmailTo] = useState("");
    const [testEmailSubject, setTestEmailSubject] = useState("🌟 Synergy Connection from INI!");
    const [testEmailHtml, setTestEmailHtml] = useState(`
<div style="font-family: Arial, sans-serif; max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
    <h2 style="color: #1e3a8a; text-align: center; margin-bottom: 24px;">🌟 Test email from INI Matchmaker</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        This is a manually drafted test email dispatched from your admin dashboard.
    </p>
    <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #3b82f6; margin: 24px 0;">
        <p style="margin: 0; font-size: 16px; color: #1e293b; font-style: italic;">
            "If you see this, your Resend API integration is fully functional and successfully connected to ini@ini.vngle.com."
        </p>
    </div>
</div>
`.trim());
    const [isSendingTest, setIsSendingTest] = useState(false);

    // Security States
    const [authStatus, setAuthStatus] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const supabase = createClient();
                const { data: { user }, error } = await supabase.auth.getUser();
                
                if (error || !user) {
                    console.log("No active admin session. Redirecting to login...");
                    router.push("/login?next=/admin/matches");
                    return;
                }

                const email = user.email || "";
                const isInternal = email.endsWith("@vngle.com");
                
                // Allow vngle.com emails or Jeremiah's personal testing email configured in env / hardcoded fallback
                const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "riverajeremiah10@gmail.com";
                const isAllowedAdmin = adminEmailsEnv
                    .split(",")
                    .map(e => e.trim().toLowerCase())
                    .filter(Boolean)
                    .includes(email.toLowerCase());

                if (!isInternal && !isAllowedAdmin) {
                    console.warn(`Unauthorized email domain access attempt: ${email}`);
                    setUserEmail(email);
                    setAuthStatus('unauthorized');
                    setIsLoading(false);
                    return;
                }

                setAuthStatus('authorized');
                fetchMatches();
            } catch (err) {
                console.error("Auth check failed:", err);
                router.push("/login?next=/admin/matches");
            }
        };

        checkAuth();
    }, []);

    const fetchMatches = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();

            const { data, error } = await supabase
                .from("matches")
                .select(`
                    id, score, rationale, status_sent, created_at,
                    user_a:contacts!matches_user_a_id_fkey(id, name, campus, role_title),
                    user_b:contacts!matches_user_b_id_fkey(id, name, campus, role_title)
                `)
                .eq("status_sent", false)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setMatches(data || []);
            // Select all by default
            if (data) {
                setSelectedMatchIds(new Set(data.map(m => m.id)));
            }
        } catch (err) {
            console.error("Error fetching matches:", err);
            setStatusMessage({ type: 'error', text: 'Failed to load matches. Ensure the database schema is updated.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleComputeMatches = async () => {
        setIsComputing(true);
        setStatusMessage(null);
        try {
            const res = await fetch("/api/admin/matchmaker", { method: "POST" });
            const result = await res.json();
            
            if (!res.ok) throw new Error(result.message || "Failed to compute matches");
            
            setStatusMessage({ type: 'success', text: result.message });
            await fetchMatches(); // Refresh the list
        } catch (err: unknown) {
            const error = err as Error;
            setStatusMessage({ type: 'error', text: error.message });
        } finally {
            setIsComputing(false);
        }
    };

    const handleSendEmails = async () => {
        if (selectedMatchIds.size === 0) return;
        
        const confirmSend = window.confirm(`Are you sure you want to send emails to ${selectedMatchIds.size} matched pairs?`);
        if (!confirmSend) return;

        setIsSending(true);
        setStatusMessage(null);
        try {
            const res = await fetch("/api/admin/send-emails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ matchIds: Array.from(selectedMatchIds) })
            });
            const result = await res.json();
            
            if (!res.ok) throw new Error(result.message || "Failed to send emails");
            
            setStatusMessage({ type: 'success', text: result.message });
            setSelectedMatchIds(new Set());
            await fetchMatches(); // Refresh to remove sent ones
        } catch (err: unknown) {
            const error = err as Error;
            setStatusMessage({ type: 'error', text: error.message });
        } finally {
            setIsSending(false);
        }
    };

    const handleClearMatches = async (ids: string[]) => {
        if (ids.length === 0) return;
        
        const confirmClear = window.confirm(`Are you sure you want to clear ${ids.length} match(es) from the admin view?`);
        if (!confirmClear) return;

        setIsLoading(true);
        setStatusMessage(null);
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("matches")
                .update({ status_sent: true })
                .in("id", ids);

            if (error) throw error;

            setStatusMessage({ type: "success", text: `Successfully cleared ${ids.length} match(es) from queue.` });
            
            // Remove cleared IDs from the selected set
            const newSelected = new Set(selectedMatchIds);
            ids.forEach(id => newSelected.delete(id));
            setSelectedMatchIds(newSelected);

            await fetchMatches(); // Refresh to remove cleared ones
        } catch (err: unknown) {
            const error = err as Error;
            setStatusMessage({ type: "error", text: error.message || "Failed to clear matches." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testEmailTo || !testEmailSubject || !testEmailHtml) {
            alert("Please fill in all test email fields.");
            return;
        }

        setIsSendingTest(true);
        setStatusMessage(null);
        try {
            const res = await fetch("/api/admin/send-test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: testEmailTo,
                    subject: testEmailSubject,
                    html: testEmailHtml
                })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || "Failed to dispatch test email.");
            
            setStatusMessage({ type: 'success', text: result.message });
            setTestEmailTo(""); // Clear recipient on success
        } catch (err: unknown) {
            const error = err as Error;
            setStatusMessage({ type: 'error', text: error.message || "Failed to send test email." });
        } finally {
            setIsSendingTest(false);
        }
    };

    const toggleMatchSelection = (id: string) => {
        const newSet = new Set(selectedMatchIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedMatchIds(newSet);
    };

    if (authStatus === 'loading') {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 text-xs font-bold tracking-widest uppercase animate-pulse">Verifying Credentials...</p>
            </div>
        );
    }

    if (authStatus === 'unauthorized') {
        return (
            <div className="h-full w-full overflow-y-auto bg-slate-950 flex items-center justify-center p-6 font-sans relative">
                {/* Background decorative glows */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

                <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative z-10 text-center animate-in fade-in zoom-in-95 duration-500">
                    {/* Secure Lock Icon Badge */}
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-4xl mb-6 shadow-inner animate-bounce">
                        🔒
                    </div>
                    
                    <h1 className="text-2xl font-black text-slate-100 tracking-tight mb-2">Access Restricted</h1>
                    <p className="text-sm text-slate-400 mb-6 px-4">
                        The INI Civic Matchmaker dashboard is reserved exclusively for internal Vngle team members.
                    </p>

                    {/* Account Details Box */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-8 text-left">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1">Your Account</span>
                        <span className="text-sm font-semibold text-slate-200 break-all">{userEmail}</span>
                        <div className="mt-3 flex items-center gap-2 text-xs text-rose-400 font-medium">
                            <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                            Status: Unauthorized External User
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3">
                        <a
                            href="/"
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/25 transition-all text-sm flex items-center justify-center gap-2"
                        >
                            🏠 Return to Network
                        </a>
                        <button
                            onClick={async () => {
                                const supabase = createClient();
                                await supabase.auth.signOut();
                                router.push("/login?next=/admin/matches");
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-3 px-6 rounded-xl transition-all text-sm"
                        >
                            🔑 Switch Account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-slate-50 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Matchmaker Admin</h1>
                        <p className="text-slate-500 mt-2">Generate AI civic connections and dispatch notifications.</p>
                    </div>
                    
                    <div className="flex gap-4 flex-wrap">
                        <button 
                            onClick={handleComputeMatches} 
                            disabled={isComputing || isSending}
                            className="bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {isComputing ? '🧠 Computing...' : '🧠 Generate New Matches'}
                        </button>
                        <button 
                            onClick={() => handleClearMatches(Array.from(selectedMatchIds))} 
                            disabled={isComputing || isSending || selectedMatchIds.size === 0 || isLoading}
                            className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-rose-100 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            🚫 Clear Selected ({selectedMatchIds.size})
                        </button>
                        <button 
                            onClick={handleSendEmails} 
                            disabled={isComputing || isSending || selectedMatchIds.size === 0}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {isSending ? '✉️ Sending...' : `✉️ Dispatch Emails (${selectedMatchIds.size})`}
                        </button>
                    </div>
                </header>

                {/* Collapsible Manual Resend Email Tester Card */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-8 shadow-sm transition-all duration-300">
                    <button 
                        onClick={() => setIsTesterOpen(!isTesterOpen)}
                        className="w-full px-6 py-4 bg-slate-800 text-white font-bold flex items-center justify-between hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xl">🛠️</span>
                            <div className="text-left">
                                <h3 className="font-bold text-sm sm:text-base text-white">Manual Resend Email Tester</h3>
                                <p className="text-xs text-slate-300 font-normal">Draft and dispatch a test email from ini@ini.vngle.com to verify SMTP/Resend integration.</p>
                            </div>
                        </div>
                        <span className="text-lg text-white transition-transform duration-300" style={{ transform: isTesterOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▼
                        </span>
                    </button>
                    
                    {isTesterOpen && (
                        <form onSubmit={handleSendTestEmail} className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Recipient Email Address *</label>
                                    <input 
                                        type="email" 
                                        required
                                        placeholder="e.g. riverajeremiah10@gmail.com"
                                        value={testEmailTo}
                                        onChange={(e) => setTestEmailTo(e.target.value)}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Subject Line *</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="e.g. 🌟 New synergy matches are here!"
                                        value={testEmailSubject}
                                        onChange={(e) => setTestEmailSubject(e.target.value)}
                                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email HTML Content *</label>
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setTestEmailHtml(`
<div style="font-family: Arial, sans-serif; max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
    <h2 style="color: #1e3a8a; text-align: center; margin-bottom: 24px;">🌟 INI Synergy Connection</h2>
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        Hello! You have a new pending matchmaking synergy waiting for you on the INI Platform.
    </p>
    <div style="background-color: #f0fdf4; padding: 20px; border-left: 4px solid #22c55e; margin: 24px 0;">
        <p style="margin: 0; font-size: 16px; color: #14532d; font-style: italic;">
            "This is a premium, custom-styled test dispatch using the live Resend API integration."
        </p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
        <a href="https://ini.network/matches" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px;">
            View Matches in Dashboard
        </a>
    </div>
</div>
`.trim());
                                        }}
                                        className="text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                                    >
                                        ✨ Load Demo Synergy Template
                                    </button>
                                </div>
                                <textarea 
                                    rows={8}
                                    required
                                    placeholder="Enter your HTML or text body here..."
                                    value={testEmailHtml}
                                    onChange={(e) => setTestEmailHtml(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isSendingTest}
                                    className="px-6 py-3 bg-slate-800 text-white font-bold rounded-lg text-sm hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {isSendingTest ? '⏳ Dispatching...' : '🚀 Dispatch Custom Test Email'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {statusMessage && (
                    <div className={`p-4 mb-8 rounded-lg border ${statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                        {statusMessage.text}
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-20 text-slate-400 font-medium animate-pulse">Loading matches database...</div>
                ) : matches.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
                        <span className="text-5xl mb-4 block">📭</span>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No pending matches</h3>
                        <p className="text-slate-500">Click &quot;Generate New Matches&quot; to have the AI scan for new connections.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {matches.map((match) => (
                            <div key={match.id} className={`bg-white rounded-xl border ${selectedMatchIds.has(match.id) ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'} shadow-sm p-6 flex flex-col md:flex-row gap-6 transition-all`}>
                                
                                {/* Checkbox & Score */}
                                <div className="flex flex-col items-center justify-center border-r border-slate-100 pr-6 shrink-0">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedMatchIds.has(match.id)} 
                                        onChange={() => toggleMatchSelection(match.id)}
                                        className="w-6 h-6 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer mb-4"
                                    />
                                    <div className="text-center">
                                        <div className="text-2xl font-black text-blue-900">{Math.round(match.score * 100)}%</div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Match</div>
                                    </div>
                                </div>

                                {/* Profiles */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 border-r border-slate-100 pr-6">
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <h4 className="font-bold text-slate-800">{match.user_a?.name || 'Unknown User'}</h4>
                                        <p className="text-sm text-slate-500 mt-1">💼 {match.user_a?.role_title || 'No Title'}</p>
                                        <p className="text-sm text-slate-500">🏢 {match.user_a?.campus || 'No Campus'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <h4 className="font-bold text-slate-800">{match.user_b?.name || 'Unknown User'}</h4>
                                        <p className="text-sm text-slate-500 mt-1">💼 {match.user_b?.role_title || 'No Title'}</p>
                                        <p className="text-sm text-slate-500">🏢 {match.user_b?.campus || 'No Campus'}</p>
                                    </div>
                                </div>

                                {/* Rationale */}
                                <div className="flex-1 flex items-center">
                                    <p className="text-sm text-slate-600 italic bg-blue-50 p-4 rounded-lg border border-blue-100 w-full">
                                        <span className="font-bold text-blue-800 not-italic block mb-1">AI Match Rationale:</span>
                                        &quot;{match.rationale}&quot;
                                    </p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col items-stretch justify-center md:pl-6 md:border-l border-slate-100 shrink-0 gap-2">
                                    <button
                                        onClick={() => handleClearMatches([match.id])}
                                        className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 hover:text-rose-600 transition-colors shadow-sm whitespace-nowrap cursor-pointer"
                                        title="Clear from Queue"
                                    >
                                        🚫 Clear
                                    </button>
                                </div>
                                
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
