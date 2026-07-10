import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const readJSON = (p) => JSON.parse(readFileSync(join(here, p), "utf8"));
const roots = (schema) => Object.keys(schema.properties.system.properties ?? {});

// Allowed top-level `system.<field>` roots per template kind (the top-level
// templates/ subdir). Actor sheets render the actor's own fields AND the fields
// of its embedded gear/ability Items, so the actor set is the union of all
// three; item sheets branch on type, so gear+ability.
const npc = readJSON("../contract/actor-npc.schema.json");
const gear = readJSON("../contract/item-gear.schema.json");
const ability = readJSON("../contract/item-ability.schema.json");
const allowed = {
  actor: new Set([...roots(npc), ...roots(gear), ...roots(ability)]),
  item: new Set([...roots(gear), ...roots(ability)]),
};

// LIMITATION: pure string scan. It extracts the first path segment after
// `system.` in each template ({{system.hp.value}} -> "hp") and asserts that
// segment is a declared field on the matching contract schema. It catches
// typo'd or removed field names — not Handlebars validity or nested-field
// correctness, which prove out in a live Foundry render.
const tmplRoot = join(here, "../system/templates");
function hbsFiles(dir, kind) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return hbsFiles(p, kind ?? e.name);
    return e.name.endsWith(".hbs") ? [{ p, kind }] : [];
  });
}

const templates = hbsFiles(tmplRoot);
assert.ok(templates.length > 0, "no .hbs templates found");

for (const { p, kind } of templates) {
  test(`${relative(tmplRoot, p)} references only contract system fields`, () => {
    const known = allowed[kind];
    assert.ok(known, `no allowed field set for template kind '${kind}'`);
    const refs = new Set(
      [...readFileSync(p, "utf8").matchAll(/system\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]),
    );
    const unknown = [...refs].filter((f) => !known.has(f));
    assert.deepEqual(unknown, [], `unknown system field(s): ${unknown.join(", ")}`);
  });
}
