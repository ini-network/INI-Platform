"use client";

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthNotice() {
    const searchParams = useSearchParams();
    const redirectReason = searchParams.get('redirectReason');
    const from = searchParams.get('from') || '';

    if (redirectReason !== 'auth_required') return null;

    let featureName = "this feature";
    if (from.startsWith('/map')) featureName = "the Public-data Map";
    else if (from.startsWith('/explore')) featureName = "the Network Map";
    else if (from.startsWith('/matches')) featureName = "the Public Match System";
    else if (from.startsWith('/news')) featureName = "Civic News";
    else if (from.startsWith('/reports')) featureName = "Civic Stories";

    return (
        <div className="mb-6 p-4 bg-amber-50 text-amber-900 text-sm font-medium rounded-xl border border-amber-200/80 flex items-start gap-2.5 shadow-xs animate-in fade-in slide-in-from-top-2">
            <span className="text-base leading-none">🔒</span>
            <div>
                <strong className="font-bold block text-amber-950 mb-0.5">Sign-In Required</strong>
                Please log in or create an account to access {featureName}.
            </div>
        </div>
    );
}

/**
 * LoginPage Component
 * 
 * Orchestrates client-side user authentication workflows bridging Supabase Auth and Next.js.
 * Supports standard dynamic Sign-In, Sign-Up (with strict pre-flight password criteria validation),
 * third-party OAuth redirection (LinkedIn integration), and an anonymous guest bypass route.
 * Employs cache invalidation techniques (router.refresh()) to ensure correct navigation states.
 */
export default function LoginPage() {
    const supabase = createClient();
    const router = useRouter();

    // View State: Swaps between Login and Account Registration forms
    const [view, setView] = useState<"sign-in" | "sign-up">("sign-in");

    // Form and Loading State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [fullName, setFullName] = useState("");

    /**
     * DYNAMIC OAUTH / EMAIL VERIFICATION REDIRECT HOST RESOLVER
     * 
     * Dynamically computes the correct callback endpoint at runtime based on the client window.
     * Prevents configuration desyncs when transitioning between local development (localhost),
     * staging branches, and the live production hostname.
     */
    const getRedirectUrl = () => {
        if (typeof window !== 'undefined') {
            return `${window.location.origin}/auth/callback`;
        }
        return '';
    };

    /**
     * SUPABASE AUTH LIFECYCLE MONITOR
     * 
     * Subscribes to Supabase's authentication state observer (`onAuthStateChange`).
     * Instantly captures login events (e.g. following successful credentials or OAuth callback redirection),
     * triggers router.refresh() to clear Next.js's layout cache, and redirects to the dashboard root.
     * 
     * Returns a teardown function that unsubscribes the observer to prevent memory leak closures.
     */
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) {
                router.refresh(); // Invalidate Next.js cache so layout header correctly evaluates new session
                router.push('/');
            }
        });
        return () => subscription.unsubscribe();
    }, [router, supabase.auth]);

    // --- PASSWORD STRENGTH LOGIC (Strict pre-flight check before Sign Up) ---
    const passwordRequirements = [
        { id: "length", text: "At least 8 characters", regex: /.{8,}/ },
        { id: "uppercase", text: "One uppercase letter", regex: /[A-Z]/ },
        { id: "lowercase", text: "One lowercase letter", regex: /[a-z]/ },
        { id: "number", text: "One number", regex: /[0-9]/ },
        { id: "special", text: "One special character (e.g., !@#$%^&*)", regex: /[^A-Za-z0-9]/ },
    ];
    // Check if password satisfies all regular expression patterns
    const isPasswordStrong = passwordRequirements.every((req) => req.regex.test(password));

    /**
     * CREDENTIAL AUTH ACTION HANDLER
     * 
     * Handles both local registration (Supabase signUp) and session creation (signInWithPassword).
     * Automatically feeds additional user metadata (e.g. full_name) to the auth database profile
     * upon registration. Restores correct page rendering state by clearing Next.js layout caches on success.
     */
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
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName },
                    emailRedirectTo: getRedirectUrl()
                }
            });
            if (error) setErrorMessage(error.message);
            else setSuccessMessage("Check your email for the confirmation link!");
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setErrorMessage(error.message);
            } else {
                // BUG FIX: Force Next.js to refresh the layout and header state!
                router.refresh();
                router.push('/');
            }
        }

        setIsLoading(false);
    };

    /**
     * LINKEDIN OAUTH SINGLE SIGN-ON FLOW
     * 
     * Delegates auth credentials verification to LinkedIn OIDC, passing down our dynamic origin callback.
     * Supabase handles the low-level state validation and translates the authentication token in /auth/callback.
     */
    const handleLinkedInSignIn = async () => {
        setIsLoading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'linkedin_oidc',
            options: {
                redirectTo: getRedirectUrl(),
            },
        });
        if (error) setErrorMessage(error.message);
        setIsLoading(false);
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc] font-sans">
            <div className="w-full max-w-[420px] rounded-2xl bg-white p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative">

                {/* Header */}
                <div className="mb-8 text-center">
                    <div
                        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
                        <span className="text-2xl">🔭</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to INI</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {view === "sign-in" ? "Sign in to access the network" : "Create your account to get started"}
                    </p>
                </div>

                {/* View Toggles */}
                <div className="flex p-1 bg-slate-100/80 rounded-xl mb-8">
                    <button
                        onClick={() => {
                            setView("sign-in");
                            setErrorMessage("");
                            setSuccessMessage("");
                        }}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${view === "sign-in" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => {
                            setView("sign-up");
                            setErrorMessage("");
                            setSuccessMessage("");
                        }}
                        className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${view === "sign-up" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Messages */}
                <Suspense fallback={null}>
                    <AuthNotice />
                </Suspense>
                {errorMessage && <div
                    className="mb-6 p-3.5 bg-red-50/80 text-red-600 text-sm font-medium rounded-xl border border-red-100 flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {errorMessage}
                </div>}
                {successMessage && <div
                    className="mb-6 p-3.5 bg-emerald-50/80 text-emerald-700 text-sm font-medium rounded-xl border border-emerald-100 flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {successMessage}
                </div>}

                {/* Form */}
                <form onSubmit={handleAuth} className="space-y-5">
                    {/* Full Name Field (Only on Sign Up) */}
                    {view === "sign-up" && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required={view === "sign-up"}
                                placeholder="Jane Doe"
                                className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="you@example.com"
                            className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full border border-slate-200 bg-white rounded-xl p-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400"
                        />

                        {/* Password Strength Checklist (Only shows during Sign Up) */}
                        {view === "sign-up" && (
                            <div className="mt-3 space-y-1.5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-semibold text-slate-700 mb-2">Password requirements:</p>
                                {passwordRequirements.map((req) => {
                                    const isMet = req.regex.test(password);
                                    return (
                                        <div key={req.id} className="flex items-center text-xs">
                                            <span className={`mr-2.5 flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full ${isMet ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                                                {isMet ? <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
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
                        className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm mt-2"
                    >
                        {isLoading ? "Processing..." : view === "sign-in" ? "Sign In" : "Create Account"}
                    </button>
                </form>

                <div className="relative mt-8 mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="bg-white px-4 text-slate-400 font-medium text-xs tracking-wider uppercase">Or continue with</span>
                    </div>
                </div>

                {/* LinkedIn Login Button */}
                <div>
                    <button
                        type="button"
                        onClick={handleLinkedInSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center py-3 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 group"
                    >
                        <Image 
                            src="/images/linkedin-logo.png" 
                            alt="LinkedIn Logo" 
                            width={20} 
                            height={20} 
                            className="mr-3 object-contain group-hover:scale-105 transition-transform" 
                        />
                        Sign in with LinkedIn
                    </button>
                </div>

                {/* Updated Anonymous Browsing Button */}
                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={() => {
                            router.refresh();
                            setTimeout(() => {
                                router.push('/');
                            }, 100);
                        }}
                        className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors underline decoration-slate-300 underline-offset-4 hover:decoration-slate-800"
                    >
                        Browse without logging in
                    </button>
                </div>

            </div>
        </div>
    );
}