import { redirect } from "next/navigation";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import MatchesDashboard from "./MatchesDashboard";

export default async function MatchesPage() {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        redirect("/login");
    }

    // 2. Fetch linked contact ID from public.users
    const { data: userData, error: userError } = await supabase
        .from("users")
        .select("linked_contact_id")
        .eq("id", user.id)
        .single();

    if (userError || !userData?.linked_contact_id) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans text-white text-center">
                <div className="max-w-md p-8 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
                    <h1 className="text-2xl font-bold mb-4">Profile Incomplete</h1>
                    <p className="text-slate-400 mb-6">
                        Your account is not yet linked to a public directory profile. You must be in the civic directory to receive and view matches.
                    </p>
                </div>
            </div>
        );
    }

    const contactId = userData.linked_contact_id;

    // 3. Fetch all public contacts (for the network map and for displaying match details)
    const { data: rawContacts, error: contactsError } = await supabase
        .from("contacts")
        .select(`*, contact_domains (domains (domain_name))`)
        .eq("is_public", true);

    if (contactsError) {
        console.error("Failed to load contacts:", contactsError);
    }

    // Format domains array
    const contacts = (rawContacts || []).map((c: any) => ({
        ...c,
        domains: c.contact_domains?.map((cd: any) => cd.domains.domain_name) || []
    }));

    const initialContact = contacts.find(c => c.id === contactId);

    if (!initialContact) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans text-white text-center">
                <div className="max-w-md p-8 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl">
                    <h1 className="text-2xl font-bold mb-4">Profile Private</h1>
                    <p className="text-slate-400 mb-6">
                        Your profile is not marked as public in the directory. You must be public to generate matches.
                    </p>
                </div>
            </div>
        );
    }

    // 4. Fetch existing matches for this user
    const { data: rawMatches, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .or(`user_a_id.eq.${contactId},user_b_id.eq.${contactId}`)
        .order("created_at", { ascending: false });

    if (matchesError) {
        console.error("Failed to load matches:", matchesError);
    }

    // Resolve match objects with the full contact profile of the *other* person
    const resolvedMatches = (rawMatches || []).map(match => {
        const otherPersonId = match.user_a_id === contactId ? match.user_b_id : match.user_a_id;
        const otherPerson = contacts.find(c => c.id === otherPersonId);
        return {
            ...match,
            otherPerson
        };
    }).filter(m => m.otherPerson); // Filter out matches if the other person is no longer public/exists

    return (
        <MatchesDashboard 
            initialContact={initialContact} 
            allContacts={contacts} 
            initialMatches={resolvedMatches} 
        />
    );
}
