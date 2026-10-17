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
