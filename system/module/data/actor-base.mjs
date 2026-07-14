const fields = foundry.data.fields;

/** A `{ value, max }` integer resource (hp, system strain, effort). */
export function resourceField(initial = 0) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, initial }),
    max: new fields.NumberField({ required: true, integer: true, initial }),
  });
}

/** One attribute: raw `score` plus its computed `modifier`. */
function attributeField() {
  return new fields.SchemaField({
    score: new fields.NumberField({ required: true, integer: true, initial: 10 }),
    modifier: new fields.NumberField({ required: true, integer: true, initial: 0 }),
  });
}

/**
 * Fields shared by both actor sub-types (character and npc). Mirrors the
 * `system` block common to actor-character.schema.json and actor-npc.schema.json
 * field-for-field (snake_case names straight from the export contract).
 *
 * The npc data model extends this and adds creature_type / size / legendary.
 */
export class StorywealdActorBase extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      contractVersion: new fields.NumberField({ required: true, integer: true, initial: 1 }),
      hp: resourceField(),
      armor_class: new fields.NumberField({ required: true, integer: true, initial: 10 }),
      attack_bonus: new fields.NumberField({ integer: true, initial: 0 }),
      saves: new fields.SchemaField({
        physical: new fields.NumberField({ integer: true, initial: 0 }),
        evasion: new fields.NumberField({ integer: true, initial: 0 }),
        mental: new fields.NumberField({ integer: true, initial: 0 }),
      }),
      attributes: new fields.SchemaField({
        str: attributeField(),
        dex: attributeField(),
        con: attributeField(),
        int: attributeField(),
        wis: attributeField(),
        cha: attributeField(),
      }),
      // level is negative-capable elsewhere in the genre stack; SWN ranks are 0-4.
      skills: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true, blank: false }),
          level: new fields.NumberField({ required: true, integer: true, initial: 0 }),
        }),
      ),
      system_strain: resourceField(),
      effort: resourceField(),
      level: new fields.NumberField({ required: true, integer: true, initial: 1 }),
      character_class: new fields.StringField({ initial: "" }),
      species: new fields.StringField({ initial: "" }),
      speed: new fields.StringField({ initial: "" }),
      goals: new fields.StringField({ initial: "" }),
      biography: new fields.HTMLField({ initial: "" }),
    };
  }

  /**
   * Body / Reflex / Will now DERIVE from their governing attribute + level,
   * replacing the stored contract value so the sheet always reflects the current
   * attributes. SWN-style save target: roll 1d20 HIGH, meet-or-beat (see
   * rolls.mjs saveRoll) — a better attribute or higher level lowers the target.
   * Body ← CON, Reflex ← DEX, Will ← WIS; the modifier is the d20 floor
   * ((score-10)/2), matching the export contract's own modifier formula.
   */
  prepareDerivedData() {
    const lvl = this.level ?? 1;
    const mod = (attr) =>
      Math.floor((((this.attributes?.[attr]?.score) ?? 10) - 10) / 2);
    const saveTarget = (attr) => Math.max(2, 15 - mod(attr) - lvl);
    this.saves.physical = saveTarget("con"); // Body
    this.saves.evasion = saveTarget("dex"); // Reflex
    this.saves.mental = saveTarget("wis"); // Will
  }
}
