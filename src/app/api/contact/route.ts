import { NextResponse } from "next/server";
import { Resend } from "resend";
import { validateContact, type ContactField } from "@/lib/contact-rules";

// the API keeps its own wording; the page shows the RULES text before it ever posts
const ERRORS: Record<ContactField, string> = {
  name: "Name is required",
  email: "Valid email is required",
  message: "Message is required",
};

export async function POST(request: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    // a null body throws here and lands in the catch, as before
    const result = validateContact(await request.json());
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: ERRORS[result.field] },
        { status: 400 }
      );
    }
    const { name, email, message } = result.value;

    const { error } = await resend.emails.send({
      from: "Mazza Builds Contact <contact@mazzabuilds.com>",
      to: "alexmazza96@gmail.com",
      replyTo: email,
      subject: `New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }
}
