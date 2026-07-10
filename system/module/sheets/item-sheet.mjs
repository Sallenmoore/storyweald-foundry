const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Item sheet for `gear` and `ability`. One Handlebars part; the template branches
 * on the item type to show the right field grid (contract fields per type).
 * Read-only-first: only name is a bound input in T3.
 */
export class StorywealdItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["storyweald", "sheet", "item"],
    position: { width: 520, height: 520 },
    window: { resizable: true },
    form: { submitOnChange: true },
  };

  static PARTS = {
    main: { template: "systems/storyweald/templates/item/item-sheet.hbs" },
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.document;
    context.system = this.document.system;
    context.editable = this.isEditable;
    context.isGear = this.document.type === "gear";
    context.isAbility = this.document.type === "ability";
    return context;
  }
}
