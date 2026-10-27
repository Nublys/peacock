# Installing Peacock with Prism Launcher

Prism is the recommended way in. The instance updates itself from GitHub every time you launch, and you
pick your graphics tier in-game. Ten minutes the first time, nothing after that.

## 1. Prism and Java

- Install [Prism Launcher](https://prismlauncher.org/download/) and sign in with your Microsoft account.
- Java: Prism → Settings → Java → **Download Java** → pick **17**, the newest build offered. (Prism's bundled 17
  crashes on new macOS; the downloaded one does not.) On a Mac the download must be the *Apple Silicon*
  (`aarch64`) build — the Intel one runs through Rosetta at half speed.

## 2. Import the instance

Add Instance → **Import** → paste this URL (or download the file and browse to it):

```
https://raw.githubusercontent.com/Nublys/peacock/main/dist/Peacock-Prism.zip
```

That gives you an instance (Prism names it after the zip, `Peacock-Prism`; rename it if you like) with
Minecraft 1.20.1, Forge 47.4.16, 6 GB of memory, the right Java flags, and the pre-launch step that keeps the
pack current. It contains no mods yet.

If you have **32 GB** of RAM, right-click the instance → Edit → Settings → Memory → maximum **8192** MiB.
Leave 6144 on a 16 GB machine; more is not faster.

## 3. First launch

Launch. A console window shows `[peacock] syncing pack` and then packwiz-installer downloading about 180
mods, the shaders and the resource packs — a few minutes on a normal connection. Then Minecraft starts.
Every later launch does the same check in a few seconds and only downloads what changed.

If the sync fails (GitHub or Modrinth unreachable), launch again later; or, to play with what you already
have, add the environment variable `PEACOCK_OFFLINE=1` in Edit → Settings → Environment variables for
that one launch.

## 4. Pick your graphics tier

Join the server and type in chat:

```
/peacock profile low
```

then relaunch. Tiers, by what the machine is:

| tier | for |
|---|---|
| `potato` | integrated graphics, old or hot laptop, under 16 GB — shaders off |
| `low` *(default)* | integrated graphics with headroom; a fanless MacBook Air (40–50 FPS) |
| `medium` | thin laptop with a fan, 16 GB |
| `high` | laptop with a real GPU |
| `ultra` | desktop with a dedicated GPU |

If you do nothing you are on `low`. Anything you change afterwards in the video or shader menus is yours;
the profile stops touching it. `/peacock profile <tier> reset` puts the profile back over your edits.
Macs stay on `low` or `medium`: the Euphoria shader variant needs more than macOS OpenGL offers.

## 5. Join

Multiplayer → Add Server → the address from the group chat. Voice chat is built in: `,` opens its menu,
it is voice-activated by default, and a Mac asks for microphone permission for Prism the first time.
You are handed **The Settler's Almanac** on first join; read *What Happened* and *Where You Woke Up*.

## Doing it by hand instead

If you would rather not import a zip:

1. Add Instance → Minecraft **1.20.1** → Forge **47.4.16**. Settings: memory 6144 MiB; JVM arguments
   `-XX:+UseG1GC -XX:MaxGCPauseMillis=50`.
2. Right-click the instance → **Minecraft Folder** (not the instance folder). Create a `peacock` folder there and
   download [`launch.jar`](https://raw.githubusercontent.com/Nublys/peacock/main/pack/peacock/launch.jar) into it.
3. Edit → Settings → **Custom commands** → Pre-launch command:
   ```
   "$INST_JAVA" -jar "$INST_MC_DIR/peacock/launch.jar" https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml
   ```
4. Launch, then steps 4 and 5 above.

## Modrinth App

Has its own guide: **[INSTALL-MODRINTH.md](INSTALL-MODRINTH.md)** (download
[`Peacock.mrpack`](https://github.com/Nublys/peacock/releases/download/rolling/Peacock.mrpack), import it from
file, and optionally add the one-line launch hook that keeps it current).

## Something is wrong

- **"unknown profile"** in the console: the tier name is misspelled in `kubejs/config/peacock-profile.json`; fix or delete it.
- **Shaders look wrong or FPS is poor**: `K` toggles shaders; `O` opens the shader menu — the preset named after
  your tier is the intended one. Drop Distant Horizons' radius before anything else.
- **Mods missing / can't connect**: launch again (the sync runs each launch). If the console ends with
  `packwiz-installer exited with`, the error above it says which download failed.
- **Mac: crashes on launch** — the bundled Java 17. Download Java 17 in Prism's settings and select it.
