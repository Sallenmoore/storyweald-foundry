import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUses } from "../system/module/uses.mjs";

test("parseUses reads the common count/period shapes", () => {
  assert.deepEqual(parseUses("3/day"), { max: 3, period: "day" });
  assert.deepEqual(parseUses("1 per encounter"), { max: 1, period: "encounter" });
  assert.deepEqual(parseUses("once per day"), { max: 1, period: "day" });
  assert.deepEqual(parseUses("twice per turn"), { max: 2, period: "turn" });
  assert.deepEqual(parseUses("2/round"), { max: 2, period: "round" });
  assert.deepEqual(parseUses("1/short rest"), { max: 1, period: "short rest" });
  assert.deepEqual(parseUses("3 x day"), { max: 3, period: "day" });
});

test("parseUses handles casing, spacing, and trailing punctuation", () => {
  assert.deepEqual(parseUses("  3 / Day.  "), { max: 3, period: "day" });
  assert.deepEqual(parseUses("Once Per Long Rest"), { max: 1, period: "long rest" });
});

test("parseUses returns a countless entry for a bare number", () => {
  assert.deepEqual(parseUses("3"), { max: 3, period: null });
});

test("parseUses nulls unbounded uses (display-only, nothing to spend)", () => {
  assert.equal(parseUses("at will"), null);
  assert.equal(parseUses("At-Will"), null);
  assert.equal(parseUses("unlimited"), null);
});

test("parseUses nulls garbage and non-strings", () => {
  assert.equal(parseUses("see text"), null);
  assert.equal(parseUses("varies"), null);
  assert.equal(parseUses("3d6"), null); // dice, not a use count
  assert.equal(parseUses("0/day"), null); // zero uses isn't a resource
  assert.equal(parseUses("-1"), null);
  assert.equal(parseUses(""), null);
  assert.equal(parseUses("   "), null);
  assert.equal(parseUses(null), null);
  assert.equal(parseUses(undefined), null);
  assert.equal(parseUses(3), null);
});
