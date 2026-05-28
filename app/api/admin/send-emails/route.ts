import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to bypass RLS in background jobs
const supabase = createClient(supabaseUrl, supabaseKey);

// We fall back to a placeholder key if missing to avoid immediate crashes during build/init
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(req: Request) {
    try {
        // 0. Authenticate & Authorize the request
        const cookieStore = await cookies();
        const supabaseAuth = createServerClient(cookieStore);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            console.error("Unauthorized access attempt to Email Dispatch API:", authError);
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
            console.warn(`Forbidden access attempt by ${email} to Email Dispatch API.`);
            return NextResponse.json({ 
                status: "error", 
                message: "Forbidden. This tool is for internal Vngle team members only." 
            }, { status: 403 });
        }

        const body = await req.json();
        const { matchIds } = body;

        if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
            return NextResponse.json({ status: "error", message: "No match IDs provided." }, { status: 400 });
        }

        console.log(`📩 Processing ${matchIds.length} matches for email dispatch...`);

        // 1. Fetch unsent matches
        const { data: matches, error: matchError } = await supabase
            .from("matches")
            .select('*')
            .in("id", matchIds)
            .eq("status_sent", false);

        if (matchError || !matches || matches.length === 0) {
            console.error("Match fetch error or no unsent matches found:", matchError);
            return NextResponse.json({ status: "error", message: "No valid unsent matches found." }, { status: 400 });
        }

        // 2. Fetch contact details for these matches
        const userIds = [...new Set(matches.flatMap(m => [m.user_a_id, m.user_b_id]))];
        const { data: contacts, error: contactError } = await supabase
            .from("contacts")
            .select('id, name, email_contact, role_title, campus, affiliation')
            .in('id', userIds);

        if (contactError || !contacts) {
            console.error("Failed to load contact profiles:", contactError);
            return NextResponse.json({ status: "error", message: "Could not fetch contact details." }, { status: 500 });
        }

        // Map for quick lookup
        const contactMap = new Map(contacts.map(c => [c.id, c]));

        let sentCount = 0;
        const failedMatches = [];

        // 3. Dispatch emails
        for (const match of matches) {
            const userA = contactMap.get(match.user_a_id);
            const userB = contactMap.get(match.user_b_id);

            if (!userA?.email_contact || !userB?.email_contact) {
                console.warn(`Skipping match ${match.id} due to missing email addresses.`);
                failedMatches.push(match.id);
                continue;
            }

            const sendIndividualEmail = async (recipient: any, matchedWith: any) => {
                const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-w-2xl mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <h2 style="color: #1e3a8a; text-align: center; margin-bottom: 24px;">🌟 You have a new match on INI!</h2>
                    
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        Hello <strong>${recipient.name.split(' ')[0]}</strong>,
                    </p>
                    
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        Our AI Matchmaker has identified a strong potential synergy between you and <strong>${matchedWith.name}</strong>!
                    </p>

                    <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #3b82f6; margin: 24px 0;">
                        <p style="margin: 0; font-size: 16px; color: #1e293b; font-style: italic;">
                            "${match.rationale}"
                        </p>
                    </div>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="https://ini.network/matches" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: white; text-decoration: none; font-weight: bold; border-radius: 8px; font-size: 16px;">
                            View Your Match on INI.network
                        </a>
                    </div>

                    <p style="color: #64748b; font-size: 14px; text-align: center;">
                        Log in to view details, explore their network, and reach out to collaborate!
                    </p>
                    
                    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <p style="color: #94a3b8; font-size: 12px;">
                            Sent automatically by the <a href="https://ini.network" style="color: #3b82f6; text-decoration: none;">INI Network</a> Matchmaker.<br/>
                            Institute for Nonpartisan Innovation @ Vngle
                        </p>
                    </div>
                </div>
                `;

                return resend.emails.send({
                    from: 'INI Network <ini@ini.vngle.com>', // MUST match your verified domain in Resend
                    to: [recipient.email_contact],
                    subject: '🌟 You have a new synergy!',
                    html: htmlContent
                });
            };

            try {
                // Send individual emails
                const [resA, resB] = await Promise.all([
                    sendIndividualEmail(userA, userB),
                    sendIndividualEmail(userB, userA)
                ]);

                if (resA.error || resB.error) {
                    console.error(`Failed to send email for match ${match.id}. Error A:`, resA.error, `Error B:`, resB.error);
                    failedMatches.push(match.id);
                } else {
                    console.log(`Emails sent successfully for match ${match.id}.`);
                    
                    // Update database to mark as sent
                    await supabase
                        .from('matches')
                        .update({ status_sent: true })
                        .eq('id', match.id);
                        
                    sentCount++;
                }
            } catch (err) {
                console.error(`Exception sending email for match ${match.id}:`, err);
                failedMatches.push(match.id);
            }
        }

        return NextResponse.json({ 
            status: "success", 
            message: `Dispatched ${sentCount} emails successfully. Failed: ${failedMatches.length}.`,
            sent: sentCount,
            failed: failedMatches
        });

    } catch (error) {
        console.error("Email Dispatch Error:", error);
        return NextResponse.json({ status: "error", message: String(error) }, { status: 500 });
    }
}
