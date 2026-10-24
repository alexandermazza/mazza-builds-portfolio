import { NextResponse } from "next/server";
import { Resend } from "resend";
import { validateContact, type ContactField } from "@/lib/contact-rules";

// the API keeps its own wording; the page shows the RULES text before it ever posts
const ERRORS: Record<ContactField, string> = {
  name: "Name is required",
  email: "Valid email is required",
  message: "Message is required",
};

type Outcome = "sent" | "invalid" | "failed";

export async function POST(request: Request) {
  // with JavaScript off the note posts as a plain form, so it gets a redirect back to the page instead of JSON
  const isForm = (request.headers.get("content-type") ?? "").startsWith("application/x-www-form-urlencoded");
  const reply = (outcome: Outcome, json: object, status: number) =>
    isForm
      ? NextResponse.redirect(new URL(`/contact?status=${outcome}`, request.url), 303)
      : NextResponse.json(json, { status });

  let input: unknown;
  try {
    input = isForm ? Object.fromEntries(await request.formData()) : await request.json();
  } catch {
    return reply("invalid", { success: false, error: "Invalid request" }, 400);
  }
  if (!input || typeof input !== "object") {
    return reply("invalid", { success: false, error: "Invalid request" }, 400);
  }

  const result = validateContact(input as Record<ContactField, unknown>);
  if (!result.ok) {
    return reply("invalid", { success: false, error: ERRORS[result.field] }, 400);
  }
  const { name, email, message } = result.value;

  try {
    // built only after validation, so a bad request never needs the key
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "Mazza Builds Contact <contact@mazzabuilds.com>",
      to: "alexmazza96@gmail.com",
      replyTo: email,
      subject: `New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Resend error:", error);
    return reply("failed", { success: false, error: "Failed to send email" }, 500);
  }

  return reply("sent", { success: true }, 200);
}
