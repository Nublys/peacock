# Peacock — dedicated server

Everything here is for the host. Players never see this folder.

## Pterodactyl (the intended host)

1. **Import the egg:** Admin → Nests → pick a nest → *Import Egg* →
   `server/pterodactyl/egg-peacock.json`.
2. **Create the server** from that egg. Allocation: one port (default 25565). Wings opens it
   for TCP **and** UDP, and Simple Voice Chat is configured to share the game port, so no
   second allocation is needed. Resources for 6–8 players: **8 vCores** (worldgen, DH, physics and GC run beside the
   one game thread) and **16 GB**, of which the startup gives Java 75% (`PEACOCK_HEAP_PERCENT` to change); a 24 GB
   container should pin the heap at 12 GB with `PEACOCK_HEAP_PERCENT=50` — a bigger heap only lengthens GC pauses.
   Docker image: `ghcr.io/pterodactyl/yolks:java_17`.
3. **Install** runs automatically (Forge 1.20.1-47.4.16, `eula.txt`, the `server.properties`
   template, JVM args, packwiz bootstrap, first server-side sync). Watch the install log; it
   ends with `== done`.
4. Before the first start: Files → `server.properties` (seed, `max-players`), then start once
   and `whitelist add <name>` from the console.
5. Pre-generate 2 km with Chunk Pregenerator (below); beyond that Distant Horizons has the server generate
   what the horizon needs (`INTERNAL_SERVER`). (Chunky was removed: DH 3.3.3 crashes with it on servers.)

**Every start** re-syncs the pack from `main` and reapplies `peacock-server/` — a merged PR
reaches the server on its next restart. The `Pack URL` variable pins a commit for rollback:
`https://raw.githubusercontent.com/Nublys/peacock/<sha>/pack/pack.toml`.
The startup command is `bash peacock-start.sh` (sync → overrides → `exec` Forge); it must stay a
single command because the Java image runs it with `exec env`, not a shell — a `&&` chain there
runs inside the image's `eval echo` expansion with its console captured. After a restart that
follows a push, read the first console lines: `[peacock] syncing pack`, packwiz-installer's list
of changed files, `[peacock] sync ok`. If it reports nothing changed
right after a push, raw.githubusercontent.com served a cached `pack.toml` — wait a few minutes
and restart again. (This output is console-only; it never appears in `logs/latest.log`.)
Mods removed from the index are deleted on the next sync; nothing needs cleaning by hand.

**Don't run `/locate`** (or anything that searches for structures) on this server: on Terralith terrain it
blocks the main thread for minutes and the watchdog treats it as a hang. `max-tick-time` is 90000 in
the template: long enough for the spawn-village search at world creation (~45 s), short enough that a
real hang is dumped and killed instead of sitting there.

**The 2026-10-17 hangs** were Village Recruits founding remote villages and reading terrain in ungenerated
chunks from the main thread; fixed in config (DECISIONS.md). If it happens again:

**When the server hangs** (players time out, console still scrolls but `/` commands do nothing): get a
thread dump *before* restarting. On the node, with the server's UUID as the container name:

    docker exec 59f52550-697a-48ee-8c94-83c2d0a54d7b kill -3 1

The JVM prints every thread's stack to the console; copy it. The watchdog does the same on its own
after `max-tick-time`, then stops the server. Either dump is what identifies the mod at fault.

**Backups & schedules:** use Pterodactyl's. Take a backup before any start that follows a
pack version bump; a schedule with a daily backup task is enough for a small server.

**Updating the egg itself** (startup command or install script changes): re-import the JSON
over the existing egg, then *Reinstall* the server only if the install script changed.

## Server-specific config: `pack/peacock-server/`

packwiz cannot flag plain config files by side, so the files that must differ on the server
live in the pack under `peacock-server/` (harmless on clients — nothing reads it there) and
the startup command copies them over the server root after each sync:

| file | why |
|---|---|
| `config/DistantHorizons.toml` | `chunkGeneratorMode = "INTERNAL_SERVER"` — the server's own worker pool generates what DH needs, 6 req/s per player (see the 2026-10-18 hang in DECISIONS) |
| `config/dynamicview.json` | Dynamic View: simulation 5–10 / view 8–10 around a 36 ms tick |

Voice chat is **not** overridden: edit `config/voicechat/voicechat-server.properties` on the server by
hand (`port=` your dedicated UDP allocation, or `-1` to share the game port) and it stays.

Add a file there when something must be server-only. Never hand-edit those paths in the
server's `config/` — the next sync replaces them.

## Server-only mods

Marked `side = "server"` in `pack/mods/`, so they install here and never on a client:

- **Spark** — `spark profiler --timeout 60` is the first thing to run when TPS drops; the 2026-10-17 profile
  (villager AI = 44%) is why Canary is in the pack; `simulation-distance` is 7 (5 felt too short in play —
  ticked chunks scale with the square of it, so watch TPS with two players and fall back to 6 if needed)
- **LuckPerms** — permissions; `lp user <name> permission set minecraft.command.* true` for staff
- **Dynamic View and Simulation Distances** (+ its library Cupboard) — rebalances `view-distance` (8–10) and
  `simulation-distance` (5–10) every 60 s around a 36 ms average tick (`pack/peacock-server/config/dynamicview.json`;
  42 ms / 12 chunks floated fine with two players, but at six to eight spread out that left 8 ms before TPS dropped).
  `server.properties` only sets the starting values. It logs each change to the console; if it sits at the
  minimum with two players on, the server is out of headroom and the fix is below, not a bigger number.

- **FTB Chunks + FTB Teams + FTB Library** (both sides) — claims and capped force-loading. Defaults ship in
  `defaultconfigs/ftbchunks/` and are copied into the world's `serverconfig/` on first start: 200 claimed
  chunks per team, **4 force-loaded** (ALWAYS mode: they keep running while the owner is offline), minimap
  forced off for every client, explosions and mob griefing off inside claims. Players claim with `J`.
- **FTB Essentials** (server) — `defaultconfigs/ftbessentials-server.snbt`: only `/spawn` (60 s cooldown,
  5 s warm-up) and `/back` after a death. Homes, warps, tpa, rtp and the virtual crafting/ender-chest
  commands are off: no fast travel is a design rule. Admin commands (`/tpl`, `/fly`, `/invsee`…) stay.
- **Chunk Pregenerator** (server) — real-chunk pre-generation. Chunky is out for good (DH 3.3.3 binds to Chunky's
  API and crashes); DH has no hook into this one. With nobody on, from the console:
  ```
  pregen start gen radius peacock SQUARE 0 0 128 minecraft:overworld
  ```
  (radius in **chunks**: 128 = 2 km each way, ~65k chunks, a few hours on 8 cores; `pregen taskList` to watch,
  `pregen stop peacock` to stop, `pregen help` for the exact syntax of the installed version). The mod idles
  when no task runs.
- **Distant Horizons generation mode** is `INTERNAL_SERVER` (since 2026-10-18): DH asks the *server* to generate
  the chunks it needs for the far horizon, through the normal worker pool, at `generationRequestRateLimit` = 6
  chunks/s per player and backing off when TPS drops. Structures and villages appear on the horizon correctly,
  and nothing generates terrain on DH's own threads any more — the `FEATURES` mode did, and raced the vanilla
  generator into the 16:58 deadlock. The cost: those chunks are real and saved (≈1–2 GB per 2 km radius of
  horizon), and exploring generates terrain for the whole DH radius over time, not just the render distance.
  Pregen first so the area around spawn is already done.
- **Clumps** (both sides) — merges XP orbs. **Let Me Despawn** (+ its library Almanac) — despawns mobs sooner once
  they are far from every player and were never fought or named; the entity count is what eight players'
  loaded areas accumulate.
- **Villager cap** — `kubejs/server_scripts/villager_cap.js`: a town stops breeding at 24 villagers within
  48 blocks (`villagerCapCount` in `kubejs/config/peacock.json`). Existing villagers are never removed.

To change a shipped default after the world exists, edit the file under the world's `serverconfig/`;
`defaultconfigs/` is only read when that file is missing.

**Heap.** `peacock-start.sh` gives Java 75% of the container (`PEACOCK_HEAP_PERCENT` to change). It was 90%:
Netty buffers, Valkyrien Skies' physics, metaspace and the JVM itself live outside the heap, and at 90% a
busy evening gets the container OOM-killed instead of a GC pause. 8 GB container → ~6 GB heap, which is right
for this mod count; below 8 GB, lower the container's player expectations rather than the percentage.

**Tick budget.** The game thread is one core of a 2013 Xeon (E5-2690 v2, 3.0 GHz): roughly half of a
modern desktop core. Everything in a ticked chunk — entities, Create block entities, random ticks —
competes for its 50 ms. Levers, in order of return: fewer entities (mob caps / Let Me Despawn, villager
density per town), Canary's optimizations (already on), Aikar GC flags (in `peacock-start.sh`), and
finally faster single-thread hardware, which is the only thing that moves the ceiling itself.

## Distant Horizons on the server

The server builds LODs for every chunk it loads and, on request from a client, generates terrain
beyond that (`chunkGeneratorMode = "FEATURES"`, 2 threads, `pack/peacock-server/config/DistantHorizons.toml`).
Clients request generation only while DH is rendering on their side and the session's generator plan
is enabled; a new world therefore has **no** far LODs until either players have requested them or you
pre-generate. Commands (console, or an op in game; the console needs absolute coordinates):

    dh debug                                      # state of the DH server: levels, players, queues
    dh pregen start minecraft:overworld <x> <z> 32   # LODs for a 65x65-chunk square around x,z (block coords)
    dh pregen status
    dh pregen stop
    dh config <key> [value]                       # read or change a DH config value live

Pregen runs on DH's own threads and is throttled by `limitIfServerUnhealthy`; progress prints in the
console. Clients receive what exists when they join (`synchronizeOnLoad`), so pregen is the quickest
way to prove the pipeline. The LOD database lives in `world/data/` and dies with the world.

## Bare-metal alternative

Not on Pterodactyl? `./server/start.sh --install` once, then `./server/start.sh` to sync and
launch (`PEACOCK_MEM=10G`, `PEACOCK_SNAPSHOT=1`, `PEACOCK_PACK_URL=…` as documented in the
script).
