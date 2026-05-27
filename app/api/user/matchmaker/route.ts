import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// Ensure environment variables are loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service role for database operations
const geminiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiKey });

export async function POST() {
    try {
        // 0. Authenticate the request
        const cookieStore = await cookies();
        const supabaseAuth = createServerClient(cookieStore);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ status: "error", message: "Unauthorized. Please log in." }, { status: 401 });
        }

        // 1. Find the user's linked contact ID
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("linked_contact_id")
            .eq("id", user.id)
            .single();

        if (userError || !userData?.linked_contact_id) {
            return NextResponse.json({ 
                status: "error", 
                message: "No public profile linked to this account. You must be in the civic directory to receive matches." 
            }, { status: 400 });
        }

        const userContactId = userData.linked_contact_id;

        // 2. Rate Limiting: Check if a match was generated for this user in the last 24 hours
        // We'll calculate the time 24 hours ago in ISO format
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const { data: recentMatches, error: recentError } = await supabase
            .from("matches")
            .select("id")
            .or(`user_a_id.eq.${userContactId},user_b_id.eq.${userContactId}`)
            .gte("created_at", twentyFourHoursAgo)
            .limit(1);

        if (recentError) {
            console.error("Error checking recent matches:", recentError);
        }

        if (recentMatches && recentMatches.length > 0) {
            return NextResponse.json({ 
                status: "rate_limited", 
                message: "You have already generated matches in the last 24 hours. Please check back later!" 
            }, { status: 429 });
        }

        console.log(`🚀 Starting manual AI Matchmaking for user contact ${userContactId}...`);

        // 3. Fetch public contacts, including the user's own profile
        const { data: contacts, error: fetchError } = await supabase
            .from("contacts")
            .select("id, name, campus, role_title, affiliation, capabilities, communities_served, notes, category, interest_category")
            .eq("is_public", true);

        if (fetchError || !contacts || contacts.length < 2) {
            return NextResponse.json({ status: "error", message: "Not enough contacts in the directory to find a match." }, { status: 400 });
        }

        const currentUserProfile = contacts.find(c => c.id === userContactId);
        if (!currentUserProfile) {
            return NextResponse.json({ status: "error", message: "Your profile is not marked as public." }, { status: 400 });
        }

        const otherContacts = contacts.filter(c => c.id !== userContactId);

        // 4. Prepare the data payload for Gemini
        const userProfileForAI = {
            id: currentUserProfile.id,
            name: currentUserProfile.name,
            interest: currentUserProfile.interest_category,
            skills: currentUserProfile.capabilities,
            notes: currentUserProfile.notes,
            affiliation: currentUserProfile.affiliation
        };

        const profilesForAI = otherContacts.map(c => ({
            id: c.id,
            name: c.name,
            interest: c.interest_category,
            skills: c.capabilities,
            notes: c.notes,
            affiliation: c.affiliation
        }));

        const systemPrompt = `
You are the INI Matchmaker AI.
Your job is to analyze the provided center profile, and pair them with 3 to 5 highly synergistic profiles from the directory based on complementary skillsets, similar interests, or synergistic needs.

Output a strictly formatted JSON array of matches. Do NOT output markdown wrappers like \`\`\`json.
Each match MUST follow this JSON schema exactly:
[
  {
    "user_a_id": "string",
    "user_b_id": "string",
    "score": 0.95, // float between 0.50 and 0.99
    "rationale": "A friendly 2-sentence explanation of why they matched, speaking in the third person. Example: 'John and Sarah both work in Public Health. John's expertise in data visualization perfectly complements Sarah's need for impact reporting.'"
  }
]
Important:
- Always use the center profile's ID as user_a_id.
- Only return highly relevant matches (score > 0.80).
- Limit to a maximum of 5 best matches total.
`;

        const userPrompt = JSON.stringify({
            centerProfile: userProfileForAI,
            directory: profilesForAI
        }, null, 2);

        // 5. Ask Gemini for matches
        console.log("🧠 Analyzing synergies with Gemini...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + "\n\nDATA:\n" + userPrompt }] }
            ],
            config: {
                responseMimeType: "application/json",
                temperature: 0.2
            }
        });

        const rawContent = response.text || "[]";
        let matchResults = [];
        try {
            matchResults = JSON.parse(rawContent);
        } catch (parseErr) {
            console.error("Failed to parse Gemini output:", parseErr);
            return NextResponse.json({ status: "error", message: "AI returned malformed data." }, { status: 500 });
        }

        if (!Array.isArray(matchResults) || matchResults.length === 0) {
            return NextResponse.json({ status: "success", message: "No strong matches found at this time.", matches: 0 });
        }

        console.log(`✨ Gemini proposed ${matchResults.length} matches. Saving to database...`);

        // 6. Save to Supabase 'matches' table
        let insertedCount = 0;
        for (const match of matchResults) {
            // Sort IDs to ensure consistency (user_a_id is always alphabetically first)
            const [id1, id2] = [match.user_a_id, match.user_b_id].sort();
            
            // Check if this exact pair already exists
            const { data: existing } = await supabase
                .from("matches")
                .select("id")
                .eq("user_a_id", id1)
                .eq("user_b_id", id2)
                .maybeSingle();

            if (!existing) {
                const { error: insertError } = await supabase
                    .from("matches")
                    .insert({
                        user_a_id: id1,
                        user_b_id: id2,
                        score: match.score,
                        rationale: match.rationale,
                        status_sent: false
                    });
                
                if (insertError) {
                    console.error("Error inserting match:", insertError);
                } else {
                    insertedCount++;
                }
            }
        }

        return NextResponse.json({ 
            status: "success", 
            message: `Successfully generated and saved ${insertedCount} new matches.`,
            newMatches: insertedCount
        });

    } catch (error) {
        console.error("User Matchmaking Engine Error:", error);
        return NextResponse.json({ status: "error", message: String(error) }, { status: 500 });
    }
}
