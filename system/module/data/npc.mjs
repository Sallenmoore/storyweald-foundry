import { StorywealdActorBase } from "./actor-base.mjs";

const fields = foundry.data.fields;

/**
 * NPCs and creatures (both export as type `npc`). The shared actor schema plus
 * three creature descriptors from actor-npc.schema.json.
 */
export class StorywealdNpcData extends StorywealdActorBase {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.creature_type = new fields.StringField({ initial: "" });
    schema.size = new fields.StringField({ initial: "" });
    schema.legendary = new fields.BooleanField({ initial: false });
    return schema;
  }
}
