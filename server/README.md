# Peacock — dedicated server

Everything here is for the host. Players never see this folder.

## Pterodactyl (the intended host)

1. **Import the egg:** Admin → Nests → pick a nest → *Import Egg* →
   `server/pterodactyl/egg-peacock.json`.
2. **Create the server** from that egg. Allocation: one port (default 25565). Wings opens it
   for TCP **and** UDP, and Simple Voice Chat is configured to share the game port, so no
   second allocation is needed. Memory: 10–12 GB; the startup uses `MaxRAMPercentage=90`.
   Docker image: `ghcr.io/pterodactyl/yolks:java_17`.
3. **Install** runs automatically (Forge 1.20.1-47.4.16, `eula.txt`, the `server.properties`
   template, JVM args, packwiz bootstrap, first server-side sync). Watch the install log; it
   ends with `== done`.
4. Before the first start: Files → `server.properties` (seed, `max-players`), then start once
   and `whitelist add <name>` from the console.
5. Let Distant Horizons build LODs on its own — the server generates them (`FEATURES` mode)
   and rate-limits itself. (Chunky was removed: DH 3.3.3 crashes with it on servers.)

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
| `config/DistantHorizons.toml` | `chunkGeneratorMode = "FEATURES"` — the server generates LODs; 2 threads, request rate limits |
| `config/dynamicview.json` | Dynamic View: simulation 5–12 / view 8–10 around a 42 ms tick |

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
  `simulation-distance` (5–12) every 60 s around a 42 ms average tick (`pack/peacock-server/config/dynamicview.json`).
  `server.properties` only sets the starting values. It logs each change to the console; if it sits at the
  minimum with two players on, the server is out of headroom and the fix is below, not a bigger number.

Claims / anti-grief (FTB Chunks vs a lighter mod) is an open decision in `docs/PLAN.md`.

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
