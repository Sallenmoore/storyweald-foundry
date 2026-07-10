const fields = foundry.data.fields;

/**
 * Gear Item. Mirrors item-gear.schema.json field-for-field. rarity/item_type are
 * enums in the contract but stay plain StringFields here — the contract's
 * `system` is additionalProperties:true and consumers must tolerate unknown
 * values, so a lenient field is safer than a `choices` allow-list until a sheet
 * needs a dropdown (P2).
 */
export class StorywealdGearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      contractVersion: new fields.NumberField({ required: true, integer: true, initial: 1 }),
      description: new fields.HTMLField({ initial: "" }),
      cost: new fields.NumberField({ integer: true, initial: 0 }),
      weight: new fields.StringField({ initial: "" }),
      rarity: new fields.StringField({ initial: "" }),
      item_type: new fields.StringField({ initial: "" }),
      category: new fields.StringField({ initial: "" }),
      consumable: new fields.BooleanField({ initial: false }),
      duration: new fields.StringField({ initial: "" }),
      attunement: new fields.StringField({ initial: "" }),
      requirement: new fields.StringField({ initial: "" }),
      material: new fields.StringField({ initial: "" }),
      size_class: new fields.StringField({ initial: "" }),
    };
  }
}
