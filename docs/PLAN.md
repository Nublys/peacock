# Plan

Six phases, each a small PR that is booted and tested before the next. The loop
throughout: launch → paste the log → the log becomes the next commit.

## Phase 0 — Reproducible repo  ✅ (this PR)
- packwiz index generated from the Prism instance export (141 mods, pinned by hash)
- `README` install flow (Prism, Mac + Linux), `tools/validate.py`, CI
- Mod set unchanged except the two Phase 1 removals below

## Phase 1 — Boot-clean baseline  ✅ (this PR)
- Removed `ImmediatelyFast` (only a +1.20.4 build was present) and orphaned `AddonsLib`
- `Villager Comfort-1.1.1.jar` → `villager-comfort-1.1.1.jar`
- Default Options: `options.txt` graphics defaults, de-conflicted keybinds
- Distant Horizons: client generation off (server generates), Mac default profile (192
  chunks, FAKE transparency, 2 threads); Linux profile in `profiles/linux`
- Oculus pre-set to Complementary Reimagined r5.9.3; FML early window off (macOS)
- Dogs: Animania dog spawns off (cats kept), vanilla wolves no longer replaced
- **Test:** both machines boot to title; shaders on; log shows Colorwheel on its own
  backend and Fresh Animations loaded; no `+1.20.4` anywhere

### Phase 1 follow-ups (need a first launch to generate the config file)
- Doggy Talents: enable tame-wolf → dog conversion (server config, generated in
  `defaultconfigs/` / world `serverconfig/`)
- ~~Oculus → Euphoria folder~~ done: `ComplementaryReimagined_r5.9.3 + EuphoriaPatches_1.10.5`
- ~~Fresh Animations metadata~~ done: 1.10.5 lacks `pack_format`; pinned 1.10.4

### Phase 1b — Hardware profiles + cross-platform launcher
- Profiles named by hardware tier, not OS: `low`, `balanced` (pack default), `performance`,
  `ultra`. Each is a folder of only the files that differ: `DistantHorizons.toml`,
  `embeddium-options.json`, `oculus.properties`, the shader settings `.txt`, and an
  `options.txt` fragment (render distance, GUI scale, fullscreen).
  | profile | meant for | DH | shader preset |
  |---|---|---|---|
  | `low` | iGPU / thermally limited / <16 GB | 128, FAKE, 1 thread, SSAO off | Potato, shaders off by default |
  | `balanced` | fanless thin-and-light, 16 GB | 192, FAKE, 2 threads | Medium, render scale 0.75 |
  | `performance` | laptop with a decent GPU and cooling | 256, COMPLETE, 4 threads | High, scale 1.0 |
  | `ultra` | desktop with a dedicated GPU | 384, 6 threads | Ultra |
- Profiles ship inside the pack (`pack/peacock/profiles/`) so packwiz keeps them updated;
  rename existing `profiles/mac` → `balanced`, `profiles/linux` → `performance`.
- Selection via a per-instance environment variable in Prism: `PEACOCK_PROFILE=balanced`.
- Launcher is a single `Launch.java` run with `$INST_JAVA` (Java 17 runs source files
  directly): it runs the packwiz bootstrap, then copies the selected profile. Same command on
  macOS, Linux and Windows — Prism runs pre-launch commands without a shell, so no `sh`/`.bat`.
  ```
  "$INST_JAVA" "$INST_MC_DIR/peacock/Launch.java" https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml
  ```
- Profile files are copied only when the target is absent or still matches a previous
  profile's hash — once a player edits a file in-game it is theirs (a profile is a starting
  point, not a lock). Retires `tools/apply-profile.sh`.
- **Test:** set `PEACOCK_PROFILE` on each machine, launch, confirm the DH radius and shader
  preset match the table; change the variable, relaunch, confirm the switch.

## Phase 2 — World and balance config
- Serene Seasons: season length (default 16 days/sub-season), fertility datapack for
  Farmer's Delight + Aquaculture
- Geolosys: zinc pluton + surface samples; Create zinc worldgen off; pluton density for 2 players
- Spawn weights: Animania / Naturalist / Mowzie's / Cataclysm across BOP + Terralith
- Structure spacing: Structory, Cataclysm (CTOV untouched)
- TAN soft-start, Illager Invasion raid caps, Big Cannons block damage off near villages
- Villager Comfort / Restock Balance tuning; Every Compat trims; Village Spawn Point confirmed
- **Test:** fresh world — spawn in a CTOV village, server DH LODs visible, zinc or iron
  findable within a session

## Phase 3 — Glue (KubeJS)
- Cross-mod recipes: wagons, canteens, guard/recruit gear, troughs, oil from FD crops,
  rail iron, cannon parts via press
- Bountiful pools, Caravans & Convoys trades, villager trades, loot tables (Create ruins,
  fortresses, Stoneholm, villages) on one emerald/Create economy
- EMI tab grouping, tooltips on gated items
- **Test:** EMI shows every recipe; CI catches references to missing items

## Phase 4 — The boss ladder
- Blueprint item; boss death → server-wide stage, persisted
- Tier 1 gates (Mutant Zombie → brass, Mutant Skeleton → recruiting, Mutant Creeper →
  gunpowder tech, Torte → advanced cooking) + fallback "charter" recipe
- Patchouli *Settler's Almanac*: locked chapters per tier
- Villager trade additions per stage; then Tiers 2–4
- **Test:** `/kill` a Mutant Zombie in a test world → brass recipe works, chapter opens

## Phase 5 — Server
- Server-side packwiz, `server.properties`, DH server LOD generation, Chunky pregen,
  same datapacks/KubeJS; runbook

## Phase 6 — Polish
- Pack name / FancyMenu title, Almanac prose, Cataclysm gear gated and out of early loot,
  Tier 3–4 tuning after the mid game has been played

## Decisions still open
1. Season length (default 16 days per sub-season)
2. Gated recipes visible-but-locked (recommended) or hidden
3. Animania cats: keep, or vanilla cats under Pet Home
4. Server-wide unlocks — assumed yes
