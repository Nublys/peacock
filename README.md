# Peacock

A survival pack for a handful of friends, on Minecraft 1.20.1 with Forge. Big terrain, real seasons,
ore that is never where you live, towns that grow on their own, and a world that ended before you
arrived. You rebuild it with trains, ships and brass — one boss at a time.

This page is the guide: how to get in, what the world is, and how the pieces work. The full
reference is in-game — every new player is handed **The Settler's Almanac** on first join.

---

## Getting in

**Prism Launcher** (recommended — the pack updates itself every launch):

1. Install [Prism](https://prismlauncher.org/download/) and, in its Settings → Java, download **Java 17** (newest build; Apple Silicon build on a Mac).
2. Add Instance → **Import** → paste `https://raw.githubusercontent.com/Nublys/peacock/main/dist/Peacock-Prism.zip`.
3. Launch. The first run downloads the pack (a few minutes); later launches just check for changes.
4. In-game, `/peacock profile <tier>` and relaunch — `low` if you do nothing. Tiers under [Performance](#performance).
5. Add the server from the group chat. Voice chat is built in (`,` for its menu).

Full walkthrough, the by-hand route and the Modrinth App: **[docs/INSTALL-PRISM.md](docs/INSTALL-PRISM.md)**.

**CurseForge app**: download the zip for your hardware tier from the
[latest release](https://github.com/Nublys/peacock/releases/latest) and import it as a custom profile; new
versions mean importing the new zip. **[docs/INSTALL-CURSEFORGE.md](docs/INSTALL-CURSEFORGE.md)**.

Either way: 6 GB of memory on a 16 GB machine, 8 GB if you have 32; more is not faster.

---

## The world

Village civilization once reached every valley: rail and canal between towns, brass turning in every
workshop, ships carrying grain to towns that never saw a field. They did very well. Then they built past
their walls, onto the fields that fed them, and dug deeper than anyone had before. A sickness came up
out of the lowest shafts and travelled the rail lines. The monsters followed it. The towns emptied.

You arrive in **Year One** after that, in the **capital** — the one old town still standing. It has a
wall, guards, a bell, traders and a bounty board. It belongs to everyone and nobody can take it.

Everything else you find is one of three things:

- **A dead town.** Every other old stone village is a ruin. Most are abandoned — roofs open, the owners
  still in the cellars as zombies, a little left in the chests. The rest are **held by pillagers**, who
  camp in them and guard chests full of what they took from every town they emptied.
- **A new town.** The survivors are founding settlements of their own: a tower, a bell, a recruit table,
  and a town that builds itself out from there. They are small, rough, growing, and have names and
  factions. *Old stone means dead; a tower means people.* When you find one, write the coordinates down.
- **The painted ones.** Pillagers are villagers — the desperate, the criminal, the opportunists, the sick who
  walked out of the gates at night. Their numbers have grown since the fall. They never held the old
  machines; they steal, and their chests are the best ordinary loot in the world.

Nobody in the world says plainly what happened. The survivors left **journals** — a guild ledger, a
physician's casebook, a stationmaster's log, a child's drawings, a pamphlet from beyond the river — and
each one blames something different. They are in the ruins' chests and on the bounty boards. Read enough
of them and you will know.

---

## How things work

### Seasons and weather
The year is four seasons of three sub-seasons, sixteen days each. Crops grow only in their season: wheat
in spring and summer, nothing in winter without a greenhouse. Winter snow piles up in layers and melts
back in spring. Cold and heat hurt (the gauge is by your hotbar): wool armour warms, leather cools,
campfires warm the air around them. There is no thirst. A calendar (Serene Seasons) shows the season;
the chat tells you too, every time you log in.

### Ore is regional
Ore does not spread evenly through the stone. **Geolosys** puts it in large deposits by region: iron near
the capital, zinc in the mountains, coal in the hills, gold and the rarer metals far off. Surface
*samples* (small clusters of the ore on the ground) mark a deposit below; a **prospector's pick** reads
the stone for what is nearby. Ore comes out as clusters that smelt like raw ore. Mineral names you will
see — hematite, limonite, sphalerite, cassiterite — are the real ones for the metal they hold; the
Almanac has the table. Caves have no ore in the walls, so caving is for what people left behind:
mineshafts, dungeons, the ruins under the hills, and their chests, which do carry ore.

### Blueprints: how technology comes back
The old world's machines are gone, and every piece is held by a boss. The recipes exist — you can see
them — but they are **locked** until you learn them. Beat the boss that holds a technology and it drops a
**Blueprint** for every player who fought it, plus a spare. Right-click to learn. From then on you can
craft that whole branch; nobody else can until they learn it too. Blueprints are items: trade them, gift
them, loot them.

The ladder runs in tiers. Tier 1 is the basics — brass, hiring recruits, blasting, climate control,
real cooking — held by the mutants and a named skeleton. Tier 2 is trains, ships, trade and diesel.
Tier 3 is precision mechanisms, netherite and cannons. Tier 4 is the arcane and the End. Every rung also
has a **charter**: pay the capital's price in emerald blocks and the knowledge is yours without the
fight — dear, but there for anyone who would rather build than hunt. The Almanac's *Bestiary* says where
each boss lives; **rumour maps** from outposts, cartographers and bounty boards point the way.

### Towns, bounties and recruits
- **The capital** is the shared home: safe storage, a bounty board that works for everyone, villagers
  worth trading with. Villagers here are people: they trade well where they live well (beds, light,
  food) and badly in a hole, and their stock restocks slowly. Towns stop breeding at about two dozen.
- **Bounty boards** post jobs — bring brass, kill pillagers at the outpost, clear the zombies from a
  ruin — and pay in emerald blocks, golden apples, saddles and real enchanted books. A board that trusts
  you pays better: sealed rumours (a map to a boss's home), the deeper journals, totems, and at the top a
  named weapon.
- **New towns** are factions with a leader, a garrison, a treasury and a merchant. They farm, trade,
  send convoys down the roads, found new towns when rich and go to war when not. They defend themselves;
  you are needed for raids and bad days. Sneak-click a town's **Noble** for paid work; standing lets you
  join, hire **recruits** (soldiers who follow, hold and patrol — once you hold the Recruiting
  Blueprint), and one day lead. A recruit table placed in a dead village founds a new town there.
- **Caravans** run between towns and you can run your own. Late game, a **Trading Floor** depot lets a
  train sell on a schedule — in a real town, with a bell and beds.

### Building and getting around
There is **no fast travel** — no /home, /tpa or warps, only `/spawn` back to the capital (slowly) and
`/back` after a death. Distance is the game: roads, wagons, ships (Valkyrien Skies — ships actually
sail), and eventually trains. Create is the industrial backbone; Macaw's furniture, roofs, bridges and
paths are for making places look like places. Cannons hurt mobs and players, never the land.

### Claims and keeping things running
Press **J** to claim chunks for your team (FTB Chunks): nobody outside your team can break, open or
blow up what is inside. The capital is claimed by the server. **Four force-loaded chunks per team**,
hard cap — enough for a farm or one Create line while you sleep, not a factory. Teams:
`/ftbteams party create`, then `/ftbteams party invite <name>`.

### The map
No minimap. The **Atlas** (`M`) is the map, and it is shared: mark deposits, ruins and towns on it for
everyone. The player locator bar shows friends' direction above the hotbar.

### Sleeping, AFK and the tab list
Sleep is a vote: when **half** the players online are in bed the night skips, and the action bar counts who is
sleeping. Five minutes without moving greys your name in the tab list with an `[AFK]` tag; move or talk and it
clears. The tab list also shows the server's TPS and everyone's ping — 20 is healthy.

### Dying
You leave a corpse holding everything. Walk back and right-click it. Nothing despawns, but someone else
can loot it, so say where you fell.

---

## Controls

| Key | Action |
|---|---|
| `B` | Backpack |
| `M` / `P` | Atlas / place a pin |
| `J` | Claim manager (FTB Chunks) |
| `K` / `O` | Shaders on/off / shader menu |
| `R` / `U` / `N` | Recruits: command / team / map |
| `I` | Towns and factions wiki (Village Recruits) |
| `V` | Quiver |
| `Shift+1–4` | Dog whistles (Doggy Talents) |
| `,` / `.` | Voice chat menu / mute mic (`Right Alt` push-to-talk if you switch) |
| `Alt` | Create tool menu / toolbelt |
| `R` over an item · `W` over a Create item | Recipes (EMI) · Ponder scene |

Every bind is searchable by name in Options → Controls.

---

## Performance

The pack ships five graphics profiles, named by what the machine is. `/peacock profile <tier>` in chat,
then relaunch; anything you then change in the video or shader menus is yours and the profile stops
touching it (`/peacock profile <tier> reset` puts the profile back over your edits).

| profile | for | shaders | far terrain (Distant Horizons) | render distance |
|---|---|---|---|---|
| `potato` | integrated graphics, old or hot laptop, under 16 GB | off | 64 | 6 |
| `low` *(default)* | integrated graphics with some headroom, fanless MacBook Air (40–50 FPS) | Complementary, lightest preset | 128 | 6 |
| `medium` | thin laptop with a fan, 16 GB | Complementary, Medium | 192 | 8 |
| `high` | laptop with a real GPU | Complementary + Euphoria, High | 256 | 10 |
| `ultra` | desktop with a dedicated GPU | Complementary + Euphoria, Ultra | 384 | 12 |

If frames drop: shaders off (`K`) is the big one, then Distant Horizons' radius, then render distance.
Macs stay on plain Complementary (`low` or `medium`); the Euphoria variant needs more than macOS
OpenGL offers. The far terrain fills in over the first hour on a new world; that is normal.

---

## House rules

Most of these are enforced by the pack, not by trust.

- Claim before you build. Leave the capital's farms replanted; build with the town, not over it.
- Mark deposits, ruins and towns on the shared atlas.
- Do not force-load what you are not using — one game thread, everybody pays for it.
- Kill bosses with friends: a Blueprint drops for every fighter, plus a spare for whoever could not come.
- Never run `/locate` on the server; it stalls the world for minutes.
- If the server stalls, note the time and what you were doing, and tell Aaron. If a recipe or tooltip
  looks wrong, `/kubejs errors` and a screenshot.

---

## For the curious

The whole pack is in this repository and generated from it: [`docs/DEVELOPING.md`](docs/DEVELOPING.md)
for how it is built, [`docs/DECISIONS.md`](docs/DECISIONS.md) for why things are the way they are,
[`docs/PLAN.md`](docs/PLAN.md) for the history, and [`server/README.md`](server/README.md) for running
the server. Releases (`.mrpack`, CurseForge zip, server zip) are on the
[Releases](https://github.com/Nublys/peacock/releases) page for anyone not on the Prism route.
