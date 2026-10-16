# Plan

Six phases, each a small PR that is booted and tested before the next. The loop
throughout: launch → paste the log → the log becomes the next commit.

**Peacock is a server pack.** Design for a whole server from day one, not two players:
technology unlocks are **per player**, the economy and the world are shared, and the first
two players are simply the first two players. Anything that would only work for a couple
(house rules, "we'll just agree not to") is replaced by a mechanic.

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
- Geolosys: zinc pluton + surface samples; Create zinc worldgen off; pluton density and size
  for a server (many players share deposits — deposits are large, but spacing decides how far
  the third and fourth settlements have to go)
- Spawn weights: Animania / Naturalist / Mowzie's / Cataclysm across BOP + Terralith
- Structure spacing: Structory, Cataclysm (CTOV untouched)
- TAN soft-start, Illager Invasion raid caps, Big Cannons block damage off near villages
- Villager Comfort / Restock Balance tuning; Every Compat trims
- Village Spawn Point: everyone spawns at the same CTOV village — it becomes the server's
  capital/hub. Confirm it has a bell and room to grow (Village Expansion).
- Server-scale balance: Illager Invasion raid size scales with players present; Mowzie's and
  Cataclysm bosses are one-per-structure, so structure spacing also sets how many bosses a
  server has — keep boss structures findable (cartographer maps / structure compass)
- Create and Valkyrien Skies tick budget: per-player caps on VS ships and contraption size
  (VS config), chunk-loading limits (Phase 5)
- **Test:** fresh world on the server — all players spawn in the same CTOV village, server DH
  LODs visible, zinc or iron findable within a session, raid with 3+ players present stays
  under the tick budget

## Phase 3 — Glue (KubeJS)
- Cross-mod recipes: wagons, canteens, guard/recruit gear, troughs, oil from FD crops,
  rail iron, cannon parts via press
- Bountiful pools, Caravans & Convoys trades, villager trades, loot tables (Create ruins,
  fortresses, Stoneholm, villages) on one emerald/Create economy
- EMI tab grouping, tooltips on gated items
- Multiplayer economy: Trading Floor depots are **stage-gated and town-bound** (recipe needs a
  Blueprint; placement checked for a bell + beds within range via KubeJS), so the
  "no trading hall" rule is enforced, not agreed. Bountiful boards per village; Caravans &
  Convoys docks per settlement.
- **Test:** EMI shows every recipe; CI catches references to missing items

## Phase 4 — The boss ladder (per-player unlocks)
Unlocks are **per player**, tracked with Game Stages (already in the pack). Nothing is
server-wide: a player who has not recovered a technology cannot craft it, even on a server
where others have.

- **Blueprint item** (one item, NBT per technology). A boss drops **one Blueprint per
  participant** — every player who damaged it and is within range when it dies — plus one.
  Using a Blueprint grants that player the stage and consumes it. Blueprints are ordinary,
  tradeable items: knowledge spreads through the server's economy (sell it, gift it, loot it
  from a corpse). This is the story — civilization recovers by sharing what it recovers.
- **Enforcement:** Recipe Stages (per-player recipe locks on 1.20.1 Forge, EMI/JEI hides
  locked recipes) if its 1.20.1 build proves solid; otherwise KubeJS cancels crafting/
  assembly for players without the stage and shows a "requires" tooltip. Either way the
  gated *blocks* also check stage on place/use, so a crafted item handed to an unstaged player
  is not a bypass.
- **Item Stages** (optional) to hide locked items in EMI until the stage is earned — decide
  after seeing how discoverable the ladder feels without it.
- **Tier 1 first** (Mutant Zombie → brass, Mutant Skeleton → recruiting, Mutant Creeper →
  gunpowder tech, Torte → advanced cooking) + the fallback "charter" recipe (expensive,
  emerald-priced, so a stalled boss never blocks a player).
- **Boss availability at server scale:** structure-bound bosses (Mowzie's, Cataclysm,
  Illager fortresses) are one per structure, so spacing (Phase 2) decides supply; late
  tiers use summonable bosses (Respillaged totems, Incendium's Hovering Inferno) so a full
  server is never waiting on worldgen.
- **Patchouli *Settler's Almanac*** per player: locked chapters open with the player's stage.
- **Villager reactions** per town (stage-gated trades appear once *any* resident player has
  the stage — towns remember who taught them).
- **FTB Teams (optional, later):** if players want shared progression inside a group,
  Blueprint use can grant the stage to the whole team. Default is per player.
- Then Tiers 2–4.
- **Test:** two accounts on the server — player A kills a Mutant Zombie; A can craft brass,
  B cannot; A hands B the second Blueprint; B uses it and can; B's Almanac chapter opens;
  the charter recipe works for a third player who has neither.

## Phase 5 — Server (a real multiplayer server)
- Server-side packwiz (`-s server`), same datapacks/KubeJS; Forge 47.4.16, Java 17
- `server.properties`: view-distance 8, simulation-distance 6, whitelist on, max-tick-time
  tuned, spawn-protection 0 (the capital is protected by claims instead)
- **Server-only mods** (`side = "server"` in the pack so clients never see them):
  - Chunky — pregen (≈3000-block radius) before DH's LOD pass
  - Spark — profiling, the first thing to open when TPS drops
  - LuckPerms — permissions for staff; **FTB Essentials** only for `/spawn`, `/back` and
    AFK — no `/home`, `/tpa` or warps (no fast travel is a design rule)
  - **FTB Chunks** — claims (anti-grief) and *capped* force-loading (1 chunk/player unless
    a stage raises it); its map/minimap turned **off** so Map Atlases stays the only map
  - Simple Voice Chat: UDP 24454 open; proximity distance ~48 blocks, groups on
  - Discord bridge (DiscordIntegration or similar) for chat/join/death relay
  - Backups: rolling world snapshots on the host (Aaron's infra) + a pre-update snapshot
    hook before any pack version bump
- Distant Horizons server config: LOD generation on the server, distribution to clients,
  rate limits for many clients
- Valkyrien Skies: per-player ship caps; Create: contraption size limits; Illager Invasion:
  raid cap scaling; Mutant Monsters: spawn rate per loaded chunk (more players = more chunks)
- Runbook: start/stop, pack update procedure (bump → snapshot → restart), rollback, how to
  read a Spark report

## Phase 6 — Polish
- Pack name / FancyMenu title, Almanac prose, Cataclysm gear gated and out of early loot,
  Tier 3–4 tuning after the mid game has been played

## Decisions still open
1. Season length (default 16 days per sub-season)
2. Gated recipes visible-but-locked (recommended) or hidden (Item Stages)
3. Animania cats: keep, or vanilla (Pet Home is gone, so this is now cosmetic)
4. ~~Server-wide unlocks~~ → **per player**, Blueprints tradeable (decided 2026-10-16)
5. Player grouping: per-player only (default) or FTB Teams for shared progression
6. Claims: FTB Chunks, or a lighter claim mod (Flan / Open Parties and Claims)
