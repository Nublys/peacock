# Peacock — dedicated server

Everything here is for the host. Players never see this folder.

## First install

```
git clone https://github.com/Nublys/peacock.git && cd peacock
./server/start.sh --install
```

That installs Forge 1.20.1-47.4.16 into `server/run/`, writes `eula.txt`, copies the
`server.properties` template and JVM args, downloads the packwiz bootstrap and performs the
first server-side sync (mods marked `both` or `server`; the 26 client-only mods are skipped).

Then, before the first real start:

1. `server/run/server.properties` — set the seed if you want one, check `max-players`.
2. `server/run/whitelist.json` — or start once and `/whitelist add <name>` from console.
3. Ports: **TCP 25565** (game) and **UDP 24454** (Simple Voice Chat).
4. Pregenerate before players arrive (Distant Horizons LODs come from real chunks):
   ```
   /chunky radius 3000
   /chunky start
   ```
   then let DH build LODs — watch `/dh` status; it rate-limits itself.

## Every start

```
./server/start.sh
```

Syncs the pack from `main` (so a merged PR reaches the server on its next restart), applies
`server/overrides/`, and `exec`s Forge's `run.sh nogui`. Use it as the `ExecStart` of a
systemd unit, or under tmux/screen.

`PEACOCK_SNAPSHOT=1 ./server/start.sh` tars the world to `server/run/snapshots/` before
syncing — do this on any start that follows a pack version bump.

## Server overrides

`server/overrides/` is copied over the run dir after every sync. It holds the files that
must differ from the client pack and that packwiz cannot flag per side:

| file | why |
|---|---|
| `config/DistantHorizons.toml` | `chunkGeneratorMode = "FEATURES"` (the server generates LODs; clients have it DISABLED), 4 worker threads |

Add a file here when a config must be server-specific; never edit `server/run/config/` by
hand for those — the next sync will replace them.

## Server-only mods

Marked `side = "server"` in `pack/mods/`, so they install here and never on a client:
Chunky (pregen), Spark (`/spark profiler` — first thing to run when TPS drops), LuckPerms
(permissions; `/lp user <name> permission set minecraft.command.* true` for staff).

Claims / anti-grief (FTB Chunks vs a lighter mod) is an open decision in `docs/PLAN.md`.

## Rollback

```
git log --oneline pack/           # find the last good commit
PEACOCK_PACK_URL=https://raw.githubusercontent.com/Nublys/peacock/<sha>/pack/pack.toml ./server/start.sh
```

Pins the server to that commit's pack until you start it without the variable again.
