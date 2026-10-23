# Decisions

Why things are the way they are. Add an entry when a choice would surprise someone later. Entries are a dated
history and are not rewritten when a later one supersedes them; the summary below says what holds now.

## Where things stand (2026-10-20)
- **The capital** is `peacock:capital`: CTOV's large plains town at size 7, on temperate lowland
  (`#peacock:capital_biomes`), one candidate per ~2,000 blocks; Village Spawn Point moves spawn into the nearest
  one at world creation, so any seed works. `capital_wall.js` walls it along its outline with four lit gates
  where the main roads end; `capital_boards.js` builds three bounty-board pavilions in the town (2026-10-21). Any far copy turns zombie
  (`dead_capitals.js`), so it is the only living old town. *Supersedes:* the concentric-ring CTOV capital,
  Terralith's fortified village, the script founder, the seed reroll, the rectangle wall with boards inside the
  gates, and the board plaza in the house pool (entries 2026-10-17 to 2026-10-20).
- **Every other CTOV village is a ruin** (60% abandoned, 40% pillager-held), kept 14 chunks from the capital.
  Stoneholm's villages are switched off (the mod stays as a dependency). Village Recruits towers are the only
  new living settlements; the AI runs their diplomacy, wars and expansion.
- **Temperature** is Cold Sweat, comfortable 35–100 °F (45 until 2026-10-21), no thirst (*supersedes* Tough As Nails).
- **The server** syncs on every start; `peacock-start.sh` runs Java beside a shutdown watchdog. The only hang found
  (Supplementaries road signs) is fixed. Chunk Pregenerator, not Chunky, for pre-generation.
- **The look** adds Subtle Effects (both sides), Particle Rain, Smooth Steps (Camera Overhaul removed 2026-10-21), Better Biome Reblend, six texture packs, Streams Reflowing and Terrain Slabs; AmbientSounds is gone. Cold
  Sweat's on-screen water drops are off, by setting and by invisible drop textures (2026-10-21).
- **Metals:** Create: Ironworks' tin, bronze and steel are the pack's only ones (Geolosys' tin and Big Cannons'
  bronze/steel fold into them); every Geolosys metal has a use beyond Spartan weapons (entry 2026-10-21).

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

## Village review: wider gaps round the capital, no towers beside it, Stoneholm villages off (2026-10-19)
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
- **Stoneholm's villages switched off.** Its underground and underwater villages were living villages with trading
  villagers, against the rule that only the capital and the new towns are alive, and it sent its own welcome
  message on join. The first attempt removed the mod, and the server would not boot: Create: Better Villagers
  declares Stoneholm a required dependency. So the mod stays installed as a library; the `peacock` datapack
  overrides both its structure sets with frequency 0 (as Terralith's `rare_village`), and `ENABLE_IN_GAME_MESSAGE`
  is false. Its chest tables are gone from `cave_loot.js`, `journals.js` and `rumour_maps.js`, and from the Almanac.
- Noted, unchanged: vanilla's and CTOV's pillager outposts both generate, so outposts are roughly twice as common
  as vanilla. That suits a world the pillagers won.

## The reroll never ran: `getGameTime` is not reachable from KubeJS here (2026-10-19, two fresh worlds)
Both 16:00 and 16:08 worlds logged `[peacock] reroll: failed — TypeError: Cannot find function getGameTime in object
ServerLevel[world]` — the first line of the check, so no world was ever rerolled (and, reading back, none had been
since the reroll was added). Village Spawn Point found no capital on either seed and was not in the way: it runs
once at world creation, only looks for `#peacock:capital`, and leaves spawn alone when there is none. Other Level
calls work (`getSharedSpawnPos`, `structureManager`, the generator and structure-placement calls the founder used),
so only this name is missing from KubeJS's remapping. Fix: "brand new" is now a first-boot flag saved with the world
(`peacock_booted`), AND-ed with the world's age when any route to the clock works (`worldAge()` tries
`getGameTime`, the SRG names, and `levelData`); the console line `[peacock] reroll: first boot: …; world age: …`
shows which route worked. The player-has-joined, nobody-online and start-script `playerdata/` guards are unchanged.

## A rerolled world that was not deleted got kept; reroll decisions now logged to a file (2026-10-19 evening)
The 20:47 boot read `first boot: false; world age: 301 ticks`: the previous boot had stopped for a reroll at the
300-tick check, but the world was never deleted (the start script's reason went with the console), and because the
script had already marked the world "booted", the next start took it for an existing world. `/locate structure
#peacock:capital` confirmed no capital. Fixes: `peacock_booted` is written only when a world is kept (a `finally`
after the check), and cleared on the reroll path; the reroll marker is read back before `stop`, so a failed write
keeps the world instead of stopping for nothing. `peacock-start.sh` appends every decision — reroll, refusal (with
the `playerdata/` entries it found), or a stop with no reroll requested — to `logs/peacock-reroll.log`.

## Shutdown hangs: a watchdog kills a stuck Java and saves a thread dump (2026-10-19 night)
About half of all shutdowns (reroll stops and manual ones alike) save everything — "All dimensions are saved",
"Finished unloading server configs" — and then Java never exits: a mod leaves a non-daemon thread running. On a
reroll that stalls the whole loop (the afternoon's lost world). Aaron chose a safety net plus diagnosis over
removing suspects blind (the hang is intermittent, and the suspects — Valkyrien Skies, Distant Horizons, Simple
Voice Chat — carry ships, the far view and voice). `peacock-start.sh` now runs Java in the background (stdin kept
with `<&0`, so the panel console still works) beside a watchdog: once shutdown begins (a reroll marker, or
"Stopping server" in this boot's `latest.log`), Java gets 120 s (`PEACOCK_HANG_GRACE`); then `jcmd Thread.print`
goes to `logs/peacock-hang-<time>.txt` (plus `kill -3` into the console), and Java is killed. The next hang names
the thread; the real fix follows from it. The reroll count is also written by the script itself, so a killed stop
still counts toward the 15.

## The capital is a scattered large CTOV town; reroll, wall and founder retired (2026-10-20)
Overnight the reroll ran unattended through its 15 tries and found no capital on any of them — about 25 seeds in a
row with 2026-10-19's — so the one-fixed-position design was the problem, not luck. Aaron: "The capital village just
has to be a large CTOV village in a comfortable temperature biome, and a good terrain", walls and Terralith optional.
- `peacock:capital` = CTOV's large plains village (start pool `ctov:village/biome/plains`, normal town centre or the
  keep), `size` 7 (CTOV's large is 5), `max_distance_from_center` 116, biomes `#peacock:capital_biomes` (unchanged).
  Placement: `random_spread` 128/64 — one candidate per ~2,000 blocks, kept only on a capital biome.
- Village Spawn Point (`#peacock:capital`) finds the nearest at world creation; Collective's search behind it is
  `findNearestMapStructure(…, 100, false)`, 100 spacings out, so a qualifying town is found on any seed. A jigsaw
  structure's biome test needs only its start position (the piece layout is deferred), so failed candidates are cheap.
- Several capitals exist, thousands of blocks apart (the Almanac now says "a few old towns live on, far apart").
  Ruins (14 chunks), nature pieces (10) and war camps (14) keep clear of every candidate via their exclusion zones on
  `peacock:capital`; Village Recruits' keep-out follows the world spawn, so the spawn capital stays neutral.
- Bounty boards: a 3x3 plaza at weight 5 in CTOV's plains house pool (now used only by the capital). CTOV's streets
  carry their house jigsaws one block above the road surface, its houses at their own y=0 (checked in the jar), so the
  plaza's path is layer 0 and its `building_entrance` jigsaw sits at y=1.
- Removed: `capital_reroll.js`, `capital_wall.js` (wall, `/peacock wall`, `/peacock found`), the `capitalWall`,
  `capitalFound`, `capitalReroll` switches, and the Terralith fortified-village overrides (its set stays at frequency 0).
  `peacock-start.sh` keeps its loop and hang watchdog and now clears a stale reroll marker before each start: the
  21:48 "hang" dump was a booting server (main thread in `PlayerRespawnLogic`), killed because a marker left by a
  panel-killed server made the watchdog think a shutdown had begun. Across the ten real reroll stops after it, Java
  always exited within 120 s; the slow exits are idle non-daemon pools (LuckPerms' HTTP client, IO workers) timing out.

## The shutdown hang was Supplementaries' road signs (2026-10-20)
The first real hang dump (`peacock-hang-20261020-094515.txt`, 09:45) has one non-daemon thread left besides
DestroyJavaVM: `pool-15-thread-1`, parked in `ServerChunkCache.getChunk` ← Supplementaries
`StructureLocator.findNearestMapFeatures` ← `BlockGeneratorBlockTile` — the worldgen road-sign generator, which looks
up the nearest structures on an executor thread and blocks on chunk loads. A search still running at shutdown waits
for a chunk the stopped server never delivers, and the thread keeps the JVM alive (the logs' "Searching for closest
structure among [ruins…]" lines are these). `building.sign_post.way_sign.enabled = false`; placed signposts are
untouched. The watchdog stays as the backstop.

## Only the spawn capital is alive: the others' villagers become zombies (2026-10-20)
The scattered capital means other copies of `peacock:capital` generate far out. Aaron: generate them, then kill
their villagers — as zombie villagers. `kubejs/server_scripts/dead_capitals.js`: on `EntityEvents.spawned` for a
villager, iron golem or Guard Villagers guard, one tick later (never inside the join: a worldgen entity joins while
its chunk is promoted, and a lookup there can block), if the entity stands inside a `peacock:capital` whose start
chunk differs from the one at world spawn, in a chunk with under 20 ticks of inhabited time (created with the town,
no player there yet), and not inside a `village_recruits:tower_spawner` — villagers are replaced by persistent zombie
villagers keeping `VillagerData`, `Offers` and `Xp` (curable, babies stay babies), golems and guards are removed.
Every candidate is tagged once (`peacock_dead_capital_checked`). Spawn capital, VR towns, player-brought and bred
villagers are untouched; if spawn is in no capital, nothing is. Zombies caught outdoors burn at dawn like any other.
The Almanac is back to "the only old town alive", plus a line on the fallen ones.

## Comfortable is 45–100 °F (2026-10-20)
Aaron: "change 45-100 to comfortable temperature". `config/coldsweat/main.toml` (COMMON) now ships with only the
changed keys — Forge fills the rest with defaults: `[Difficulty] "Minimum Habitable Temperature" = 0.2889` (Cold
Sweat stores MC units, MC = (°F − 32) / 45, read from `Temperature.convert`; 45 °F), max unchanged at 100 °F,
`[Builtin] Difficulty = "custom"`, `"Auto Update" = false` so an update cannot reset them. Not `preserve`, so it
reaches servers that already generated the file. Context: a new world starts in early spring (−0.2 MC, −9 °F) and
the capital biomes' Cold Sweat lows are 51–59 °F, so dawn read ~50 °F at the old floor.

## Capitals are rarer than the grid suggests (2026-10-20 13:54)
`/locate structure peacock:capital` from (−3000, −3000) and from (3000, 3000) both returned the spawn capital
(960, −5424), 4,642 and 8,667 blocks away: no other capital within ~8,700 blocks. Only a few percent of the
2,000-block candidates land on capital-biome lowland under Terralith + Tectonic — which also explains the ~25
failed single-position seeds. In practice the spawn capital is the only one players will meet; `dead_capitals.js`
is the safety net for the rare far one.

## Capital bounty boards placed by script; tower lore (2026-10-20)
- The 3x3 board plaza in the capital's house pool gave one world 50+ boards: jigsaw tries a slot's elements in turn
  until one fits, so a small piece takes every slot no house fits regardless of weight. It is gone from the pools;
  `capital_boards.js` places two `bountiful:bountyboard`s once per world, 5 s after first load: beside the bell
  (CTOV's plains square has one, at the well) on open ground — the first solid block from the sky must be a ground
  block (never a roof, never a dirt-path road) with two air above — else outside the centre piece's corners (the
  fortified keep has no bell). Flag `peacock_capital_boards`. Existing worlds: place boards by hand.
- Aaron: towers need not be easier to find, but lore or bounties are welcome. A tier-2 found writing, "Charter of a
  New Town" (the forty raise a tower on clean ground, three rules, grain for the capital), and a Sealed Rumour,
  "smoke from a new tower" (exploration map to `village_recruits:tower_spawner`, search radius 20), as an UNCOMMON
  mapper-board reward. The Almanac's New Towns page says towers rise only when someone walks near.
- 14:34: `capital_boards.js` failed on its first run — `start.getPieces()` is a JDK immutable list
  (`ImmutableCollections$ListN`) whose members Rhino cannot reflect on. Copied into an `ArrayList` first
  (reproduced and verified in the same Rhino). Aaron: "just need to ensure there are boards", so the search now
  widens to rings out to 40 blocks from the square, and as a last resort puts the two beside world spawn on
  whatever stands there; with no capital at spawn they go beside spawn too.

## The capital gets a wall again, following the town's outline (2026-10-20)
Aaron: "Can we try generating walls for it?" `capital_wall.js` is back, rewritten for the CTOV capital: the wall line
is the convex hull of every building piece's footprint (pieces whose pool element is not under `/roads/` and not a
villager piece), pushed 5 blocks out, stepped 4-connected so there are no diagonal gaps. A column inside a road
piece's footprint becomes a gate (cleared arch, stone lintel, hanging lantern on its first column), so every road
out of town passes through. Wall: 5 high, stone bricks with some mossy/cracked, stone-brick-wall cap, lantern posts
every 8 columns and beside gates, taller towers at the hull's corners; over water it stands on the surface with a
foundation filled down to the bed (at most 8). Built 8 s after first load, 40 columns per tick; flag
`peacock_capital_wall2`; `/peacock wall` (op) rebuilds. Columns in unloaded chunks are skipped and counted.
Logic checked against a fake town (6 buildings, 4 roads, a pond): 480 columns, 4 gates, none inside a building,
no gaps. The world the reroll era left needs nothing: the flag is new, so the current world is walled on its next start.
- 15:05, first real wall: 830 columns around 297 building pieces, 105 road pieces — and 0 gates. CTOV's streets end
  at houses inside the town, so no road piece ever crosses the hull. Gates are now placed on purpose: the road piece
  reaching farthest N, E, S and W each gets a 3-wide gate (stone lintel, hanging lantern) at the wall column nearest
  its far end, posts beside it, and a 3-wide dirt path from the road's end out to the gate (open ground only, never
  inside a building piece). The plan is deterministic, so a world walled before this gets the gates cut into its
  standing wall on the next start (flag `peacock_capital_wall_gates`; ground read two blocks inside the wall).
  Checked against a CTOV-like fake town (roads ending inside): 4 gates and paths on a new world, the same 4 cut into
  an existing wall, nothing on a third boot.

## The Appalachia look, Forge-1.20.1 edition (2026-10-20)
Aaron liked GOATED's Appalachia pack (Fabric, 1.21.11) and picked from it. Every candidate was checked for a Forge
1.20.1 build on Modrinth; unavailable: Wilder Wild, Terrestria, Boids/Birds, Cicada, Cool Rain, Wet Sand, Resonance,
Sunbathing Godrays, Allure, Wild Vanilla, Photonics.
- **Client only (no server cost, any world):** Subtle Effects (+ Fzzy Config, already present), Particle Rain, Camera
  Overhaul, Countered's Smooth Steps, Better Biome Reblend; texture packs Fast Better Grass, rainbow's foliage,
  3D Default, Fresh Animations Details + Objects, Cubic Sun & Moon — on in every profile, `potato` without 3D Default
  and the Fresh Animations family. The old shipped pack lists are in `_previous`, so players who never changed
  their packs get the new list. Better Animations left out: its 1.20.1 version declares Fabric API.
- **Worldgen (server cost, new chunks only):** Streams Reflowing and Countered's Terrain Slabs (beta on 1.20.1;
  bundles polymixin). To be tried on a test world first: capital still found, wall/boards behave, boot time and
  TPS while travelling; pre-generate around the capital with Chunk Pregenerator (not Chunky: DH 3.3.3 crashes with it).
- **AmbientSounds removed** (Aaron): its region loops play animals that are not there — wolf howls, owls, crows,
  frogs, whales. Wind/water/cave reverb remain through Sound Physics Remastered; Subtle Effects adds a few sounds.
- Every new jar's mandatory dependencies were checked against the pack before shipping (the Stoneholm lesson).
- 15:46 client crash on join: `Registry Object not present: subtle_effects:item_rarity`. Subtle Effects registers
  its own particle types; on Forge the client's registries are matched to the server's on join, and the server did
  not have the mod, so its particles vanished. Subtle Effects (and Fzzy Config) are now `side = "both"` — the mod
  supports servers. Particle Rain registers particles the same way but does nothing at all on a dedicated server, so
  it cannot be fixed that way; it stays client-only pending an in-game `/weather rain` test.
- Camera Overhaul toned down (Aaron: "lower the camera sway"): profile keys set idle sway 0.6→0.2, turning roll
  1.25→0.5 and the walking tilts (strafe roll 10→5, forward pitch 7→3.5, vertical pitch 2.5→1.5). The launcher
  matches keys by name and `[walking]` is the first section carrying the tilt keys, so sprinting/swimming/flying
  keep the mod's values; the mod's defaults are in `_previous` so they count as untouched. Applies from the launch
  after the mod first writes `config/cameraoverhaul.toml`; a player's own edits are kept.

## Camera Overhaul quieter in every movement; Cold Sweat's screen drops off (2026-10-20)
Aaron: "Reduce the walking, jumping, looking around, and flying sway further", and blocky blue drops ran down the
screen after leaving water. The first toning-down only reached walking: Camera Overhaul repeats its tilt keys under
[walking], [sprinting], [swimming], [flying], [mounts] and [vehicles], and the launcher matched a key's first line in
the file. `*.keys` files may now carry `[table]` lines that scope the keys after them to that table (Launch.java and
tools/apply-profile.py), and a quoted key may contain spaces. Values: idle sway 0.1, turning roll 0.2; walking
2.0 / 1.5 / 0.5 (sideways roll / pitch moving / pitch jumping), sprinting 3 / 2 / 0.5, flying -0.5 / 1.5 / 0.5 with
view smoothing 0.25 (was 1.0, the floaty lag), swimming, mounts and vehicles about halved. The drops were Cold
Sweat's wet effect (`"Show Water Effect"` in [Preferences] of config/coldsweat/client.toml, default 3 = drips
and on-screen); it is 0 now. Both are per-setting, so a player who changes them in game keeps their value.

## Every shader that fits the pack, shipped for choosing (2026-10-20)
Aaron: "Find ALL shaders that support the modpack and add them so I may choose." Method: every Modrinth shader with
a 1.20.1 Iris build and 40k+ downloads (148 of 660; the rest is a long tail of small personal packs), less effect
filters (VHS, body cam, flashlight, motion blur, saturation sliders, depth/normal maps, PS1 looks, joke packs);
each file downloaded and opened. Kept only packs with Distant Horizons programs (`dh_terrain`/`dh_water` in the
zip; without them the far LOD terrain renders wrong) whose `iris.features.required` Oculus 1.8.0 provides (it has
every flag Iris defines). That added 50 packs plus three more Sildur's Vibrant variants (High, Extreme, Extreme-VL)
and Sildur's Enhanced Default (Fancy, Fast); MakeUp went to 9.6. About 250 MB per client, client-only, filenames
without spaces or colour codes. Packs that need compute shaders, SSBOs or custom images (Rethinking Voxels, Better
Voxels, Noble, Shrimple, FastPBR, Visual Vibrance, Pegasus, Glimmer, Reverie, Spring, Blocky, DERCODE, Just Colored
Lighting, Tricked) need OpenGL 4.3 and cannot run on macOS. Not added for lack of DH support: Insanity, AstraLex,
Pastel, Nostalgia, Kappa, Potato, Vanilla Plus, Lux, RedHat and others; Miniature (already shipped) also lacks it.
Once Aaron picks, the rest come out again before friends install.

## Running dust trail off (2026-10-20)
Subtle Effects' dust cloud behind a running player is off (`[dustClouds] playerRunning = false` in
config/subtle_effects/entities.toml, via the profiles); vanilla's small sprint particles under the feet remain, as do
the clouds behind galloping horses and charging ravagers.

## Particles, clouds and entity distance follow the profile; Particular removed (2026-10-20)
Aaron: "Could it be worth modifying other settings like particle count?" then "Ship it!". The four particle mods ran
at full strength on every tier. Now per tier (gen-profiles.py `PARTICLES`; medium and up keep each mod's default):

| | potato | low | medium / high / ultra |
|---|---|---|---|
| Particle Rain max / density / storm / distance | 400 / 20 / 25 / 10 | 750 / 40 / 50 / 12 | 1500 / 75 / 100 / 16 |
| Falling Leaves spawn rate / conifers | 3 / 1 | 6 / 1 | 10 / 2 |
| Subtle Effects particle culling distance | 3 | 4 | 5 |
| entityDistanceScaling | 0.5 | 0.75 | 1.0 |
| clouds | off | fast | fancy |

Particular is gone: its leaves, fireflies and waterfall spray repeated Falling Leaves, Subtle Effects and Streams
Reflowing. Clouds: the shipped first-launch options.txt had them off for everyone (which also hides Complementary's
clouds), and potato wrote `renderClouds:false` unquoted where vanilla writes `"false"`; both old values are in
_previous, so an untouched install takes its tier's clouds. The launcher (and apply-profile.py) no longer creates a
missing JSON config from keys, since a mod's nested JSON (Particle Rain's `{"perf": {...}}`) cannot be built from
flat lines; the keys apply on the launch after the mod writes its file.

## One set of rain ripples (2026-10-20)
Particle Rain and Subtle Effects both put ripple particles on water in the rain. Subtle Effects' `rainWaterRipples`
(config/subtle_effects/blocks.toml) is off through the profiles; Particle Rain's ripples stay, scaled by tier. The
shader side does not double anything: shaders draw no particles, and every Euphoria Patches feature starts off (by
default it is Complementary plus modded-block support). Euphoria's optional Seasons module would double Serene
Seasons' colouring if a player turns it on.

## Bounty boards pay a newcomer well; board standing is shared (2026-10-20)
Aaron: "make the initial bounty rewards good, as a way to rope players into the bounty system", unless they already
return more than goes in. They did not: Bountiful picks rewards first and then objectives worth the same
(`objectiveModifier` 0), so a delivery broke even, and with iron priced 450 as a reward against 350 as an
objective, iron-for-anything-for-iron lost. Read from Bountiful 6.0.4's code: a board's level comes from the
bounties *everyone* has finished on it (2 per level for the first five, then 3, 4, 5 ...; level 10 at 25,
level 30 at 135), so standing is the board's, not a player's; rewards are weighted by rarity against that level
(below 5, commons at full weight; from 5 they drop 2.25x, from 15 about 5x). So the hook is in COMMON rewards:
iron pickaxe, sword and knife, chainmail (uncraftable), goat-fur armour, a waterskin, torches, cooked beef,
andesite alloy and maps, all priced well under their worth to a new settler; iron 450 → 300 (still above the
armorer's 4-for-an-emerald, so no loop), lanterns 500 → 350. They fade as the board levels into rarer pay. The
musket cartridge left the reward pool: it is Blueprint-gated (Blasting), and rewards never are. Not changed: the
board starts with one random decree, so the capital's journals and rumours depend on luck (proposal pending).

## The mods on the bounty boards; Bountiful's ungated defaults closed (2026-10-20)
Aaron: "plenty of mod items can be rewarded or demanded ... a great way to force players to interact with unfamiliar
mods ... don't over pollute to the point where players don't see Peacock's story-specific bounties. Set the bounties
to be per player."
- **Where they go.** Bountiful divides each pool's weight by its entry count, so a pool keeps the same share of a
  board's picks however long it gets. Mod items went into the twelve trade decrees' own pools (Farmer's Delight crops
  and meals; Aquaculture fish, rods and tackle; Create parts, sheets and machines; Spartan weapons and shields;
  Cold Sweat fur, hides, sewing table and soulspring lamp; Geolosys ore samples and the prospector's pick; Macaw's
  furniture; Storage Drawers; Supplementaries rope, flax, sacks, quiver, slingshot, hourglass; Naturalist game;
  Doggy Talents treats, collars and beds; Map Atlases; Nature's Compass). The Archivist decree never draws those
  pools, the mapper's rumour vouchers keep their share, and `_all_objs` (in every decree) gained only the pillager
  faction's own: skeleton villagers, provokers, bashers, griefers, marauders, executioners, igniters, firecallers.
  Every id was checked against the jars.
- **Bountiful's defaults merge in.** A datapack pool merges into the built-in one (`replace` only works for files in
  config/bountiful), so the filler the pack meant to drop was still there. Now removed by null entries: arrows, glow
  ink, prismarine, minecarts, axolotl buckets, glass, dyes, banners, dirt/cobblestone/stone-brick jobs, and the
  defaults that doubled the pack's own. Bountiful's netherite armour rewards are gone (netherite is a Blueprint);
  its diamond armour and tools wait for board level 12, trident 10, Mending and Heart of the Sea 15, and its
  ungated totem is replaced by the pack's (level 15).
- **Per player.** The bounty slips already are: each player takes their own copy, so two players can both do the
  same job. The board's level is not and cannot be made so without changing Bountiful: it is the sum of everyone's
  finished bounties on that board, and a board generates one set of jobs for all. A player who wants their own
  standing can craft a board at home; the capital's boards stay shared.

## Wild crops easier to find (2026-10-20)
Farmer's Delight's wild crops already generate in Terralith and Biomes O' Plenty biomes (both tag theirs
`forge:is_hot`/`is_wet` and `minecraft:is_beach`), but rarely. Aaron: "You can increase them". The Paxi datapack
overrides the placed features' rarity: tomatoes 1 in 100 chunks → 30 (hot, dry biomes), onions and carrots 120 →
50 (temperate), potatoes 100 → 40 (cold). Cabbages and beetroots (beaches, 30) and rice (wet, 20) are unchanged.
New chunks only.

## Camera Overhaul nearly off (2026-10-20)
Aaron, third pass: "the mod that snakes the screen. Reduce everything it does massively ... except the part that
smooths the walking going up the half slab terrain". That part is Smooth Steps, a separate mod, left alone. Camera
Overhaul now runs at a fraction of the second pass in every movement: idle sway 0, turning roll 0.05, screen shake
capped at 0.5 and none from swinging; walking 0.5 / 0.3 / 0.1, sprinting 0.75 / 0.5 / 0.1, flying -0.1 / 0.3 / 0.1,
view smoothing 0 when sprinting or flying, swimming, mounts and vehicles cut alike. If it still bothers players,
the next step is removing the mod.

## Quieter waterfalls and music (2026-10-20)
Aaron: "lower the volume of the waterfalls too, and the minecraft music". Streams Reflowing's water ambience (its
rivers and waterfalls; `waterAmbience` in config/streamsreflowing-client.properties; the first commit named the .toml it only imports from) 1.0 → 0.35, and Minecraft's music
slider 100% → 30%, in every profile and in the first-launch options; a player's own slider setting stands.

## The player list opens below the compass (2026-10-20)
Aaron: "Tab gets in the way over compass, makes it difficult to read." Reworked Locator Bar draws its compass at the
top centre and the player list draws from the top as well (the 2026-10-17 note left this alone). Better Tab has no
position setting and the compass can only be offset from the top, so `startup_scripts/tab_list_offset.js` shifts
Forge's `minecraft:player_list` HUD layer down 30 GUI pixels (`tabListOffset` in kubejs/config/peacock.json), the
same push/pop pattern as the boss-bar scaling. Supersedes "the tab list covering the locator bar ... is left alone".

## One shader: Complementary Reimagined (2026-10-20)
Aaron: "Remove all shader but the one chose" (he chose Complementary Reimagined, on by default). The 60 other packs
shipped for choosing (2026-10-19 and 2026-10-20, including Complementary Unbound) are gone, about 250 MB less per
client. Euphoria Patcher stays: it builds `ComplementaryReimagined + EuphoriaPatches` on each client from the
shipped zip, which the high and ultra profiles use. Supersedes "Lighter shader packs shipped for testing" and
"Every shader that fits the pack, shipped for choosing".

## Echo only in caves and big halls (2026-10-20)
Aaron: muffling indoors is fine, but "echo is for caves and very large buildings, not huts, homes, long houses".
Sound Physics Remastered's `reverb_attenuation_distance` ("the ray distance at which reverb starts", default 0 =
off, so every room rang) is 10 blocks in every profile, and `reverb_gain` 1.0 → 0.7. Occlusion (the muffling) is
unchanged. If halls still sound dry or huts still ring, the distance is the one number to move.

## Echo threshold 24; music 10%, creatures and ambience 70% (2026-10-21)
Reading Sound Physics Remastered's code: `reverb_attenuation_distance` is compared with a ray's *total* path across
its bounces (up to 4), not with the room's size, so at 10 a hut about 6 blocks wide (paths ~3+6+6+6 = 21) still
echoed on its later bounces. Aaron chose 24 (of 24 or 32): huts and homes up to ~7 wide only muffle, longhouses
echo faintly, caves and halls ring; 32 would also quiet longhouses and most narrow caves. Wood already reflects
little (0.4 against stone's 1.5); lowering it further is the next lever. Same day: music slider 30% → 10%,
"Friendly Creatures" (neutral) and "Ambient/Environment" 100% → 70%, in every profile and the first-launch options.

## Comfortable is 35–100 °F (2026-10-21)
Aaron: the temperature bar showed "Frozen" when no one was in danger. That bar is Cold Sweat's *world* gauge: it
pegs to freezing as soon as the air is below the habitable minimum, while the body only cools slowly from there.
With the minimum at 45 °F, ordinary nights (the capital sat near 50 °F by day), autumn and winter, rain and
highlands all read as freezing. Minimum habitable now 35 °F (`0.0666…` MC units; MC = (°F − 32) / 45), maximum
unchanged at 100 °F: a cool night is fine, frost, snow, mountains and winter still bite. Almanac and README say 35.

## Camera Overhaul removed; Smooth Steps does the slabs (2026-10-21)
Aaron: walking over all the half slabs felt jittery; is there a lighter mod that only smooths steps? There already
was: Countered's Smooth Steps (client mixins on the camera and entity move) lowers the camera when the player steps
up and eases it back over a few ticks; it needs nothing else. Camera Overhaul pitched the view on every vertical
movement, so Terrain Slabs' half-steps made it nod at each one. It is removed with its profile keys (three
toning-down passes did not make it right). Smooth Steps stays at its default 0.7; it smooths stepping up only,
stepping down a slab is vanilla's short fall.

## The player list lines up with Jade (2026-10-21)
Aaron: "Reduce the gap from the tab menu and the compass. You have Jade a good size gap." The fixed 30 px shift
became "auto": the list's top goes where Jade's overlay starts, a tenth of the screen height down (Jade
`overlayPosY` 0.9), so it scales with the window and GUI scale like Jade does. A number in `tabListOffset` still
forces a fixed shift.

## Cold Sweat's water drops: invisible textures, not just the setting (2026-10-21)
Aaron still had the drops in rain ("It's not the rain mod", then "I looked it up, it's 100% cold sweat"). His log
showed the launcher treating `"Show Water Effect" = 0` as already done, yet Cold Sweat's in-game Water Effects
option (Esc → Options → the Cold Sweat icon; the mod list's Config button does nothing for this mod) was on until he
turned it off. Most likely the first launch after 2026-10-20, before the launcher read quoted keys with spaces, wrote
the setting where Cold Sweat did not read it; his rewritten file can no longer show it. Cold Sweat's WetnessRenderer
is the only on-screen drop overlay in the pack (its 8×8 droplet stretched to 40–48 px is the "blocky" look), so the
pack now ships fully transparent `droplet.png` (8×8) and `droplet_trail.png` (8×1) under
`kubejs/assets/cold_sweat/textures/gui/overlay/`. KubeJS puts its asset pack above mod resources, so this holds
whatever the setting says. The profiles also set `"Water Droplet Opacity" = 0.0` (default 0.5).

## Geolosys metals get work; Create: Ironworks (2026-10-21)
Aaron: "The geolosys mod adds many many ores that are ONLY used when crafting spartan weaponry. Are there any mods
or custom work we can do to give these ores more use?" A recipe scan of every jar confirmed it: silver, nickel,
platinum and aluminium fed only Spartan Weaponry/Shields; lead only Supplementaries' spiky bomb; tin only Big
Cannons' bronze. Create's recipes naming these metals are Immersive Engineering compat, inactive here. He chose
items 1–5 of the proposal plus Create: Ironworks.
- **Create: Ironworks 3.5.0** (Forge 1.20.1; MCreator-built, data-driven Create recipes, no Create code
  dependency): copper, bronze, brass, rose quartz, sturdy and steel tools and armour, hammers, paxels; tin, bronze
  and steel ingots, nuggets, sheets and blocks; tin buckets, cauldrons, hoppers and lanterns; coal dust gunpowder.
  Its tin ore worldgen is off (`forge:none` over its three biome modifiers; Geolosys is the only ore). It replaced
  Create's own brass mixing with a one-ingot version: the datapack restores Create's (`create:mixing/brass_ingot`,
  2 ingots) and `metals.js` removes Ironworks' brass mixes. Its Tinkers' and Dreams & Desires recipes ship without
  load conditions; the datapack switches them off (`forge:false`), so they do not error at every load. Its steel
  recipe for netherite templates (7 steel + netherrack, instead of 7 diamonds) is kept.
- **One tin, one bronze, one steel**: Ironworks' items, because its own recipes name them by id. Geolosys' tin
  ingot/nugget and Big Cannons' bronze/steel ingots, scrap and blocks are replaced in every recipe output and
  input, their conversion crafts removed, dropped from the forge tags and hidden in EMI. Big Cannons melts by tag,
  so cannons cast from Ironworks' metal. Bronze: Ironworks unheated (1 ingot), Big Cannons heated (2).
- **Crushed Geolosys ore was a dead end** (found on the way): the clusters carry `forge:raw_materials/<metal>`, so
  Create crushed lead, silver, nickel, aluminium and platinum into crushed ore that could not be washed or smelted
  (those recipes are conditional on Thermal, Mekanism, IE…). Now washing gives 9 nuggets plus the real companion
  metal (lead → 50% silver nugget, silver → 50% lead, nickel → 25% platinum, platinum → 25% nickel), and crushed
  ore smelts or blasts to an ingot. Tin goes through Ironworks' crushed tin (it overrides `create:crushing/raw_tin`).
- **1, lead is shot**: musket cartridge from 3 lead nuggets + gunpowder + paper (4, iron gives 3); Big Cannons shot
  balls (3, iron gives 2) and solid shot from lead. Script-added recipes are not seen by blueprints.js's staging
  pass (`forEachRecipe` walks only the original recipes), so `metals.js` wraps these in the same Recipe Stages
  gate itself (Blasting, Cannons), and honours `ladder: false`.
- **2, alloys** in a heated basin: electrum (gold + silver → 2), constantan (copper + nickel → 2), invar (2 iron +
  nickel → 3), with nuggets. Their forge tags also unlock Spartan's electrum, constantan and invar weapons.
- **3, blocks**: lead, silver, nickel, aluminium, platinum, electrum, constantan, invar (tin, bronze, steel are
  Ironworks'). The lead block's tag switches Supplementaries' cannonball recipe from iron blocks to lead blocks.
  Sheets only where something uses them: aluminium and platinum (Create press). Textures are recoloured from
  Geolosys' ingots, Create's iron sheet and the vanilla iron block.
- **4, wealth**: villagers buy them (added to the villager's offers on right-click; see the crash entry below): toolsmith L2 6 tin,
  weaponsmith L2 6 lead, cleric L2 3 silver, armorer L3 4 nickel, toolsmith L3 5 aluminium → 1 emerald; cleric L4
  1 platinum → 2. New offers appear as villagers level up; existing levels keep their lists. Bounties: tin,
  bronze, steel (toolsmith), bronze, nickel (armorer), lead (fletcher), silver (cleric), platinum (any board);
  rewards silver and platinum (any board), a bronze pickaxe and steel hammer (toolsmith), a bronze chestplate
  (armorer).
- **5**: platinum sheet → precision mechanism in 3 deploy loops, no scrap (Create's: gold sheet, 5 loops, ~12%
  scrap); Ironworks adds a steel-nugget version. Aluminium sheets → 8 Eureka balloons (paper 2, leather 4,
  membrane 32), gated by Ships like Eureka's own.
- The Almanac's "Why the Rocks Have Names" gains a page of what each metal is for.

## Quieter, softer: breath from Cold Sweat, thinner fog, less noise (2026-10-21)
Aaron: "ways to reduce game noise, and create a clean but soft look." What he chose:
- **Breath fog** was Subtle Effects' Frosty Breath: it shows in any biome cold enough to snow and, with Serene
  Seasons, in every biome from late autumn to early spring, regardless of temperature, so nearly always. It is off
  (`displayType = "OFF"`), and `kubejs/client_scripts/cold_breath.js` draws the same particle with the same placement
  and rhythm from Cold Sweat's outside air temperature (trait WORLD, the world gauge's number: biome, height, time,
  season, weather) below `breathBelowF` (peacock.json, 45 °F). Aaron: "they can have warm clothes on but have the fog
  breath because they are in a cold area or it is winter. It should be tied to the outside temperature", so body
  temperature, clothing and acclimation play no part; a hearth warming the air does. Cold Sweat syncs every
  player's temperatures to everyone tracking them, so other players breathe by their own air.
- **Particle Rain fog** (wet-biome fog, always on in rivers and swamps, and the after-rain fog): density 0.1 → 0.05
  for both the flat and upright layers, upright opacity 1.0 → 0.5; desert dust haze 0.2 → 0.1. Shipped as
  `kubejs/assets/particlerain/particles.json`: Particle Rain merges every resource pack's particles.json field by field
  (missing fields stay null), and KubeJS's pack sits above the mod's. Aaron wrote "fog density to .5"; read as half
  (0.05), since 0.5 would be five times the default.
- **Sounds** (Subtle Effects): no snoring (player and villager chance 0), no stomach growling (threshold 0), the
  low-health heartbeat at half volume, drips landing at 40%.
- **Potion rings** around players at half opacity.
- **Screen motion** (options.txt, also the first-launch file): FOV effects, screen distortion, damage tilt 0.5;
  lightning flashes hidden. Cold Sweat: shiver intensity, heatstroke sway and blur 0.5.
All settings go through the launcher's untouched-only rule (the old values are in `PREVIOUS_DEFAULTS`).

## The Almanac's ore chapter, ore by ore (2026-10-21)
Aaron asked whether the book explains the ore system and what each ore does and how to get it. It did, scattered over
three entries, and a check against Geolosys' loot tables and deposits found it wrong in places: nickel had no source
(limonite drops nickel and iron together, Y -48 to -32; the book said "iron, deep"), autunite was still listed though
it was confined to the End on 2026-10-17, and quartz was missing (Y -64 to -48, the only quartz: Geolosys' biome
modifier also removes `ore_quartz_nether` and `ore_quartz_deltas`). "Where Each Metal Lies" and "Why the Rocks Have
Names" became "Every Ore at a Glance" (the depth table, mining and processing, Fortune and Silk Touch) plus Shallow,
Middle and Deep Ores (each ore: speckle colour from its texture, what it drops, depth and terrain, what it is for)
and "What the Metals Are For". Galena and limonite are called out as two-metal ores.
Same day: Subtle Effects' rising sparkles on dropped items off (`[itemRarity] particlesDisplayType = "OFF"`).

## The metals update crashed server start; fixed (2026-10-21 11:00)
Aaron's server logs (11:00 and 11:03 boots): `ClassCastException: String cannot be cast to Integer` in
`ServerAboutToStartEvent` → `VillagerTradesEvent`, from `NativeJavaMap.get` → `Int2ObjectMap.containsKey`. KubeJS'
Rhino wraps every Java map as a JS object and answers each property or method lookup with `containsKey(name)`;
fastutil's Int2ObjectMap (Forge's trade table) casts that String key to Integer. The first touch of
`event.getTrades()` killed the server, and the shutdown then hung on LuckPerms and Spark threads until the
watchdog. Never call into a Java Map from KubeJS. The villager metal trades now go into the villager's own
`MerchantOffers` (an ArrayList) when a player right-clicks it, once it has the profession and level (server
`metals.js`); existing villagers get them too.
Same boot: KubeJS reported "modified 2 recipes": `replaceOutput` only reaches recipe types it has a schema for
(Geolosys' smelting/blasting), so Big Cannons' basin mixing and compacting still made its hidden bronze and steel.
Those ten recipes are now rebuilt with the ids swapped in their JSON.

## Geolosys samples left out of Distant Horizons' LODs (2026-10-21)
Aaron: "add the geolosys surface rocks to the DH exception list". All 23 `geolosys:*_ore_sample` blocks are appended
to DH's defaults in `ignoredRenderBlockCsv` (tier profiles via `dh_keys`, the shipped client file and the server
copy). Samples have a collision box, so `blocksToIgnore = NON_COLLIDING` kept them, and each drew as a block-sized
speck in the distance. LODs already generated keep the specks until those areas are regenerated or revisited.

## Breath script: no breath at all, fixed (2026-10-21 11:30)
Aaron's client log: `cold_breath.js#76: Error in 'ClientEvents.tick': TypeError: Cannot find function getGameTime in
object ClientLevel`, every tick from joining, so the temperature was never checked. KubeJS' name remapping did not
expose that one method on the client level. The script now counts its own ticks, calls every game method through a
helper that tries the readable name and then the runtime (SRG) name, and logs the first failure once instead of
silently every tick.

## The bounty boards get a pavilion (2026-10-21)
Aaron: the boards are "tuff to spot as they are a single block on the ground. Can you create buildings around them
so they are easier to find and players can recognize the building? Like a tavern or a Gazebo." He chose the open
pavilion over an enclosed hall (a 9x7 building rarely fits on CTOV's dense square and would end up hidden behind
houses). `capital_boards.js` now builds, once per world, a 7x7 open timber pavilion: stone-brick plinth, oak floor,
oak log posts and beams, a red nether-brick hip roof, six hanging lanterns, a waxed "Bounties / Work for pay"
hanging sign over the north and south openings, oak railings east and west, and a flagpole on the ridge with a
yellow banner (red diamond and border) that reads from across town and on the Distant Horizons skyline. Both boards
stand back to back on the centre post. Site: the first 7x7 patch of open ground (no roof, road or water in any
column, at most 2 blocks of rise) on rings around the bell (6 to 20), then the square's centre (to 48), then spawn;
the patch is levelled. Flag `peacock_board_pavilion`; a world that already had the 2026-10-20 bare boards gets the
pavilion once and its bare boards within 48 blocks (±12 of the bell's height) are taken up. No site anywhere: two
bare boards beside spawn, as before.
- 12:50, first build failed halfway (Aaron: "Saw the structure, no bounty board on it"): `Assignment to undeclared
  variable d`. KubeJS' Rhino scopes `for (var d ...)` to its loop, so the second loop's `for (d = ...)` threw after the
  posts and beams. Every loop variable is now declared up front, and `validate.py` flags a `for (x = ...)` whose name is
  only declared in an earlier `for (var x ...)`. The site is saved (`peacock_board_pavilion_site`) before building,
  so a failed build is finished in the same place, and the next start finds the half-built frame (log centre post on
  a plank floor, log corner posts) and rebuilds over it. Materials now stone brick and oak (Aaron); the red roof and
  yellow flag stay for recognition.

## Enhanced Celestials removed (2026-10-21)
Aaron: "Can you remove the moon phases mod?" Enhanced Celestials 2 (core, default lunar events, shader support) and
CorgiLib, which nothing else needs, are gone, with `config/enhancedcelestials2core-mixins.properties`. No more blood,
harvest, blue or super moons; the moon is vanilla. The Almanac's "The Sky" page now covers vanilla moon phases and
weather, and the crops and terrain pages no longer mention it.
- 13:37, a new world: "no open 7x7 ground near the square — 2 bare board(s) beside spawn" (Aaron: "No bounty boards").
  The first site search tried 16 directions per ring, far too sparse for CTOV's dense square. Second version: every
  7x7 spot within 40 blocks of the bell, nearest first, that touches no building or road piece of the capital (their
  bounding boxes plus one), lies inside the hull of the buildings (so capital_wall.js, which walls outside that hull,
  never crosses it), and is open ground in all 49 columns (paths and farmland now count as ground; leaves, flowers
  and crops pass through) with at most 3 blocks of rise. Flag `peacock_board_pavilion_v2`; a world whose first run fell
  back to bare boards (pavilion flag, no saved site) gets the pavilion and its bare boards (near the bell, and beside
  spawn) are taken up.
- 14:10, another new world, "no open 7x7 ground within 40 blocks": the capital's first piece is the town centre, the
  square itself, and the search kept clear of it like a house, so nothing near the bell qualified. Third version: the
  square counts as open ground, the search relaxes in four steps (reach 40→64, rise 2→8, roads allowed from step 3,
  outside the hull only at step 4), each failed step logs how many spots each rule rejected, and building/road
  overlap is a summed-area grid (constant time per spot; ~380 boxes × 12,800 spots was too slow for the server
  thread). Only a built pavilion sets the flag (`peacock_board_pavilion_v3`): bare boards are put out again each start
  until one stands.

## Breath script, second fix (2026-10-21 14:10)
"no method players on ClientLevel": KubeJS adds its own `players` property to levels, which hides the game's
`players()` method under the same name. The helper now accepts a property value when no arguments are needed and
tries KubeJS' `getPlayers()` first; particles fall back to the particle engine; and the log shows one line ten seconds
in with the air temperature it reads, and one when the first breath is drawn.
- 15:05: the third search worked (step 3, 50 blocks from the bell, 17 up a hill: 4,175 of ~5,000 nearby spots touched a
  house). Aaron: "The pavilions just need to be in the town, and there should be multiple to make them easier to
  find." Now `boardPavilions` (peacock.json, default 3) pavilions, at least 32 blocks apart, anywhere inside the hull of
  the town's pieces, nearest the bell first; paths allowed from the start; rise 3, then 6, then 8 (the last step
  also allows the town's edge). Sites are kept in `peacock_board_pavilion_sites`; the one being built in
  `peacock_board_pavilion_site`; done flag `peacock_board_pavilions_v4`. A world with the one-pavilion version keeps it
  and gets the other two.

## Villagers restock after sleeping; the bell visit is no longer needed (2026-10-22)
Aaron: "Is there a config option to disable the Bell interaction? Sleeping should be enough to restock." Villager
Restock Balance has no config: it is data-pack functions in the mod, and its rule is the predicate
`clgd.villager:can_restock` (slept in a bed last night AND came within 6 blocks of its meeting point, the bell, between
daytime 9000 and 11000). The pack datapack (Paxi, above the mods) overrides that predicate with the sleep condition
alone. Villager Comfort still prices cramped, dark or caged villagers up to 4x, so halls stay a bad deal.

## Walk through leaves: Passable Foliage (2026-10-22)
Aaron: "Can you add walk through leaves?" Passable Foliage 8.2.1 (Snownee; Forge 1.20.1, both sides; needs Kiwi,
already in the pack): leaves (`#minecraft:leaves`, via its `passablefoliage:passables` tag) lose their collision, you
slow down inside them (90% horizontally and vertically), falls into leaves do half damage, and mob pathfinding
knows leaves are passable. Defaults kept, so mobs pass through leaves too. Its Leaf Walker enchantment lets you
stand on leaves again.

## The Elder Guardian holds Diving (2026-10-22)
Aaron, after the boss review: "Add the Elder Guardian, that'll be it." A 15th rung, **Diving** (Tier 2, charter key a
prismarine shard): Create's copper backtank, diving helmet and diving boots, and the vanilla conduit. The netherite
diving pieces are smithed from the copper ones, so they follow; water breathing and turtle shells stay free. A
monument has three Elder Guardians, and each one drops Blueprints like any ladder boss, so one monument raid supplies a
team. "Every Line of the Ledger" now includes it. The other bosses without a Blueprint (Sculptor, Remnant, Maledictus,
Scylla, Mutant Enderman, Hovering Inferno, the raid captains, Warden, Wither, Dragon) stay loot-only by choice.

## Potato drops Better Leaves (2026-10-22)
Aaron: "Disable better leaves for the potato preset." Better Leaves joins `POTATO_DROP` (with 3D Default and Fresh
Animations): its bushy models add geometry to every leaf block, the most common block in a forest. The previous
potato pack list is in `PREVIOUS_DEFAULTS`, so existing potato installs that never changed their packs lose it on the
next launch; anyone who picked their packs by hand keeps their choice. Low and up keep it.

## Bounty pavilions: clay-brick roof (2026-10-22)
Aaron: "Bounty boards structure looks great but replace the nether bricks. They're out of place." He picked clay brick
(over spruce, dark oak and deepslate tiles): the roof stays red, so "red-roofed pavilions with yellow flags" still holds,
in a material villages use. New pavilions are built with brick stairs and a brick cap; standing ones are re-roofed once
(`peacock_board_roofs_brick`), block for block, only where the nether brick is still in place.

## The capital wall no longer stands on trees (2026-10-22)
Aaron: "The capital walls gen ontop of threes." The wall's ground scan only skipped blocks named `minecraft:…`, so
another mod's tree (Biomes O' Plenty borders the capital's biomes, and the wall runs MARGIN blocks outside the town),
a bee nest or a huge mushroom read as ground and the column went up on the canopy. The scan now skips any mod's
leaves, logs, wood, saplings and carpets, those vanilla extras, and anything tagged leaves, logs, saplings, flowers
or replaceable-by-trees (water stays ground, so walls over ponds still stand on the surface). Leaves hanging over a
finished column are notched out. Walls already standing are checked once (`peacock_capital_wall_trees`): a column
whose stones rest on tree is taken down and rebuilt on the ground; every other column is left as it is.

## Leaves: Optimized Bushy Leaves replaces Better Leaves (2026-10-22)
Aaron: "Switch the leaf mod to Optimized Bushy Leaves, still leave leafs disabled for potato." Optimized Bushy Leaves
v1.3 (Jagutka, Modrinth `fancyfast-bushy-leaves`, client side) is built for mid- and low-end PCs. Low, medium, high and
ultra get it in Better Leaves' place; potato keeps none (bushy leaves need Fancy leaves: potato's Fast leaves draw their
see-through edges as white boxes, which Aaron saw on a potato install whose pack list was his own). The old list is
in `PREVIOUS_DEFAULTS`, so untouched installs switch on the next launch.
Trade-off: it covers vanilla leaves only (oak, birch, spruce, jungle, acacia, dark oak, cherry, azalea, mangrove and
roots); Better Leaves also covered Biomes O' Plenty and ~60 other mods, so BOP trees keep their plain leaves now.
Its pack format is a newer one, so the resource-pack screen may label it "made for a newer version"; it loads anyway.
Same hour, Aaron: "Stack both packs." Better Leaves is back, ranked just below Optimized Bushy Leaves: the light pack's
blockstates, models and textures win for every vanilla leaf, and Better Leaves still dresses Biomes O' Plenty and the
other modded trees (its modded models use their own mods' textures, so the light pack's opaque vanilla leaf textures do
not reach them). Potato drops both.

## Bounty fix: the cartographer's Field Manual reward (2026-10-22)
The server logged "Bountiful reward pool entry is not valid!: pk_field_manual" every board refresh: Geolosys' Field Manual
is not an item of its own but a Patchouli book (`patchouli:guide_book` with `{"patchouli:book":"geolosys:field_manual"}`,
which is what Geolosys' own recipe makes). The reward is now that. Also `/peacock wall trees` (op) runs the wall's tree
check by hand, and the check logs what it found (or that it found no capital) — on 2026-10-22 17:50 it left no line.

## Boss rebalance (2026-10-22)
Aaron, after the boss review: "Make the changes and push." Principle: a Blueprint's tier is how hard its boss is *and*
how hard it is to reach; Tier 1 is Overworld bosses you meet near home in iron; nothing is held by a boss that cannot
be found; hard bosses pay.
- **Brass** (Tier 1): Mutant Zombie **and Mutant Enderman** — the hinge of Create gets two wild holders.
- **Climate control**: Mutant Snow Golem → **Frostmaw**, Tier 1 → **2**. The golem never spawns wild (only a player's
  Chemical X pet), so the old route meant killing your own pet. Fires, furnaces, insulation and waterskins stay free.
- **Advanced cooking**: Torte unchanged, Tier 1 → **2** — the fight is easy, the Nether trip is the tier.
- **Trading Floor**: Invoker **plus the four Respillaged captains** (Spiritcaller, Magispeller, Freakager, Ragno).
- **Precision**: Leviathan and the Radiation Director as before, but the Director (Incendium's 20 HP wither skeleton)
  becomes 250 HP / armour 10 / knockback-immune the first time it is hit (`server_scripts/boss_tuning.js`, by
  `attribute` command since Incendium builds it from a vanilla mob).
- **Netherite**: Monstrosity **plus Ancient Remnant**. **Cannons**: Frostmaw → **Maledictus**. **Ender logistics**:
  Ender Guardian **plus Scylla** (a route for those who never reach the End).
- Unchanged: Recruiting, Blasting, Trains, Ships, Diesel, Diving, Arcane. Loot-only by choice: Hovering Inferno (its
  artifacts), Sculptor (its armour set), Wither, Warden, Dragon, and the Mutant Snow Golem.
- Charters follow the tiers (Climate and Cooking 2 → 4 emerald blocks); "Every Line of the Ledger" now counts the
  new holders; Almanac bestiary, tier pages, ledger and charter list rewritten.

## The capital economy: Works, services, the Steward, more trades (2026-10-22)
Aaron, after the economy discussion ("There's little to spend on…"): "Can you try and ship it all?" Emeralds had many
sources (bounties, trades, depots, pillager loot) and almost no sinks after charters; this adds sinks people want.
- **Villager trades** (`villager_trades.js`): every profession also sells modded goods (Farmer's Delight, Aquaculture,
  Cold Sweat, Create Deco, Macaw's, Ironworks bronze, Spartan alloys, rumour vouchers, Nature's Compass…), added on
  right-click like the metal trades. Never a Blueprint-locked item (checked at runtime); a missing item is skipped.
  Farmer's pies/meat +50% in winter. **Cure floor:** a player's major-positive gossip with a villager is capped at 5
  points on each right-click, so a cure takes a few emeralds off, not the whole price.
- **Service people** (`capital_npcs.js`): NoAI, invulnerable named villagers; right-click opens a chat menu with
  clickable `/peacock npc …` choices, valid only for the person you last talked to (2 min, 8 blocks). Traders (Physician,
  Exchange) open their trade screen on a plain click, the menu on sneak; their stock is reset each dawn.
- **Capital Works** (`capital_projects.js`): a Clerk by a lectern near spawn takes donations for seven projects in
  order — Forge (Smith), Scriptorium (Scribe), Market (Exchange + stalls), Infirmary (Physician, Undertaker, graveyard),
  Rail Station (Courier), Lighthouse (Keeper, beacon beam), Relight a Dead Town (nearest `#peacock:ruins_abandoned`:
  zombie villagers cured, zombies killed, bell, beds, bounty board, banner, six settlers). Buildings are built by
  command on open ground found just outside the capital's bounding box (+8, clear of the wall), force-loaded while
  building. Total ≈1,200 emeralds plus materials. `/peacock projects`, `/peacock projects finish` (op), `/peacock projects clerk` (op).
- **Services** (`capital_services.js`): Smith (repair by wear, ×2 netherite; clear anvil penalty 4; rename 1), Scribe
  (Blueprint copy = half charter in emerald blocks + paper; books/maps), Physician (trades; cure harmful effects 2, Bad
  Omen 6, zombie villager 8 — no curer discount), Undertaker (Corpse mod: last corpse to the graveyard, 8 + 1/250
  blocks, max 48, 32 from another dimension, refunded if none), Courier (held item to any player, 1 + 1/1000 blocks,
  arrives after 30 s + 1 s per 20 blocks, waits for offline players), Keeper (lodestone compass to the lamp, 4),
  Exchange (Geolosys clusters from other regions, BOP saplings, banner patterns, armour trims, name tags, saddles).
- **The Steward** (`steward.js`): a contract (16 emeralds, from the Clerk) spawns a mortal NoAI steward; while his
  employer is offline and his purse holds emeralds he force-loads the 3×3 chunks around him (vanilla `forceload`) at
  1 emerald per chunk per 6 h (one per 40 min); login report; dismiss refunds half; death ends it.
  **FTB Chunks `force_load_mode` is NEVER** from now on (defaultconfigs; existing worlds switched once by
  `peacock-start.sh`, `PEACOCK_FREE_FORCELOAD=1` skips it): claims force-load only while the team is online.
- Untested in play at the time of writing: the first server start places the Clerk; `/peacock projects finish` walks
  the buildings for a test. `#peacock:ruins_abandoned` lists the `ruin_a` structures of `peacock-ruins.zip`; regenerate
  it if `gen-ruins.py` changes the ruin set.
First server run (2026-10-22 20:02): the Clerk was placed (643,94,-5616), but steward.js failed on login and logout —
"Cannot find function getUUID in object ServerPlayer": KubeJS does not expose `getUUID()` by that name. Every new script
now uses the `uuid` property (as achievements.js and blueprints.js always did) and `player.selectedSlot`. The Village
Recruits manual also slipped through on that fresh world (the addon gives it later than 2 s after login), so
no_vr_manual.js now looks again at 10 s and 30 s.

## What Are They Up To removed (2026-10-22)
Aaron: "Remove the mod that sees into players inventories and when they open chests. It's extra." Watut (and its
library CoroUtil, which nothing else needs) showed other players' open menus — chests, inventories — and typing
bubbles in the world, plus the idle "Zz". Gone, with its server config; idle players are simply not marked now.

## Anthracite drops ordinary coal (2026-10-22)
Aaron: anthracite "has no real use … that would be fine if it could be used in 100% of the places coal could be used."
It was in `#minecraft:coals` (fuel, campfires) but the torch recipe and most Create/Ironworks recipes name
`minecraft:coal`. Its deposit (a layer at Y -64 to -52) is unchanged; its two ores and its sample now drop vanilla coal
(loot tables in the pack datapack, Silk Touch and Fortune as before), and anthracite already in inventories crafts into
coal one for one (`peacock:anthracite_to_coal`). Lignite and bituminous coal are untouched.


## event.cancel() last: service people answer, gate messages show (2026-10-23)
Aaron: "Right clicking on the NPCs also did nothing." In KubeJS 6, `event.cancel()` (and `success()`/`exit()`) throws
to end the handler on the spot (EventExit), so nothing written after it ever runs. `capital_npcs.js` cancelled the
right-click and then opened the menu: the vanilla trade screen was stopped and the menu never came, so the Clerk and
every service person looked dead (traders still opened their trade screen, which never reached our code). The same
order hid four messages: the Blueprint "Placing this" and "Hiring" denials (the block or hire was refused silently),
the trading depot's town requirement, and the full-town notice. All five now cancel last, and `tools/validate.py`
fails on any statement after an `event.cancel()` / `success()` / `exit()` in the same block.

## Almanac crafting pages name the staged recipes (2026-10-23)
A Mac client log showed seven Almanac crafting pages finding nothing ("Recipe … not found"): the training treat, ship
helm, floater and balloon, train station, handcar and cannon mount. A Blueprint-locked recipe is removed and re-added
wrapped by `blueprints.js`, so its original id no longer exists. The wrapped id was `peacock:staged/<rung>/<ns>/<path>`;
the rung is now left out (`peacock:staged/<ns>/<path>`; each recipe is wrapped once, so it stays unique), and
`gen-almanac.py`'s `staged()` names it, so a page does not depend on which rung caught the recipe. Patchouli finds
it because Recipe Stages' recipes are crafting recipes.

## Backpack: any common metal (2026-10-23)
Aaron: "update the backpack recipe to also accept metal ingots of a similar value, not just iron." Metal is regional,
so the two iron ingots in Backpacked's recipe locked out anyone far from iron. `server_scripts/backpack.js` replaces it
(`peacock:backpack`) with the same shape taking any of `#peacock:backpack_metals` in each metal slot: iron, copper,
tin, zinc, lead, nickel, aluminium. Gold, silver, platinum and the alloys are worth more and are left out.

## Blueprints: what a rung makes claims first (2026-10-23)
Aaron: "Make and push all updates." Each recipe is wrapped (Recipe Stages) once, by the first rung that claims it, and
each rung used to run its outputs, inputs and output mods in turn. Brass comes first and gates every recipe that uses
brass, so it claimed about 54 recipes that belong to later rungs before those were reached (checked against the mod
jars): the mechanical arm, rotation speed controller and sequenced gearshift (Precision), all five diesel machines
(Diesel), the content observer, stockpile switch and smart chute (Ender logistics), Steam 'n' Rails' brass parts
(Trains), Big Cannons' brass pieces (Cannons); Blasting likewise took Big Cannons' gunpowder recipes. Now every rung's
outputs and output mods claim first, and inputs only take what is left. The Doggy Talents training treat contains
gunpowder, so a dog needed Blasting; it is exempt (`FREE` in `blueprints.js`) and its Almanac page names its own recipe.

## Animals: Animania out (2026-10-23)
Aaron: Animania cost 22% of the server's entity time (spark), and its animals needed food, water, beds and good moods
("No mods that make animal keeping extra work?"). With our config it also replaced the vanilla animals at world
generation. Decided with Aaron: no herd is worth keeping, so no migration step ("You can delete them"); the peafowl go
too ("Pack does not need that bird specifically"); the feeding trough is in ("Include").
- **Out:** Animania Reborn, its five configs, the pack datapack's `animania` biome tags. Every Animania animal, block and
  item in the world disappears on the first start without it.
- **In:** vanilla farm animals again (Fresh Animations animates them, which it never could for Animania); **More Mob
  Variants** (breeds and coats for cows, pigs, sheep, chickens, cats, wolves, stored on the animal), with **More Mob
  Variants x Fresh Animations** 1.3.0-1.9 on top of Fresh Animations (not on potato, which has no Fresh Animations;
  the old pack lists are in `PREVIOUS_DEFAULTS`); **Critters and Companions** (small animals; its libraries were
  already in the pack); **Animal Feeding Trough** (animals eat and breed from it on their own). Naturalist stays the big
  wildlife; its dragonfly and snail are off (`config/naturalist.json`), since Critters and Companions has both and its
  dragonfly is tameable and drops the wings that tame the jumping spider.
- **Herd cap** (`herd_cap.js`): two animals cannot make a baby while 40 of their kind live within 32 blocks; nearby
  players are told, at most once a minute. The mechanical version of "don't build huge farms", needed now that troughs
  breed animals unattended. Villagers keep their own cap. `herdCap`/`herdCapCount` in `kubejs/config/peacock.json`.
- **Wildlife for old land** (`wildlife_reseed.js`): each overworld chunk generated before this change gets, once, the
  spawn pass Minecraft runs when it generates a chunk (`NaturalSpawner.spawnMobsForChunkGeneration`, the biome's own
  animals and density), when a player next loads it, two chunks per tick. New chunks are marked done as they are
  generated (`ChunkEvent.Load#isNewChunk`); claimed chunks and the capital are skipped. Done chunks: one bit each, per
  region, in server persistentData `peacock_reseed`. `wildlifeReseed` switch.
- Both scripts get their Forge events through `startup_scripts/forge_hooks.js`: KubeJS 6 binds `ForgeEvents` only for
  startup scripts, which do not reload, so the hook just calls a function the server script sets in `global`.
- The butcher's Animania salt lick and salt became a feeding trough and leads; the Almanac's animal pages are rewritten.

## Village Recruits' join report hidden (2026-10-23)
Every login printed about twelve "[VillageRecruits Addon] … NOT found / detected / Integrity check passed" lines to
every player. The addon has no setting for them, so `startup_scripts/quiet_join_chat.js` drops those system messages
on the client; lines reporting a real problem (WARNING, missing, could NOT) still show.

## Macs: no special case (2026-10-23)
Aaron: "Please don't do anything specific for the mac just leave things as is." A launcher change that defaulted
shaders off on macOS was made and reverted before it shipped; Macs get the same tiers as everyone.
