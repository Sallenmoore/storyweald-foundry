# Storyweald ⇄ Foundry Export Contract

**Contract version: 1**

The canonical, versioned description of the JSON documents StoryTeller (a.k.a.
Storyweald) pushes into Foundry VTT for the **`storyweald`** game system. It is
the source of truth that both sides build against: StoryTeller's exporter emits
these shapes; the Foundry system's DataModels and sheets consume them.

## Purpose

StoryTeller already exports actors and items to Foundry, but today it targets
**existing community systems** (`swnr` for Stars Without Number, `dnd5e`), so the
`system` payloads are shaped for those third-party schemas. Because we now ship
our **own** Foundry system (`storyweald`), we own the target schema and can make
it a clean, stable, versioned surface instead of chasing another project's field
names.

This contract was **extracted** from the existing exporters — it invents no
mechanics StoryTeller doesn't already have. Every field below names its source
StoryTeller field (or is explicitly flagged as having none). Sources:

- `models/systems/starswithoutnumbersystem/system.py` — `foundry_character_export`,
  `foundry_creature_export`, `foundry_item_export`, `swnr_ability_document` (#861).
- `models/systems/fantasysystem/system.py` — the dnd5e-shaped exporter (cross-check).
- `models/ttrpgobject/{ability,item,character,creature}.py`, `models/base/actor.py` —
  the model fields and each type's `page_data()`.
- `models/utility/foundry/actor_service.py` — how items/abilities embed on the actor.

## Document taxonomy

| Foundry document | `type` | StoryTeller source |
|---|---|---|
| **Actor** | `character` | `Character` where `is_player` is true (PCs) |
| **Actor** | `npc` | `Character` (non-player) **and** `Creature` — both export as `npc` |
| **Item** | `gear` | `Item` |
| **Item** | `ability` | `Ability` — **embedded** as an Item on its owning actor |

**Abilities are embedded Items.** An actor's powers/features are pushed as Item
documents of type `ability` inside the Actor document's `items[]` array — the
Foundry-native pattern (the SWN exporter already embeds abilities + gear + skills
as full Item docs on the actor create payload; `actor_service.push_actor`). A
standalone `ability` document (outside an actor) is valid too and uses the same
schema.

Skills are **not** a document type here — they ride as `system.skills[]` on the
actor (the SWN exporter emits them as embedded `skill` Items; we fold them into a
first-class actor field instead).

Out of scope in the current exporters and therefore **not** in this contract:
`Vehicle` (SWN `ship` actor) and place/scene exports (`foundry_place_export` →
Foundry `Scene`). They can become `contractVersion`-carrying document types later.

## Versioning rules

- Every document carries **`system.contractVersion`** — an **integer**, currently
  **`1`**. It is the one deliberately camelCase key; all data fields are snake_case.
- Bump the integer **only on a breaking change** to the shape (a field renamed or
  removed, a type changed, a new `required` field added). Additive, backward-
  compatible changes (new optional field) do **not** bump it.
- `system` objects are `additionalProperties: true` on purpose — a newer exporter
  may add fields a consumer doesn't know yet; the consumer must ignore unknowns
  rather than reject the document. The version gate is for *breaking* drift only.
- The schemas in this directory (`*.schema.json`, JSON Schema draft 2020-12) are
  the machine-checkable form of the tables below; `test/contract.test.mjs` compiles
  them and validates the fixtures.

## `system` field name conventions

Field names are clean **snake_case** derived from StoryTeller's own field names,
kept identical where sane. Deliberate departures:

- **`damage`** ← StoryTeller `Ability.dice_roll` (the field holds the damage/effect
  dice string; `damage` reads better on a sheet).
- **`character_class`** ← `Character.occupation` (PCs) / `Creature.archetype` (NPCs)
  — the SWN exporter collapses both into swnr's `class`.
- **`hp` / `armor_class`** ← `hitpoints` / `ac`.
- Attribute **`modifier`** is computed `(score - 10) // 2` (floor) — mirrors
  `Actor.initiative`; StoryTeller stores only the raw score.

---

## Actor — `character` (PC)

Top level: `name` (string, required), `type` (const `character`, required),
`img` (string, optional — portrait URL), `system` (object, required),
`items` (array, optional — embedded `gear`/`ability` Items).

### `system`

| Field | JSON type | Required | Source StoryTeller field | Notes |
|---|---|---|---|---|
| `contractVersion` | integer (const 1) | ✅ | — | Version gate. |
| `hp` | `{value:int, max:int}` | ✅ | `Actor.hitpoints` | value = max = hitpoints (export sets both). `current_hp` exists on the model but isn't exported. |
| `armor_class` | integer | ✅ | `Actor.ac` | |
| `attributes` | object (6 keys) | ✅ | `Actor.strength/dexterity/constitution/intelligence/wisdom/charisma` | Keys `str/dex/con/int/wis/cha`, each `{score:int, modifier:int}`. modifier computed. |
| `skills` | array `{name, level}` | ✅ | `Actor.skills` | `{name: level}` map flattened. level = rank (SWN 0–4; other genres can be negative). |
| `level` | integer | ✅ | `Actor.level` | |
| `attack_bonus` | integer | ⬜ | **none** | swnr export hardcodes `ab=1`; no StoryTeller source. |
| `saves` | `{physical, evasion, mental}` int | ⬜ | **none** | swnr computes saves from attributes; no StoryTeller source. |
| `system_strain` | `{value, max}` int | ⬜ | **none** | swnr default. |
| `effort` | `{value, max}` int | ⬜ | **none** | swnr default. |
| `character_class` | string | ⬜ | `Character.occupation` | |
| `species` | string | ⬜ | `Actor.species` | |
| `speed` | string | ⬜ | `Actor.speed` | Free-text, e.g. `"30ft"`. |
| `goals` | string | ⬜ | `Actor.goal` | Character `page_data()` omits it today → usually empty. |
| `biography` | string (HTML) | ⬜ | composed | Exporter builds it from `desc` + `backstory` + `history`. |

## Actor — `npc` (NPCs and creatures)

Same top-level shape as `character` (`type` const `npc`). `system` is the
character set **minus** the `level` requirement (creatures default level 1)
**plus** three creature fields:

| Field | JSON type | Required | Source StoryTeller field | Notes |
|---|---|---|---|---|
| …all `character` `system` fields… | | `contractVersion,hp,armor_class,attributes,skills` required | | `character_class` ← `Creature.archetype` for creatures. |
| `creature_type` | string | ⬜ | `Creature.type` | e.g. `"animal"`, `"humanoid"`. Empty for exported Characters. |
| `size` | string | ⬜ | `Creature.size` | tiny/small/medium/large/huge. |
| `legendary` | boolean | ⬜ | `Creature.legendary` | |

## Item — `gear`

Top level: `name` (string, required), `type` (const `gear`, required), `img`
(string, optional), `system` (object, required).

### `system`

| Field | JSON type | Required | Source StoryTeller field | Notes |
|---|---|---|---|---|
| `contractVersion` | integer (const 1) | ✅ | — | |
| `description` | string (HTML) | ⬜ | composed | From `history` + `features` + `duration`. |
| `cost` | integer | ⬜ | `Item.cost` | `IntAttr`, base currency (unified to int 2026-07-08). |
| `weight` | string | ⬜ | `Item.weight` | Free-text, e.g. `"0.8 kg"`. |
| `rarity` | string enum | ⬜ | `Item.rarity` | common/uncommon/rare/very rare/legendary/artifact. |
| `item_type` | string enum | ⬜ | `Item.item_type` | Derived property: weapon/armor/consumable/utility/artifact. |
| `category` | string | ⬜ | `Item.category` | Free-text descriptive subtype ("Energy Weapon"). |
| `consumable` | boolean | ⬜ | `Item.consumable` | ⚠ `page_data()` exposes it under the **typo key `consumbale`**. |
| `duration` | string | ⬜ | `Item.duration` | |
| `attunement` | string | ⬜ | `Item.attunement` | ⚠ Model field (#837) **not in `page_data()`** today — needs an exporter change to flow. |
| `requirement` | string | ⬜ | `Item.requirement` | ⚠ Model field (#837) **not in `page_data()`** today. |
| `material` | string | ⬜ | `Item.material` | ⚠ Model field **not in `page_data()`** today. |
| `size_class` | string | ⬜ | `Item.size_class` | ⚠ Model field **not in `page_data()`** today. |

## Item — `ability`

Top level: `name` (string, required), `type` (const `ability`, required), `img`
(string, optional), `system` (object, required). Embedded on the actor's
`items[]` (or standalone).

### `system`

| Field | JSON type | Required | Source StoryTeller field | Notes |
|---|---|---|---|---|
| `contractVersion` | integer (const 1) | ✅ | — | |
| `ability_type` | string enum | ⬜ | `Ability.type` | character/item/vehicle/creature (owner kind). |
| `action` | string enum | ⬜ | `Ability.action` | main action/bonus action/reaction/free action/passive. |
| `category` | string enum | ⬜ | `Ability.category` | offensive/defensive/social/support/control/movement/utility. |
| `hit_roll` | string | ⬜ | `Ability.hit_roll` | Attack bonus text, e.g. `"+6"`. |
| `damage` | string | ⬜ | `Ability.dice_roll` | **Renamed** from `dice_roll`. e.g. `"2d6 + 4"`. |
| `save_dc` | string | ⬜ | `Ability.save_dc` | e.g. `"WIS Save"`, `"DEX 15"`. |
| `element` | string | ⬜ | `Ability.element` | |
| `target` | string | ⬜ | `Ability.target` | |
| `range` | string | ⬜ | `Ability.range` | e.g. `"30ft Cone"`. |
| `uses` | string | ⬜ | `Ability.uses` | |
| `duration` | string | ⬜ | `Ability.duration` | |
| `description` | string (HTML) | ⬜ | `Ability.description` | Flavor text. |
| `effects` | string | ⬜ | `Ability.effects` | Hard outcome. |
| `mechanics` | string | ⬜ | `Ability.mechanics` | Raw rules text. |
| `notes` | string | ⬜ | `Ability.notes` | |

---

## Reverse channel (out of scope here — P4)

Foundry → StoryTeller write-back (the `foundry_import` path: name, stats, hp,
level, species, description) will be a **subset** of this contract — the same
field names, only the ones a GM edits at the table flow back. It is specified in
P4, not here.
