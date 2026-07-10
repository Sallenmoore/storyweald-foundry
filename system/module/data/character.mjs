import { StorywealdActorBase } from "./actor-base.mjs";

/**
 * Player character. Its `system` is exactly the shared actor schema — no fields
 * beyond the base (NPCs are the ones that add creature_type/size/legendary), so
 * this is a named subclass over StorywealdActorBase.
 */
export class StorywealdCharacterData extends StorywealdActorBase {}
