/**
 * The Stars Without Number ruleset, expressed as a data table.
 *
 * Pure data (plus trivial derived getters): consumed by storyweald.mjs at init
 * and, from P2 on, by the sheets and roll logic. No Foundry APIs are touched
 * here so it can be imported and read anywhere, including the node tests.
 */
export const SWN = {
  id: "swn",
  label: "Stars Without Number",

  // Dice conventions for each roll kind.
  dice: {
    skill: "2d6", // skill check: 2d6 + attribute modifier + skill level
    attack: "1d20", // attack roll
    save: "1d20", // saving throw (roll high vs the save target)
    initiative: "1d8",
  },

  // Feeds CONFIG.Combat.initiative — SWN individual initiative is 1d8 + DEX mod.
  initiative: {
    formula: "1d8 + @attributes.dex.modifier",
    decimals: 0,
  },

  // Labels for the resource strip on the actor sheet. Keys match system fields.
  resources: {
    hp: "HP",
    armor_class: "AC",
    attack_bonus: "Attack Bonus",
    system_strain: "System Strain",
    effort: "Effort",
  },

  // Non-resource field labels (header level, biography speed).
  labels: {
    level: "Level",
    speed: "Speed",
  },

  // The six attributes, in display order, with their labels. Keys match
  // system.attributes.<key>.
  attributes: {
    str: "Strength",
    dex: "Dexterity",
    con: "Constitution",
    int: "Intelligence",
    wis: "Wisdom",
    cha: "Charisma",
  },

  // Saving throws. Keys match system.saves.<key>.
  saves: {
    physical: "Physical",
    evasion: "Evasion",
    mental: "Mental",
  },

  // The standard SWN skill list (2d6 convention, ranks 0-4). An actor's
  // system.skills[] carries the ranks a given character actually has.
  skills: [
    "Administer",
    "Connect",
    "Exert",
    "Fix",
    "Heal",
    "Know",
    "Lead",
    "Notice",
    "Perform",
    "Pilot",
    "Program",
    "Punch",
    "Shoot",
    "Sneak",
    "Stab",
    "Survive",
    "Talk",
    "Trade",
    "Work",
  ],
};

export default SWN;
