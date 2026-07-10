# Storyweald — Foundry VTT Game System

A data-driven game system for [Foundry Virtual Tabletop](https://foundryvtt.com/), built as the
table-side companion to [Storyweald](https://storyweald.com) (AI-powered TTRPG world-building and
campaign management). One system id (`storyweald`), multiple **ruleset profiles** — Stars Without
Number first; Other Dust and a genre-neutral western profile planned.

## What it does

- **Actor & item sheets** designed to render Storyweald exports faithfully: characters, NPCs and
  creatures with their abilities, gear, skills and resources.
- **Versioned export contract** (`contract/`): the JSON shape Storyweald pushes over
  [foundryapi](https://github.com/Sallenmoore/foundryapi). The system's DataModels mirror it
  field-for-field; contract bumps are coordinated releases.
- **Table mode**: sheets stay legible at coffee-table/kiosk distance (pairs with Monk's Common
  Display + Hide Player UI — see `TABLE.md`).
- Roadmap: clickable 2d6 skill rolls, attacks/damage/saves, SWN initiative, resource tracking,
  live drive from the Storyweald GM deck.

## Install

Manifest URL (Foundry setup → Install System → Manifest):

```
https://github.com/Sallenmoore/storyweald-foundry/releases/latest/download/system.json
```

## Layout

| Path | What |
|---|---|
| `system/` | The Foundry package root (`system.json`, `module/`, `templates/`, `styles/`, `lang/`) |
| `contract/` | Export contract: `contract.md` + JSON Schemas |
| `test/` | Node tests (`node --test`; ajv schema validation) |
| `scripts/` | Release tooling |

## Development

No build step — plain ESM. Bind-mount `system/` into a Foundry container at
`/data/Data/systems/storyweald` and restart Foundry to pick up `system.json` changes; sheet
JS/CSS reloads with the browser.

```sh
npm install   # ajv (test-only dependency)
node --test test/
```

## License

MIT (code). Contains no ruleset text — mechanics-level compatibility only. Stars Without Number
support per Sine Nomine Publishing's third-party policy.
