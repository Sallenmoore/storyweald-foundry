# Storyweald — Foundry VTT Game System

A data-driven game system for [Foundry Virtual Tabletop](https://foundryvtt.com/), built as the
table-side companion to [Storyweald](https://storyweald.com) (AI-powered TTRPG world-building and
campaign management). One system id (`storyweald`), multiple **ruleset profiles** — Stars Without
Number and a genre-neutral Frontier Western, GM-selectable per world.

## What it does

- **Actor & item sheets** designed to render Storyweald exports faithfully: characters, NPCs and
  creatures with their abilities, gear, skills and resources.
- **Versioned export contract** (`contract/`): the JSON shape Storyweald pushes over
  [foundryapi](https://github.com/Sallenmoore/foundryapi). The system's DataModels mirror it
  field-for-field; contract bumps are coordinated releases.
- **Table mode**: sheets stay legible at coffee-table/kiosk distance (pairs with Monk's Common
  Display + Hide Player UI — see `TABLE.md`).
- **Clickable rolls**: 2d6 skill checks, d20 attack/damage/save rolls, all posted as styled chat
  cards. Roll formulas come from the active ruleset profile, so sheets stay ruleset-agnostic.
- **LLM-content sanitizers**: ability/gear fields are generated text, not trusted formulas — a
  garbage `damage` string disables the roll button instead of crashing the roller.
- **Resource tracking**: HP / system strain / effort with −/+ steppers and a max-lock (casual clicks
  can't re-max a stat), ability `uses` ("3/day" parsed leniently) with a spend button, and weapon
  ammo decrement. Play-time state lives in Foundry flags; Storyweald stays canonical between sessions.
- **SWN initiative**: `1d8 + DEX mod` wired into Foundry's combat tracker.
- Roadmap: live drive from the Storyweald GM deck.

## Ruleset profiles

A **profile** is a data table (`system/module/profiles/*.mjs`) of dice conventions, resource labels,
attributes, saves and a skill list. The sheets and roll engine read whichever profile is active, so
they stay ruleset-agnostic. Two ship today:

| id | Label | Skill / init | Notes |
|---|---|---|---|
| `swn` | Stars Without Number | 2d6 skill, 1d8 init | HP / system strain / effort resources |
| `frontier` | Frontier Western | 1d20 skill, 1d10 init | Genre-neutral western; omits strain/effort |

Pick one per world in **Game Settings → Configure Settings → Storyweald → Ruleset Profile** (world
scope, GM-only). Changing it reloads Foundry. Adding a profile is a new `profiles/<id>.mjs` mirroring
the shape and a line in the `PROFILES` map + settings `choices` in `module/storyweald.mjs` — no sheet
or roll code changes. Labels are genre-neutral by design (mechanics-level compatibility, no ruleset
trademark text).

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

### Releases (maintainers)

Releases are cut by pushing a `v<version>` tag whose number **must match** `system/system.json`'s
`version` (the workflow fails loudly otherwise). Use `scripts/release.sh <version>` — it verifies the
match, runs the tests, and pushes the tag; `.github/workflows/release.yml` then zips `system/` and
publishes the GitHub release the manifest URL above points at.

## License

MIT (code). Contains no ruleset text — mechanics-level compatibility only. Stars Without Number
support per Sine Nomine Publishing's third-party policy.
