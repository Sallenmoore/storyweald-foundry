// T4 Part 2 — validate LIVE pulled Foundry docs against the contract schemas.
// Mirrors contract.test.mjs but runs over the round-trip output dir instead of
// the fixtures. Usage: node test/validate_live.mjs <dir-of-pulled-*.json>
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const here = dirname(fileURLToPath(import.meta.url));
const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false });
const schemaFiles = {
  character: "../contract/actor-character.schema.json",
  npc: "../contract/actor-npc.schema.json",
  gear: "../contract/item-gear.schema.json",
  ability: "../contract/item-ability.schema.json",
};
for (const p of Object.values(schemaFiles)) ajv.addSchema(readJSON(join(here, p)));
const validatorFor = (name) =>
  ajv.getSchema(readJSON(join(here, schemaFiles[name])).$id);

// map a Foundry doc `type` to the schema name (actors: character|npc; items: gear|ability)
const schemaForType = (t) =>
  ({ character: "character", npc: "npc", gear: "gear", ability: "ability" }[t]);

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node test/validate_live.mjs <dir>");
  process.exit(2);
}

let total = 0;
let failed = 0;
const files = readdirSync(dir).filter((f) => f.startsWith("pulled_") && f.endsWith(".json"));
for (const f of files.sort()) {
  const doc = readJSON(join(dir, f));
  const check = (label, d) => {
    total++;
    const name = schemaForType(d.type);
    if (!name) {
      failed++;
      console.log(`FAIL ${label}: unknown type ${JSON.stringify(d.type)}`);
      return;
    }
    const validate = validatorFor(name);
    const ok = validate(d);
    if (ok) {
      console.log(`ok   ${label}  [${d.type}] ${d.name ?? ""}`);
    } else {
      failed++;
      console.log(`FAIL ${label}  [${d.type}] ${d.name ?? ""}`);
      console.log(JSON.stringify(validate.errors, null, 2));
    }
  };
  check(`${f} (actor)`, doc);
  for (const [i, item] of (doc.items ?? []).entries()) {
    check(`${f} item[${i}]`, item);
  }
}
console.log(`\n== ${total - failed}/${total} documents valid (${failed} failed) ==`);
process.exit(failed ? 1 : 0);
