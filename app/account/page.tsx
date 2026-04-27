"use client";

import {useState, useEffect} from "react";
import {createClient} from "@/utils/supabase/client";
import {User} from "@supabase/supabase-js";
import {useRouter} from "next/navigation";
import {deleteUserAccount} from "@/app/actions/authActions";

export default function AccountSettingsPage() {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    // Form States
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [fullName, setFullName] = useState("");
    // Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState("");

    useEffect(() => {
        const fetchUserData = async () => {
            const supabase = createClient();
            const {data: {user}} = await supabase.auth.getUser();

            if (user) {
                setUser(user);
                setEmail(user.email || "");
                setFullName(user.user_metadata?.full_name || "");
            }
        };
        fetchUserData();
    }, []);

    // --- PASSWORD STRENGTH LOGIC ---
    const passwordRequirements = [
        {id: "length", text: "At least 8 characters", regex: /.{8,}/},
        {id: "uppercase", text: "One uppercase letter", regex: /[A-Z]/},
        {id: "lowercase", text: "One lowercase letter", regex: /[a-z]/},
        {id: "number", text: "One number", regex: /[0-9]/},
        {id: "special", text: "One special character (e.g., !@#$%^&*)", regex: /[^A-Za-z0-9]/},
    ];
    const isPasswordStrong = passwordRequirements.every((req) => req.regex.test(newPassword));

    // --- ACTIONS ---

    const handleUpdateName = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setStatusMessage(null);
        const supabase = createClient();

        const {error} = await supabase.auth.updateUser({
            data: {full_name: fullName}
        });

        if (error) setStatusMessage({type: "error", text: error.message});
        else setStatusMessage({type: "success", text: "Name successfully updated."});

        setIsProcessing(false);
    };

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setStatusMessage(null);
        const supabase = createClient();

        const {error} = await supabase.auth.updateUser({email});

        if (error) setStatusMessage({type: "error", text: error.message});
        else setStatusMessage({type: "success", text: "Confirmation link sent to both old and new email addresses."});

        setIsProcessing(false);
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isPasswordStrong) {
            setStatusMessage({type: "error", text: "Please meet all password strength requirements."});
            return;
        }
        if (newPassword !== confirmPassword) {
            setStatusMessage({type: "error", text: "Passwords do not match. Please try again."});
            return;
        }

        setIsProcessing(true);
        setStatusMessage(null);
        const supabase = createClient();

        const {error} = await supabase.auth.updateUser({password: newPassword});

        if (error) {
            setStatusMessage({type: "error", text: error.message});
        } else {
            setStatusMessage({type: "success", text: "Password successfully updated."});
            setNewPassword("");
            setConfirmPassword("");
        }
        setIsProcessing(false);
    };

    // NEW: Sign out of other devices
    const handleSignOutOthers = async () => {
        setIsProcessing(true);
        setStatusMessage(null);
        const supabase = createClient();

        const {error} = await supabase.auth.signOut({scope: 'others'});

        if (error) {
            setStatusMessage({type: "error", text: error.message});
        } else {
            setStatusMessage({type: "success", text: "Successfully signed out of all other active sessions."});
        }
        setIsProcessing(false);
    };

    // Secure Account Deletion
    const handleDeleteAccount = async () => {
        if (!user) return;
        setIsProcessing(true);
        setStatusMessage(null);

        try {
            const supabase = createClient();

            // 1. Get the user's secure session token
            const {data: {session}} = await supabase.auth.getSession();
            if (!session) throw new Error("No active session found.");

            // 2. Call the server action with the token and ID
            await deleteUserAccount(session.access_token, user.id);

            // 3. Wipe the local session and redirect them to the login screen
            await supabase.auth.signOut();
            setShowDeleteModal(false);
            router.push("/login");

        } catch (error: any) {
            console.error("Deletion error:", error);
            setStatusMessage({type: "error", text: error.message || "Failed to delete account."});
            setIsProcessing(false);
            setShowDeleteModal(false);
        }
    };

    if (!user) {
        return <div className="p-8 text-center text-slate-500 font-medium animate-pulse">Loading account data...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Account Settings</h1>
                <p className="text-slate-600">Manage your login credentials and security preferences.</p>
            </div>

            {statusMessage && (
                <div
                    className={`mb-6 p-4 rounded-xl font-medium flex items-center ${statusMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                    <span className="mr-3">{statusMessage.type === "success" ? "✅" : "❌"}</span>
                    {statusMessage.text}
                </div>
            )}

            <div className="space-y-6">

                {/* Update Name */}
                <form onSubmit={handleUpdateName}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-1">Full Name</h2>
                    <p className="text-sm text-slate-500 mb-4">Update how your name appears to the AI Copilot and
                        internal systems.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="flex-1 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                        <button type="submit" disabled={isProcessing || fullName === user.user_metadata?.full_name}
                                className="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap">
                            Update Name
                        </button>
                    </div>
                </form>

                {/* Update Email */}
                <form onSubmit={handleUpdateEmail}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-1">Email Address</h2>
                    <p className="text-sm text-slate-500 mb-4">Update the email address you use to log in.</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                               className="flex-1 border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                               required/>
                        <button type="submit" disabled={isProcessing || email === user.email}
                                className="px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap">Update
                            Email
                        </button>
                    </div>
                </form>

                {/* Update Password */}
                <form onSubmit={handleUpdatePassword}
                      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-1">Change Password</h2>
                    <p className="text-sm text-slate-500 mb-4">Ensure your account is using a long, random password to
                        stay secure.</p>

                    <div className="flex flex-col gap-4 max-w-md">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                            <input type="password" placeholder="Enter new password" value={newPassword}
                                   onChange={(e) => setNewPassword(e.target.value)} required
                                   className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>

                            <div className="mt-3 space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-xs font-bold text-slate-600 mb-2">Password must contain:</p>
                                {passwordRequirements.map((req) => {
                                    const isMet = req.regex.test(newPassword);
                                    return (
                                        <div key={req.id} className="flex items-center text-xs">
                                            <span
                                                className={`mr-2 ${isMet ? "text-emerald-500" : "text-slate-300"}`}>{isMet ? "✓" : "○"}</span>
                                            <span
                                                className={isMet ? "text-slate-700" : "text-slate-500"}>{req.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                            <input type="password" placeholder="Confirm new password" value={confirmPassword}
                                   onChange={(e) => setConfirmPassword(e.target.value)} required
                                   className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"/>
                            {confirmPassword.length > 0 && newPassword !== confirmPassword &&
                                <p className="text-xs text-rose-500 mt-1 font-medium">Passwords do not match</p>}
                        </div>

                        <button type="submit"
                                disabled={isProcessing || !newPassword || !confirmPassword || !isPasswordStrong || newPassword !== confirmPassword}
                                className="mt-2 w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors">Save
                            New Password
                        </button>
                    </div>
                </form>

                {/* Security & Sessions */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-1">Session Management</h2>
                    <p className="text-sm text-slate-500 mb-4">Log out of any other browsers or devices where your
                        account is currently active.</p>
                    <button onClick={handleSignOutOthers} disabled={isProcessing}
                            className="px-5 py-2.5 bg-slate-100 text-slate-700 border border-slate-300 font-bold text-sm rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors">
                        Sign out of other devices
                    </button>
                </div>

                {/* Danger Zone */}
                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-200">
                    <h2 className="text-lg font-bold text-rose-800 mb-1">Danger Zone</h2>
                    <p className="text-sm text-rose-600 mb-4">Permanently delete your account and all associated data.
                        This action cannot be undone.</p>
                    <button onClick={() => setShowDeleteModal(true)}
                            className="px-5 py-2.5 bg-rose-600 text-white font-bold text-sm rounded-lg hover:bg-rose-700 transition-colors">
                        Delete Account
                    </button>
                </div>

            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Are you absolutely sure?</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            This action cannot be undone. This will permanently delete your account, your profile, and
                            remove all your saved contacts.
                        </p>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-700 mb-2">
                                Please type <span className="text-rose-600 bg-rose-50 px-1 rounded select-all">delete my account</span> to
                                confirm.
                            </label>
                            <input
                                type="text"
                                value={deleteConfirmation}
                                onChange={(e) => setDeleteConfirmation(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                placeholder="delete my account"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteConfirmation("");
                            }}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== "delete my account" || isProcessing}
                                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 transition-colors"
                            >
                                Permanently Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}