import { StorywealdCharacterData } from "./data/character.mjs";
import { StorywealdNpcData } from "./data/npc.mjs";
import { StorywealdGearData } from "./data/gear.mjs";
import { StorywealdAbilityData } from "./data/ability.mjs";
import { StorywealdActorSheet } from "./sheets/actor-sheet.mjs";
import { StorywealdItemSheet } from "./sheets/item-sheet.mjs";
import { SWN } from "./profiles/swn.mjs";

Hooks.once("init", () => {
  // Expose the active ruleset profile for sheets/rolls (P2+).
  CONFIG.STORYWEALD = { profile: SWN };
  game.storyweald = { profile: SWN };

  // Register the DataModel for each document sub-type declared in system.json.
  CONFIG.Actor.dataModels.character = StorywealdCharacterData;
  CONFIG.Actor.dataModels.npc = StorywealdNpcData;
  CONFIG.Item.dataModels.gear = StorywealdGearData;
  CONFIG.Item.dataModels.ability = StorywealdAbilityData;

  // Initiative formula from the SWN profile (1d8 + DEX modifier).
  CONFIG.Combat.initiative = { ...SWN.initiative };

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
