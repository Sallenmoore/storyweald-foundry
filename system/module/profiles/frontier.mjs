/**
 * A genre-neutral western ruleset, expressed as a data table — the second
 * Storyweald profile, so frontier worlds (StoryTeller's Western genre) can use
 * Foundry as their table. Same shape as profiles/swn.mjs; the sheets and
 * rolls.mjs read whichever profile the GM selects (see storyweald.mjs).
 *
 * IP: labels are deliberately generic — no ruleset trademark strings. The dice
 * conventions are neutral d20 defaults, not any published system's.
 *
 * Pure data (no Foundry APIs) so the node tests can import it directly.
 */
export const FRONTIER = {
  id: "frontier",
  label: "Frontier Western",

  // Neutral d20 conventions. The rolls engine bakes skill level / hit bonus onto
  // these bases, so a skill check is 1d20 + level, an attack 1d20 + hit bonus.
  dice: {
    skill: "1d20",
    attack: "1d20",
    save: "1d20",
    initiative: "1d10", // western-flavored speed
  },

  // Feeds CONFIG.Combat.initiative — 1d10 + DEX mod.
  initiative: {
    formula: "1d10 + @attributes.dex.modifier",
    decimals: 0,
  },

  // The genre has no system strain / effort, so the profile OMITS them: the
  // actor sheet renders a stepper only for resources a profile declares here.
  resources: {
    hp: "Health",
    armor_class: "Guard",
    attack_bonus: "Shot Clock",
  },

  // Same six attribute keys as the contract; matching keys let @attributes.dex
  // (initiative) and the data model resolve regardless of active profile.
  attributes: {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma",
  },

  // Contract save keys (physical/evasion/mental) with neutral western display names.
  saves: {
    physical: "Body",
    evasion: "Reflex",
    mental: "Will",
  },

  // Mirrors StoryTeller's WesternSystem skill list (models/systems/westernsystem/
  // skills.py get_skills_list) — the exact Skill.name spellings an exported actor
  // carries. Declarative today: rolls match on the actor's own system.skills[].name.
  skills: [
    "Acrobatics",
    "Brawling",
    "Deception",
    "FirstAid",
    "Gambling",
    "History",
    "Insight",
    "Intimidation",
    "Investigation",
    "Marksmanship",
    "Perception",
    "Persuasion",
    "Religion",
    "Riding",
    "SleightOfHand",
    "Stealth",
    "Survival",
    "Tracking",
  ],
};

export default FRONTIER;
