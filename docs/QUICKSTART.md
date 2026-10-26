# Peacock: quick start

## Get in (pick one)

| you use | do this | updates |
|---|---|---|
| **Modrinth App** | download [**Peacock.mrpack**](https://github.com/Nublys/peacock/releases/download/rolling/Peacock.mrpack) → Modrinth App → **+** → **From file** → choose it. Set memory to 6 GB. [Full guide](INSTALL-MODRINTH.md) | re-download, or add the one-line launch hook in the guide |
| **Prism Launcher** *(updates itself)* | Add Instance → **Import** → `https://raw.githubusercontent.com/Nublys/peacock/main/dist/Peacock-Prism.zip`. [Full guide](INSTALL-PRISM.md) | automatic, every launch |
| **CurseForge App** | download the zip for your machine from the [latest release](https://github.com/Nublys/peacock/releases/latest) → Create Custom Profile → Import. [Full guide](INSTALL-CURSEFORGE.md) | import the next release |

Memory: **6 GB** (8 GB on a 32 GB machine). Then Multiplayer → Add Server → the address from the group chat.

## Your first hour

1. **Read the book.** You spawn in the capital holding *The Settler's Almanac*. It is the manual for everything
   below. Start with *What Happened* and *Where You Woke Up*.
2. **Make a fire.** Three sticks on a diagonal make a **fire drill**; hold right-click on a block to light a
   campfire. Cold is real (Cold Sweat): roofs, fires and wool keep you alive in winter.
3. **Find metal.** Ore is regional, not under your feet. Look for small rock clusters on the ground (samples),
   tap the ground with a **flint prospector's hammer** (flint, cobblestone, sticks) and follow it down.
4. **Take a bounty.** The boards on the capital's square pay emeralds for jobs, and emeralds buy almost anything
   from the capital's service people (talk to them).
5. **Claim your land** with the FTB Chunks map once you settle (`J`), so nobody else can grief it.
6. **Fight a boss for technology.** Machines are locked behind Blueprints that bosses drop. The Almanac's
   *Blueprints & Recovery* chapter says who holds what.

## Keys worth knowing

| key | does |
|---|---|
| `B` | backpack |
| `M` | atlas (map), `P` place a pin |
| `R` / `U` (in a menu) | recipes / uses of the hovered item (EMI) |
| `R` / `U` / `N` (in game) | Recruits: command / team / map |
| `,` | voice chat menu (voice-activated by default) |
| `K` / `O` | shaders on/off / shader menu |
| `F3` | debug screen: FPS, server tick, coordinates, biome, what you're looking at |

Controller: plug it in. B is the backpack, D-pad left the atlas, D-pad right the radial menu (fill it once in
Controlify's settings). The Almanac's *Playing with a Controller* page has the full layout.

## When something is off

- **Laggy?** Press `F3`. If the *server tick* line shows under 20 TPS, it's the server: tell the group. If FPS
  is low, it's your machine: lower Distant Horizons' range, then `K` for shaders off. Prism users can also pick
  a lighter graphics tier with `/peacock profile potato` (or `low`) and relaunch.
- **Can't connect / mods missing**: your copy is out of date. Prism: launch again. Modrinth: re-download.
- **Crashed**: send `logs/latest.log` from the game folder to the group chat.
