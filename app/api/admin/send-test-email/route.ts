import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

// We fall back to a placeholder key if missing to avoid immediate crashes during build/init
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(req: Request) {
    try {
        // 0. Authenticate & Authorize the request
        const cookieStore = await cookies();
        const supabaseAuth = createServerClient(cookieStore);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

        if (authError || !user) {
            console.error("Unauthorized access attempt to Send Test Email API:", authError);
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
            console.warn(`Forbidden access attempt by ${email} to Send Test Email API.`);
            return NextResponse.json({ 
                status: "error", 
                message: "Forbidden. This tool is for internal Vngle team members only." 
            }, { status: 403 });
        }

        const body = await req.json();
        const { to, subject, html } = body;

        if (!to || !subject || !html) {
            return NextResponse.json({ status: "error", message: "Recipient (to), subject, and HTML content are required." }, { status: 400 });
        }

        console.log(`📩 Sending custom test email to ${to} triggered by ${email}...`);

        const res = await resend.emails.send({
            from: 'INI Network <ini@ini.vngle.com>', // MUST match your verified domain in Resend
            to: [to],
            subject: subject,
            html: html
        });

        if (res.error) {
            console.error("Resend API error sending test email:", res.error);
            return NextResponse.json({ status: "error", message: res.error.message || "Failed to send test email via Resend." }, { status: 500 });
        }

        return NextResponse.json({ 
            status: "success", 
            message: `Custom test email successfully dispatched to ${to}!`,
            id: res.data?.id
        });

    } catch (error) {
        console.error("Send Test Email Error:", error);
        return NextResponse.json({ status: "error", message: String(error) }, { status: 500 });
    }
}
