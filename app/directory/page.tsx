import { Suspense } from "react";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import DirectoryClient, { Contact } from "./directory-client";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

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

    return (
        <Suspense fallback={
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-sans p-8">
                <div className="text-slate-500 text-sm font-medium animate-pulse">Loading Directory...</div>
            </div>
        }>
            <DirectoryClient initialContacts={initialContacts} />
        </Suspense>
    );
}