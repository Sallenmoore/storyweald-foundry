import { skillRoll, attackRoll, damageRoll, saveRoll } from "../rolls.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const PATH = "systems/storyweald/templates/actor";
const CHAT_CARD = "systems/storyweald/templates/chat/roll-card.hbs";

/**
 * Actor sheet for both `character` and `npc`. ApplicationV2 + Handlebars, v14.
 * T2 adds clickable rolls: skill rows, save chips, and per-ability attack/damage
 * buttons post a styled chat card. Every formula/label comes from module/rolls.mjs
 * (profile-driven, sanitized); an ability with no rollable hit_roll/damage renders
 * no button (the T1 null contract).
 */
export class StorywealdActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["storyweald", "sheet", "actor"],
    position: { width: 620, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editItem: this._onEditItem,
      rollSkill: this._onRollSkill,
      rollSave: this._onRollSave,
      rollAttack: this._onRollAttack,
      rollDamage: this._onRollDamage,
    },
  };

  // Header (portrait + identity + stat strip + tab nav) is always rendered; each
  // remaining PART is one tab body. PART id === tab id so _preparePartContext can
  // hand each body its tab record.
  static PARTS = {
    header: { template: `${PATH}/header.hbs` },
    skills: { template: `${PATH}/skills.hbs` },
    inventory: { template: `${PATH}/inventory.hbs` },
    abilities: { template: `${PATH}/abilities.hbs` },
    biography: { template: `${PATH}/biography.hbs` },
  };

  static TABS = {
    primary: {
      initial: "skills",
      tabs: [
        { id: "skills", label: "STORYWEALD.Tab.skills" },
        { id: "inventory", label: "STORYWEALD.Tab.inventory" },
        { id: "abilities", label: "STORYWEALD.Tab.abilities" },
        { id: "biography", label: "STORYWEALD.Tab.biography" },
      ],
    },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.document;
    context.system = this.document.system;
    context.editable = this.isEditable;
    context.isNpc = this.document.type === "npc";
    context.profile = CONFIG.STORYWEALD?.profile;
    // Attributes/saves as ordered [key,label,data] rows so the template stays flat.
    context.attributes = Object.entries(context.profile?.attributes ?? {}).map(
      ([key, label]) => ({ key, label, ...this.document.system.attributes[key] }),
    );
    context.saves = Object.entries(context.profile?.saves ?? {}).map(
      ([key, label]) => ({ key, label, value: this.document.system.saves?.[key] }),
    );
    context.gear = this.document.items.filter((i) => i.type === "gear");
    // Ability rows carry precomputed rollability so the template shows an
    // attack/damage button only when rolls.mjs can build a formula for it.
    context.abilityItems = this.document.items
      .filter((i) => i.type === "ability")
      .map((i) => ({
        id: i.id,
        name: i.name,
        system: i.system,
        canAttack: attackRoll(context.profile, i) !== null,
        canDamage: damageRoll(context.profile, i) !== null,
      }));
    // Explicit rather than trusting the super chain to preserve it.
    context.tabs = this._prepareTabs("primary");
    return context;
  }

  _preparePartContext(partId, context, options) {
    context.tab = context.tabs?.[partId];
    return context;
  }

  /** Open the embedded Item's own sheet. Bound to the sheet instance by Foundry. */
  static _onEditItem(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    this.document.items.get(id)?.sheet.render(true);
  }

  static _onRollSkill(event, target) {
    const name = target.closest("[data-skill]")?.dataset.skill;
    this._postRoll(skillRoll(this._profile, this.actor, name));
  }

  static _onRollSave(event, target) {
    const key = target.dataset.save;
    this._postRoll(saveRoll(this._profile, this.actor, key));
  }

  static _onRollAttack(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (item) this._postRoll(attackRoll(this._profile, item), `${item.name} — Attack`);
  }

  static _onRollDamage(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (item) this._postRoll(damageRoll(this._profile, item), `${item.name} — Damage`);
  }

  get _profile() {
    return CONFIG.STORYWEALD?.profile;
  }

  /**
   * Evaluate a roll result from rolls.mjs and post the styled chat card. `result`
   * may be null (nothing rollable) — a no-op, matching the T1 button contract.
   */
  async _postRoll(result, title) {
    if (!result) return;
    const roll = new Roll(result.formula, this.actor.getRollData());
    await roll.evaluate();
    const content = await foundry.applications.handlebars.renderTemplate(CHAT_CARD, {
      img: this.actor.img,
      actorName: this.actor.name,
      title: title ?? result.label,
      flavor: result.flavor,
      formula: roll.formula,
      total: roll.total,
      dice: roll.dice.map((d) => ({ faces: d.faces, results: d.results.map((r) => r.result) })),
    });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
    });
  }
}
