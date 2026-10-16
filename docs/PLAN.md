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
- Oculus: switch `shaderPack=` to the Euphoria-patched folder name once Euphoria has run
- Confirm Fresh Animations' `pack.mcmeta` loads (log previously said "Missing metadata")

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
