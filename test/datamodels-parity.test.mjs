import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), "utf8");
const readJSON = (p) => JSON.parse(read(p));

// Each contract schema -> the DataModel source file(s) whose union defines that
// type's `system`. Actors compose a shared base; items stand alone.
const sources = {
  character: ["../system/module/data/actor-base.mjs", "../system/module/data/character.mjs"],
  npc: ["../system/module/data/actor-base.mjs", "../system/module/data/npc.mjs"],
  gear: ["../system/module/data/gear.mjs"],
  ability: ["../system/module/data/ability.mjs"],
};
const schemaFiles = {
  character: "../contract/actor-character.schema.json",
  npc: "../contract/actor-npc.schema.json",
  gear: "../contract/item-gear.schema.json",
  ability: "../contract/item-ability.schema.json",
};

// LIMITATION: Foundry DataModels can't be instantiated outside the Foundry
// client (defineSchema needs `foundry.data.fields` at runtime). So this is a
// string-level parity check: every top-level `system` field name in the
// contract must appear literally in the source that defines it. It catches
// renamed/omitted fields, not type mismatches — those are proven live (step 7).
for (const [type, schemaPath] of Object.entries(schemaFiles)) {
  test(`data model for '${type}' mentions every contract system field`, () => {
    const sys = readJSON(schemaPath).properties.system;
    const names = new Set([...Object.keys(sys.properties ?? {}), ...(sys.required ?? [])]);
    const src = sources[type].map(read).join("\n");
    const missing = [...names].filter((n) => !src.includes(n));
    assert.deepEqual(missing, [], `${type} data model is missing field(s): ${missing.join(", ")}`);
  });
}
