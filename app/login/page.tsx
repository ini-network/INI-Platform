"use client";

import {createClient} from '@/utils/supabase/client';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';

export default function LoginPage() {
    const supabase = createClient();
    const router = useRouter();

    // View State
    const [view, setView] = useState<"sign-in" | "sign-up">("sign-in");

    // Form State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [fullName, setFullName] = useState("");

    const getRedirectUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/auth/callback`;
        }
        return '';
    };

    useEffect(() => {
        const {data: {subscription}} = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                router.push('/');
            }
        });
        return () => subscription.unsubscribe();
    }, [router, supabase.auth]);

    // --- PASSWORD STRENGTH LOGIC (Only used for Sign Up) ---
    const passwordRequirements = [
        {id: "length", text: "At least 8 characters", regex: /.{8,}/},
        {id: "uppercase", text: "One uppercase letter", regex: /[A-Z]/},
        {id: "lowercase", text: "One lowercase letter", regex: /[a-z]/},
        {id: "number", text: "One number", regex: /[0-9]/},
        {id: "special", text: "One special character (e.g., !@#$%^&*)", regex: /[^A-Za-z0-9]/},
    ];
    const isPasswordStrong = passwordRequirements.every((req) => req.regex.test(password));

    // --- AUTH ACTIONS ---
    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        if (view === "sign-up" && !isPasswordStrong) {
            setErrorMessage("Please meet all password requirements.");
            setIsLoading(false);
            return;
        }

        if (view === "sign-up") {
            const {error} = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {full_name: fullName},
                    emailRedirectTo: getRedirectUrl()
                }
            });
            if (error) setErrorMessage(error.message);
            else setSuccessMessage("Check your email for the confirmation link!");
        } else {
            const {error} = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) setErrorMessage(error.message);
        }

        setIsLoading(false);
    };

    const handleLinkedInLogin = async () => {
        const {error} = await supabase.auth.signInWithOAuth({
            provider: 'linkedin',
            options: {redirectTo: getRedirectUrl()}
        });
        if (error) setErrorMessage(error.message);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4 font-sans">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">

                {/* Header */}
                <div className="mb-6 text-center">
                    <div
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <span className="text-3xl">🔭</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">INI Explorer</h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        {view === "sign-in" ? "Sign in to access the network" : "Create your account"}
                    </p>
                </div>

                {/* View Toggles */}
                <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
                    <button
                        onClick={() => {
                            setView("sign-in");
                            setErrorMessage("");
                            setSuccessMessage("");
                        }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${view === "sign-in" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => {
                            setView("sign-up");
                            setErrorMessage("");
                            setSuccessMessage("");
                        }}
                        className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${view === "sign-up" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Messages */}
                {errorMessage && <div
                    className="mb-4 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg border border-red-100">{errorMessage}</div>}
                {successMessage && <div
                    className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-lg border border-emerald-100">{successMessage}</div>}

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-4">
                    {/* Full Name Field (Only on Sign Up) */}
                    {view === "sign-up" && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required={view === "sign-up"}
                                placeholder="Jane Doe"
                                className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                            />
                        </div>
                    )}
                    <div>
                        <label
                            className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label
                            className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full border border-slate-200 bg-slate-50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                        />

                        {/* Password Strength Checklist (Only shows during Sign Up) */}
                        {view === "sign-up" && (
                            <div className="mt-3 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <p className="text-xs font-bold text-slate-600 mb-2">Password must contain:</p>
                                {passwordRequirements.map((req) => {
                                    const isMet = req.regex.test(password);
                                    return (
                                        <div key={req.id} className="flex items-center text-xs">
                      <span className={`mr-2 ${isMet ? "text-emerald-500" : "text-slate-300"}`}>
                        {isMet ? "✓" : "○"}
                      </span>
                                            <span className={isMet ? "text-slate-700" : "text-slate-500"}>
                        {req.text}
                      </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || (view === "sign-up" && !isPasswordStrong)}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                    >
                        {isLoading ? "Processing..." : view === "sign-in" ? "Sign In" : "Create Account"}
                    </button>
                </form>

                <div className="mt-6 border-t border-slate-100 pt-6">
                    <button
                        type="button"
                        onClick={handleLinkedInLogin}
                        className="w-full flex items-center justify-center py-2.5 bg-[#0A66C2] text-white font-bold rounded-lg hover:bg-[#004182] transition-colors shadow-sm"
                    >
                        <span className="mr-2 font-serif font-bold text-lg">in</span>
                        Continue with LinkedIn
                    </button>
                </div>

            </div>
        </div>
    );
}