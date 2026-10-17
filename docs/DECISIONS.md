# Decisions

Why things are the way they are. Add an entry when a choice would surprise someone later.

## Platform
- **Forge 47.4.16, not NeoForge.** On 1.20.1 NeoForge is frozen at 47.1.x; Serene
  Seasons, BOP, TAN, Trading Floor and VS2 all require Forge ≥ 47.2–47.3.
- **1.20.1** for Create 6 addon coverage (Steam 'n' Rails, Diesel Generators, Big Cannons,
  Enchantment Industry all current here).
- **Embeddium + Oculus**, not Sodium/Iris (those are Fabric/NeoForge-only on this version).
- **Colorwheel + Colorwheel Patcher** keep Flywheel's GPU backend alive under shaders;
  Euphoria Patches is the one shader pack Colorwheel supports natively.
- **packwiz** so both machines sync from `main`; mods are never committed.

## Profiles are named by hardware tier, never by OS
- `low` / `balanced` / `performance` / `ultra`. The OS decides nothing about settings; the GPU,
  cooling and RAM do. A Windows desktop is `ultra`; a Windows ultrabook is `balanced`.
- Launch plumbing is the only OS-sensitive part, so the launcher is Java (available in every
  instance via `$INST_JAVA`) rather than a shell or batch script.

## Client defaults (`balanced`: MacBook Air M5, fanless, 16 GB) are the pack defaults
- DH 192 chunks, FAKE transparency, 2 threads; render distance 8; shader render scale
  0.75 is a per-pack setting (set once Euphoria has produced its folder).
- Client DH generation is **off** — the server generates LODs. Singleplayer test worlds
  will not grow LODs unless `chunkGeneratorMode` is set back to `FEATURES`.
- `preserve = true` on DH, Oculus, Embeddium, Flywheel, Colorwheel, EMF, ETF configs so
  in-game tweaks survive pack updates. **Caveat:** preserve means "never overwrite an existing
  file", so an instance converted from a pre-packwiz install keeps its old copies — delete
  those files once and relaunch to receive the pack's versions. Fresh installs are unaffected.
- FML `earlyWindowControl = false` — the early loading window misbehaves on macOS.

## Removed / not added, deliberately
- **ImmediatelyFast** — only a +1.20.4 build was ever present; small gain, not worth a
  wrong-version jar. Re-add only with a `+1.20.1` file.
- **Create: Design n' Decor 0.4.0b** — Create 0.5.1 build; crashed on construct.
- **Explorify, Macaw's BOP addon** — redundant with Structory / Every Compat.
- **Better Caravans** — taste; trade should be a trip or a route you built.
- **Trade Cycling** — hall-adjacent; Restock Balance + Comfort make halls pointless anyway.
- **Project Atmosphere / Weather2** — TAN already owns temperature; no tornadoes.
- **Waystones, `/home`, `/tpa`, warps** — fast travel would undercut the "build the route"
  premise. `/spawn` (to the capital) and `/back` after death are the only teleports.
- **Simple Clouds, colored lighting** — need OpenGL 4.2+/compute; macOS tops out at 4.1.
- **Xaero's** — Map Atlases chosen for immersion; one-jar swap if it frustrates.
- **Simply Swords, Apotheosis, Epic Fight, Ice & Fire** — wrong tone or replace too much.
- **Fresh Animations pinned to 1.10.4.** 1.10.5's `pack.mcmeta` uses only the 1.21.9+
  `min_format`/`max_format` keys and omits `pack_format`, so 1.20.1 reports "Missing metadata"
  and never loads it. Stay on 1.10.4 until a release restores `pack_format`.
- **TAN+ 1.4 recipe override.** `data/create/recipes/filling/purified_water_bucket.json` in TAN+
  is a `toughasnails:water_purifying` recipe using `ingredient` instead of `input`; TAN's
  serializer NPEs and *every* world load fails ("Failed to load datapacks"). Overridden with a
  correct copy in `pack/kubejs/data/…`. Drop the override when TAN+ fixes it.
- **Pet Home** (1.1.2 and 1.1.3) — `MobMixin` shadows `setPathfindingMalus` with no refmap
  entry, so the mixin fails on production Forge and the game exits before the title screen.
  Removed 2026-10-16; re-add when a release ships a correct refmap.
- **Chunky** (server-only, 1.3.146) — Distant Horizons 3.3.3 binds to Chunky's API from its
  chunk-load hook (`ChunkyAccessor.bindOnGenerationProgressEvent`) and `ChunkyProvider.get()`
  throws "Chunky is not loaded"; on a Forge server this surfaces as *Exception during promotion
  of chunk to FULL status* and kills the server seconds after `Done`. Upstream DH issue #1329.
  Removed 2026-10-16. DH generates its own LODs server-side, so nothing is lost for distant
  terrain; for real-chunk pregen use Speiger's Chunk Pregenerator (DH has no hook into it) or
  re-add Chunky once DH ships the fix.

## Dogs
- One dog: **Doggy Talents Next.** Animania's dog breeds are spawn-disabled (cats kept);
  vanilla wolves no longer replaced by Animania; DTN converts tamed wolves (follow-up).
  Pet Home was dropped (broken build, see below), so horses/cats keep vanilla behaviour.

## Trading
- **No trading halls.** Villager Restock Balance (need bed + bell) and Villager Comfort
  (cramped = expensive) enforce it mechanically.
- **Trading Floor stays**, with the house rule: depots only inside a settlement with beds
  for the villagers using it. Late game = a scheduled train selling into a real town.
- Caravans & Convoys pinned to **1.0.8** because the Village Expansion compat 1.0.1 was
  built against it (1.0.13 broke its `WagonDispatchMixin`). Re-check when the compat updates.

## Keybinds
- `R` shader-reload unbound (Recruits command screen keeps R); Recruits map → `N`
  (Atlas keeps `M`); atlas pin → `P` (Backpack keeps `B`; social interactions unbound);
  Backpacked management unbound (reachable from inventory; quiver keeps `V`).
- Context-scoped shares left alone: Ponder `W`, Create/Railways `Alt`, VS piloting keys.

## Peacock is a server pack
- Designed for a whole server from the start. The first two players are just the first two.
- Anything that only works by agreement between a couple of people ("no trading halls",
  "depots only in towns") is turned into a mechanic (Restock Balance + Comfort, stage-gated
  town-bound depots). Rules that need a referee do not scale.
- Everyone spawns at one CTOV village (Village Spawn Point) — the capital. It grows with
  Village Expansion and is the natural first market, first station, first raid target.

## Boss gating (Phase 4)
- Gate *expansion* tech only (brass, trains, ships, diesel, cannons, advanced Create);
  never the homestead (water, crops, animals, andesite Create, wagons, docks).
- Unlocks are **per player** (Game Stages), not server-wide — on a server, one player's kill
  must not hand everyone the technology. Superseded the earlier server-wide decision.
- The boss drops one **Blueprint** per participant plus one; using it grants the stage and
  consumes it. Blueprints are tradeable, so knowledge moves through the player economy —
  which is the story (civilization recovers by sharing what it recovers).
- Enforcement is per player (Recipe Stages, or KubeJS crafting checks) *and* on the gated
  blocks themselves, so handing a crafted station to an unstaged player is not a bypass.
- A priced "charter" fallback recipe exists so a bugged or exhausted boss never blocks a
  player permanently.
- Story: village civilization was spread far and wide; the monsters stole its technology;
  the dark age bred the pillagers. Every boss is recovery, not unlocking.
