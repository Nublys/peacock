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
| `deck` | Steam Deck: graphics and controls (see [Steam Deck](#steam-deck) below) |

If you do nothing you are on `low`. Anything you change afterwards in the video or shader menus is yours;
the profile stops touching it. `/peacock profile <tier> reset` puts the profile back over your edits.
Macs stay on `low` or `medium`: the Euphoria shader variant needs more than macOS OpenGL offers.

## 5. Join

Multiplayer → Add Server → the address from the group chat. Voice chat is built in: the first time you press `,`
it walks you through your microphone and push-to-talk or voice activation, and a Mac asks for microphone
permission for Prism the first time.
You are handed **The Settler's Almanac** on first join; read *What Happened* and *Where You Woke Up*.

## Steam Deck

Prism runs on the Deck as it does on any Linux machine; the `deck` profile does the rest.

1. **Desktop Mode** (Steam button → Power → Switch to Desktop). Install **Prism Launcher** from Discover, then
   follow steps 1–3 above: Java 17 from Prism's own Download Java, import the zip, leave memory at 6144 MiB
   (the Deck's 16 GB is shared with its graphics).
2. **First launch, still in Desktop Mode.** It downloads the pack. If Controlify shows a Steam Deck notice,
   choose to continue. Join the server, open chat (D-pad up, or the keyboard) and type `/peacock profile deck`,
   then quit Minecraft.
3. **Add it to Steam.** Still in Desktop Mode, open Steam → Games → Add a Non-Steam Game → tick
   **Prism Launcher**. Back in Game Mode it is in your library; open it, tap the instance, Launch.
4. **Controller layout** (once, in Game Mode): the Prism Launcher entry → controller icon → Controller
   Settings → choose the template **Gamepad with Mouse Trackpad**. Then Edit Layout → Back Grip Buttons:
   - **L4 → Right Alt**: hold to talk (voice chat is set up on push-to-talk by the profile)
   - **R4 → `,`**: the voice chat menu (groups, mute)
   - **L5 → Tab**: the player list

   The sticks, triggers, face buttons and D-pad are Controlify's (see *Playing with a Controller* in the
   Almanac). Text boxes bring up Controlify's keyboard; Steam + X is Steam's.
5. **40 FPS.** The profile caps Minecraft at 40. In the Quick Access menu (`…`) → Performance, set the refresh
   rate to 40 Hz and the framerate limit to 40 so frames arrive evenly.

What the profile sets: Complementary's lightest preset, far terrain at 96, render distance 6, no Fresh
Animations (it is CPU work and the CPU is the Deck's limit), GUI scale 2, full screen, the 40 FPS cap, and
Controlify's enhanced Steam Deck driver off (it needs the Decky plugin, and SteamOS updates have broken it; off,
the Deck is a normal Steam gamepad). For more battery, `/peacock profile potato` turns shaders off. Sleeping the
Deck drops you from the server; reconnect after it wakes.

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
