# Table client setup (coffee-table / kiosk display)

How the physical game table shows a live Foundry world, and how the Storyweald GM
**Run deck** drives it. This is the operator runbook for the TV/kiosk client and the
two display modules. It documents the *state we run in production* (module ids,
setting names, the display user) — verified headlessly against the live `sandbox-swn`
world (Foundry core 14.364, system `storyweald`) on 2026-07-10.

Repos in play: this repo (`storyweald-foundry` = the `storyweald` system + these table
docs), `foundryapi` (headless REST bridge the deck talks to), StoryTeller (the deck itself).

---

## (a) What the table setup is

- **One kiosk Foundry client on the TV.** A browser (or a dedicated mini-PC / Fire stick
  browser) at the table logs into the campaign's Foundry world as a **dedicated player-level
  "display" user** and is left running full-screen. Two modules strip it down to a clean,
  chrome-free board: **Monk's Common Display** (mirror the GM's view / focus combat) and
  **Hide Player UI** (remove navigation, controls, sidebar for that user).
- **Players are optional.** They can join the same world from their own laptops/phones as
  normal Foundry players, or just watch the TV. Nothing about the deck→table loop requires
  player clients to exist.
- **The GM never touches Foundry directly during play.** The GM runs the Storyweald **Run
  deck**; deck actions (start session, next turn, HP/condition changes, map switch, handout
  send) are pushed into the live world through `foundryapi`. `live_session` stays the source
  of truth; every push is best-effort (a degraded Foundry never breaks the deck).
- **`/table` fallback:** StoryTeller's own `/table` display page keeps working unchanged and
  needs no Foundry at all. If you don't want a Foundry kiosk (or Foundry is down), point the
  TV at StoryTeller `/table` instead — you lose the map/token board but keep the deck-driven
  table view. Foundry kiosk and `/table` are alternatives, not a stack.

---

## (b) Installing the two modules

Both modules are **already installed and enabled** in this instance:

| Module | id | Version | Foundry 14 |
|---|---|---|---|
| Monk's Common Display | `monks-common-display` | **14.01** | verified for v14 |
| Hide Player UI | `hide-player-ui` | **1.9.1** | manifest verified to 13.345 — runs on 14.364, see troubleshooting |

Foundry installs modules at the **setup level** (not per-world), then each world enables the
ones it wants. Two proven mechanisms:

**1. Disk drop (how these got here; same pattern as worlds).** Foundry scans
`…/Data/modules/<id>/` at setup load. Unzip a module's release into its own folder and
restart the container so setup rescans:

```bash
# host side; data root: /opt/nvme/data-services/foundry/data/Data/modules/
cd /opt/nvme/data-services/foundry/data/Data/modules
curl -L -o mcd.zip https://github.com/ironmonk108/monks-common-display/archive/14.01.zip
unzip mcd.zip -d monks-common-display   # ensure module.json lands at monks-common-display/module.json
curl -L -o hpu.zip https://github.com/gsimon2/hide-player-ui/releases/download/1.9.1/module.zip
unzip hpu.zip -d hide-player-ui
chown -R samoore:samoore monks-common-display hide-player-ui   # match sibling ownership
# module discovery happens at setup load -> restart the foundry container (see caveats below)
```

The manifest URLs (for the latest version instead of a pinned one) live in each `module.json`:
`monks-common-display` → `…/releases/latest/download/module.json`; `hide-player-ui` →
`…/releases/download/1.9.1/module.json`. Foundry's package registry also answers
`https://api.foundryvtt.com/_api/packages/get?id=<module-id>`.

**Restart caveat:** modules are only rescanned when Foundry (re)loads the setup layer, so a
disk install needs a container restart to be discovered. **Never restart while a session is
live** — check the world's join page / recent `docker logs foundry` for active players first.
If someone is in-world, do the disk drop and defer the restart to between sessions. After
restart, relaunch the active world:
`POST foundryapi /world/launch {"world":"sandbox-swn"}` then poll `/health` until
`{"connected":true,"world":"sandbox-swn"}`. (No restart was needed for this deployment —
both modules were already present and enabled.)

**2. Foundry setup UI / setup API.** From the setup screen, **Add-on Modules → Install Module**,
paste the manifest URL. This is the normal interactive path and needs the admin key; it writes
into the same `Data/modules/` tree and needs no manual restart. Use it when you're at a browser;
use the disk drop for headless/scripted installs.

---

## (c) The display user

A dedicated **player-level** user named **`table`** exists (id `mEEuiBcBUSPLdyNB`, role `1` =
PLAYER). The TV logs in as this user. Keep it player-role so the table only ever sees what the
GM shares — never give it Gamemaster.

Recreate it headlessly if lost:

```bash
curl -s -X POST https://foundryapi.stevenamoore.dev/documents \
  -H "Authorization: Bearer $FOUNDRYAPI_TOKEN" -H 'Content-Type: application/json' \
  -d '{"type":"User","data":{"name":"table","role":1}}'
```

Two login options — **pick one; never put credentials in a URL, bookmark, or script:**

- **Passwordless kiosk (current default).** The `table` user has no password, so the TV just
  picks it from the user list and joins. Simplest for an always-on kiosk. **Tradeoff:** anyone
  who can reach the world on the LAN can join as `table` — acceptable because it's player-role
  and this is a trusted home LAN. Don't expose the world publicly with a passwordless user.
- **Password + browser autofill.** Set a password on `table` and let the kiosk browser's saved
  password fill the login form. Slightly more friction on first setup; no standing passwordless
  seat. The password lives only in the browser's credential store — **not** in any URL or launch
  script.

---

## (d) Monk's Common Display — clean table view

Configure while logged in as the **GM**. Settings live under *Configure Settings →
Monk's Common Display* (module id `monks-common-display`); exact names:

- **Configure Common Display** (`configure` menu, "Configure what player is used for the
  common display") — the important one. Open it and designate **`table`** as the common
  display, and set its **startup view** (what the screen shows before combat, e.g. mirror the
  GM). Per-player, you can also tick **"This player is a common display"** (`display`) on the
  `table` user.
- **Show Combat** (`show-combat`, default on) — auto-shows the combat display when an encounter
  starts and hides it when it ends. This is the focus-follow-combat behaviour the deck relies on:
  deck "start session" creates the encounter → the table snaps to it.
- **Hide UI** (`hide-ui`) — hides Foundry chrome on the common display. Turn **on** for a clean
  board (works together with Hide Player UI below).
- **Screen Padding** (`focus-padding`) — padding around the focused token when the display pans.
- **Per Scene** (`per-scene`) — store display settings per scene if different scenes want
  different framing; leave off for one consistent table view.
- Combat framing extras if the tracker feels cramped/large: **Combat Scale** (`combat-scale`),
  **Limit shown combatants** (`limit-shown`), **Show Chat Log** (`show-chat-log`).

The deck's map switch calls `POST /scene/{id}/activate`; MCD's "mirror the GM / follow combat"
then keeps the table framed on the active scene automatically.

---

## (e) Hide Player UI — for the `table` user

Also configured as **GM**, under *Configure Settings → Hide Player UI* (module id
`hide-player-ui`). Target the display user without touching real players:

- **Player Names With Hidden UI** (`hiddenPlayers`) — set to **`table`** (comma-separated if
  more than one display). This applies the hidden-UI config to that user only. (Leave
  **Hide For All Players** / `hideForAllPlayers` **off** so real players keep their UI.)
- **Connecting Player's UI Configuration** (menu `hide-player-ui`) — GM-side checklist of which
  chrome to strip for connecting players: **Hide Foundry logo**, **Hide Navigation Section**
  (or just navToggle / scene list / boss bar), **Hide Controls** (left toolbar), **Hide Sidebar**
  (or specific tabs). For a bare table, hide logo + navigation + controls + sidebar.
- **Personal UI Configuration** (menu `hide-player-ui-player-configuration`) — alternative:
  log in *as* `table` on the kiosk and set the per-screen hides there. Player sessions must be
  refreshed for changes to take effect.

MCD's **Hide UI** and Hide Player UI overlap; using both gives the cleanest result — MCD frames
the board, Hide Player UI guarantees no player chrome leaks onto the TV.

---

## (f) How Storyweald deck pushes appear on the table

The deck talks to `foundryapi` (`https://foundryapi.stevenamoore.dev`, bearer server-side in
StoryTeller's env). What lands on the table:

| Deck action | foundryapi call | On the table |
|---|---|---|
| Start session | `POST /combat` (+ bound scene `POST /scene/{id}/activate`) | Scene activates; combat tracker appears (MCD auto-shows via **Show Combat**) |
| Next / prev turn | `POST /combat/{id}/turn` | Tracker advances the active combatant |
| HP / condition change | `PATCH /documents/Actor.<id>` (+ `/combat/{id}/combatant/{cid}` for defeated) | Actor sheet / tracker updates live |
| Map switch | `POST /scene` then `POST /scene/{id}/activate` | The new scene becomes active; MCD reframes the board |
| Handout — image | `POST /show/image {url,title?}` | Image **popout** on all clients (fire-and-forget broadcast; visual only, no ack) |
| Handout — journal | `POST /show/journal {uuid,force?}` | Journal entry rendered to players (server-acked) |
| End session | `DELETE /combat/{id}` | Combat ends; MCD hides the tracker |

Scene activation and image/journal popouts are **native Foundry behaviour** — the modules aren't
required for the push to arrive; they're required for it to look *clean* on the TV. Every push is
best-effort with a tight timeout: if `foundryapi` or Foundry is degraded, the deck stays fully
functional and shows a degraded link chip (see below).

---

## (g) Troubleshooting

- **Nothing shows on the TV / board has full UI chrome** — a module is disabled. Check
  `core.moduleConfiguration` for the world:
  `curl -s -X POST https://foundryapi.stevenamoore.dev/query -H "Authorization: Bearer $FOUNDRYAPI_TOKEN" -H 'Content-Type: application/json' -d '{"type":"Setting","query":{"key":"core.moduleConfiguration"}}'`
  — both `monks-common-display` and `hide-player-ui` must be `true`. Re-enable in the world's
  *Manage Modules*, or (headless) patch that Setting document. Module settings can't be set via
  `foundryapi /execute` — it's a reserved stub (503) — so module *config* menus are a one-time GM
  UI step; only enable/disable state lives in a Setting document you can patch.
- **Deck pushes land but the TV doesn't follow** — the `table` user isn't set as the common
  display, or it's on the wrong scene. Reopen **Configure Common Display**, confirm `table` is
  the display, and that MCD **Show Combat** is on. If the kiosk drifted to a stale scene, the
  next `/scene/{id}/activate` (any deck map switch) re-syncs it; MCD only follows the *active*
  scene.
- **Hide Player UI leaves chrome on 14.364** — the module manifest is verified only to 13.345.
  It runs on core 14.364 (enabled here), but if a UI element refuses to hide after a Foundry
  bump, fall back to MCD's own **Hide UI** for the board and check for a newer `hide-player-ui`
  release. This is the one module to re-verify after any Foundry major upgrade.
- **Deck shows a "degraded" link chip** — `foundryapi` is unreachable or Foundry is down;
  pushes are being swallowed (by design — the deck keeps working on `live_session`). Check
  `curl -s https://foundryapi.stevenamoore.dev/health` (want `{"connected":true,"world":"…"}`).
  A `foundryapi` container rebuild briefly drops the link — do those between sessions. If
  `/health` is 503 but the world is up, the world may lack the `api` user (foundryapi only
  reports connected in worlds where its user exists).
- **After installing/updating a module** — remember the setup-level rescan needs a container
  restart, which drops any live session. Restart only between sessions, then relaunch the world
  and poll `/health`.

---

### Verified headlessly (2026-07-10, against live `sandbox-swn`)

- `monks-common-display` 14.01 + `hide-player-ui` 1.9.1 present on disk and both `true` in the
  world's `core.moduleConfiguration`.
- `table` player user (role 1) created and confirmed in the world user list.
- `POST /show/image` → 200; `POST /show/journal` (throwaway journal) → 200.
- No container restart performed (both modules already discovered + enabled).

Visual confirmation of the deck→table loop on a real client is a user step (Phase 3 T5).
