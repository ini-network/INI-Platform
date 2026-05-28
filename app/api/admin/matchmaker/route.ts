import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// Ensure environment variables are loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to bypass RLS in background jobs
const geminiKey = process.env.GEMINI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const ai = new GoogleGenAI({ apiKey: geminiKey });

export async function POST() {
    try {
        // 0. Authenticate & Authorize the request
        const cookieStore = await cookies();
        const supabaseAuth = createServerClient(cookieStore);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            console.error("Unauthorized access attempt to Matchmaker API:", authError);
            return NextResponse.json({ status: "error", message: "Unauthorized. Please log in." }, { status: 401 });
        }

        const email = user.email || "";
        const isInternal = email.endsWith("@vngle.com");
        const adminEmailsEnv = process.env.ADMIN_EMAILS || "";
        const isAllowedAdmin = adminEmailsEnv
            .split(",")
            .map(e => e.trim().toLowerCase())
            .filter(Boolean)
            .includes(email.toLowerCase());

        if (!isInternal && !isAllowedAdmin) {
            console.warn(`Forbidden access attempt by ${email} to Matchmaker API.`);
            return NextResponse.json({ 
                status: "error", 
                message: "Forbidden. This tool is for internal Vngle team members only." 
            }, { status: 403 });
        }

        console.log(`🚀 Starting AI Matchmaking cycle triggered by ${email}...`);

        // 1. Fetch public contacts from Supabase
        const { data: contacts, error: fetchError } = await supabase
            .from("contacts")
            .select("id, name, campus, role_title, affiliation, capabilities, communities_served, notes, category, interest_category")
            .eq("is_public", true);

        if (fetchError || !contacts || contacts.length < 2) {
            console.error("Not enough contacts to match, or fetch error:", fetchError);
            return NextResponse.json({ status: "error", message: "Not enough contacts." }, { status: 400 });
        }

        console.log(`📦 Fetched ${contacts.length} profiles for analysis.`);

        // 2. Prepare the data payload for Gemini
        // To save tokens, we stringify a simplified version of the profiles
        const profilesForAI = contacts.map(c => ({
            id: c.id,
            name: c.name,
            interest: c.interest_category,
            skills: c.capabilities,
            notes: c.notes,
            affiliation: c.affiliation
        }));

        const systemPrompt = `
You are the INI Matchmaker AI.
Your job is to analyze the provided list of network profiles and pair people up based on complementary skillsets, similar interests, or synergistic needs.
For example, if Person A needs funding and Person B is a grant writer, that is a strong match. If they share the exact same 'interest', that is also a strong match.

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
- Only return highly relevant matches (score > 0.80).
- Do not match a user with themselves.
- A user can be matched with multiple people if relevant.
- Limit to a maximum of 10 best matches total to avoid overwhelming the system.
`;

        const userPrompt = JSON.stringify(profilesForAI, null, 2);

        // 3. Ask Gemini for matches
        console.log("🧠 Analyzing synergies with Gemini...");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + "\n\nPROFILES:\n" + userPrompt }] }
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
            console.log("Raw output:", rawContent);
            return NextResponse.json({ status: "error", message: "AI returned malformed data." }, { status: 500 });
        }

        if (!Array.isArray(matchResults) || matchResults.length === 0) {
            return NextResponse.json({ status: "success", message: "No strong matches found this cycle.", matches: 0 });
        }

        console.log(`✨ Gemini proposed ${matchResults.length} matches. Saving to database...`);

        // 4. Save to Supabase 'matches' table
        // We will insert them one by one or in a batch. We also want to ensure we don't insert duplicate pairs.
        let insertedCount = 0;
        for (const match of matchResults) {
            // Sort IDs to ensure consistency (user_a_id is always alphabetically first)
            const [id1, id2] = [match.user_a_id, match.user_b_id].sort();
            
            // Check if this pair already exists
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
            message: `Successfully generated ${matchResults.length} matches and inserted ${insertedCount} new ones.`,
            newMatches: insertedCount
        });

    } catch (error) {
        console.error("Matchmaking Engine Error:", error);
        return NextResponse.json({ status: "error", message: String(error) }, { status: 500 });
    }
}
