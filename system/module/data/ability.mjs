const fields = foundry.data.fields;

/**
 * Ability Item — embedded on an actor (or standalone). Mirrors
 * item-ability.schema.json field-for-field. `damage` is the contract's rename of
 * StoryTeller's `dice_roll`. Enum-typed contract fields (ability_type/action/
 * category) stay plain StringFields for forward-compat, same as gear.
 */
export class StorywealdAbilityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      contractVersion: new fields.NumberField({ required: true, integer: true, initial: 1 }),
      ability_type: new fields.StringField({ initial: "" }),
      action: new fields.StringField({ initial: "" }),
      category: new fields.StringField({ initial: "" }),
      hit_roll: new fields.StringField({ initial: "" }),
      damage: new fields.StringField({ initial: "" }),
      save_dc: new fields.StringField({ initial: "" }),
      element: new fields.StringField({ initial: "" }),
      target: new fields.StringField({ initial: "" }),
      range: new fields.StringField({ initial: "" }),
      uses: new fields.StringField({ initial: "" }),
      duration: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
      effects: new fields.StringField({ initial: "" }),
      mechanics: new fields.StringField({ initial: "" }),
      notes: new fields.StringField({ initial: "" }),
    };
  }
}
