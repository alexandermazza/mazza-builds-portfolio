import { test } from "node:test";
import assert from "node:assert/strict";
import { validateContact } from "./contact-rules.ts";

const good = { name: "Jordan Lee", email: "jordan@example.com", message: "Quick question." };

test('empty name fails on name with "Add your name so I know who\'s writing."', () => {
  assert.deepEqual(validateContact({ ...good, name: "" }), {
    ok: false,
    field: "name",
    message: "Add your name so I know who's writing.",
  });
});

test('"a@b" fails on email', () => {
  assert.deepEqual(validateContact({ ...good, email: "a@b" }), {
    ok: false,
    field: "email",
    message: "That email doesn't look right. Check it so I can write back.",
  });
});

test("whitespace-only message fails on message", () => {
  assert.deepEqual(validateContact({ ...good, message: " \n\t " }), {
    ok: false,
    field: "message",
    message: "Write a line or two about what's on your mind.",
  });
});

test("checks name, then email, then message", () => {
  const result = validateContact({ name: " ", email: "nope", message: "" });
  assert.equal(result.ok === false && result.field, "name");
  const next = validateContact({ name: "Jordan", email: "nope", message: "" });
  assert.equal(next.ok === false && next.field, "email");
});

test("valid input passes with trimmed values", () => {
  assert.deepEqual(validateContact({ name: "  Jordan Lee ", email: "jordan@example.com", message: "\n Quick question.  " }), {
    ok: true,
    value: good,
  });
});

test("non-string fields fail", () => {
  for (const field of ["name", "email", "message"] as const) {
    for (const bad of [undefined, null, 42, ["a@b.co"], { trim: () => "x" }]) {
      const result = validateContact({ ...good, [field]: bad });
      assert.equal(result.ok, false, `${field} = ${JSON.stringify(bad)}`);
      assert.equal(result.ok === false && result.field, field);
    }
  }
});
