import { Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import DirectoryClient, { Contact } from "./directory-client";

// Cache public directory contacts and revalidate in background every 2 minutes
export const revalidate = 120;

async function DirectoryData() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Query active database contacts joining relative relational tags/domains
    const { data, error } = await supabase
        .from('contacts')
        .select(`*, contact_domains (domains (domain_name))`)
        .eq('is_public', true);

    let initialContacts: Contact[] = [];
    if (!error && data) {
        // Restructure raw Supabase arrays into typed Contact definitions
        initialContacts = (data as any[]).map((c) => ({
            ...c,
            domains: c.contact_domains.map((cd: any) => cd.domains.domain_name)
        }));
    } else if (error) {
        console.error("Failed to load directory data on server:", error);
    }

    return <DirectoryClient initialContacts={initialContacts} />;
}

export default function DirectoryPage() {
    return (
        <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center bg-slate-50 font-sans p-8">
                <div className="flex flex-col items-center gap-3">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <div className="text-slate-500 text-sm font-medium">Loading Directory...</div>
                </div>
            </div>
        }>
            <DirectoryData />
        </Suspense>
    );
}