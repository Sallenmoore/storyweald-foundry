import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SWN } from "../system/module/profiles/swn.mjs";
import { FRONTIER } from "../system/module/profiles/frontier.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), "utf8");

// The keys the rolls engine + sheets read off a profile. If a profile is missing
// any of these, a genre swap breaks rolls/initiative/saves silently — this is the
// parity contract every profile must satisfy.
test("both profiles expose the keys the rolls engine reads", () => {
  for (const p of [SWN, FRONTIER]) {
    assert.equal(typeof p.id, "string", `${p.id} id`);
    assert.equal(typeof p.label, "string", `${p.id} label`);
    for (const kind of ["skill", "attack", "save", "initiative"]) {
      assert.match(p.dice[kind], /d\d/, `${p.id} dice.${kind}`);
    }
    assert.equal(typeof p.initiative.formula, "string", `${p.id} initiative.formula`);
    assert.equal(typeof p.initiative.decimals, "number", `${p.id} initiative.decimals`);
    // Attribute + save keys must MATCH across profiles: @attributes.dex (initiative)
    // and saveRoll(profile, actor, key) resolve by these keys, not by label.
    assert.deepEqual(Object.keys(p.attributes), ["str", "dex", "con", "int", "wis", "cha"]);
    assert.deepEqual(Object.keys(p.saves), ["physical", "evasion", "mental"]);
    assert.ok(p.resources.hp, `${p.id} labels hp`);
    assert.ok(Array.isArray(p.skills) && p.skills.length > 0, `${p.id} skills`);
  }
});

// The conditional-resource-strip driver: frontier declares no strain/effort, so
// the sheet renders no stepper for them; it keeps the shared AC/attack labels.
test("frontier omits the resources the genre lacks", () => {
  assert.equal(FRONTIER.resources.system_strain, undefined);
  assert.equal(FRONTIER.resources.effort, undefined);
  assert.ok(FRONTIER.resources.armor_class && FRONTIER.resources.attack_bonus);
});

// Pin the Western skill list to StoryTeller's WesternSystem.get_skills_list order
// and Skill.name spellings, so a drift on either side is caught here.
test("frontier pins StoryTeller's WesternSystem skill list", () => {
  assert.deepEqual(FRONTIER.skills, [
    "Acrobatics", "Brawling", "Deception", "FirstAid", "Gambling", "History",
    "Insight", "Intimidation", "Investigation", "Marksmanship", "Perception",
    "Persuasion", "Religion", "Riding", "SleightOfHand", "Stealth", "Survival",
    "Tracking",
  ]);
});

// String-level check that init wires a world-scoped, both-choice profile setting
// (can't boot Foundry here — so we assert the registration source, not runtime).
test("init registers a world-scoped profile setting offering both profiles", () => {
  const src = read("../system/module/storyweald.mjs");
  assert.match(src, /game\.settings\.register\(\s*["']storyweald["']\s*,\s*["']profile["']/);
  assert.match(src, /scope:\s*["']world["']/);
  assert.match(src, /choices:\s*\{[^}]*swn[^}]*frontier[^}]*\}/s);
});
