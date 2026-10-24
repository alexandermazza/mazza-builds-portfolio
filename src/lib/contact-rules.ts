// The contact note's rules, shared by the page (inline hints) and /api/contact (the real check).
export type ContactField = "name" | "email" | "message";

// in the order they are checked and reported
export const RULES: Record<ContactField, [test: (value: string) => boolean, message: string]> = {
  name: [(v) => v.trim().length > 0, "Add your name so I know who's writing."],
  email: [(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "That email doesn't look right. Check it so I can write back."],
  message: [(v) => v.trim().length > 0, "Write a line or two about what's on your mind."],
};

export function validateContact(
  input: Record<ContactField, unknown>,
): { ok: true; value: Record<ContactField, string> } | { ok: false; field: ContactField; message: string } {
  const value = {} as Record<ContactField, string>;
  for (const field of Object.keys(RULES) as ContactField[]) {
    const v = input[field];
    const [test, message] = RULES[field];
    if (typeof v !== "string" || !test(v)) return { ok: false, field, message };
    value[field] = field === "email" ? v : v.trim();
  }
  return { ok: true, value };
}
