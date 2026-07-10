import { skillRoll, attackRoll, damageRoll, saveRoll } from "../rolls.mjs";
import { parseUses } from "../uses.mjs";

// The three {value, max} resources that get steppers on the header strip.
const STEPPED = ["hp", "system_strain", "effort"];

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
      toggleEdit: this._onToggleEdit,
      adjustResource: this._onAdjustResource,
      spendUse: this._onSpendUse,
      resetUses: this._onResetUses,
      fireAmmo: this._onFireAmmo,
      reloadAmmo: this._onReloadAmmo,
    },
  };

  // Max fields (hp/strain/effort max, editable stats) are locked by default so a
  // casual tap at the table can't re-max a stat; the header lock toggles this.
  _editMode = false;

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
    // Edit mode only exists on an editable sheet; the template disables max
    // inputs and hides the unlock cue otherwise.
    context.editMode = this._editMode && this.isEditable;
    const labels = context.profile?.resources ?? {};
    context.resourceStats = STEPPED.map((key) => ({
      key,
      label: labels[key] ?? key,
      ...this.document.system[key],
    }));
    // Gear rows precompute weapon-ness + ammo flags so weapons get an ammo
    // counter (flags.storyweald.ammo — Foundry-local play state, reset on re-push).
    context.gear = this.document.items
      .filter((i) => i.type === "gear")
      .map((i) => ({
        id: i.id,
        name: i.name,
        system: i.system,
        isWeapon: i.system.item_type === "weapon",
        ammo: i.getFlag("storyweald", "ammo") ?? 0,
      }));
    // Ability rows carry precomputed rollability so the template shows an
    // attack/damage button only when rolls.mjs can build a formula for it, plus
    // parsed `uses` -> a spend counter (flags.storyweald.spent) or display-only text.
    context.abilityItems = this.document.items
      .filter((i) => i.type === "ability")
      .map((i) => {
        const uses = parseUses(i.system.uses);
        const spent = i.getFlag("storyweald", "spent") ?? 0;
        return {
          id: i.id,
          name: i.name,
          system: i.system,
          canAttack: attackRoll(context.profile, i, this.document) !== null,
          canDamage: damageRoll(context.profile, i) !== null,
          uses: uses
            ? { max: uses.max, period: uses.period, remaining: Math.max(0, uses.max - spent) }
            : null,
          usesText: uses ? null : i.system.uses || null,
        };
      });
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
    if (item) this._postRoll(attackRoll(this._profile, item, this.actor), `${item.name} — Attack`);
  }

  static _onRollDamage(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (item) this._postRoll(damageRoll(this._profile, item), `${item.name} — Damage`);
  }

  /** Flip the max-field lock and re-render (button state is declarative). */
  static _onToggleEdit(event, target) {
    this._editMode = !this._editMode;
    this.render();
  }

  /** −/+ a {value,max} resource, clamped to 0..max. */
  static _onAdjustResource(event, target) {
    const key = target.dataset.resource;
    const res = this.document.system[key];
    if (!res) return;
    const value = Math.clamp(res.value + Number(target.dataset.delta), 0, res.max);
    this.document.update({ [`system.${key}.value`]: value });
  }

  /** Spend one ability use: bump the owned item's `spent` flag, capped at max. */
  static _onSpendUse(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;
    const max = Number(target.dataset.max);
    const spent = item.getFlag("storyweald", "spent") ?? 0;
    if (spent < max) item.setFlag("storyweald", "spent", spent + 1);
  }

  /** Reset an ability's spent uses back to zero. */
  static _onResetUses(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    item?.setFlag("storyweald", "spent", 0);
  }

  /** Fire a round: decrement the weapon's ammo flag, floored at 0. */
  static _onFireAmmo(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;
    const ammo = item.getFlag("storyweald", "ammo") ?? 0;
    if (ammo > 0) item.setFlag("storyweald", "ammo", ammo - 1);
  }

  /** Reload: load one round. ponytail: no magazine capacity in the contract, so
   *  a full reload is repeated taps; add a capacity flag if the export gains one. */
  static _onReloadAmmo(event, target) {
    const item = this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    if (!item) return;
    const ammo = item.getFlag("storyweald", "ammo") ?? 0;
    item.setFlag("storyweald", "ammo", ammo + 1);
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
