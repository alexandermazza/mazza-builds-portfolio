import { test } from "node:test";
import assert from "node:assert/strict";
import { follow } from "./gpgpu.ts";

test("follow eases toward the target without overshooting", () => {
  let v = 0;
  for (let i = 0; i < 120; i++) {
    const next = follow(v, 1, 1 / 60, 6);
    assert.ok(next > v && next < 1, `step ${i} went from ${v} to ${next}`);
    v = next;
  }
  assert.ok(v > 0.99, `after two seconds it is only at ${v}`);
});

test("follow lands in the same place however the time is split into frames", () => {
  const twoShort = follow(follow(0.2, 0.9, 0.016, 6), 0.9, 0.016, 6);
  const oneLong = follow(0.2, 0.9, 0.032, 6);
  assert.ok(Math.abs(twoShort - oneLong) < 1e-12, `${twoShort} vs ${oneLong}`);
});

test("follow holds still once it has arrived", () => {
  assert.equal(follow(0.5, 0.5, 0.04, 6), 0.5);
});
