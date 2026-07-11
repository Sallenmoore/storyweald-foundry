import { StorywealdCharacterData } from "./data/character.mjs";
import { StorywealdNpcData } from "./data/npc.mjs";
import { StorywealdGearData } from "./data/gear.mjs";
import { StorywealdAbilityData } from "./data/ability.mjs";
import { StorywealdActorSheet } from "./sheets/actor-sheet.mjs";
import { StorywealdItemSheet } from "./sheets/item-sheet.mjs";
import { SWN } from "./profiles/swn.mjs";
import { FRONTIER } from "./profiles/frontier.mjs";

// The ruleset profiles a world can pick between, keyed by their id.
const PROFILES = { swn: SWN, frontier: FRONTIER };

Hooks.once("init", () => {
  // World-scoped, GM-configurable ruleset choice. requiresReload: Foundry prompts
  // for a reload on change (sheets/rolls read the profile once, at init) — lazy
  // over re-rendering every open sheet.
  game.settings.register("storyweald", "profile", {
    name: "STORYWEALD.Settings.profile.name",
    hint: "STORYWEALD.Settings.profile.hint",
    scope: "world",
    config: true,
    type: String,
    choices: { swn: SWN.label, frontier: FRONTIER.label },
    default: "swn",
    requiresReload: true,
  });
  const profile = PROFILES[game.settings.get("storyweald", "profile")] ?? SWN;

  // Expose the active ruleset profile for sheets/rolls (P2+).
  CONFIG.STORYWEALD = { profile };
  game.storyweald = { profile };

  // Register the DataModel for each document sub-type declared in system.json.
  CONFIG.Actor.dataModels.character = StorywealdCharacterData;
  CONFIG.Actor.dataModels.npc = StorywealdNpcData;
  CONFIG.Item.dataModels.gear = StorywealdGearData;
  CONFIG.Item.dataModels.ability = StorywealdAbilityData;

  // Initiative formula from the active profile.
  CONFIG.Combat.initiative = { ...profile.initiative };

  // --- Sheet registration (T3) ---------------------------------------------
  // ApplicationV2 + HandlebarsApplicationMixin sheets, made default for each
  // sub-type. Signature: registerSheet(documentClass, scope, sheetClass, config).
  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(Actor, "storyweald", StorywealdActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
    label: "STORYWEALD.SheetLabel.actor",
  });
  DocumentSheetConfig.registerSheet(Item, "storyweald", StorywealdItemSheet, {
    types: ["gear", "ability"],
    makeDefault: true,
    label: "STORYWEALD.SheetLabel.item",
  });
});
