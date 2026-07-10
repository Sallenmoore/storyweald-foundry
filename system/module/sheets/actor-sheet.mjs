const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const PATH = "systems/storyweald/templates/actor";

/**
 * Actor sheet for both `character` and `npc`. ApplicationV2 + Handlebars, v14.
 * Read-only-first (T3): every contract field renders; the only bound inputs are
 * the ones Foundry gives for free (document name, hp.value) so submitOnChange
 * persists them. Rolls/resource automation are P2.
 */
export class StorywealdActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["storyweald", "sheet", "actor"],
    position: { width: 620, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { editItem: this._onEditItem },
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
    context.abilityItems = this.document.items.filter((i) => i.type === "ability");
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
}
