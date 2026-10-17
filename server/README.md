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
| `config/DistantHorizons.toml` | `chunkGeneratorMode = "FEATURES"` — the server generates LODs (clients: DISABLED); 4 threads |
| `config/voicechat/voicechat-server.properties` | `port=-1` → voice chat on the game port; 48-block range; groups on |

Add a file there when something must be server-only. Never hand-edit those paths in the
server's `config/` — the next sync replaces them.

## Server-only mods

Marked `side = "server"` in `pack/mods/`, so they install here and never on a client:

- **Spark** — `spark profiler --timeout 60` is the first thing to run when TPS drops; the 2026-10-17 profile
  (villager AI = 44%) is why Canary is in the pack and `simulation-distance` is 5
- **LuckPerms** — permissions; `lp user <name> permission set minecraft.command.* true` for staff

Claims / anti-grief (FTB Chunks vs a lighter mod) is an open decision in `docs/PLAN.md`.

## Bare-metal alternative

Not on Pterodactyl? `./server/start.sh --install` once, then `./server/start.sh` to sync and
launch (`PEACOCK_MEM=10G`, `PEACOCK_SNAPSHOT=1`, `PEACOCK_PACK_URL=…` as documented in the
script).
