import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ status: "error", message: "Missing type or data." }, { status: 400 });
    }

    let subject = "";
    let html = "";

    if (type === "civicwire") {
      const { orgName, email, insightsNeeded } = data;
      if (!email || !insightsNeeded) {
        return NextResponse.json({ status: "error", message: "Email and insights details are required." }, { status: 400 });
      }
      subject = `[CivicWire Request] America250 - ${orgName || "Unknown Org"}`;
      html = `
        <h2>New CivicWire Insights Request</h2>
        <p><strong>Organization/Community Name:</strong> ${orgName || "Not Provided"}</p>
        <p><strong>Contact Email:</strong> ${email}</p>
        <p><strong>Local Insights Needed:</strong></p>
        <blockquote style="background: #f1f5f9; padding: 12px; border-left: 4px solid #2563eb; margin: 0; font-style: italic; color: #334155;">
          ${insightsNeeded.replace(/\n/g, "<br />")}
        </blockquote>
        <br />
        <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
        <p style="color: #64748b; font-size: 11px;">Sent from the INI America250 Portal</p>
      `;
    } else if (type === "nomination") {
      const { name, contact, role, reason } = data;
      if (!name || !contact) {
        return NextResponse.json({ status: "error", message: "Name and contact info are required." }, { status: 400 });
      }
      subject = `[INI Nomination] America250 - ${name}`;
      html = `
        <h2>New Network Growth Nomination</h2>
        <p><strong>Recommended Contact/Org:</strong> ${name}</p>
        <p><strong>Contact Info (Email/Web):</strong> ${contact}</p>
        <p><strong>Nominated Role/Type:</strong> ${role || "Not Specified"}</p>
        <p><strong>Why they should join:</strong></p>
        <blockquote style="background: #fdf2f8; padding: 12px; border-left: 4px solid #db2777; margin: 0; font-style: italic; color: #470c24;">
          ${(reason || "Not Provided").replace(/\n/g, "<br />")}
        </blockquote>
        <br />
        <hr style="border: 0; border-top: 1px solid #e2e8f0;" />
        <p style="color: #64748b; font-size: 11px;">Sent from the INI America250 Portal</p>
      `;
    } else {
      return NextResponse.json({ status: "error", message: "Invalid submission type." }, { status: 400 });
    }

    console.log(`📩 Dispatching America250 ${type} email to connect@ini.network...`);

    const res = await resend.emails.send({
      from: 'INI Network <ini@ini.network>',
      to: ['connect@ini.network'],
      subject: subject,
      html: html,
    });

    if (res.error) {
      console.error("Resend API error sending America250 form:", res.error);
      return NextResponse.json({ status: "error", message: res.error.message || "Failed to send email." }, { status: 500 });
    }

    return NextResponse.json({
      status: "success",
      message: "Email successfully dispatched!",
      id: res.data?.id
    });

  } catch (error) {
    console.error("America250 Form Submission Error:", error);
    return NextResponse.json({ status: "error", message: String(error) }, { status: 500 });
  }
}
