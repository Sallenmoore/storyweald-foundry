import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SWN } from "../system/module/profiles/swn.mjs";
import {
  sanitizeBonus,
  sanitizeDice,
  skillRoll,
  attackRoll,
  damageRoll,
  saveRoll,
  initiativeFormula,
} from "../system/module/rolls.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (p) => JSON.parse(readFileSync(join(here, "fixtures", p), "utf8"));
const character = fixture("character.json");

// A hit_roll bonus is an integer, in any of the shapes StoryTeller/LLM emit.
test("sanitizeBonus parses integer bonuses, nulls prose and dice", () => {
  assert.equal(sanitizeBonus("+6"), 6);
  assert.equal(sanitizeBonus("6"), 6);
  assert.equal(sanitizeBonus("-1"), -1);
  assert.equal(sanitizeBonus("+0"), 0);
  assert.equal(sanitizeBonus(3), 3);
  assert.equal(sanitizeBonus(""), null);
  assert.equal(sanitizeBonus("see text"), null);
  assert.equal(sanitizeBonus("1d20+6"), null); // a bonus, not a full roll
  assert.equal(sanitizeBonus(null), null);
});

// The crux: LLM damage text must sanitize to a real dice formula or null out.
test("sanitizeDice passes dice expressions, nulls garbage", () => {
  assert.equal(sanitizeDice("2d6 + 4"), "2d6 + 4");
  assert.equal(sanitizeDice("1d8+2"), "1d8 + 2"); // spacing normalized
  assert.equal(sanitizeDice("d6"), "d6");
  assert.equal(sanitizeDice("1D20"), "1d20"); // case normalized
  assert.equal(sanitizeDice("+1d4"), "1d4"); // leading + stripped
  assert.equal(sanitizeDice("see text"), null);
  assert.equal(sanitizeDice("WIS Save"), null);
  assert.equal(sanitizeDice("5"), null); // flat number, no die
  assert.equal(sanitizeDice(""), null);
  assert.equal(sanitizeDice(null), null);
});

// Generated damage strings routinely carry a trailing damage type; keep the roll.
test("sanitizeDice strips a trailing damage-type descriptor", () => {
  assert.equal(sanitizeDice("2d6 + 4 fire"), "2d6 + 4");
  assert.equal(sanitizeDice("2d6 + 4 shock damage"), "2d6 + 4");
  assert.equal(sanitizeDice("1d8+2 force damage"), "1d8 + 2");
  assert.equal(sanitizeDice("1d6 cold damage."), "1d6");
  // still nulls when there's no leading roll, only prose
  assert.equal(sanitizeDice("roll 2d6 fire"), null);
});

test("skillRoll bakes the skill rank into the 2d6 formula", () => {
  assert.deepEqual(skillRoll(SWN, character, "Shoot"), {
    formula: "2d6 + 2",
    label: "Shoot",
    flavor: "Skill Check",
  });
  // rank 0 adds nothing
  assert.equal(skillRoll(SWN, character, "Lead").formula, "2d6");
  // negative ranks (other genres) subtract
  const grim = { system: { skills: [{ name: "Sneak", level: -1 }] } };
  assert.equal(skillRoll(SWN, grim, "Sneak").formula, "2d6 - 1");
  // unknown skill -> no roll
  assert.equal(skillRoll(SWN, character, "Nonexistent"), null);
});

test("attackRoll builds d20 + hit bonus, null when hit_roll isn't a bonus", () => {
  assert.equal(attackRoll(SWN, { system: { hit_roll: "+6" } }).formula, "1d20 + 6");
  assert.equal(attackRoll(SWN, { system: { hit_roll: "+0" } }).formula, "1d20");
  assert.equal(attackRoll(SWN, { system: { hit_roll: "-2" } }).formula, "1d20 - 2");
  assert.equal(attackRoll(SWN, { system: { hit_roll: "" } }), null);
  assert.equal(attackRoll(SWN, { system: { hit_roll: "melee" } }), null);
  // fixture ability carries no hit_roll -> no attack button
  assert.equal(attackRoll(SWN, character.items[0]), null);
});

test("damageRoll sanitizes the damage dice, null on prose", () => {
  assert.deepEqual(damageRoll(SWN, character.items[0]), {
    formula: "1d8 + 2",
    label: "Damage",
    flavor: null,
  });
  assert.equal(damageRoll(SWN, { system: { damage: "see text" } }), null);
  assert.equal(damageRoll(SWN, { system: { damage: "" } }), null);
  assert.equal(damageRoll(SWN, { system: {} }), null);
});

test("saveRoll rolls the save die vs the actor's target", () => {
  assert.deepEqual(saveRoll(SWN, character, "physical"), {
    formula: "1d20",
    label: "Physical Save",
    flavor: "vs 15",
  });
  // unknown save key -> no roll
  assert.equal(saveRoll(SWN, character, "sanity"), null);
  // no target on the actor -> still rollable, no "vs" flavor
  assert.equal(saveRoll(SWN, { system: {} }, "mental").flavor, null);
});

test("initiativeFormula passes the profile formula through", () => {
  assert.equal(initiativeFormula(SWN), "1d8 + @attributes.dex.modifier");
});
