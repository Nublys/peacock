# Installing Peacock with the Modrinth App

The Modrinth App imports Peacock as a single file. Ten minutes the first time.

**Download:** [**Peacock.mrpack**](https://github.com/Nublys/peacock/releases/download/rolling/Peacock.mrpack)
(always the newest build of the pack; rebuilt automatically every time the pack changes).

## 1. Import

1. Install the [Modrinth App](https://modrinth.com/app) and sign in with your Microsoft account.
2. Click **+** (Create instance) in the left sidebar → **From file** (or "Import") → choose the
   `Peacock.mrpack` you downloaded → **Create**.
3. Wait while it installs Minecraft 1.20.1, Forge 47.4.16 and about 180 mods. A few minutes on a normal
   connection. The Modrinth App picks the right Java by itself.

## 2. Memory

Open the instance → **⋯** / gear → **Settings** → **Java and memory**:

- Turn on custom memory and set **6144 MB** (6 GB). With 32 GB of RAM, **8192 MB**. More is not faster.

## 3. Play

Launch, then **Multiplayer → Add Server** → the address from the group chat.

- You are handed **The Settler's Almanac** on first join. It is the manual: read *What Happened* and
  *Where You Woke Up* first.
- Voice chat is built in and voice-activated: `,` opens its menu. A Mac asks for microphone permission the
  first time.
- Graphics start on the pack's `low` settings: shaders on at their lightest, Distant Horizons at a modest
  range. `K` turns shaders off and on, `O` opens the shader menu, and Distant Horizons' own settings are in
  Options. If the game stutters, lower Distant Horizons' range first, then turn shaders off.
- Plugging in a controller just works (Controlify).

See **[QUICKSTART.md](QUICKSTART.md)** for the first hour.

## 4. Updating

Peacock changes often. Two ways to stay current:

**Simple: download again.** When the group chat says the pack updated, download `Peacock.mrpack` again from
the link above and import it as a new instance. Your worlds live on the server, so nothing is lost; copy
`options.txt` from the old instance's folder if you want your keybinds and video settings back.

**Automatic: let the pack update itself on every launch** (the same thing the Prism route does). This
needs Java 17 or newer installed on your computer so a terminal can run it: type `java -version` in a terminal;
if it prints a version of 17 or more, you have it (otherwise install
[Temurin 17](https://adoptium.net/temurin/releases/?version=17)). Then instance → **Settings** →
**Launch hooks** → **Pre launch**:

```
java -jar peacock/launch.jar https://raw.githubusercontent.com/Nublys/peacock/main/pack/pack.toml
```

`launch.jar` already ships inside the pack. From then on every launch checks GitHub, downloads only what changed,
and `/peacock profile <tier>` in chat (then relaunch) picks a graphics tier for your machine: `potato`, `low`,
`medium`, `high` or `ultra` (see the README's Performance section). If a launch fails with the hook in place,
remove the hook line and launch again; you will be on the version you have.

## Something is wrong

- **Can't connect / "mods missing"**: your instance is older than the server. Re-download `Peacock.mrpack`
  (or add the hook above).
- **Crashes at start**: memory set too low or too high; 6144 MB. Then send `logs/latest.log` from the
  instance folder (instance → ⋯ → Open folder) to the group chat.
- **Low FPS**: Distant Horizons range down first, then `K` for shaders off. Press `F3` and send a screenshot:
  the left column's FPS and server-tick lines and the right column's GPU line say most of it.
