import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const readJSON = (p) => JSON.parse(readFileSync(join(here, p), "utf8"));

// draft 2020-12 with cross-schema $ref (actors $ref the item schemas by $id).
const ajv = new Ajv2020({ allErrors: true, strict: false });
const schemaFiles = {
  character: "../contract/actor-character.schema.json",
  npc: "../contract/actor-npc.schema.json",
  gear: "../contract/item-gear.schema.json",
  ability: "../contract/item-ability.schema.json",
};
for (const p of Object.values(schemaFiles)) ajv.addSchema(readJSON(p));

const validatorFor = (name) =>
  ajv.getSchema(readJSON(schemaFiles[name]).$id);

test("every schema compiles", () => {
  for (const name of Object.keys(schemaFiles)) {
    assert.ok(validatorFor(name), `${name} schema failed to compile`);
  }
});

// fixture -> the schema it must satisfy
const fixtures = {
  character: "fixtures/character.json",
  npc: "fixtures/npc.json",
  gear: "fixtures/gear.json",
  ability: "fixtures/ability.json",
};

for (const [name, path] of Object.entries(fixtures)) {
  test(`fixture ${name} validates against its schema`, () => {
    const validate = validatorFor(name);
    const ok = validate(readJSON(path));
    assert.ok(ok, `${name} invalid: ${JSON.stringify(validate.errors, null, 2)}`);
  });
}

test("negative: a character missing system.hp fails", () => {
  const doc = readJSON("fixtures/character.json");
  delete doc.system.hp;
  const validate = validatorFor("character");
  assert.equal(validate(doc), false, "expected the hp-less character to be rejected");
});

test("negative: an ability document with type 'gear' fails the ability schema", () => {
  const doc = readJSON("fixtures/ability.json");
  doc.type = "gear"; // wrong discriminator for the ability schema's const
  const validate = validatorFor("ability");
  assert.equal(validate(doc), false, "expected a mistyped ability to be rejected");
});

test("negative: an embedded actor item with an unknown type fails", () => {
  const doc = readJSON("fixtures/character.json");
  doc.items.push({ name: "Mystery", type: "spell", system: { contractVersion: 1 } });
  const validate = validatorFor("character");
  assert.equal(validate(doc), false, "expected an unknown embedded item type to be rejected");
});
