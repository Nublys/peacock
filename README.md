# Peacock

A two-player Forge 1.20.1 pack: frontier logistics on Tectonic terrain. Create and
Steam 'n' Rails over Geolosys ore that is never where you live, Serene Seasons and
Tough As Nails setting the calendar, villages worth defending, and a boss ladder that
hands back the technology a dark age took away.

The pack is managed with [packwiz](https://packwiz.infra.link). Mods are never
committed — `pack/mods/*.pw.toml` pins each one to an exact version and hash, and the
installer fetches them. Everything you can edit lives in `pack/`.

## Layout

```
pack/                 the packwiz pack — this is what gets installed
  pack.toml           name, versions, index hash
  index.toml          every file below, hashed (regenerate with `packwiz refresh`)
  mods/*.pw.toml      one file per mod (145; 3 server-only)
  resourcepacks/      Fresh Animations (Modrinth-managed)
  shaderpacks/        Complementary Reimagined + Unbound (Modrinth-managed)
  config/             shipped configs; `preserve = true` files are not overwritten on update
  config/defaultoptions/   first-launch options.txt + keybindings.txt (Default Options)
profiles/             hardware profiles copied over pack defaults (mac is the pack default)
instance/             Prism instance.cfg / mmc-pack.json for reference (Forge 47.4.16)
tools/                validate.py (CI), apply-profile.sh
server/               pterodactyl/ (egg + install script), start.sh (bare metal), server.properties, JVM args
pack/peacock-server/  server-only config overrides, shipped by the pack, copied over the server root on start
docs/                 PLAN.md (phases), DECISIONS.md (why things are the way they are)
```

## Install (Prism Launcher)

1. Create an instance: **Minecraft 1.20.1**, **Forge 47.4.16**, Java 17.
   - Memory: 6 GB on the 16 GB MacBook Air (`-Xmx6G`), 8 GB on the Linux laptop.
   - JVM args: `-XX:+UseG1GC -XX:MaxGCPauseMillis=50`
   - On the Mac, confirm `java -version` reports `aarch64` — Rosetta Java halves performance.
2. Put `packwiz-installer-bootstrap.jar` in the instance's **Minecraft Folder** (Prism:
   right-click instance → Minecraft Folder; not the instance folder one level up):

   ```
   curl -L -o "<minecraft folder>/packwiz-installer-bootstrap.jar" \
     https://github.com/packwiz/packwiz-installer-bootstrap/releases/latest/download/packwiz-installer-bootstrap.jar
   ```
3. Instance → Edit → Settings → **Custom commands** → Pre-launch command:

   ```
   "$INST_JAVA" -jar "$INST_MC_DIR/packwiz-installer-bootstrap.jar" https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml
   ```

   Every launch now syncs mods and configs to the current `main`.
4. Launch once. Default Options writes `options.txt`/keybinds on first run only — after
   that, in-game settings changes stick.
5. Mac only: `tools/apply-profile.sh mac <instance>/minecraft` — this is already the
   pack default, so this step is only needed if the Linux profile was applied first.
   Linux: `tools/apply-profile.sh linux <instance>/minecraft` for 256-chunk LODs.
6. Shaders: Oculus is pre-set to plain Complementary Reimagined r5.9.3. Euphoria Patcher
   generates the "+ EuphoriaPatches" variant beside it; pick that in the Oculus menu (`O`)
   only on a machine with a real GPU — on macOS it exceeds the 16-texture-unit limit and
   Oculus disables shaders. On an iGPU (Vega 8, Iris Xe) set the CR profile to Potato/Low.

> The repo is public so the raw.githubusercontent.com URL works without a token.
>
> Converting an existing instance: packwiz-installer only removes files *it* installed, so delete
> any old jars it doesn't manage by hand (`ImmediatelyFast-*`, `addonslib-*`, `Villager Comfort-1.1.1.jar`).

## Server

Pterodactyl: import `server/pterodactyl/egg-peacock.json`, create a server from it, one
allocation (voice chat shares the game port). Every start syncs the pack from `main`.
Full runbook in [`server/README.md`](server/README.md) — install, pregen, overrides, rollback;
bare-metal `server/start.sh` as the alternative. Server-only mods (Spark, LuckPerms) carry
`side = "server"` and never reach clients.

## Updating the pack

```
cd pack
packwiz modrinth update <slug>        # or: packwiz update --all
packwiz refresh                        # rewrites index.toml + pack.toml hash
cd .. && python3 tools/validate.py     # must pass
```

Commit `pack/`, open a PR. CI re-runs `packwiz refresh` and fails if the index is stale.

Adding a mod: `packwiz modrinth add <slug>` (or `packwiz curseforge add <slug>`), then set
`side = "client"` in its `.pw.toml` if it is client-only.

## Keybinds (shipped defaults)

| Key | Action |
|---|---|
| `B` | Backpack |
| `K` / `O` | Toggle shaders / shader menu |
| `M` | Atlas · `P` place atlas pin |
| `R` / `U` / `N` | Recruits: command / team / map |
| `I` | Village Expansion wiki |
| `V` | Quiver (Supplementaries) |
| `Shift+1–4` | Doggy Talents whistles |
| `,` / `.` | Voice chat menu / mute mic (voice activation by default; `Right Alt` push-to-talk) |
| `Alt` | Create tool menu / toolbelt, Railways bogey menu (context) |

Controlling is installed — search any bind by name in Options → Controls.

## Status

See `docs/PLAN.md`. Phase 0–1 (reproducible repo, boot-clean baseline) is this branch.
