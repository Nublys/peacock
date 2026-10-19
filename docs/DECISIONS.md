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
- Five tiers: potato, low, medium, high, ultra — the same words Complementary's shader presets use,
  so what a player sees in the shader menu is what they typed into `PEACOCK_PROFILE`. The 5850U/Vega 8 laptop is `low`
  (or `potato`), the M5 Air is `medium` -- tonight's HIGH-preset Euphoria on a Vega 8 was the
  wrong tier, not a bug.
- Profiles patch individual settings, not files. First version hashed whole files and kept
  everything as "edited by you" on the very first real machine: Oculus and DH rewrite their configs on
  each start. Per-setting with a recorded last-written value is the only rule that survives that.
- `launch.jar` instead of a `.java` source run by `$INST_JAVA`: Prism's downloaded runtimes are
  JREs (no `jdk.compiler`), so single-file source launch is not dependable.
- The OS decides nothing about settings; the GPU,
  cooling and RAM do. A Windows desktop is `ultra`; a Windows ultrabook is `medium`.
- Launch plumbing is the only OS-sensitive part, so the launcher is Java (available in every
  instance via `$INST_JAVA`) rather than a shell or batch script.

## Client defaults (`medium`: MacBook Air M5, fanless, 16 GB) are the pack defaults
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
- ~~ImmediatelyFast~~ **re-added 2026-10-17.** The `+1.20.4` Forge jar is a multi-version build whose
  `mods.toml` declares `minecraft [1.20,1.20.4]`; removing it on the filename was a mistake. Client-only;
  batches HUD/text/map/entity rendering — relevant with Map Atlases and Jade on screen. The validator
  allowlists it by name (`MULTI_VERSION_OK`).
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
- **Block physics / structural collapse** (Realistic Block Physics, Physics Mod, Everything Falls) —
  update-driven physics collides with Create contraptions, Valkyrien Skies and runtime-built villages,
  and one careless break demolishes a shared build. Decided against 2026-10-17.
- **Fresh Animations pinned to 1.10.4.** 1.10.5's `pack.mcmeta` uses only the 1.21.9+
  `min_format`/`max_format` keys and omits `pack_format`, so 1.20.1 reports "Missing metadata"
  and never loads it. Stay on 1.10.4 until a release restores `pack_format`.
- **TAN+ 1.4 recipe override.** `data/create/recipes/filling/purified_water_bucket.json` in TAN+
  is a `toughasnails:water_purifying` recipe using `ingredient` instead of `input`; TAN's
  serializer NPEs and *every* world load fails ("Failed to load datapacks"). Overridden with a
  correct copy in `pack/config/paxi/datapacks/peacock/data/…`. Drop the override when TAN+ fixes it.
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

## Shader default is plain Complementary Reimagined, not the Euphoria variant
- On macOS (OpenGL 4.1, 16 texture units) `ComplementaryReimagined + EuphoriaPatches` fails to
  build its composite pass — `No more available texture units while activating sampler
  shadowcolor1` — so Oculus silently disables shaders on every world join; both MacBook Air
  JVM crashes (2026-10-16) followed that failed pipeline build. Plain CR r5.9.3 fits. The
  pack default is therefore `ComplementaryReimagined_r5.9.3.zip`; the `high`/`ultra`
  profiles (Phase 1b) switch to the Euphoria folder, which Euphoria Patcher still generates.
- A Ryzen 5850U (Vega 8 iGPU) running Euphoria at the HIGH profile is the "horrible FPS" case:
  that machine is the `low` tier (shaders Potato/off, DH 128), not `high`.

## Pterodactyl startup is one script, never a `&&` chain
- yolks `java` images run `PARSED=$(… | eval echo "$(cat -)")` then `exec env ${PARSED}`. A startup
  command with `&&` is executed *by that eval*, inside the capture: the server ran with no console
  and no stdin, and the packwiz sync step was only ever echoed (so restarts never updated the pack,
  while a reinstall — whose install script does sync — did). Found 2026-10-16.
- Startup is `bash peacock-start.sh`; the script syncs, applies `peacock-server/`, then `exec`s
  Forge so stdin/stdout belong to the server. The script ships inside the pack too, so it updates
  itself on every sync.

## Client-only mods that must also be on the server
- **Particular Reforged** opens a Forge network channel (`particular:main`) whose version
  predicate rejects an absent server, so Forge refuses the join with a "mod mismatch" when
  the server lacks it. Shipped `side = "both"`; its common init only registers particle types.
  Audit of the other 22 client-only jars (2026-10-16): none open a channel, so they join freely.
  Rule for new client mods: if the jar contains `newSimpleChannel`/`ChannelBuilder`, it is
  `both`, whatever Modrinth's side label says.

## Seasons are long and crops obey them
- 16 days per sub-season (48-day seasons, 192-day year): a planting is a commitment, winter is a
  season you prepare for, not a weekend. Out-of-season crops do not grow at all; Serene Seasons'
  Greenhouse Glass is the deliberate escape hatch (glass = a build, not a toggle).
- Farmer's Delight crops are tagged into seasons by hand; Serene Seasons ships no FD compat.

## The capital is a large CTOV village; vanilla villages are gone
- CTOV keeps the five vanilla villages in rotation at low weight, so `#minecraft:village` could land spawn
  in a vanilla one. Vanilla villages are removed from the `minecraft:village` structure set
  (`pack/config/paxi/datapacks/peacock/data/minecraft/worldgen/structure_set/village.json`), so every village — and therefore the
  capital — is CTOV. Tried `#ctov:large_village` for the spawn search: a third of the candidates, and the
  locate on Terralith terrain ran past 4 minutes with the server thread blocked. Back to
  `#minecraft:village`. Then the vanilla villages kept coming: **Village Recruits overrides vanilla's
  `minecraft:villages` set** to re-add all five vanilla village types beside its tower spawner. Our
  datapack now overrides that set too, keeping only the tower spawner (the mod's own
  `vr_replace_villages` behaviour). Spawn is fixed at world creation: needs a world made after this.
- **Never `/locate` on this server.** A structure search on Terralith terrain blocks the main thread for
  minutes; the watchdog killed the server 60 s into one (2026-10-17 13:20). `max-tick-time` raised to
  180000, then settled at **90000** (2026-10-17 13:55) after a main-thread hang with no dump: the spawn
  search at world creation takes ~45 s, and anything past 90 s is a hang we want dumped and killed.
  `kill -3` on the container's PID 1 gets the same dump on demand (server/README.md).

## Boss structures must exist in modded biomes
- Cataclysm's structure biome tags list only vanilla biomes (`minecraft:desert`, `minecraft:snowy_plains`,
  `minecraft:nether_wastes`...). With Terralith + BOP most of the overworld and with Incendium most of the
  Nether is modded, so the Cursed Pyramid, Frosted Prison, Burning Arena and Soul Blacksmith were
  near-absent. Overridden in `pack/config/paxi/datapacks/peacock/data/cataclysm/tags/worldgen/biome/has_structure/` with
  `#forge:is_desert`, `#forge:is_snowy` (both populated by Terralith and BOP) and Incendium/Nullscape
  biomes. Mowzie's tags already include all overworld biomes. 2026-10-17.

## One ore source, one zinc
- Create's worldgen is off; Geolosys deposits (incl. sphalerite for zinc) are the only ore. Regional
  ore is the whole reason for trains and wagons.
- Geolosys clusters are tagged `forge:raw_materials/<metal>` so Create's existing crushing/washing
  recipes take them — no parallel processing chain to maintain. Any Geolosys zinc ingot is folded
  into Create's by KubeJS so EMI shows one zinc.

## Decisions taken 2026-10-17 (Aaron)
- **Season harshness:** crops stop growing out of season (Greenhouse Glass is the counter). Confirmed.
- **Gated recipes:** visible but locked; the tooltip names the boss. No Item Stages hiding.
- **Progression grouping:** per player by default, **FTB Teams** available so a group can share unlocks.
  Adds FTB Library + FTB Teams in Phase 4; pairs with FTB Chunks for claims if chosen.
- **Animania cats:** keep.
- **Geolosys harshness:** medium — iron near the capital, zinc a valley away. Tune after a fresh world.
- **Structure density:** default spacing for now.
- **Cannon griefing:** block damage **off everywhere**, explosion damage to entities stays —
  `defaultconfigs/createbigcannons-server.toml`: `damageRestriction = "NO_DAMAGE"`,
  `projectilesChangeSurroundings = false`. Applies to worlds created after it shipped. Replaces the
  earlier "off near bells" idea; no KubeJS needed.
- **Big Cannons:** keep.
- **Claims:** pending — see the plan doc for the comparison.

## Distant Horizons on the server is throttled, not unleashed
- 2026-10-17: with nobody online the server sat 2–7 s behind every tick (`Can't keep up`, 320 s to
  load). DH's FEATURES generator was running Tectonic/Terralith/BOP worldgen on 4 threads at full duty
  out to 4096 blocks — ~200k chunks of LODs on a node that also has to tick the world.
- Server override now: 2 threads, `threadRunTimeRatio = 0.5`, generation and sync distance 2048,
  10 requests/s per client. Distant terrain fills in more slowly; the server keeps 20 TPS. Raise again
  only with a Spark report showing headroom and a known core count for the container.

## Datapack overrides ship through Paxi, not kubejs/data (2026-10-17)
- KubeJS's `kubejs/data` folder is injected at resource-reload time: recipes, tags and loot tables took,
  but the `minecraft:village` structure-set override did not — the world still rolled a vanilla village,
  because worldgen registries are read earlier. Paxi (+ YUNG's API) loads `config/paxi/datapacks/*`
  as real datapacks above every mod, for worldgen and everything else. All data overrides moved to
  `pack/config/paxi/datapacks/peacock/`; KubeJS keeps only scripts.

## Distant Horizons client generation mode must not be DISABLED (2026-10-17)
- Day-one config set the client's `chunkGeneratorMode = "DISABLED"` ("the server generates"). In DH 3.x
  that switch also decides whether the client *requests* LODs from a DH server, so nobody ever saw
  server LODs beyond render distance. Now `FEATURES` (`SURFACE` on potato/low) via the profiles — the
  pack's DH file is `preserve`d, so a profile key is how it reaches existing installs.

## Resource packs (2026-10-17)
- Shipped in `pack/resourcepacks/` (client side), enabled for every tier through `options.txt`
  (`config/defaultoptions/options.txt` for new installs, the `resourcePacks` profile key for existing
  ones): Fresh Animations, Motschen's Better Leaves, Enhanced Boss Bars, xali's Enchanted Books,
  xali's Potions, Low On Fire. All vanilla-faithful 16x; full retextures (Faithful, Stay True, Jicklus)
  were rejected because they leave Create/FD/Macaw's in the default style and the mismatch reads worse.
- Animania has no retexture anywhere and Fresh Animations cannot reach it (its animals are its own
  entities, not vanilla). Accepted: Animania stays for its gameplay; the rest of the world carries the look.
- Filenames are forced space-free in the `.pw.toml` (`filename` is independent of the download URL) —
  the validator rejects spaces, and the Low On Fire upstream name contains a `§`.
- **Previous defaults** (`pack/peacock/profiles/_previous/*.keys`, written by gen-profiles.py): values an
  older pack version wrote as defaults. The launcher treats a setting equal to one of them as untouched,
  so a changed default reaches existing installs without `PEACOCK_RESET=1` while a player's own edit is
  still kept. Append to `PREVIOUS_DEFAULTS` whenever a shipped default changes.

## The Almanac is the wiki; a quest book would be the guide (2026-10-18)
- v3: 13 chapters, 68 entries, 232 pages. New chapters **Server Rules & Claims** (claiming, teams,
  force-load cap, the two commands, what we do not do, playing together), **What Is in the Pack** (every
  mod by purpose, five pages) and **Why Can't I…** (ten FAQ entries that link into the chapters). Tech
  gained **Charters** (every charter recipe as a crafting page — KubeJS recipes render in Patchouli) and
  **What Exactly Is Locked** (the gate list in plain words). Recruits, combat and food got mechanics pages.
- The page-budget check now measures *visible* text (formatting codes stripped), so bold-heavy pages are
  judged by what fits, not by source length.
- Patchouli stays the reference ("what is this, how does it work, why"). If the server wants a guided
  path with progress tracking and rewards, that is **FTB Quests** (FTB Library is already in): chapters per
  tier, tasks like "kill a Mutant Zombie", "use a Blueprint", rewards in charter emeralds. Not added — it
  is a second book to maintain, and the ladder already tells players what to do next through tooltips.

## Quality of life, round two (2026-10-17 night, Aaron's list)
- **Locator Bar** (reworked-locator-bar): the newer game's player bar — a dot per player by direction above
  the hotbar. Both sides so it sees everyone on the server.
- **Crafting from chests:** *Workshop for handsome adventurer* — its crafting tables (every wood type)
  read the chests and barrels around them and ship an EMI recipe handler, so EMI's "craftable" filter
  counts what is in the room. *Storage Drawers* + its Create compat are the "barrel mod that works with
  Create". **Tom's Simple Storage was added and removed the same night** (Aaron, 23:23): a terminal over
  every connected chest deletes the reason to build sorting lines, and its wireless terminal is fast travel
  for items — the pack's premise is that moving and sorting things is the game. Workshop covers crafting
  from the room; Create vaults, funnels and drawers are the storeroom.
- **Smaller tooltips:** Jade's overlay is the thing in the way in play. Every profile now writes
  `config/jade/jade.json` keys `overlayScale 0.7`, `alpha 0.6`, `itemModNameTooltip false` (the mod-name
  line on every item tooltip). GUI scale is untouched on purpose: the hotbar stays the same size.

## Caving pays in ore (2026-10-17)
- Geolosys removes every vanilla ore feature in every dimension (`remove_vanilla_ores` biome modifier on
  `#geolosys:all_dimensions`), so caves had nothing in their walls. Added **YUNG's Better Mineshafts** and
  **Better Dungeons** (Terralith-aware biome tags) for places to find, and `kubejs/server_scripts/cave_loot.js`
  gives every underground chest table — vanilla mineshaft/dungeon/stronghold/ancient city, YUNG's,
  Cataclysm ruins — a pool of Geolosys clusters, coal, lapis, redstone, gems and the odd prospector's pick,
  rolled 1–4 times by depth. Switch `caveLoot`.
- Geolosys compat flags were on for mods we do not have: platinum dropped **only Osmium** (Mekanism) and
  autunite dropped Yellorium (Bigger Reactors) — the `forge:raw_materials/yellorium` tag error in every
  start log. All four compat flags off. Autunite (uranium) has no consumer at all, so its deposit is
  confined to End biomes via Paxi, where its replacement stone never occurs: effectively gone.
- The mineral names (hematite, galena, sphalerite…) are Geolosys's: each is the real-world ore of a metal
  and drops a *cluster* of that metal. Tin/lead/silver/nickel/aluminum/platinum feed Spartan Weaponry's
  material weapons; the Almanac now has a "Why the Rocks Have Names" entry and a caving entry.

## The server hang, found (2026-10-17 18:00 watchdog dump)
- Main thread parked 180 s in `ServerChunkCache.getChunkBlocking` ← `Level.getHeight` ←
  **Village Recruits Addon** `RoadGround.waterSurfaceY` ← `CityRoadPlanner.layStandaloneCross` ←
  `VillageFactionManager.ensureFactionExists` ← `VillageFoundingNudge.tick`. Translation: the addon's
  night "founding nudge" converted a villager at a *remote* tower spawner (BOOTSTRAP activation), minted a
  faction, and laid the town's first crossroads — reading terrain height in chunks that did not exist yet.
  That forces chunk generation from inside the tick; on Terralith each chunk is slow, and with Canary's
  `chunk_access` mixin the wait never drained the main-thread queue. Same mechanism as the 13:43 hang
  (no dump then; same symptoms, VS physics queue backing up).
- Fix, three layers: `remoteTowerActivation = "OFF"` (addon villages are founded only inside simulation
  distance, where the chunks exist), `nightFoundingNudge = false` (the exact code path), discovery radius
  64 → 16 chunks; and Canary `mixin.world.chunk_access=false` so a blocking load behaves like vanilla.
  Natural addon villages stay enabled (they are the AI factions), and the tower-spawner exclusion zone
  keeps them off CTOV towns.

## First server run of Phases 3–5: two script bugs, one worldgen fix (2026-10-17 17:37 log)
- KubeJS loads all server scripts into **one scope**: `const SWITCHES`/`const RADIUS` declared in two files
  killed two scripts. First fix (bare `{ }` blocks) made it worse — KubeJS's Rhino reports "redeclaration
  of var" for any `const` inside a bare block, 5 of 8 scripts failed (18:07 log). Every script body now
  lives in an IIFE `;(() => { … })()`, which is a real function scope.
- `JSON.stringify(recipe.json)` on a Gson object dumps the object's Java members, so all 613 staged
  recipes failed to parse (and had already been removed: brass was uncraftable for everyone). Fixed by
  `JSON.parse(String(recipe.json))` — Gson's `toString()` is the JSON text.
- **Buildings on farms**: Village Recruits' Village Expansion plans houses around any bell, including CTOV
  villages, and its plot test only knew lava/fire/cactus. `plotHazardBlocks` now lists farmland, crops
  (vanilla + Farmer's Delight), hay, composters, bells, lecterns, chests, paths, rails, water, Create
  track/belts/depots, the trading depot and bounty boards, so a plot touching a town's working parts is
  skipped. The tower-spawner structure set also got an exclusion zone (8 chunks) from `minecraft:village`
  and wider spacing, so a Recruits settlement does not seed itself inside a CTOV town.

## Claims are FTB Chunks, with its map switched off (2026-10-17)
- Chosen over Flan / Open Parties and Claims because its force-loading is **capped and team-scoped**
  (`max_force_loaded_chunks`, `hard_team_force_limit`) and because FTB Teams doubles as the grouping layer
  the Blueprint ladder may later use. Its map is the price: `force_disable_minimap: true` on the world,
  the large map unbound, in-world and death waypoints off, and the **claim manager** (a plain grid, no
  terrain) on `J`. Map Atlases remains the only map.
- Force-load cap is 4 chunks per team in `ALWAYS` mode: enough for one farm or one Create line to keep
  running while everyone sleeps, deliberately not enough for a factory. Raise per team with FTB Ranks /
  LuckPerms `ftbchunks.max_force_loaded` if a server vote wants it.
- FTB Essentials for `/spawn` and `/back` only; everything that is fast travel is off.
- Villager cap (24 per town) via `EntityEvents.spawned` on *babies without our seen-tag*, so chunk reloads
  never delete anyone; Villager Workers' workers are other entity types and are not counted.

## The ladder is Recipe Stages + KubeJS, not Item Stages (2026-10-17)
- **Recipe Stages 8.0** (Forge 1.20.1, Game Stages dep) accepts recipes as JSON (`recipestages:stage`,
  `recipestages:shaped_stage` wrapping a crafting recipe), so KubeJS can wrap mods' recipes at load time
  without CraftTweaker. Only crafting-table recipes can be staged — that is the mod's limit and we design
  around it: gate the *things built from* a material, not the material.
- **Item Stages rejected**: CraftTweaker-only configuration, and hiding items in a player's inventory is
  hostile when Blueprints are meant to be traded. Place-gating via `BlockEvents.placed` covers the
  "handed a machine" case.
- **One table** (`global.LADDER` in a startup script) feeds server enforcement and client tooltips, so a
  rung edit is one edit. Named Incendium bosses are matched as `type|name` because they are vanilla mobs.
- Mutant Enderman left the ladder (its "ender logistics" moved to the Ender Guardian so the End has a
  prize); "frontier ore" had nothing concrete behind it and became **arcane industry**.
- Boss participation is tracked by damage (`EntityEvents.hurt` → UUID list on the entity) rather than
  proximity alone, so a bystander does not get a Blueprint and a kill by recruits still drops two.

## Old Guns V2 out, Musket Mod in (2026-10-17)
- "Old Guns V2" turned out to be 20th-century firearms (AKM, MP5, Thompson, Kar98k, Colt 1911 …) with no
  muzzle-loaders at all; "trim the modern guns" would have left a revolver and a Winchester. Replaced by
  **Musket Mod** (ewewukek): flintlock muskets, pistols, blunderbuss; cartridges need gunpowder, which
  the Blasting rung gates. Village Recruits' addon detects `musketmod` and arms recruits with them.
- The voice-chat server override was dropped from `pack/peacock-server/`: Aaron assigns Simple Voice
  Chat its own port on the panel, and a shipped file would overwrite that every start.

## Phase 3 glue: how each rule is enforced (2026-10-17)
- **Depot is town-bound** by counting block entities in the 5×5 loaded chunks around the placement
  (bells and beds both have one) instead of scanning blocks or POIs: cheap, no POI predicate plumbing
  through Rhino, and "loaded chunks" is always true for the chunks around a player placing a block.
- **Rumour maps are vanilla exploration maps.** The structure search they trigger runs on the server
  thread when the chest loot rolls — the same class of cost as `/locate`. Mitigation is in the numbers:
  radius 40 chunks for Mowzie's sets (spacing 25 → ~10 cells), 60 for the illager fort (spacing 42),
  100–120 for Cataclysm (spacing 80–112 → 1–4 cells). `skip_existing_chunks: false` so a map can point
  at a structure someone already walked past. Kill switch: `rumourMaps` in `kubejs/config/peacock.json`.
- **Pack switches live in `kubejs/config/peacock.json`**, read with `JsonIO` at script load, so an admin
  can turn a rule off with `/reload` instead of editing scripts.
- **Mowzie's biome gate** opened with `#minecraft:is_overworld` rather than a hand list: the per-boss
  `biome_tags` in `mowziesmobs-common.toml` (snowy / savanna / peak / not-ocean) already select the
  right biomes; the `has_mowzie_structure` tag was only a vanilla-biome allowlist.

## The Mac stays on `low` (2026-10-17)
- The M5 Air gets 40–50 FPS on `low` (Complementary at Potato preset, DH 128) and Aaron is keeping it
  there rather than `medium`. The README's "MacBook Air = medium" guidance is therefore aspirational;
  `low` is the honest recommendation for fanless Macs until a profile with shaders at Potato *and*
  medium's DH radius proves itself.

## Client FPS on the potato tier (2026-10-17)
- `potato` now: DH radius 64 (was 96), `entityDistanceScaling` 0.5, vanilla clouds off, and **no Fresh
  Animations** (EMF animates every entity on the render thread; the other packs are free). Shaders off,
  fast graphics, render distance 6 were already there. Everything else in the pack's client stack
  (Embeddium, ImmediatelyFast, Entity Culling, ModernFix, FerriteCore, Canary) is already the ceiling of
  what mods can do; past this it is resolution, Mesa `mesa_glthread=true` on Linux, and JVM flags.
- Nothing in the pack can scale render resolution; on an iGPU, window size is the single biggest lever.

## Simulation distance is dynamic (2026-10-17)
- Aaron wants 10–12; the Xeon cannot promise that at all times. **Dynamic View and Simulation Distances**
  (someaddon, server-only, with Cupboard) now floats `simulation-distance` 5–12 and `view-distance` 8–10
  around a 42 ms mean tick, re-evaluated every 60 s with console logging. Quiet server = big radius, busy
  server = smaller radius, TPS stays ~20 either way. `server.properties` keeps 7/8 as the starting point.
- Aikar's G1 flags added to `peacock-start.sh` (shorter GC pauses; no effect on average tick cost).
- Rejected for now: Let Me Despawn / mob-cap cuts (gameplay change — hostile mobs were ~14% of the tick;
  revisit with two players' data), Farsight (client; hides view-distance changes, DH already does that job).

## Server performance: the profile, and what it changed (2026-10-17)
- Spark on the live server (1 player, 327 entities, TPS 14.9): **77% of the server thread was entity
  ticking, 44% villagers alone** — vanilla `Brain → AcquirePoi → PathFinder`, villagers hunting beds and
  job sites across Terralith terrain in a tall CTOV village. Create, DH, VS, worldgen: negligible. The
  host is a 2013 Xeon E5-2690 v2 (3.0 GHz): the single game thread runs at about half a modern core.
- Added **Canary 0.3.3** (Lithium for Forge) for its AI/POI/pathing optimizations, with
  `block_entity_ticking`, `entity.collisions` and `chunk.serialization` disabled in `canary.properties`
  (Create and Valkyrien Skies friction history), plus `ai.poi` off: its root mixin rewrites
  `PoiManager.getInRange`, which Valkyrien Skies' `MixinPOIManager` hooks — with both on the VS mixin fails
  and VS stops the server. `simulation-distance` 6 → 5 in the server template, then **7** (2026-10-17 14:20,
  Aaron: 5 is too short in play). Ticked area: 5 → 121 chunks, 6 → 169, 7 → 225, 8 → 289; with ~40 ms ticks
  at 5 and one player, 7 is the experiment and 6 the fallback; FTB Chunks force-loading (Phase 5) is the
  real answer for bases that must keep running.
- Open: cap villager density per town (Village Expansion / Villager Workers keep adding) — count first.

## Client performance stack (2026-10-17)
- Embeddium + Oculus, FerriteCore, ModernFix, Entity Culling, ImmediatelyFast, Colorwheel. Profiles now
  also carry Embeddium's weather/leaves quality and vignette, and Distant Horizons SSAO — `potato`/`low`
  take the FAST path. Not added: More Culling (Create block-entity culling risk), Nvidium (NVIDIA +
  Sodium 0.5 only), Embeddium Extras (no 1.20.1 build on Modrinth).
- Publishing: profiles live inside the pack so the Modrinth App gets them via its pre-launch hook; the
  CurseForge app has no hooks and gets `medium` by default. An in-game profile picker (a tiny companion
  mod applying a profile on next start) is the wish-list answer.

## Jade for block/entity tooltips (2026-10-17)
- Jade 11.13.3, side both (server-side data for container contents). Create, Farmer's Delight,
  Supplementaries, Doggy Talents and Mowzie's ship their own Jade plugins. Not The One Probe (thinner
  Create integration) or WTHIT (Fabric-first).

## No Discord bridge
- Decided 2026-10-17. Voice chat is in-game; chat stays in-game.

## The Almanac is the onboarding
- Every player gets *The Settler's Almanac* (Patchouli, pack-level book, no extra mod) on first join:
  story, first days, seasons/crops, prospecting, towns, threats, the Blueprint ladder, controls and
  profiles. It is generated from `tools/gen-almanac.py` so prose edits are one file. It describes the
  Phase 4 ladder as designed and says so ("arrives with the Dark Age update") rather than hiding it.
- v2 (2026-10-17): 10 chapters, 45 entries, 174 pages. The first cut was text-only and one page per
  topic, which read as unfinished. Now uses crafting/smelting/spotlight/entity/relations pages; every
  recipe, item and entity id is checked against the mod jars, every internal link against the entry
  list, and every page against a per-type character budget before the book is written. New chapters:
  *Bestiary of Bosses* (every boss, structure and biome — the findability promise) and *Building &
  Logistics*. Corrections made while writing: Incendium's reactor boss is the **Radiation Director**
  (not "Withered Director"); the fort boss is Illager Invasion's **Invoker**; Serene Seasons 9 has no
  greenhouse-glass item — any `#forge:glass` a few blocks above a crop counts; only hematite,
  sphalerite and gold are biome-bound in our Geolosys overrides, the rest follow depth.

## Tough As Nails: temperature on, thirst off
- `thirst.toml: enable_thirst = false` (2026-10-16). Seasons and temperature are the survival layer we
  want (clothing, campfires, shade, the calendar); a second hunger bar is bookkeeping. Canteens and
  the water purifier remain craftable but inert; revisit if the pack ever wants a desert/expedition arc.

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
  never the homestead (water, crops, animals, andesite Create, wagons, docks, **basic climate
  clothing** — wool and leaf armour, campfires, Greenhouse Glass). Mutant Snow Golem gates climate
  *control* instead: TAN Thermoregulator, TAN+ Air Conditioners and Personal Fan (2026-10-17).
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

## The dead world (2026-10-18)
- **One living settlement type.** Aaron: two kinds of living village "seems to confuse players". So every CTOV
  village is a ruin (abandoned or pillager-held), the capital is the single living exception, and every other
  living place is a Village Recruits town. Rule for players: old stone means dead, a tower means people.
- **CTOV kept, as ruins.** Its 900 hand-built pieces are the visual of the old world; the addon's 13 houses plus
  procedural production buildings are the look of the new. The contrast is the story. A possible later step is
  feeding CTOV houses into the addon's datapack building loader.
- **The cause is never stated.** Overbuilt, dug too deep, nature answered — but each journal blames something
  else and the Almanac only says "nobody agrees what they woke". The pillager pamphlet is the one voice that says
  it plainly, so it cannot be trusted.
- **Pillagers are villagers** — the desperate, the criminal, the opportunists; numbers grown since the fall. They
  never held tech. The Invoker's Trading Floor Blueprint stays, reframed as stolen ledgers.
- **Capital is neutral ground.** The addon refuses to found a town in spawn chunks and can only conquer towers,
  so no faction can ever own the capital; keep-out widened to 17 chunks so no claim reaches it either.
- **Bounty boards pay in things worth walking back for.** Bountiful's worth system is sound; its default rewards
  were arrows and glass. Rewards never include Blueprints (boss-only) or gated outputs; objectives may ask for
  gated items (a reason to have brass).
- **Sealed Rumour over a command reward.** Bountiful has a `command` reward type, but whether it runs with the
  player's permission level is unknown; an item that the server redeems via `loot give` is certain and reads
  better.
- **No dynamic lights.** Complementary's handheld lighting already covers every shader tier; potato (the only
  tier without shaders) does not need its own.
- **Guard Villagers left at defaults.** With CTOV villages dead, guards only matter in the capital; the addon's
  garrisons defend the new towns.
- **Still no Chunky.** Re-added for the 6–8 player pass and removed before it shipped to a server: the 2026-10-17
  finding stands (DH 3.3.3 crashes when Chunky drives generation). `dh pregen` covers the LODs; terrain is
  generated by play.

## Default tier is `low`; the profile is picked in-game (2026-10-18)
- Aaron asked for `low` as the default: the friends joining are mostly on laptops, and `low` (shaders at
  Complementary's lightest preset, DH 128, render 6) is the honest median — a machine that can do more loses
  nothing by typing `/peacock profile medium` once. The shipped config defaults (options.txt, Distant Horizons,
  Embeddium) are the `low` tier too, so a CurseForge-app install without the launcher lands in the same place.
- The in-game picker replaced the environment variable because nobody should have to open Prism's settings to
  change a graphics tier. The server cannot write a client's files, so the command sends the tier to the
  client (KubeJS `sendData`), the client writes `kubejs/config/peacock-profile.json`, and `launch.jar` reads it
  before `PEACOCK_PROFILE`. It lives under `kubejs/config/` because that path is certainly writable by a
  client script; packwiz leaves files it did not install alone.
- `dist/Peacock-Prism.zip` is committed (gitignore exception) so the import URL works without a release. Its
  pre-launch command is one escaped INI string: Prism's settings file is Qt INI, and a value with bare quotes
  inside loses the spaces between the pieces (the `java-jar …launch.jarhttps://…` failure of 2026-10-18).
- One CurseForge zip per tier, because that app has no pre-launch hook; `tools/apply-profile.py` bakes the
  tier's `*.keys` into the config files with the same per-setting rule as the launcher.

## Seasons stop when nobody is online (2026-10-18)
- `progress_season_while_offline = false`. Aaron: a player who keeps logging in during winter five times in a
  row starves. The calendar now only moves while someone is playing, so the season anyone sees is one the
  group actually lived through. The day/night cycle is vanilla and unaffected.

## First flight fixes (2026-10-18, Aaron's test world)
- **Capital is always walled.** Only CTOV's four fortified variants (plains, taiga, swamp, mesa) are capital
  candidates; the roll that gave an unwalled savanna capital cannot happen again. Variants accept any
  village-able biome, so a plains-walled capital in a savanna is intended.
- **Bounty posts** along the capital's streets (weight 3 in every CTOV deco pool): the single gazebo off the
  town centre often fails to fit, and "I can't find a bounty board" was the result.
- **Jade sits below the locator bar** (`overlayPosY` 0.9) and ships as a nested `config/jade/jade.json` so the
  flat keys file is only ever an update, never the whole config.
- **Chunk Pregenerator** (Speiger, CurseForge, server-only) for real-chunk pregen: chunk loading on fresh
  terrain is the complaint; DH's own pregen then reads chunks instead of generating them. Chunky stays out
  (DH binds to its API and crashes). The tab list covering the locator bar while Tab is held is left alone.
- **FallingTree** for whole-tree felling (Aaron asked for a timber mod); both sides, defaults.

## Distant Horizons no longer generates terrain on the server (2026-10-18)
- The 16:58 watchdog crash: the server thread sat 90 s in `getChunk` for the chunk a creative-flying player
  entered, while `Worker-Main-2` was parked on a `PalettedContainer` semaphore (`ThreadingDetector`) that no
  running thread released — a worldgen deadlock between two generators touching the same chunk section.
  DH's own config says of `FEATURES`: "may cause world generator bugs or instability when paired with certain
  world generator mods". Terralith, Tectonic, CTOV and three structure mods are those mods.
- Server DH is `INTERNAL_SERVER` (Aaron vetoed `PRE_EXISTING_ONLY`: "DH needs to be able to see out if players
  explore"). DH asks the server to generate the chunks the horizon needs — one generator, the vanilla worker
  pool, so the cross-thread race is gone — rate-limited to 6 requests/s per player with back-off when TPS
  drops. Those chunks are real and saved, so the world grows to the DH radius around wherever people go
  (≈1–2 GB per 2 km of horizon). If the hang recurs in this mode the generator race was not the cause and
  the next suspect is the worker pool itself (thread dump again).
- Chunk generation speed itself: there is no multithreaded-worldgen mod for Forge 1.20.1 (C2ME is Fabric);
  pregen, 8 cores, and not flying into fresh land at creative speed are the levers. Canary and ModernFix are
  already in.
- **Noisium** added (server-only) after Aaron asked for C2ME-class chunk generation speed: C2ME is Fabric-only;
  Noisium is the Forge option, commonly run with Terralith/Tectonic/Lithostitched, and deterministic. First
  suspect to remove if worldgen misbehaves.

## The capital's wall is built by script; the pieces that never appeared (2026-10-18, second flight)
- CTOV's `*_fortified` variants are a 28-block stone keep in the town centre, not a perimeter wall — my
  assumption, twice wrong in play. Nothing on Forge 1.20.1 walls a village, so `capital_wall.js` does: it
  reads the capital's structure bounding box at world spawn, and 10 s after the first load raises a
  terrain-following stone-brick wall six blocks outside it with lantern pillars, corner towers and a gate per
  side. `/peacock wall` (op) reruns it; `capitalWall: false` disables it.
- The bounty posts went into the `deco` pools, which the plains streets never reference; they are now in the
  `house` pools at ~3% weight. And both the posts and the ruins' zombie-owner pieces lacked a jigsaw block,
  which a pool element needs to attach to anything — so neither had ever been placed. Both carry one now
  (`building_entrance` facing out of the plaza; `minecraft:bottom` facing down, as vanilla's villager pieces).

## The capital is Terralith's fortified village (2026-10-18, second flight)
- Aaron found a living, normal-looking village near the capital. It was Terralith's `fortified_village` from
  its `rare_village` structure set — a walled castle town with its own houses, church, library and deepslate
  streets — which no part of the ruin work had touched. It is a better capital than anything CTOV offers (CTOV's
  "fortified" is a keep, not a wall), so it now *is* the capital: one concentric-ring position near the origin,
  biomes widened to `#peacock:capital_biomes`, Terralith's own placements silenced with `frequency: 0`.
- Jigsaw naming differs by mod: Terralith's streets target `minecraft:entrance` one block above the road,
  CTOV's `minecraft:building_entrance` at road level. The bounty post carries Terralith's.
- The CTOV-based capital variants are gone; the script wall remains available but off.

## Tough As Nails removed (2026-10-18)
- Aaron, on the players' behalf: "the freezing is annoying". Tough As Nails and TaN Plus are out, with their
  config, the thirst script, and the ladder's *Climate control* rung (its outputs were all TaN blocks); the
  Mutant Snow Golem now holds nothing. Seasons stay strict in the fields — that is the survival layer now.

## Three script bugs from the fourth world's log (2026-10-18)
- `capital_wall.js` died on "redeclaration of var x": KubeJS' Rhino does not scope `let`/`const` per block, so a
  loop variable cannot share a name with a later `const` in the same function. Every loop variable is unique now.
  The structure lookup itself worked: it logged the capital's bounds (141×155 blocks) before failing.
- The AFK team never existed: Recruits listens to every command and throws if one runs inside `ServerEvents.loaded`
  before it has its server reference. The team commands run 3 s later now.
- `blueprints.js`: `event.source.getEntity()` is not exposed by KubeJS; `event.source.actual` is. Boss fighters
  were never recorded, so no Blueprint would have dropped for anyone.
- **Fifth world (20:47): no capital at all.** Spawn at 0,72,0, Spawn Point never logged "Village found", `/locate`
  empty. The datapack was identical to the fourth world's (which had a 141×155 capital); only the seed differed:
  the one ring position landed in a biome outside the village tags. The capital structure now accepts
  `#minecraft:is_overworld`; `preferred_biomes` (village tags + forests, taigas, savannas, hills) still pulls the
  position onto sensible land when any is within reach.


## The capital is founded by script when worldgen cannot place it well (2026-10-19, sixth world)
- The sixth world spawned in mid-ocean. Vanilla's concentric-ring placement has one position eight-odd chunks
  from the origin and a fixed 112-block search for `preferred_biomes`; with `biomes` widened to any overworld
  biome (the fix for the fifth world's *no* capital) a position with no gentle land in reach simply builds the
  castle in the sea. Nothing in data can say "dry, flat, not mountains".
- Now the structure and the ring placement both use a strict hand-picked `#peacock:capital_biomes`: plains,
  sunflower plains, meadow, forests (oak, flower, birch), savanna, taiga, cherry grove, and Terralith's brushland,
  highlands (temperate/forested), lavender/blooming/sakura/lush/moonlight valleys, steppe, shrublands, birch taiga,
  valley clearing. No oceans, rivers, beaches, swamps, jungles, deserts, badlands, peaks, cliffs or snow
  ("avoid biomes with aggressive or crazy terrain"). CTOV's village tags were dropped from the list: they put
  villages in all of those.
- A bad seed therefore gets *no* worldgen capital — and `capital_wall.js` founds one. Ten seconds after load,
  with no capital at spawn, it walks rings of candidate chunks outward from the origin (6 to 62 chunks), reads
  the biome and the generator's own terrain height on a 5×5 grid (±88 blocks) around each — no chunks are
  loaded for that — and takes the flattest spot in the nearest ring where nearly every sample is a gentle biome,
  all are dry, the height spread is ≤16 and no ruin placement lies within 8 chunks. Fallback: the flattest dry
  land in reach. It then force-loads the footprint (two `/forceload` tickets, polled every second), generates
  the Terralith fortified village there with the game's jigsaw code (the `/place structure` path, so villagers
  spawn with it), moves the world spawn onto it, remembers the bounds in persistentData (the start is not
  registered, so `/locate` will not know it) and builds the wall. `/peacock found` (op) runs the same by hand,
  `/peacock found here` at your feet, `force` founds beside an existing one. `capitalFound: false` disables it.
- Log lines to look for on a new world: `[peacock] found: gentle land at chunk …`, `generating N chunks …`,
  `placed the capital over N chunks`, `world spawn moved to …`, then `wall: … columns`. Or, with a good seed,
  Spawn Point's "Village found!" and straight to `wall:`.
- **Seventh run (21:54): the survey looked at 0 spots.** KubeJS' Rhino (rhino-forge 2001.2.3) has no `Math.PI` —
  it is `undefined`, so every ring's spot count was `NaN` and the loop body never ran. Reproduced off-server by
  loading the pack's own Rhino jar (+ Gson) in a 10-line Java harness and running the real `scan()` against a stub
  world; fixed with a literal `TAU`. The same harness confirmed the earlier trap: a `const`/`let` inside a `try`
  block throws "redeclaration of var" at run time. `tools/validate.py` now fails on both patterns in any KubeJS
  script (CI runs it).

## Boot popups, join chat, boss bars (2026-10-18, late)
"Lots of pop ups to click through" at boot, "spammed with things from mods" on join, "a boss bar covered a
quarter of the screen". Turned off, in the shipped file and — for `preserve = true` files — as profile keys so
existing installs get it too:
- Distant Horizons: the auto-updater (an update popup at boot; players get DH through the pack) and the startup
  chat warnings (low memory, mod compatibility, vanilla render distance, pool memory, GC, slow world gen, replay).
- Embeddium's donation prompt; Euphoria Patcher's popup, shader in-game message and update checker; Reworked
  Locator Bar's one-time "unsupported version" warning; Colorwheel's "incompatible shaderpack" chat line; EMF's
  reload-error toast; No Chat Reports' Realms warning and signing-request chat line; vanilla Realms notifications
  (and the accessibility/multiplayer-warning/tutorial first-launch screens, already off, now also profile keys).
- Update notices to ops on join: Animania, Collective, Village Recruits.
- Boss bars: no scaling mod exists for Forge 1.20.1, so `kubejs/startup_scripts/bossbar_scale.js` scales Forge's
  boss-bar HUD layer (vanilla and modded bars draw inside it) about the top centre, `bossBarScale` 0.5.
- Not touched: Village Recruits' walk-into-a-village hints (gameplay, once per village) and the pack's own one
  welcome line. Anything still appearing on join shows up as `[CHAT]` lines in the *client's* `logs/latest.log`.
- **Eighth run (22:01): the survey froze the server.** With `Math.PI` fixed the loop ran — on the server thread,
  in one go. Every `getBaseHeight` runs the full Tectonic/Terralith density stack for a column; a survey is
  thousands of them, so the tick never ended (Valkyrien Skies' "too many physics frames" every second from 22:01:39)
  and a login at 22:04:38 hung on "Encrypting" until the client timed out. The survey now runs in slices of
  ≤15 ms per tick, reads biomes straight from the biome source (no chunk lookup, no 8-way zoom), checks biomes
  before any height, samples heights on a 3×3 grid with early exits, and logs progress (spots, heights, ms per
  height) every 5 s. Only one founding runs at a time. Tested in the Rhino harness with a stub scheduler and 5 ms
  height reads: 6 ticks, longest slice 60 ms.
- **Ninth run (22:18): the sliced survey worked, the build did not.** Survey: 47 s in 138 ticks, but each terrain
  height read took **77 ms** (spawn prep ran at 2.7 chunks/s the same boot — the host looks CPU-starved), so a
  "slice" was up to ~0.7 s and the server fell 28 s behind; it also found 0/25 gentle biomes anywhere, because it
  read biomes at y≈68, which under Tectonic's raised terrain is underground (Terralith cave biomes). Then the
  jigsaw layout took 41.7 s in one tick, and `/forceload add` generated the 225-chunk footprint *synchronously*
  on the server thread — the watchdog killed the server at 60 s. The founder no longer runs at boot
  (`capitalFound: false`); the same y=0 problem is why vanilla's ring placement never nudges the capital onto
  `preferred_biomes` in this pack (it searches biomes at y=0, which Terralith fills with cave biomes).

## Pirate ships made rare (2026-10-18, spark profile)
A 74 s spark profile after boot (1 player): **37% of the server thread** was Valkyrien Pirates/VLib turning
worldgen pirate ships into Valkyrien Skies ships (`StructureTemplateExtKt.placeAsShip` from `vlib$tick`), mostly
parked waiting for neighbouring chunks to load — one tick took 28 s. Ships spawned every 24 chunks of deep/warm
ocean, and Distant Horizons' server-side generation runs the full pipeline, so they kept spawning far from anyone.
The host is a Xeon E5-2690 v2 (2013, 8 threads at 3.0 GHz): main-thread work costs about twice what it would on a
current desktop. Aaron chose "rare" over removal: the datapack overrides `pirates_eureka:ships` to spacing 96 /
separation 48 (16× fewer) and `pirates:wrecks` to 80 / 40 (4× fewer; the set includes the friendly raft). The
`pirates_sails` and `pirates_sky` sets are not overridden: they live in the jar's optional datapacks, which are not
loaded, and a set naming an unregistered structure would break world loading. Applies to newly generated chunks.

## The Almanac explains Village Recruits; its manual is removed (2026-10-18)
Aaron: "remove the Villager Recruits book and just explain all of that in yours". The addon gives every new player a
written "Village Recruits Manual" on first login (`VillageJoinGuide`, no config switch). `no_vr_manual.js` marks
`PlayerPersisted.village_recruits_received_book` at login and removes any copy two seconds later (covers players
who already have one). The Almanac's Towns & Trade chapter grew from two Village Recruits entries to seven — The
New Towns, Joining a Town, Recruits & Guards (incl. food-as-healing, Hold the line), How a Town Lives (funds,
builders, granary, sleep, mines and seams), Merchants & Contracts (standing, bounties, pardon), War, Scouts & Sides
(scouting first, chain of command, picking a side, restless nights, perish notices) and Leading a Faction (scouting
from the map, Offers/Stock/Goods tabs, reserves, armoury, troop convoys, four towns per faction) — written from the
addon's own wiki text and this pack's settings. The `I` key (the addon's wiki screen) still works but is no longer
advertised; the README key table and the Almanac's Keys page dropped it.

## Temperature is back, as Cold Sweat; a fire drill; the capital only in temperate country (2026-10-18)
Aaron: "Add thermal stuff back, not the thirst. But add ways for the player to warm, it seemed like fires or
furnaces did not help." Tough As Nails (removed earlier the same day for "the freezing") counts campfires and
furnaces only inside an enclosed room as far as we could tell, so standing beside a campfire in the open did
nothing. **Cold Sweat 2.4.4** replaces it: proximity heat anywhere (within ~7 blocks, falling off with distance,
weakened by walls, two campfires at most stacking), the hearth/boiler/icebox for whole rooms, insulation sewn into
armour, waterskins, Serene Seasons integration (±15 °C summer/winter by default), and no thirst system at all.
- Its defaults warm you near fire, campfires, lava, magma and Create's blaze burner, **not furnaces**. The pack
  datapack adds lit furnaces, smokers, blast furnaces and Farmer's Delight's stove (`data/peacock/cold_sweat/
  block/block_temp/`), at Cold Sweat's own documented furnace value (15 °F, range 7, max 40 °F).
- "Make sure the wool and leather to insulate work with modded gear": Cold Sweat insulates any item that goes in
  an armour slot (`Equipable` + armour slot, minus a blacklist that is empty), with fixed 4/6/5/4 slots per piece
  whatever its protection, so every mod's armour takes insulation. Ingredients are leather, all `#minecraft:wool`,
  rabbit hide and its own furs; `item/insulator/modded_leather.json` adds every other `#forge:leather` item at
  leather's value.
- **Climate control** is back on the ladder (14 rungs): the Mutant Snow Golem's Blueprint gates the hearth, boiler
  and icebox. Campfires, furnaces, the sewing table, insulation, waterskins and the thermometer are always free.
- **Fire drill** (`peacock:fire_drill`, KubeJS): three sticks on a diagonal; hold right-click on a block for two
  seconds to light an unlit campfire or candle (not furnaces, lamps or ores, which also have a `lit` property;
  not waterlogged ones) or put a fire on the face aimed at; twelve uses. Chosen over Tools for Survival (a small
  mod that also adds sickles, javelins and plant fibre) to add nothing else.
- **Capital biomes**: temperature 0.5–0.8 and low ground only — plains, sunflower plains, forest, flower forest,
  birch and old-growth birch forest; Terralith temperate highlands, lavender forest/valley, blooming valley, sakura
  grove/valley, moonlight valley. Out: savanna and shrublands (hot, dry), taiga, birch taiga, steppe, forested
  highlands, valley clearing, lush valley (cool), meadow, cherry grove, blooming plateau (high, and Cold Sweat
  cools with altitude). A narrower list means more seeds with no capital; the seed-reroll proposal is still open.
- Almanac: a Staying Warm entry (Land, Seasons & Sky), a "...stop freezing?" FAQ, the climate rung back on the
  Tier 1, charter and What Is Locked pages.

## Zoom needs a spyglass; What Are They Up To; a Peacock achievements tab; seed reroll (2026-10-18)
- **Just Zoom 3.0.1** (+ Konkrete, both client-only). It has no "require a spyglass" option — its zoom key always
  works — so `spyglass_zoom.js` (server) checks each player's inventory and every equipped Backpacked backpack once
  a second (backpack contents exist only on the server) and tells the client when that changes;
  `spyglass_zoom_client.js` unbinds Just Zoom's key without a spyglass and puts the player's own key back with one
  (remembered in `kubejs/config/peacock-zoom.json`, so an options save while unbound loses nothing). Using a
  spyglass in hand zooms through Just Zoom too (its default). Its options key defaulted to **B**, the backpack, and
  is unbound; its one-time "press B for options" toast is pre-dismissed by a shipped (preserved)
  `justzoom_instance_data/persistence_data.json`.
- **What Are They Up To 1.2.3** (+ CoroUtil, both sides) replaces the pack's grey `[AFK]` team (removed from older
  worlds on load): typing bubbles, menus shown in the world, idle players doze off with a "Zz" in the tab list after
  five minutes. Cost: status packets when someone starts/stops typing or opens a menu, relayed to nearby players;
  nothing ticks in the world. `dynamicGuiDontSendConstantGUIUpdates = true` sends an open menu once instead of every
  10 ticks. The sleep vote stays.
- **Achievements**: `tools/gen-advancements.py` writes a Peacock tab (52 advancements) into the pack datapack.
  Vanilla triggers where one exists — entering any of the 72 ruins (location + structure), killing a raider inside a
  held ruin, picking up each journal (written-book NBT title + author; all 16 for the challenge), crafting a charter,
  making a fire drill, Cold Sweat's own `armor_insulated` trigger, placing a hearth, taking a bounty. The rest are
  `minecraft:impossible`, granted by `achievements.js`: 30 bosses (ladder bosses, Mowzie's, Cataclysm, the illager
  bosses, Incendium's named vanilla mobs, the vanilla four) to everyone who hit the boss and is within 128 blocks, plus
  "every boss that holds a Blueprint"; Blueprints (first, each tier, all) from recipe stages; joining a town (the
  player's scoreboard team starts `village_`, Village Recruits' faction naming); a first recruit (a `recruits:`
  entity within 16 blocks whose owner is the player); opening a sealed rumour; and a winter lived through (seen
  online in winter, then online in spring). Dropped as undetectable: finishing a bounty (Bountiful only signals the
  client), founding a town, an out-of-season greenhouse harvest. `validate.py` checks the script's boss table against
  the generated files.
- **Seed reroll** (approved): `capital_reroll.js` stops a brand-new world with no capital — world clock under 2
  minutes, never joined (flag set on first login), nobody online — after writing `kubejs/config/peacock-reroll.json`;
  `peacock-start.sh` now runs Java in a loop (foreground, so the console stays attached; no marker = exit with the
  server's code, as before), deletes the world folder only if its `playerdata/` is empty and `level.dat` exists,
  clears `level-seed`, and starts again. 15 tries in a row, then it keeps the world. Simulated locally with a stand-in
  `java` (reroll path and the playerdata guard). Thread dumps now go to Java's PID, not 1 (server/README).
- **Tenth world (23:00)** ran the commit before the reroll (it synced at 23:00; the reroll was pushed after), so no
  reroll happened. Village Spawn Point found no capital and fell back to `#minecraft:village` — a ruin in hot
  country at 0,108,-272 ("spawned in a hot biome with no village"). The fallback is off now
  (`keepDefaultVillageTagBackup: false`): without a capital the spawn stays at the origin, and on a new world the
  reroll takes over. The "crash" on stopping was Forge failing to save `world/serverconfig/valkyrienskies/
  vs_eureka.toml` because the world folder had already been deleted while the server was still running — harmless.

## Lighter shader packs shipped for testing (2026-10-19)
Aaron: "Just install them all and let me play around with them". Added, client-only, selectable in the shader menu
(O) — no tier uses them yet: **MakeUp – Ultra Fast 9.5g** (every effect optional; Distant Horizons programs in its
source), **Sildur's Vibrant 2.02 Lite** and **Medium** (Distant Horizons support listed), and **Miniature Shader
2.19** (very light; no sign of Distant Horizons support, so far terrain may look wrong with it). Sildur's files are
renamed without spaces (validate.py rule). Once a winner is picked, the low tier's `oculus.properties` shader pack
and its per-pack settings go into tools/gen-profiles.py like the Complementary presets.

## Tools on the back (2026-10-19)
Aaron: "a back or hips mod — unequipped tools and weapons go to the back or hip". **Tools On My Back 1.1.2**
(client-only, no dependencies) is the only maintained option for Forge 1.20.1 (Arsenal+, Back Tools and Stowed are
1.21-only). It shows each player's last-used tool or weapon on their back; it tracks every player the client sees
(per-UUID in its player tick), so with everyone on the pack, everyone sees everyone's gear. One item at a time;
position per item or per item type (all swords, all axes) is set in its in-game editor (Mods → Tools On My Back →
Config), e.g. swords on the belt.

## The ruins never generated: a stale village set won the datapack order (2026-10-19)
Review before the next playtest. Both pack datapacks defined `data/minecraft/worldgen/structure_set/village.json`:
`peacock-ruins.zip` (72 ruin structures, kept clear of the capital) and an old copy in the `peacock` folder from
2026-10-17 listing all 36 CTOV villages as ordinary living villages. Paxi loads the folder after the zip (the
crash report's datapack list ends `…, peacock-ruins.zip, peacock`), and the later pack wins — so every world so far
had living CTOV villages and no ruins: the living "normal CTOV village" near the capital, Mindi shot by a pillager,
no zombie owners or ruin loot. The stale file is deleted (packwiz removes it from servers and clients on the next
sync) and `validate.py` now fails on any file both packs define except `pack.mcmeta`. Vanilla's own
`minecraft:villages` set was already handled (overridden to Village Recruits' tower spawner only). The ruins
structures themselves loaded without errors on every boot; they have simply never been placed before, so tonight is
their first real test.
- The reroll also gained a safety net: before rerolling, it locates the capital (one concentric-ring position inside
  the spawn area — an already-generated chunk, so cheap). If the capital exists but spawn is not in it, spawn is
  moved there and the wall is built 30 s later, instead of deleting a world that has its capital.

## Village review: wider gaps round the capital, no towers beside it, Stoneholm removed (2026-10-19)
A pass over every structure set in the pack against the dead-world plan (Aaron approved all of it).
- **Ruins keep 14 chunks from the capital** (was 6). The capital, Terralith's size-7 castle town, reaches about
  7 chunks from its centre plus the 6-block wall, so a ruin starting 6 chunks out could run into the town.
- **The pack's nature pieces** (fallen logs, boulders, the woodcutter's rest; spacing 7) keep 10 chunks from the
  capital. They had no gap and would have landed in its streets.
- **No Village Recruits tower beside the capital.** The tower set's one exclusion slot is used on the ruins, so it
  cannot also avoid the capital; on roughly one seed in ten a tower could generate within a few chunks of the
  walls (the spawn keep-out stops it founding a town, but the building would stand). `capital_reroll.js` now also
  rerolls a brand-new world when the tower set's placement maths puts any tower chunk within 9 chunks of the
  capital's centre — arithmetic only, nothing generated. Console: `[peacock] reroll: a Village Recruits tower can
  generate within 9 chunks of the capital …`. About 10% more rerolls.
- **Stoneholm removed.** Its underground and underwater villages were living villages with trading villagers,
  against the rule that only the capital and the new towns are alive, and it sent its own welcome message on
  join. Its chest tables are gone from `cave_loot.js`, `journals.js` and `rumour_maps.js`, and from the Almanac.
- Noted, unchanged: vanilla's and CTOV's pillager outposts both generate, so outposts are roughly twice as common
  as vanilla. That suits a world the pillagers won.
