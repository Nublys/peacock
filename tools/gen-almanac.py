#!/usr/bin/env python3
"""Generate pack/patchouli_books/peacock_almanac/ — the Settler's Almanac, Peacock's in-game guide.

Patchouli loads books from <game dir>/patchouli_books/<id>/ with namespace `patchouli`, so no mod of
our own is needed. Entries are plain text pages; Patchouli does not auto-paginate, so each page body
stays under ~330 characters. Edit BOOK below and re-run; the JSON is generated.

    python3 tools/gen-almanac.py && (cd pack && packwiz refresh)

Give command (what kubejs/server_scripts/almanac.js does on first join):
    /give @s patchouli:guide_book{"patchouli:book":"patchouli:peacock_almanac"}
"""
import json, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "pack" / "patchouli_books" / "peacock_almanac"

BOOK_JSON = {
    "name": "The Settler's Almanac",
    "landing_text": "Village civilization once reached every valley. Then the monsters took its machines, the long dark came, and the pillagers rose in the gap. You are a settler at the end of that dark age. This almanac is what the survivors remembered.$(br2)Open a chapter on the left.",
    "version": 1,
    "model": "patchouli:book_brown",
    "book_texture": "patchouli:textures/gui/book_brown.png",
    "filler_texture": "patchouli:textures/gui/page_filler.png",
    "show_progress": False,
    "i18n": False,
    "use_blocky_font": False,
    "dont_generate_book": False,
}

# category id -> (name, description, icon, sortnum)
CATEGORIES = {
    "story":   ("The Dark Age", "What happened, and what you are here to do.", "minecraft:cracked_stone_bricks", 0),
    "start":   ("First Days", "Spawn, the capital, food, shelter, and the first winter.", "minecraft:campfire", 1),
    "land":    ("Land, Seasons & Weather", "The year, the cold, and what grows when.", "sereneseasons:calendar", 2),
    "ore":     ("Ore & Prospecting", "Metal is regional. Finding it is the first adventure.", "geolosys:prospectors_pick", 3),
    "towns":   ("Towns & Trade", "Villagers, caravans, bounties — and why trading halls don't work here.", "minecraft:emerald", 4),
    "threats": ("Threats", "Pillagers, raids, and the things that hold the old machines.", "minecraft:crossbow", 5),
    "tech":    ("Blueprints & Recovery", "How technology comes back, one boss at a time.", "create:brass_ingot", 6),
    "tools":   ("Controls, Map & Settings", "Keys, the atlas, voice chat, and performance profiles.", "map_atlases:atlas", 7),
}

def T(*paras):
    """Join paragraphs into one Patchouli text body."""
    return "$(br2)".join(paras)

# entries: category -> list of (id, name, icon, [pages...]); a page is a string (text) or a dict
ENTRIES = {
    "story": [
        ("what_happened", "What Happened", "minecraft:cracked_stone_bricks", [
            T("Long before you, villages were spread far and wide, joined by rail and canal. Brass turned in every workshop. Trains ran on schedules. Ships carried grain to towns that never saw a field.",
              "Then the monsters came for the machines."),
            T("No one agrees on how. The dead carried off the brass. Things from below took the engines apart and kept the parts. The sky over the Nether lit up and never went dark again.",
              "Without their tools the villages shrank to what you see now: a bell, a few farms, a wall if they were lucky."),
            T("Into that gap came the pillagers — people who decided the fall was an opportunity. They hold outposts, fortresses, and much of what was stolen. They would prefer the dark age continued.",
              "You arrived at its end. Whether it ends is up to you."),
        ]),
        ("your_part", "Your Part", "minecraft:writable_book", [
            T("Every piece of lost technology is held by something that will fight to keep it. Beat it and it drops a $(bold)Blueprint$() — the knowledge of how the thing was made.",
              "Use the Blueprint and you can build that technology. Nobody else can until they learn it too."),
            T("Knowledge is a thing you can hand to someone. Trade Blueprints, gift them, loot them from the fallen. Civilization recovers by sharing what it recovers.",
              "See $(l:patchouli:tech/how_blueprints_work)Blueprints & Recovery$() for the ladder."),
        ]),
    ],
    "start": [
        ("spawn", "Where You Woke Up", "minecraft:bell", [
            T("Everyone spawns in the same village: the $(bold)capital$(). It has a bell, villagers with trades, and beds. It will grow as the server does — it is the first market, the first station, and the first thing raiders come for.",
              "Set your spawn with a bed early. There is no fast travel in this world; distance is real."),
            T("$(bold)Day one checklist:$()$(br)- Wood, a crafting table, a bed in the capital$(br)- Check the season (calendar, or the sky's colour)$(br)- Food: villager farms are fair game to replant$(br)- A campfire before nightfall if it is cold",
              "Mobs are harder than you remember. A wolf helps; a dog helps more (see Threats)."),
        ]),
        ("food", "Food & Cooking", "farmersdelight:cooking_pot", [
            T("Farmer's Delight runs the kitchen: cutting boards, cooking pots, skillets, and meals that feed you for a long time. Simple meals carry you through the first season; the good stuff needs a stove and ingredients from more than one biome.",
              "Fish with Aquaculture rods and nets — rivers and oceans have different fish, and some are worth money."),
            T("Animals are from Animania: breeds, genders, feed and water troughs. A cow that is fed and watered gives milk; one that is not, will not. Animals need care, and they reward it.",
              "Season matters: see Land, Seasons & Weather for what grows when, and why a greenhouse is worth building before winter."),
        ]),
        ("temperature", "Staying Warm (and Cool)", "toughasnails:wool_helmet", [
            T("Tough As Nails tracks your $(bold)temperature$(). The bar by your hotbar swings cold in winter nights, snowy biomes, deep water and high altitude; hot in deserts, the Nether, and midsummer noon.",
              "Thirst is $(bold)off$() in this pack. Temperature is the survival layer."),
            T("Counters: wool and leather armor warm you; campfires, torches and lava warm the air near them; shade, water and ice cool you. Climate clothing from TAN is the long-term answer.",
              "Icy or scorching for too long hurts. Plan the first winter: a roof, a fire, and wool."),
        ]),
        ("first_create", "Your First Machines", "create:andesite_alloy", [
            T("Nothing in the homestead tier is locked. Andesite alloy, water wheels, mechanical presses, mixers, saws, belts, funnels, chutes, wagons and docks are yours from day one.",
              "What you cannot make yet is $(bold)brass$() — and everything brass unlocks. The dead took it. See Blueprints & Recovery."),
            T("Create's own book (the ponder screens — hold $(bold)W$() over an item) explains every machine. This almanac only tells you which doors are closed and which bosses hold the keys."),
        ]),
    ],
    "land": [
        ("seasons", "The Year", "sereneseasons:calendar", [
            T("Serene Seasons runs the calendar: four seasons, each in three parts (early, mid, late), each part $(bold)16 days$(). A year is 192 days. The world was born in early spring.",
              "Grass and leaves change colour; snow falls and stays in winter and melts in spring; storms are seasonal."),
            T("Craft a $(bold)calendar$() to see the date. Villages keep one in the capital.",
              "Animals, fish and crops all follow the year. Plan around it or fight it with glass."),
        ]),
        ("crops", "What Grows When", "minecraft:wheat", [
            T("Crops $(bold)do not grow out of season$(). Hover over seeds: the tooltip lists fertile seasons.",
              "$(bold)Spring:$() carrots, potatoes, cabbage, onions, berries, most saplings$(br)$(bold)Summer:$() wheat, melons, tomatoes, onions, rice, sugar cane, cactus$(br)$(bold)Autumn:$() wheat, pumpkins, beetroot, carrots, cabbage, rice$(br)$(bold)Winter:$() sweet berries, spruce"),
            T("Year-round: mushrooms, nether wart, cave vines.",
              "$(bold)Greenhouse Glass$() (Serene Seasons) makes any crop under it count as in-season. A glass roof over a farm is the winter plan. Below Y=48 fertility is ignored too — deep farms work all year."),
        ]),
        ("terrain", "The Land Itself", "minecraft:grass_block", [
            T("Tectonic and Terralith shape the terrain: real mountain ranges, deep valleys, long rivers. Biomes O' Plenty fills them. Distant Horizons shows the far side of the valley from your door.",
              "Rivers and coasts matter: Valkyrien Skies ships (Eureka) and wagons from Caravans & Convoys are how goods move before rails exist."),
            T("The Nether is Incendium's: new biomes, new structures, and the Nether Reactor — which in this story is the machine that was stolen. The End is Nullscape. Both are late-game chapters."),
        ]),
    ],
    "ore": [
        ("regional_ore", "Ore Is Regional", "geolosys:hematite_ore", [
            T("There is $(bold)no random ore$(). Geolosys places metal in deposits — plutons — each of one kind, each large, and each somewhere specific. Iron may be a ten-minute walk; zinc may be the next valley over.",
              "This is deliberate. Ore that is somewhere else is why wagons, ships and eventually trains exist."),
            T("Look for $(bold)samples$(): small rock clusters on the surface that show what is below. Dig straight down from a sample and you will find the deposit.",
              "Ore blocks drop $(bold)clusters$(), not raw ore. Smelt them, or run them through Create's crushing wheels for more."),
        ]),
        ("prospecting", "The Prospector's Pick", "geolosys:prospectors_pick", [
            T("Craft the $(bold)Prospector's Pick$() early. Right-click stone and it tells you what ore is nearby and roughly where. Walk, tap, walk, tap. It never breaks.",
              "Geolosys hands you its own $(bold)Field Manual$() on first join — it lists every deposit, what it drops, and at what depth."),
            T("Metals you will need, in order: $(bold)copper and iron$() (homestead; iron is common and shallow), $(bold)zinc$() (sphalerite — brass needs it), then $(bold)gold$() and $(bold)coal$() in bulk once machines run."),
            T("Ore is regional: $(bold)zinc lies under mountains$(), $(bold)gold in the dry country$() (desert, badlands, savanna), $(bold)tin in sand$(), $(bold)lead under plains$(), $(bold)limonite iron in marshes$().",
              "Nature's Compass finds the biome; samples find the deposit."),
            T("Mark deposits on your atlas. The first player to find zinc should tell everyone — and that is a trade route being born."),
        ]),
    ],
    "towns": [
        ("villagers", "Villagers Worth Keeping", "minecraft:emerald", [
            T("Villagers here are people, not vending machines. $(bold)Villager Comfort$() means a villager without a bed, light and food trades badly; a happy village trades well.",
              "$(bold)Restock Balance$() means trades run out and restock slowly. Buying out one librarian all day does not work."),
            T("Together they make trading halls pointless and towns valuable: the best prices are in a real village with real beds, and the way to more trade is $(bold)more villages$(), not more cells.",
              "Villages grow (Village Expansion) and hire guards. Villager Workers can be put to farming or hauling."),
        ]),
        ("caravans", "Caravans, Bounties, Markets", "minecraft:chest_minecart", [
            T("$(bold)Bountiful$() boards post jobs villages want done; pay is emeralds and goods.",
              "$(bold)Caravans & Convoys$(): wagons that carry trade between settlements. Build a dock or a wagon post and routes open up. This is the mid-game economy before rail."),
            T("Late game, the $(bold)Trading Floor$() lets a train sell on a schedule — a depot in a real town, goods in, emeralds out, while you are elsewhere.",
              "Depots need a Blueprint and a town with a bell and beds. There is no version that works in a hole in the ground."),
        ]),
        ("recruits", "Recruits & Guards", "minecraft:iron_sword", [
            T("Villages arm $(bold)Guard Villagers$() to hold a wall. $(bold)Village Recruits$() lets you hire a squad: command them with $(bold)R$(), teams with $(bold)U$(), their map with $(bold)N$(). Press $(bold)I$() for the Recruits wiki.",
              "Hiring is locked until the Mutant Skeleton falls — the drill was lost with it."),
        ]),
    ],
    "threats": [
        ("night", "The Night", "minecraft:rotten_flesh", [
            T("Mobs are tougher and smarter. Mutant Monsters wander rarely and are not ordinary zombies. Mowzie's and Cataclysm creatures guard places that look like they should be guarded.",
              "Combat is Better Combat: directional swings, real reach. Spartan Weaponry gives spears, halberds and crossbows a reason to exist; Old Guns gives you a musket if you can make powder."),
            T("$(bold)Dogs$(): tame a wolf, then feed it a $(bold)Training Treat$() to make it a dog (Doggy Talents). Dogs learn talents, carry things, fight well and come back. Whistle commands are on $(bold)Shift+1..4$().",
              "Your corpse keeps your items when you die (Corpse). Walk back."),
        ]),
        ("pillagers", "Pillagers", "minecraft:crossbow", [
            T("Pillagers are the faction that profited from the fall. Outposts, fortresses and camps hold stolen goods and some Blueprints. Illager Invasion adds new kinds — illusioners, sorcerers, basher, provokers — the longer a raid runs.",
              "Raids come from Bad Omen; a village with guards and walls holds, one without does not."),
            T("Savage & Ravage and Respillaged make outposts and raids worth the fight: loot, totems, and the way to summon a captain when you are ready for one.",
              "The $(bold)Fortress Illusioner$() holds the trading ledgers. See Blueprints & Recovery."),
        ]),
    ],
    "tech": [
        ("how_blueprints_work", "How Blueprints Work", "minecraft:paper", [
            T("Technology is unlocked $(bold)per player$(). Killing a boss does not unlock it for the server — it drops $(bold)Blueprints$(): one for every player who fought, plus one spare.",
              "Use a Blueprint and you learn that technology. The spare is for someone who was not there."),
            T("Blueprints are ordinary items: trade them, sell them, gift them, or take them off a corpse. A new player on an old server catches up by trading, not by grinding the same boss.",
              "Stuck on a boss? Every Blueprint also has a $(bold)charter$() recipe: expensive, emerald-priced, and always available. Slow, but never blocked."),
            T("Recipes you have not learned are visible but locked; the tooltip names the boss. The gated $(bold)blocks$() check too — a brass machine handed to someone who has not learned brass will not run for them.",
              "$(italic)The first Blueprints arrive with the Dark Age update. Until then nothing is locked.$()"),
        ]),
        ("tier1", "Tier 1 — Iron and a Dog", "minecraft:iron_ingot", [
            T("Beatable alone in iron armour with a dog. These are the dark age's fallout, not its masters.",
              "$(bold)Mutant Zombie$() → $(bold)Brass$(). The dead carried it off. Brass opens the middle of Create.$(br)$(bold)Mutant Skeleton$() → $(bold)Recruiting$(): hire squads, arm guards.$(br)$(bold)Mutant Creeper$() → $(bold)Blasting$(): TNT, gunpowder tech, the blaze burner."),
            T("$(bold)Mutant Snow Golem$() (snowy biomes) → $(bold)Climate control$(): thermoregulators, air conditioners. Wool and leaf clothing are always free.$(br)$(bold)Mutant Enderman$() → ender logistics: Create's chutes across distance.$(br)$(bold)Torte$() (Incendium's skeleton chef, Nether) → $(bold)Advanced cooking$(): Slice & Dice automation, Aquaculture nets."),
        ]),
        ("tier2", "Tier 2 — Bring Recruits", "minecraft:diamond", [
            T("Bosses that guard a place. Bring a squad, or a friend.",
              "$(bold)Ferrous Wroughtnaut$() → $(bold)Trains$() (Steam 'n' Rails).$(br)$(bold)Naga$() → $(bold)Ships$() (Eureka).$(br)$(bold)Fortress Illusioner$() → the $(bold)Trading Floor$() — the illagers held the ledgers.$(br)$(bold)Umvuthi$() → $(bold)Diesel$()."),
        ]),
        ("tier3", "Tier 3 — The Reactor", "minecraft:netherite_scrap", [
            T("Both of you, with a plan.",
              "$(bold)Withered Director$() (Nether Reactor) → $(bold)mechanical arms, precision mechanisms$() — the reactor's own parts.$(br)$(bold)Netherite Monstrosity$() → netherite, heavy cannon calibres.$(br)$(bold)Frostmaw$() → $(bold)Cannons$() (Create Big Cannons)."),
        ]),
        ("tier4", "Tier 4 — The Last Chapter", "minecraft:end_crystal", [
            T("$(bold)Hovering Inferno$(), $(bold)Ignis$(), the Respillaged totem captains → frontier ore, the final rail.$(br)$(bold)Ender Guardian$() (the End) → the lost capital's last secret.",
              "What that is, the survivors did not write down."),
        ]),
    ],
    "tools": [
        ("controls", "Keys", "minecraft:lever", [
            T("$(bold)B$() backpack$(br)$(bold)M$() atlas · $(bold)P$() place a pin$(br)$(bold)V$() quiver$(br)$(bold)R / U / N$() Recruits: command / team / map$(br)$(bold)I$() Recruits wiki$(br)$(bold)Shift+1..4$() dog whistles$(br)$(bold)Alt$() Create tool menu (hold)"),
            T("$(bold)K$() shaders on/off · $(bold)O$() shader menu$(br)$(bold),$() voice chat menu · $(bold).$() mute mic$(br)$(bold)Right Alt$() push-to-talk",
              "Controlling is installed: Options → Controls has a search box, so any bind can be found by name."),
        ]),
        ("atlas", "The Atlas", "map_atlases:atlas", [
            T("There is no minimap. $(bold)Map Atlases$() collects maps into one book: craft an atlas, carry it, and it fills as you travel. $(bold)M$() opens it; $(bold)P$() drops a pin where you stand.",
              "Mark deposits, villages, docks and boss structures. A shared atlas on a lectern in the capital is the server's map room."),
        ]),
        ("voice", "Voice Chat", "minecraft:note_block", [
            T("Simple Voice Chat is built in and uses the server's port — nothing to set up. Voice carries 48 blocks and fades with distance; use groups ($(bold),$() menu) to talk across the map.",
              "Default is voice activation; $(bold)Right Alt$() is push-to-talk if you switch. Mac: allow the microphone for Prism when asked."),
        ]),
        ("performance", "Performance Profiles", "minecraft:redstone_torch", [
            T("The pack ships graphics profiles by $(bold)hardware$(), applied by the launcher from the PEACOCK_PROFILE setting in Prism:",
              "$(bold)potato$() iGPU, shaders off · $(bold)low$() iGPU, Complementary at Potato · $(bold)medium$() thin laptops like a MacBook Air · $(bold)high$() laptop with a real GPU · $(bold)ultra$() desktop"),
            T("Anything you change in the video or shader menus is kept; the profile only sets defaults. Shaders toggle with $(bold)K$(). If frames drop, lower Distant Horizons' radius first, shaders second, render distance last.",
              "Macs stay on plain Complementary — the Euphoria variant exceeds what macOS OpenGL offers."),
        ]),
    ],
}

def write(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def main():
    # validate every page before touching the output, so a bad page never leaves a half-written book
    for cid, entries in ENTRIES.items():
        for eid, name, icon, pages in entries:
            for pg in pages:
                if isinstance(pg, str) and len(pg) > 420:
                    raise SystemExit(f"page too long in {cid}/{eid}: {len(pg)} chars (limit 420)")
    if OUT.exists(): shutil.rmtree(OUT)
    write(OUT / "book.json", BOOK_JSON)
    lang = OUT / "en_us"
    for cid, (name, desc, icon, sortnum) in CATEGORIES.items():
        write(lang / "categories" / f"{cid}.json", {"name": name, "description": desc, "icon": icon, "sortnum": sortnum})
    n = 0
    for cid, entries in ENTRIES.items():
        for i, (eid, name, icon, pages) in enumerate(entries):
            pj = []
            for p in pages:
                if isinstance(p, str):
                    if len(p) > 420: raise SystemExit(f"page too long in {cid}/{eid}: {len(p)} chars")
                    pj.append({"type": "patchouli:text", "text": p})
                else:
                    pj.append(p)
            write(lang / "entries" / cid / f"{eid}.json",
                  {"name": name, "icon": icon, "category": f"patchouli:{cid}", "sortnum": i, "pages": pj})
            n += 1
    print(f"wrote {len(CATEGORIES)} categories, {n} entries -> {OUT.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
