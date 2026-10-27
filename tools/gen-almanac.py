#!/usr/bin/env python3
"""Generate pack/patchouli_books/peacock_almanac/ — the Settler's Almanac, Peacock's in-game guide.

Patchouli loads books from <game dir>/patchouli_books/<id>/ with namespace `patchouli`, so no mod of
our own is needed. Patchouli does not auto-paginate, so every page body is length-checked here
(limits per page type below) before anything is written. Edit BOOK/ENTRIES and re-run:

    python3 tools/gen-almanac.py && (cd pack && packwiz refresh)

Give command (what kubejs/server_scripts/almanac.js does on first join):
    /give @s patchouli:guide_book{"patchouli:book":"patchouli:peacock_almanac"}

Recipe, item and entity ids used on crafting/spotlight/entity pages were checked against the mod
jars; a wrong id renders as a missing-recipe page, so re-check when a mod is swapped.
"""
import json, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "pack" / "patchouli_books" / "peacock_almanac"

BOOK_JSON = {
    "name": "The Settler's Almanac",
    "landing_text": "Village civilization once reached every valley. It built past its walls and dug below the old marks, and the world answered with sickness and monsters. The towns emptied. You are a settler in Year One after that, in the one old town still standing. This almanac is what the survivors remembered.$(br2)Open a chapter on the left; new settlers start with $(l:patchouli:start/first_hour)Your First Hour$(). Blue text is a link.",
    "version": 2,
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
    # how to play first, then the world, then reference
    "start":   ("First Days", "Your first hour, the capital, food, animals, and the first machines.", "minecraft:campfire", 0),
    "tools":   ("Controls, Map & Settings", "Keys, controllers, the atlas, EMI and Jade, F3, voice chat, graphics profiles.", "map_atlases:atlas", 1),
    "rules":   ("Server Rules & Claims", "Claims, force-loading, commands, and the few things we do not do.", "minecraft:oak_fence", 2),
    "story":   ("The Dark Age", "What happened, what was lost, and what you are here to do.", "minecraft:cracked_stone_bricks", 3),
    "land":    ("Land, Seasons & Sky", "The year, the cold, what grows when, the sky, and the other dimensions.", "sereneseasons:calendar", 4),
    "ore":     ("Ore & Prospecting", "Metal is regional. Finding it is the first adventure; every metal has a use.", "geolosys:prospectors_pick", 5),
    "towns":   ("Towns & Trade", "The capital and its people, bounties, villagers, the new towns and their wars.", "minecraft:emerald", 6),
    "threats": ("Threats", "The night, how fighting works, and the pillager faction.", "minecraft:crossbow", 7),
    "tech":    ("Blueprints & Recovery", "How technology comes back, one boss at a time, and what each tier unlocks.", "create:brass_ingot", 8),
    "bosses":  ("Bestiary of Bosses", "Every boss, where it lives, how to find it, and what it holds.", "minecraft:wither_skeleton_skull", 9),
    "building": ("Building & Logistics", "Decor, wagons, ships and aircraft, trains, cannons.", "mcwroofs:oak_roof", 10),
    "mods":    ("What Is in the Pack", "Every mod by what it does for you.", "minecraft:bookshelf", 11),
    "faq":     ("Why Can't I...", "The questions every new settler asks, answered.", "minecraft:oak_sign", 12),
}

# ---------- page helpers (each returns a page dict; limits are checked in main) ----------
def T(*paras):
    """Join paragraphs into one Patchouli text body."""
    return "$(br2)".join(paras)

def txt(*paras, title=None):
    p = {"type": "patchouli:text", "text": T(*paras)}
    if title: p["title"] = title
    return p

def staged(recipe):
    """A recipe a Blueprint locks: blueprints.js removes it and re-adds it wrapped, as peacock:staged/<ns>/<path>.
    A page naming the original id shows nothing (client log: "Recipe … not found"), so name the wrapped one."""
    return "peacock:staged/" + recipe.replace(":", "/", 1)

def craft(recipe, text=None, title=None, recipe2=None):
    p = {"type": "patchouli:crafting", "recipe": recipe}
    if recipe2: p["recipe2"] = recipe2
    if title: p["title"] = title
    if text: p["text"] = text
    return p

def smelt(recipe, text=None, title=None):
    p = {"type": "patchouli:smelting", "recipe": recipe}
    if title: p["title"] = title
    if text: p["text"] = text
    return p

def spot(item, text, title=None):
    p = {"type": "patchouli:spotlight", "item": item, "text": text, "link_recipe": False}
    if title: p["title"] = title
    return p

def ent(entity, text, name=None, scale=None):
    p = {"type": "patchouli:entity", "entity": entity, "text": text}
    if name: p["name"] = name
    if scale: p["scale"] = scale
    return p

def rel(entries, text=None, title=None):
    p = {"type": "patchouli:relations", "entries": [f"patchouli:{e}" for e in entries]}
    if title: p["title"] = title
    if text: p["text"] = text
    return p

def L(entry, label):
    """Inline link to another entry."""
    return f"$(l:patchouli:{entry}){label}$()"

B = lambda s: f"$(bold){s}$()"
I = lambda s: f"$(italic){s}$()"

def LI(*items):
    """A bulleted list: Patchouli indents and bullets each $(li) item."""
    return "".join("$(li)" + i for i in items)

# character budget per page type (text that still fits without overflowing the page)
LIMITS = {"text": 420, "text_first": 360, "crafting1": 150, "crafting2": 80, "smelting": 150,
          "spotlight": 280, "entity": 180, "relations": 180}

# ---------- entries: category -> list of (id, name, icon, [pages...]) ----------
ENTRIES = {
    # ===================================================================================== story
    "story": [
        ("what_happened", "What Happened", "minecraft:cracked_stone_bricks", [
            txt("Long before you, villages were spread far and wide, joined by rail and canal. Brass turned in every workshop. Trains ran on schedules. Ships carried grain to towns that never saw a field.",
                "They did very well. For centuries they did very, very well."),
            txt("Then the towns built past their walls, onto the fields that fed them, and the Guild dug below the old marks for more zinc and more brass. A sickness came up out of the lowest shafts and travelled the rail lines. The monsters followed it.",
                "Nobody agrees what they woke. The survivors' own words are scattered in the ruins; see " + L("story/found_writings", "Found Writings") + "."),
            txt("The machines were lost with the towns: the dead carried off the brass, things from below took the engines apart, the sky over the Nether lit up and never went dark. Every piece is now held by something that will fight to keep it.",
                "You arrived in Year One after the fall, in the one old town still standing. Whether anything comes back is up to you."),
        ]),
        ("what_was_lost", "The Ledger of Losses", "minecraft:book", [
            txt("The survivors kept a ledger of what was taken and by whom. It is the spine of this almanac, and of the " + L("tech/how_blueprints_work", "Blueprint ladder") + ".",
                B("Brass") + " went with the dead. " + B("Gunpowder") + " with the creepers. The " + B("drill") + " that made soldiers of farmers went with the skeletons."),
            txt(B("Trains") + " rusted in a chamber under the hills, guarded by an iron thing that will not leave. " + B("Ships") + " sank off the stony shores where the nagas nest. The " + B("trading ledgers") + " went to the illager fort.",
                B("Diesel") + " burns in a savanna shrine. The " + B("diving gear") + " lies in the ocean monuments. The " + B("hearth") + " froze with the frostmaw; the " + B("cannons") + " went to the frosted prison. The reactor's " + B("precision parts") + " glow in the Nether."),
            txt("And something was taken to the End that no one has named. The ledger's last line is blank.",
                I("Every entry in this list is a boss in the ") + L("bosses/where_they_are", "Bestiary") + I(".")),
        ]),
        ("your_part", "Your Part", "minecraft:writable_book", [
            txt("Every piece of lost technology is held by something that will fight to keep it. Beat it and it drops a " + B("Blueprint") + ": the knowledge of how the thing was made.",
                "Use the Blueprint and you can build that technology. Nobody else can until they learn it too."),
            txt("Knowledge is a thing you can hand to someone. Trade Blueprints, gift them, loot them from the fallen. Civilization recovers by sharing what it recovers.",
                "You are not expected to do this alone. Towns, recruits, dogs and other settlers are all part of the plan."),
            txt(B("What this almanac is not:") + " a manual for every mod. Create has ponder scenes (hold " + B("W") + " over any of its items). EMI shows every recipe (" + B("R") + " over an item). Jade names whatever you look at.",
                "This book tells you how the pieces fit, which doors are closed, and which bosses hold the keys."),
        ]),
        ("dead_towns", "The Dead Towns", "minecraft:mossy_stone_bricks", [
            txt("Every old stone village you find is dead. Learn the rule early: " + B("old stone means dead; a tower means people") + ".",
                "Most are " + B("abandoned") + ": roofs open, glass gone, the dead owners still in the cellars, a little left in the chests and sometimes a journal. The rest are " + B("held") + ": pillagers camp in them, and the chests hold what they took from every town they emptied."),
            txt("An abandoned village is a quarry, a shelter and a story. A held one is a fight with real loot at the end. Neither has a bell that works, a board that posts, or a villager who trades.",
                "Cure the zombie villagers, or bring villagers of your own, put down a recruit table and ring a bell: the survivors will found a new town on the old bones (" + L("towns/new_towns", "The New Towns") + ")."),
            txt("The only old town alive is the " + B("capital") + ", where you woke. A few held out nearly as long; their streets stand, their people are zombies. It is neutral ground: no faction can take it or found one in it. Raids are its only threat.",
                "Smaller things litter the land between: fallen logs, cairns, a derailed cart, a platform where the morning engine never came. Read them. They are the same story told in blocks."),
        ]),
        ("painted_ones", "The Painted Ones", "minecraft:crossbow", [
            txt("Pillagers are villagers. The desperate, the criminal, the opportunists, the sick who walked out of the gates at night and were seen again only in paint. Since the fall their numbers have grown beyond counting.",
                "They never held the old machines. They steal, and they are good at it."),
            txt("Their camps and outposts are built from what they took: a bell for a cookpot, a lectern for a chopping block, town fences for a palisade, and cages for the people they took along with the goods.",
                "Their chests are the best ordinary loot in the world. Their captains carry the stolen ledgers. The capital's bounty boards will pay you to thin them; see " + L("threats/pillagers", "The Pillager Faction") + "."),
        ]),
        ("found_writings", "Found Writings", "minecraft:written_book", [
            txt("The survivors left books: a guild ledger, a physician's casebook, a stationmaster's log, a child's drawings, a pamphlet from beyond the river. Each blames something different. Read enough and you will know what happened; they never did.",
                "They are not reprinted here. Look in the dead towns' chests, mineshafts, dungeons and the pillagers' plunder."),
            txt("The deeper pages are a reward: a town's bounty board under the " + B("Archivist's Records") + " decree pays in journals once the board trusts you (" + L("towns/caravans", "Bounties") + ").",
                "Keep what you find in a lectern at the capital. Someone else will want to read it."),
        ]),
    ],
    # ===================================================================================== start
    "start": [
        ("first_hour", "Your First Hour", "minecraft:campfire", [
            txt("Six things, in order. Each has a chapter; this is the short version.",
                LI(B("Read this book.") + " Chapters on the left; blue text links. Start with " + L("start/spawn", "Where You Woke Up") + ".",
                   B("Make a fire.") + " Three sticks on a diagonal make a " + L("land/warmth", "fire drill") + "; hold right-click on a block. Cold is real.")),
            txt(LI(B("Find metal.") + " Ore is regional. Look for small rock clusters on the ground and tap there with a flint hammer (" + L("ore/prospecting", "Prospecting") + ").",
                   B("Take a bounty.") + " The boards in the capital's pavilions pay emeralds, and emeralds buy almost anything from the capital's people (" + L("towns/caravans", "Bounties") + ").")),
            txt(LI(B("Claim your land") + " once you settle: " + B("J") + " (" + L("rules/claims", "Claiming Land") + ").",
                   B("Fight a boss for technology.") + " Machines are locked behind Blueprints that bosses drop (" + L("tech/how_blueprints_work", "Blueprints") + ")."),
                "Lost? The last chapter, " + L("faq/cold", "Why Can't I...") + ", answers the usual questions."),
        ]),
        ("spawn", "Where You Woke Up", "minecraft:bell", [
            txt("Everyone spawns in the same village: the " + B("capital") + ", the last old town alive, inside the survivors' wall. Its bounty boards stand in red-roofed pavilions with yellow flags. The first market, and the first thing raiders come for.",
                "Claim a bed early; there is no fast travel. Almost every other old stone village is a ruin (" + L("story/dead_towns", "The Dead Towns") + ")."),
            txt(B("Day one checklist:") + LI("Wood, a crafting table, a bed in the capital", "Check the season: sky colour, or craft a calendar", "Food: villager farms are fair game, replant what you take", "A campfire before nightfall: three sticks make a " + L("land/warmth", "fire drill"))),
            txt(B("First night:") + " stay inside the wall. Mobs here are tougher and smarter than you remember, and the village guards will not chase them for you.",
                "Mark the capital on your " + L("tools/atlas", "atlas") + " before you leave it. The capital will grow as the server does; nothing you build there is wasted."),
            txt(B("Dying") + " leaves a corpse holding everything you carried. Walk back and right-click it. Nothing despawns, but somebody else can loot it, so tell a friend where you fell.",
                "Hunger is vanilla plus AppleSkin (hover food to see what it restores). There is no thirst. The cold is real in winter: see " + L("land/warmth", "Staying Warm") + "."),
        ]),
        ("differences", "Small Things That Differ", "minecraft:oak_log", [
            txt("Habits from plain Minecraft that need adjusting:",
                LI(B("Trees fall whole") + " when you chop the bottom log (FallingTree). Sneak to take a single log.",
                   B("Leaves let you through:") + " walk into a bush and you walk through it, slowly.")),
            txt(LI(B("Streams flow.") + " Rivers carry a current; a boat drifts downstream. Hillsides are stepped with slabs, so walking is less jumping.",
                   B("Zoom needs a spyglass:") + " " + B("Z") + " zooms only while one is in your inventory or backpack.",
                   B("Dying leaves a corpse") + " holding everything; walk back and right-click it. Nothing despawns.")),
            txt(LI(B("Trades restock on sleep:") + " a villager refreshes its trades when it wakes from a bed, once a day.",
                   B("Herds and towns have caps:") + " 40 animals of a kind per pasture, about two dozen villagers per town. The pack tells you when you hit one.",
                   B("No fast travel:") + " " + B("/spawn") + " and " + B("/back") + " after a death are all there is.")),
        ]),
        ("food", "Food & Cooking", "farmersdelight:cooking_pot", [
            txt("Farmer's Delight runs the kitchen. Raw food still works, but real meals feed you longer, give " + B("Nourishment") + " (slow natural regen) and " + B("Comfort") + " (faster healing).",
                "Start with a knife and a cutting board; the pot and skillet come once you have iron."),
            craft("farmersdelight:cutting_board", "Right-click food onto it, then right-click with a knife. Cabbage into leaves, meat into cuts, rice into grains."),
            craft("farmersdelight:cooking_pot", "Sits on a heat source: campfire, stove, fire, magma. Soups, stews and rice dishes come out of here. A bowl in the left slot serves them."),
            craft("farmersdelight:skillet", "Fries meat and eggs in your hand or on a stove. The stove below is the kitchen's heart: a campfire you can cook several things on at once."),
            craft("farmersdelight:stove", "Build the stove under a cooking pot. Rich soil (compost) grows crops faster in any season that allows them."),
            txt(B("Fish:") + " Aquaculture gives rods, hooks and bait. Rivers, lakes and oceans hold different fish; some are heavy, some are worth emeralds. A worm farm turns dirt and seeds into bait.",
                B("Aquaculture Delight") + " adds the recipes that turn a catch into a meal."),
            craft("aquaculture:iron_fishing_rod", "Rods take a hook and bait; a worm farm breeds the bait.", recipe2="aquaculture:worm_farm"),
            txt(B("Nourishment") + " comes from full meals (anything made in a pot or on a stove): slow natural regeneration even when your hunger bar is not full. " + B("Comfort") + " comes from warm dishes (soups, stews): faster healing. Both show as potion effects.",
                "Raw and roasted food keeps you alive; meals make the difference in a fight."),
            txt("Season matters: see " + L("land/crops", "What Grows When") + ". Out of season, crops stop; a greenhouse roof or a deep farm keeps the pot full.",
                "Animals have a chapter of their own: " + L("start/animals", "Animals")),
        ]),
        ("animals", "Animals", "animal_feeding_trough:feeding_trough", [
            txt("The farm animals are Minecraft's own: cows, pigs, sheep, chickens, goats, rabbits, horses, cats. " + B("More Mob Variants") + " gives them breeds and coats (a sooty pig, a horned sheep, a cookie cow) that their young inherit.",
                "They ask nothing of you but food to breed: no thirst, no moods, no beds."),
            craft("animal_feeding_trough:feeding_trough", "Fill a feeding trough with an animal's breeding food (wheat, seeds, carrots): the animals around it eat and breed on their own."),
            txt(B("A pasture holds 40.") + " Two animals cannot have young while 40 of their kind live within 32 blocks; you are told when it happens. Spread a herd over two pastures, or eat some.",
                "Every animal is ticked by the server for everyone on it; that is the reason."),
            txt(B("Wild animals") + " are Naturalist's: deer, boar, bears, lions, elephants, giraffes, zebras, rhinos, alligators, snakes, birds, butterflies and fireflies. Bears defend themselves, snakes bite, vultures circle."),
            txt(B("Dogs") + " are Doggy Talents' (" + L("threats/night", "The Night") + "). " + B("Horses") + " pull wagons (" + L("building/wagons", "Wagons") + ").",
                "Land explored before the animals changed gets its wild animals back the first time someone walks through it again."),
            ent("naturalist:deer", "A deer: wary and fast, and the best meat in the woods.", scale=0.8),
        ]),
        ("first_create", "Your First Machines", "create:andesite_alloy", [
            txt("Nothing in the homestead tier is locked. Andesite alloy, water wheels, presses, mixers, saws, millstones, belts, funnels and chutes are yours from day one.",
                "What you cannot make yet is " + B("brass") + ", and everything brass unlocks. The dead took it. See " + L("tech/how_blueprints_work", "Blueprints & Recovery") + "."),
            craft("create:crafting/materials/andesite_alloy", "Andesite alloy is the first material. Andesite is everywhere; iron nuggets come from iron clusters (see Ore)."),
            craft("create:crafting/kinetics/water_wheel", "Free power from flowing water. Large wheels give more.", recipe2="create:crafting/kinetics/large_water_wheel"),
            craft("create:crafting/kinetics/millstone", "Millstone grinds flour and crushes clusters; the press makes sheets.", recipe2="create:crafting/kinetics/mechanical_press"),
            craft("create:crafting/kinetics/mechanical_mixer", "Mixer over a basin: dough, alloy, one day brass. Fans blow and smelt.", recipe2="create:crafting/kinetics/encased_fan"),
            craft("create:crafting/kinetics/wrench", "Wrench: rotate and pick up machines. Goggles: see stress and speed.", recipe2="create:crafting/kinetics/goggles"),
            txt("Create explains itself: hold " + B("W") + " over any Create item for a ponder scene. This almanac only says which doors are closed.",
                B("Closed for now:") + " brass and everything on it (mechanical crafters, arms, deployers, trains), blaze burners, cannons, diesel, precision mechanisms."),
        ]),
        ("carrying", "Carrying Things", "backpacked:backpack", [
            spot("backpacked:backpack", "A backpack goes in your back slot and opens with " + B("B") + ". Leather, string and two ingots of any common metal (iron, copper, tin, zinc, lead, nickel, aluminium). It can be upgraded and dyed. Supplementaries' sacks are the cheap alternative: a block of storage you can carry.", title="Backpack"),
            txt(B("Shulker boxes") + " are late. Before them: sacks, backpacks, chest minecarts, wagons, ships. Create's chutes and belts move things between machines; wagons move them between towns.",
                "A " + B("toolbox") + " (Create) holds tools and swaps them into your hand."),
            craft("create:crafting/curiosities/brown_toolbox", "Toolboxes are shared within range: open one and your hotbar can pull from it."),
            txt(B("Crafting from your chests:") + " the " + B("Proximity Crafting Table") + " uses every chest, barrel, drawer and vault within 8 blocks as if it were in your pack. Open it and EMI's craftable filter shows what the room can make; its fill button pulls the ingredients from wherever they are.",
                "It works in your own land: it will not reach into land another team has claimed."),
            craft("peacock:proximity_crafting_table", "Four chests, four common metal ingots (iron, copper, tin, zinc, lead, nickel or aluminium) and a crafting table. Set it in the storeroom."),
            txt(B("Workshop tables") + " (any wood) can open one nearby chest at a time: put a " + B("name tag") + " in the table's side slot and the chests next to it appear as tabs (two name tags on a dual table reach two blocks).",
                B("Storage Drawers") + " hold one item each in bulk, show it on the front, and feed Create funnels and belts directly."),
        ]),
    ],
    # ===================================================================================== land
    "land": [
        ("seasons", "The Year", "sereneseasons:calendar", [
            txt("Serene Seasons runs the calendar: four seasons, each in three parts (early, mid, late), each part " + B("16 days") + ". A year is 192 days. The world was born in early spring.",
                "Grass and leaves change colour. Snow falls and stays in winter, and melts in spring. Storms are seasonal."),
            craft("sereneseasons:calendar", "The calendar shows the date and season. Keep one in your inventory; the capital keeps one by the bell."),
            craft("sereneseasons:season_sensor", "A season sensor emits redstone by season: greenhouse shutters, a bell that rings on the first day of spring."),
            txt(LI(B("Spring:") + " thaw, planting, breeding.", B("Summer:") + " long days, heat, the main harvest.", B("Autumn:") + " second harvest, pumpkins, storing.", B("Winter:") + " snow, cold, dark early; berries and whatever is under glass."),
                "Animals, fish and crops all follow the year. Plan around it, or fight it with glass."),
        ]),
        ("warmth", "Staying Warm", "minecraft:campfire", [
            txt("Cold Sweat tracks two temperatures: the " + B("air") + " where you stand and your " + B("body") + ". The air follows the biome, the season, the hour, altitude, rain and shade. Your body follows the air slowly; the gauge by your hotbar shows which way it is going.",
                "There is no thirst. Comfortable air is 35 to 100 °F; the thermometer reads it."),
            txt("Far enough either way and it hurts: the cold slows and freezes you, heat wears you down. New players get a grace period. Winter nights, rain and high ground are the danger.",
                "The capital sits in mild country: comfortable in spring and autumn, a cold winter, a warm summer."),
            txt("A lit campfire, fire, furnace, smoker, blast furnace or stove warms you within a few blocks, more the closer you stand. Walls between you and the fire weaken it. Lava and magma are hot; ice cools.",
                "A roof, four walls and a fire is a winter night survived.", title="Heat"),
            craft("peacock:fire_drill", "The fire drill: three sticks. Hold right-click on a block for two seconds to light a campfire or candle, or start a fire. Twelve uses."),
            craft("cold_sweat:sewing_table", "Insulates any armour piece, from any mod. Wool keeps out cold, rabbit hide heat, leather a little of both. Shears take it back off."),
            craft("cold_sweat:waterskin", "Warmed at a campfire: a hot-water bottle. The thermometer reads the air.", recipe2="cold_sweat:thermometer"),
            spot("cold_sweat:hearth", "The hearth heats a whole house: fuel it and fit a smokestack; pipes carry the air further. The boiler warms a room, the icebox cools one. All three are " + B("Climate control") + ", held by the Frostmaw (Tier 2).", title="Climate control"),
        ]),
        ("crops", "What Grows When", "minecraft:wheat", [
            txt("Crops " + B("do not grow out of season") + "; hover seeds for theirs." +
                LI(B("Spring:") + " carrots, potatoes, cabbage, onions, berries, most saplings", B("Summer:") + " wheat, melons, tomatoes, onions, rice, sugar cane, cactus", B("Autumn:") + " wheat, pumpkins, beetroot, carrots, cabbage, rice", B("Winter:") + " sweet berries, spruce")),
            txt("Year-round: mushrooms, nether wart, cave vines.",
                "Below " + B("Y=48") + " season is ignored: deep farms work all year. So does anything under a " + B("glass roof") + "."),
            spot("minecraft:glass", "Any glass counts as greenhouse glass here: a crop with glass a few blocks above it grows as if in season. A glass roof over a lit, walled field is the winter plan. Build it in autumn and the pot stays full.", title="Greenhouses"),
            txt(B("Rich soil") + " (Farmer's Delight) speeds growth. Slice & Dice can automate the kitchen later; a sprinkler waters a field.",
                "Trees ignore seasons. Berries, mushrooms and fish are the winter calories."),
        ]),
        ("sky", "The Sky", "minecraft:clock", [
            txt("The moon keeps its ordinary phases: the fuller it is, the more slimes in the swamps and the better armed the night's mobs. Nights are dark; carry light.",
                "Weather is seasonal: winter storms snow, summer storms are short and loud. The air is colder at night, in the rain and high up, and Cold Sweat counts all of it."),
        ]),
        ("terrain", "The Land Itself", "minecraft:grass_block", [
            txt("Tectonic and Terralith shape the terrain: real mountain ranges, deep valleys, long rivers, high plateaus. Biomes O' Plenty fills them. Streams run and fall from the hills, and slabs soften the slopes.",
                "The capital sits in a lowland. Mountains are where the zinc is; dry country is where the gold is."),
            txt("Rivers and coasts matter: boats and wagons are how goods move before rails exist. Rivers carry a current: a boat drifts downstream. Build towns where water and road meet.",
                "Structory scatters ruins; Create Structures leave old workshops with parts in them."),
            txt(B("Nature's Compass") + " finds a biome by name: the way to the nearest snowy peak, savanna or desert. It is how you find the places bosses live.",
                "Craft one before the first long trip."),
            craft("naturescompass:natures_compass", "Right-click to open the biome list, pick one, follow the needle. It cannot find structures; that is what rumours and maps are for."),
        ]),
        ("otherworlds", "Nether & End", "minecraft:obsidian", [
            txt("The Nether is Incendium's: new biomes, piglin villages, a quartz kitchen with a chef in it, a reactor that still runs. Portals link up sensibly (Nether Portal Fix) so a portal in your town comes back to your town.",
                "The Nether holds four Blueprints and the Inferno's altar. A mid-game place, not a shortcut."),
            txt("The End is Nullscape's: islands, pillars, crystal peaks and shadowlands. Cataclysm's Ruined Citadel stands in its highlands with the " + B("Ender Guardian") + " inside.",
                "What the Guardian keeps is the last chapter. See " + L("tech/tier4", "Tier 4") + "."),
        ]),
    ],
    # ===================================================================================== ore
    "ore": [
        ("regional_ore", "Ore Is Regional", "geolosys:hematite_ore", [
            txt("There is " + B("no random ore") + ". Geolosys places metal in deposits: each of one kind, each large, each at its own depth. Iron may be a ten-minute walk; zinc may be the next valley over.",
                "This is deliberate. Ore that is somewhere else is why wagons, ships and eventually trains exist."),
            txt("Look for " + B("samples") + ": small rock clusters lying on the surface that show what is below. Dig straight down from a sample and you reach the deposit.",
                "Ore blocks drop " + B("clusters") + ", not raw ore. Smelt them, or crush and wash them in Create for more."),
            smelt("geolosys:smelting/iron_ingot_from_cluster_smelting", "One cluster, one ingot in a furnace. Create's crushing wheels and washing give more per cluster once you have them."),
            txt(B("Where metal lives") + " near the surface:" + LI(B("Everywhere:") + " iron (hematite), copper (malachite), coal, aluminum (bauxite)", B("Mountains:") + " zinc, platinum, beryl", B("Dry country:") + " gold, lapis; " + B("sandy:") + " tin (cassiterite)", B("Plains:") + " lead and silver (galena); " + B("marsh:") + " nickel (limonite)")),
            txt(B("Deep down it evens out.") + " Below about Y -16, in the deepslate, lead and silver, nickel, platinum, tin and gold lie in their own deposits under " + I("every") + " biome: smaller than the regional ones, but a cave that runs deep enough finds them in its walls.",
                "Deepslate metal ore also gives one to two clusters a block, not one. The regional deposits are the rich ones; the deep is the road for everyone else."),
        ]),
        ("prospecting", "The Prospector's Pick", "geolosys:prospectors_pick", [
            txt(B("Surface rocks") + " (samples) mean a deposit under that chunk: they lie near the chunk's middle, not straight above the ore, and say nothing about depth. Break one for a cluster of its metal.",
                "Geolosys hands you its own " + B("Field Manual") + " on first join. It lists every deposit, what it drops and at what depth."),
            txt(B("Flint Prospector's Hammer") + " (day one: flint, cobblestone, sticks): tap a block face: it names ores 3 blocks in that way, and in a 9 by 9 column 64 down, with how much and roughly how deep. 32 uses.",
                B("The prospector's pick") + " answers where: right-click stone and it names the ore within 5 blocks of that face and which way it lies; if none, what is anywhere in the chunk. It never breaks."),
            craft("peacock:flint_prospectors_hammer", "Tap the ground where the rocks are. Nothing? Walk on: the deposit may be in the next chunk, or deeper than 64 blocks."),
            craft("peacock:prospectors_pick", "Three ingots of any common metal (iron, copper, tin, zinc, lead, nickel, aluminium) and two sticks. Tap exposed stone, not dirt."),
            craft("geolosys:crafting/field_manual_from_crafting", "Lost the manual? Craft one. While you hold the pick, the corner of the screen shows how far below sea level you are."),
            txt(B("Metals you will need, in order:") + " copper and iron (homestead; iron is common and shallow), then " + B("zinc") + " (brass needs it, and brass needs a Blueprint), then gold and coal in bulk once machines run.",
                "The first player to find zinc should tell everyone. That is a trade route being born."),
        ]),
        ("deposits", "Every Ore at a Glance", "geolosys:sphalerite_ore", [
            txt("Geolosys names each deposit after its " + B("mineral") + ", the real name of that ore in the ground. The mineral tells you the metal: there is no iron ore block, there is hematite.",
                "Shallow to deep. The next three entries give each ore: what it drops, where, and what it is for."),
            txt(LI("Malachite (copper) Y -16 to 90", "Coal Y 34 to 78", "Cassiterite (tin) Y 44 to 68", "Bauxite (aluminum) Y 48 to 65", "Hematite (iron) Y 32 to 60", "Sphalerite (zinc) Y 37 to 46, mountains"), title="Shallow"),
            txt(LI("Lignite (soft coal) Y -4 to 32", "Galena (lead + silver) Y -16 to 32", "Gold Y -64 to 32, dry land", "Platinum Y -25 to 19", "Lapis Y -64 to 64", "Azurite (copper) Y -49 to 13", "Cinnabar (redstone) Y -60 to 15"), title="Middle"),
            txt(LI("Beryl (emerald) Y -56 to 19", "Bituminous coal Y -32 to -16", "Limonite (nickel + iron) Y -48 to -32", "Teallite (tin) Y -52 to -40", "Kimberlite (diamond) Y -64 to 10", "Quartz Y -64 to -48", "Anthracite (hard coal) Y -64 to -52"), title="Deep"),
            txt(LI("Galena (lead + silver) Y -56 to -16", "Limonite (nickel + iron) Y -56 to -44", "Platinum Y -56 to -20", "Cassiterite (tin) Y -56 to -16", "Gold Y -64 to -24"), "Smaller than the regional deposits, found under any biome.", title="Deep, everywhere"),
            txt(B("Now and then you strike it rich.") + " Nine deposits in ten are the usual size; about one in ten is a " + B("big strike") + " of two to three times the ore. Worth telling the others about.",
                "Deposits only replace stone, so a cave, a dirt bank or the surface takes its bite: what you dig out is often less than the deposit was."),
            txt(B("Mining:") + " ore drops " + B("clusters") + ", never raw ore; deepslate metal ore drops one to two. " + B("Fortune") + " gives more clusters. " + B("Silk Touch") + " gives the ore block itself.",
                B("Processing:") + " a cluster smelts to one ingot. A millstone or crushing wheels crush it, and washing (an encased fan through water) turns crushed ore into nuggets with a bonus. Uranium is not in this world."),
        ]),
        ("ores_shallow", "Shallow Ores", "geolosys:malachite_ore", [
            txt(B("Malachite") + " (green): copper. Y -16 to 90, anywhere. Create's pipes and copper casing, bronze, Ironworks copper tools, constantan.",
                B("Coal") + ": coal. Y 34 to 78. Fuel, torches, steel."),
            txt(B("Cassiterite") + " (pale tan): tin. Y 44 to 68, sandy ground; deep under anywhere. Bronze (copper + tin in a basin), tin tools and armour (stone-grade, early), lanterns. Toolsmiths buy it.",
                B("Bauxite") + " (tan): aluminum. Y 48 to 65. The airship metal: aluminum sheets make aircraft hulls and propellers. Light, fast tools and armour. Toolsmiths buy it."),
            txt(B("Hematite") + " (dark red): iron. Y 32 to 60, everywhere, the most common deposit. Everything.",
                B("Sphalerite") + ": zinc. Y 37 to 46, under mountains only. Brass, the hinge of the whole Create tree. Find it early and tell everyone where."),
        ]),
        ("ores_middle", "Middle Ores", "geolosys:galena_ore", [
            txt(B("Lignite") + ": soft coal. Y -4 to 32. Fuel.",
                B("Galena") + " (dark grey): lead " + B("and") + " silver, both from every block. Y -16 to 32 under plains; Y -56 to -16 anywhere. Lead: shot for muskets, cannons and ships, lead pipes, heavy tools and armour. Silver: electrum, electron tubes, gear that bites the undead."),
            txt(B("Gold") + ": gold. Y -64 to 32, dry land only (desert, badlands, savanna). Create's precision mechanisms, electrum, golden food.",
                B("Platinum") + ": platinum. Y -25 to 19 under mountains; deeper anywhere. Near-diamond tools and armour; platinum sheets make quicker precision mechanisms and better engines. Clerics pay well."),
            txt(B("Lapis") + ": lapis. Y -64 to 64.",
                B("Azurite") + " (dark blue): copper, the deep kind. Y -49 to 13.$(br)" + B("Cinnabar") + " (red): redstone. Y -60 to 15. Create's rose quartz, electron tubes, every contraption with a switch."),
        ]),
        ("ores_deep", "Deep Ores", "geolosys:limonite_ore", [
            txt(B("Beryl") + " (green): emeralds. Y -56 to 19. Trade, and the Blueprint charters.",
                B("Bituminous coal") + ": Y -32 to -16. Fuel.$(br)" + B("Anthracite") + ": Y -64 to -52. Drops ordinary coal."),
            txt(B("Limonite") + " (yellow): nickel " + B("and") + " iron. Y -48 to -32 in marshes; Y -56 to -44 anywhere. The only nickel: long-lasting nickel gear, constantan (copper + nickel), invar (iron + nickel). Armorers buy it.",
                B("Teallite") + ": tin, in deep dikes shared with beryl. Y -52 to -40."),
            txt(B("Kimberlite") + " (cyan flecks): diamonds. Y -64 to 10.",
                B("Quartz") + ": nether quartz, here the only source: Geolosys took the Nether's veins too. Y -64 to -48. Rose quartz (with redstone), comparators, observers."),
            txt(B("Nether:") + " poor gold Y 10 to 40, ancient debris Y 8 to 22, both as deposits with samples. Ancient debris clumps smelt to netherite scrap.",
                B("Peat") + " lies in swamp ground and burns. Granite, diorite and andesite come in plutons, which is why a hillside is sometimes one stone."),
        ]),
        ("metals", "What the Metals Are For", "create_ironworks:bronze_ingot", [
            txt(B("Tools and armour") + " in every metal. Ironworks makes copper, bronze, brass and steel. Tin is early; lead heavy (shrugs off knockback); silver enchantable and bites the undead; nickel lasts.",
                "Aluminum is light and fast; electrum fastest and most enchantable, but fragile; constantan the workhorse; invar hard-wearing; platinum near diamond."),
            txt(LI(B("Lead") + ": shot, ship cannonballs, pipes", B("Silver") + ": electrum, electron tubes", B("Aluminum") + ": aircraft hulls, propellers", B("Platinum") + ": engines, precision mechanisms", B("Bronze") + ": cannons, ship guns"), title="Each metal's job"),
            txt(LI(B("Constantan") + ": thermometers, telescopes", B("Invar") + ": the hearth, aircraft boilers", B("Electrum") + ": transmitters, content observers", B("Tin") + ": lanterns"),
                "Silver and platinum are the rare ones, and electrum needs silver."),
            txt("Alloys mix in a " + B("heated basin") + ": electrum is gold + silver, constantan copper + nickel, invar two iron + nickel. Every metal also has a storage block.",
                "Smiths, armorers and clerics buy the rarer metals for emeralds, bounty boards ask for them, and Spartan Weaponry makes weapons of all of them."),
        ]),
        ("gear", "Tools & Armour in Every Metal", "peacock:platinum_pickaxe", [
            txt("Every metal makes the full set, tools and armour, in the usual shapes. Each repairs with its own ingot and takes armour trims. Which to carry:",
                LI(B("Tin:") + " early and soft; stone-grade mining, a step up from copper.", B("Lead:") + " heavy. Iron-grade, slow swing, hits harder; the armour shrugs off knockback.")),
            txt(LI(B("Silver:") + " soft but very enchantable; its tools and weapons do half again as much to the undead.", B("Nickel:") + " iron that lasts longer.", B("Aluminum:") + " light and fast, wears quickly, enchants well.", B("Electrum:") + " the fastest tools and the best enchanting; fragile.")),
            txt(LI(B("Constantan:") + " the workhorse, between iron and steel.", B("Invar:") + " hard-wearing, the longest life short of platinum; the armour has a little toughness.", B("Platinum:") + " diamond-grade mining, close to diamond's life, and it enchants better than diamond.")),
            craft("peacock:gear/tin_pickaxe", "Vanilla's shapes, ingots and sticks. Silver for graveyards, lead for the gate.", recipe2="peacock:gear/lead_sword"),
            craft("peacock:gear/platinum_chestplate", "Armour likewise. Only lead resists knockback; platinum is nearest diamond.", recipe2="peacock:gear/invar_helmet"),
            txt("Ironworks adds copper, bronze, brass and steel sets on top; Spartan Weaponry makes its daggers, spears, longbows and the rest of all these metals too.",
                "Alloys (" + L("ore/metals", "What the Metals Are For") + ") mix in a heated basin: electrum, constantan and invar are made, not mined."),
        ]),
        ("artifacts", "Treasures: Artifacts", "artifacts:night_vision_goggles", [
            spot("artifacts:night_vision_goggles", B("Artifacts") + " are worn treasures: goggles that see in the dark, a scarf of invisibility, digging claws, a lucky scarf, running shoes, a cloud in a bottle (a double jump), about forty in all. Nobody crafts them; they are found.", title="Artifacts"),
            txt(B("Where:") + " mineshaft, ancient city, stronghold, temple and outpost chests; small " + B("campsites") + " deep underground (a bed, a lantern, a chest, barrels); and now and then on a zombie or skeleton that wore one and dropped it.",
                B("Mimics:") + " about a third of campsite chests bite. Hit it before you open it if it looks too good."),
            txt(B("Wearing them:") + " open your inventory and click the " + B("Curios") + " button beside it: rings, necklace, belt, charm, hands, head, feet. Cataclysm's boss accessories go in the same slots.",
                "Hover an artifact for what it does. Most work the moment they are worn."),
        ]),
        ("caving", "What Caves Are For", "minecraft:torch", [
            txt("Geolosys took every vanilla vein, so ore is in deposits, not sprinkled through the stone. Caves are how you reach the deep ones, and the deep pays better:",
                LI(B("Deep deposits") + " under every biome: lead and silver, nickel, platinum, tin, gold. A deep cave finds them in its walls.", B("Deepslate metal ore") + " gives one to two clusters a block.")),
            txt(LI(B("Mineshafts and dungeons:") + " YUNG's, plus Repurposed Structures' biome versions (icy, desert, jungle, swamp...). Cataclysm's ruins and Ancient Factory.", B("Chests pay more the deeper they are:") + " every underground chest carries ore; below Y 0 it adds the rare metals, below Y -32 diamonds and platinum.")),
            txt(LI(B("Cave goods sell:") + " bounty boards ask for amethyst, glow lichen, dripstone, moss, spore blossoms, sculk and echo shards; the capital's later projects want glow berries, deepslate and amethyst.", B("The deep dark") + " holds the Warden, one of the three holders of the Ender logistics Blueprint (" + L("tech/tier4", "Tier 4") + ").")),
            txt("Rumour maps to the deeper bosses turn up in the same chests. A mineshaft is a good first expedition: wood, rails, chests, and the way to the deposits below.",
                "Bring a bed, torches and a dog. Mobs are smarter here than you remember."),
        ]),
    ],
    # ===================================================================================== towns
    "towns": [
        ("capital", "The Capital", "minecraft:bell", [
            txt("The capital is the village you spawned in and the only old town alive. It is the one shared spawn: settlers arrive there, raids are drawn to it, and the first station, dock and market will be there.",
                "It belongs to everyone; no faction can claim it or found a town in it. Build in it, but build with the town, not over it."),
            txt(B("What makes a town a town") + " here: a bell, beds, and villagers who sleep in them. Several mods check for exactly that. Trading depots, bounty boards and caravan stops all want a real settlement around them.",
                "A hole in the ground with one librarian is not a town, and the pack will tell you so."),
            txt(B("Growing it:") + " more beds and workstations draw more villagers; Village Expansion lets a town build itself out; guards hold the wall; workers tend the fields.",
                "Like all land, the capital only runs while someone is near: its farms, villagers and guards rest while it is empty."),
        ]),
        ("villagers", "Villagers Worth Keeping", "minecraft:emerald", [
            txt("Villagers here are people, not vending machines. " + B("Villager Comfort") + ": a villager without a bed, light and food trades badly; a happy village trades well.",
                B("Sleep to restock") + ": a villager refreshes its trades once a day, when it wakes from a night in a bed. No bed, no restock; buying out one librarian all day does not work."),
            txt("Together they make trading halls pointless and towns valuable: the best prices are in a real village with real beds, and the way to more trade is " + B("more villages") + ", not more cells.",
                B("Create Better Villagers") + " gives them Create goods to sell and buy. Villager trades are also how Blueprints spread once towns learn them."),
            txt(B("Workers") + " (Villager Workers): hire a farmer, miner, lumberjack, fisherman or shepherd with emeralds. Give them a chest, a bed and food and they work the area you set. They are the first labour you can buy.",
                "In a town, workers earn the town its income (" + L("towns/town_life", "How a Town Lives") + ")."),
        ]),
        ("caravans", "Bounties, Caravans & Depots", "bountiful:bountyboard", [
            txt(B("Bountiful") + " boards post jobs: bring brass, kill pillagers. A new board pays in kit (iron tools, chainmail, winter fur); a grown one in emerald blocks, saddles and enchanted books.",
                "Each finished bounty raises the board's standing, shared by all. At ten, " + B("sealed rumours") + " (a map to a boss); at fifteen, journals and totems; at thirty, a named weapon."),
            craft("bountiful:crafting/bountyboard", "The capital's board works for everyone; a new town can craft its own. Decrees set what a board asks for; Archivist's Records pays in writings."),
            txt(B("Caravans & Convoys") + ": merchant caravans travel between settlements with wagons, and you can run your own. Build a stop and routes open. This is the mid-game economy before rail.",
                "Raiders know the roads too."),
            txt("Late game, the " + B("Trading Floor") + " lets a train sell on a schedule: a depot in a real town, goods in, emeralds out, while you are elsewhere.",
                "Depots need a Blueprint and a town with a bell and beds. There is no version that works in a hole in the ground."),
        ]),
        ("works", "The Capital Works", "minecraft:lectern", [
            txt("The " + B("Clerk of the Works") + " stands by a lectern on the capital's square. Talk to her: she shows the project the whole server is paying for, what it still needs, and who has given most.",
                "Give emeralds (16 or 64 at a time), what you hold, or everything in your pack that is on the list."),
            txt("When a project is paid for, its building goes up just outside the wall and its people move in. In order: " + B("the Forge") + ", " + B("the Scriptorium") + ", " + B("the Market") + ", " + B("the Infirmary") + ", " + B("the Rail Station") + ", " + B("the Lighthouse") + ".",
                "Last of all: " + B("Relight a Dead Town") + ". The nearest abandoned ruin is cleared, its zombie villagers cured, and settlers move in around a new bell."),
            txt("Each project wants emeralds and materials: stone bricks, logs, iron, glass, wool, and later Create parts and track. The later ones are big; a server builds them together over weeks.",
                B("/peacock projects") + " shows progress from anywhere."),
        ]),
        ("services", "Capital Services", "minecraft:anvil", [
            txt(B("Smith") + " (the Forge): repairs what you hold for emeralds, by how worn it is. No XP, no \"too expensive\". He also clears anvil penalties and renames.",
                B("Scribe") + " (the Scriptorium): writes a copy of any Blueprint you know, for a friend, at half the charter price and a sheet of paper. Copies books and maps."),
            txt(B("Physician") + " (the Infirmary): golden apples and potions on her table; sneak and talk for cures, lifting Bad Omen, and curing a zombie villager you bring her.",
                B("Undertaker") + ": brings your latest corpse to the capital graveyard, priced by distance; refunded if nothing is left."),
            txt(B("Courier") + " (the Station): sends what you hold to any player, by rail. The further away they are, the longer it takes; it waits for them if they are offline.",
                B("Keeper") + " (the Lighthouse): a compass that always points to the lamp. " + B("Exchange Merchant") + " (the Market): ore from other regions, rare saplings, patterns and trims; fresh each dawn."),
        ]),
        ("steward", "The Steward", "peacock:steward_contract", [
            txt("Land only runs while someone is near it, and force-loaded claims only run while their team is online. To keep a farm going while you sleep, hire a " + B("steward") + ".",
                "The Clerk sells his contract (16 emeralds). Use it where he should live."),
            txt("Pay him by talking to him. While you are away he keeps the " + B("3x3 chunks") + " around him running and takes " + B("one emerald every 40 minutes") + ". When his purse is empty your land waits for you; nothing is lost.",
                "He can be killed: wall him in. Dismissing him returns half his purse."),
        ]),
        ("shopping", "What Villagers Sell", "minecraft:emerald_block", [
            txt("Villagers sell more than the old trades: farmers sell Farmer's Delight seeds and pies, fishermen Aquaculture tackle, leatherworkers waterskins and furs, masons Create Deco and roof blocks.",
                "Smiths sell bronze tools, armour and Spartan alloy weapons; cartographers sell sealed rumours."),
            txt("Nothing a Blueprint locks is ever on sale. Pies and preserved meat cost half again as much in " + B("winter") + ", when nothing grows.",
                "Curing a villager still makes it cheaper, but never nearly free: the discount from a cure is capped."),
        ]),
        ("new_towns", "The New Towns", "recruits:recruit_block", [
            txt("Every living settlement besides the capital is new: a " + B("tower") + " the survivors raised, a bell, a recruit table, and a town that builds itself out from there. They are small, rough and growing, and they have names.",
                "A tower rises only when someone walks near. Follow new roads, or earn a sealed rumour of smoke from a new tower on a bounty board."),
            txt("Each town is a " + B("faction") + ": a leader, a garrison, a treasury, a merchant and a Noble. It farms, mines, trades, sends convoys down the roads, founds new towns when rich and goes to war when it must, whether or not you take part.",
                "Villagers and soldiers belong to the town whose " + B("bed") + " they sleep in. Everything else follows from that."),
            txt(B("Reclaiming:") + " a recruit table and a bell in a dead village found a new town there, far enough from other towns. The builders put the new over the old.",
                "No town can be founded or claimed near the capital: it is neutral ground, for everyone."),
            rel(["towns/joining", "towns/recruits", "towns/town_life", "towns/town_trade", "towns/war", "towns/leading"], "Everything about the towns, in order.", title="The Towns"),
        ]),
        ("joining", "Joining a Town", "minecraft:white_banner", [
            txt("You never have to join anything. Staying " + B("factionless") + " is a real way to play: you can take work from any town, trade with all of them and pick sides in their wars as you like.",
                "To enlist, stand near a town's centre (its bell) and say in chat:$(br)" + B("I would like to join your army")),
            txt("The nearest town within 40 blocks answers. Walking into a town that would have you prints the invitation once. You belong to one faction at a time.",
                "A member can speak to the town's leader (right-click) for the leader's screen, and stands with the town in its wars from then on."),
            txt(B("Useful commands:") + LI("/vrcontracts standing: what every faction thinks of you, and why", "/vrintel: what your faction knows about its neighbours", "/vrconvoy: convoys on the road", "/vrconfig: what this server has switched on")),
        ]),
        ("recruits", "Recruits & Guards", "minecraft:iron_sword", [
            txt("Villages arm " + B("Guard Villagers") + " to hold a wall: hand a villager a sword or crossbow and they take the post. " + B("Recruits") + " are soldiers you hire and own: command them with " + B("R") + " and teams with " + B("U") + "."),
            ent("recruits:recruit", "Recruits follow, hold, patrol and guard. They die for good, so give them armour. Pay is emeralds per hire.", scale=0.9),
            txt("Hiring is " + B("locked") + " until the Mutant Skeleton falls: the drill that made soldiers of farmers was lost with it (" + L("tech/tier1", "Tier 1") + "). Guards are not locked; a wall can always be manned.",
                B("Hiring:") + " right-click a recruit with emeralds in hand; the price is on the screen. Shift-right-click one for his own screen: inventory, equipment, upkeep."),
            txt(B("Food is how they heal.") + " A recruit has a hunger bar like yours; a full belly heals him fast, an empty one not at all. Fighting and healing make him hungry; standing and marching do not. A loaf of bread is worth about seven hit points.",
                "Cooked food heals faster than raw."),
            txt("At a quarter health a recruit with food in his pack breaks off, eats, and goes back in. One with an empty pack fights on. The " + B("Hold the line") + " button on his screen stops him ever withdrawing: for the man on the gate.",
                "Starving never kills a recruit; it leaves him useless until fed. They gain levels and better aim with experience."),
        ]),
        ("town_life", "How a Town Lives", "minecraft:hay_block", [
            txt(B("Money:") + " villagers and workers earn a town its income: some to the treasury, some to a fund for founding new towns, some to buying blocks for its builder. The builder lays out a plan and builds it one house at a time, paying in materials it really has.",
                "Those materials sit in the town's chests. They can be stolen, and the town notices."),
            txt(B("Food:") + " every soldier carries rations from the town's granary, filled by wheat farms and animal pens. A town without a farm can arm an army but not keep it fighting. An empty granary is how rebellions start.",
                B("Sleep:") + " off-duty soldiers go to bed, one per bed, and heal while they sleep. A quarter stay on watch. They wake for any real attack."),
            txt(B("Mines:") + " every town mine sits on its own deposit. All have coal, iron and copper; each also has a few seams of rarer ore, and they differ. A town chooses its soldiers' gear from what its own mines can keep supplying.",
                "So a neighbour in armour you do not recognise is sitting on a seam you lack. Trade for it, escort it, or take it."),
            txt("Leave a metal in a town's chests and it counts as that town's supply: keep a friendly town stocked and its soldiers re-arm in that metal. Stop, and over the next hour they fall back to what they mine.",
                "The capital of every faction trickles a little wood, stone, sand and wool on its own, so no town is ever completely stuck."),
        ]),
        ("town_trade", "Merchants & Contracts", "minecraft:emerald_block", [
            txt(B("The merchant") + " trades both ways: he buys what his town needs for emeralds, and his Buy tab sells what it has to spare. A town only sells above what it wants to keep, so a rich neighbour's shelf tells you what it is sitting on.",
                "Buying back always costs more than you sold for. What a merchant wants to buy shows what the town is planning."),
            txt(B("The Noble") + " keeps a contract board (sneak-click him): cull monsters, stand a night watch, haul a material. Finished work pays emeralds and " + B("standing") + " with that faction, and only that one.",
                "Standing opens a faction's better contracts, its shop and eventually its gates."),
            txt(B("Losing standing:") + " killing a faction's people costs it. Far enough down and it posts a " + B("bounty") + " on you that other players can take, and its soldiers attack on sight. A player-run faction's leader can pardon you; a town run by the villagers never forgets.",
                "Check where you stand with /vrcontracts standing."),
        ]),
        ("war", "War, Scouts & Sides", "minecraft:crossbow", [
            txt("Towns choose their own friends and enemies from strength, wealth and distance. They cannot attack a place they have never found: first they send a " + B("scout") + " and four escorts. Kill the party and the attack never comes until they try again.",
                "A town that loses its capital may split; a badly run one may see a village rebel."),
            txt(B("A town fights as an army.") + " Commanders count the enemy by its gear, not its heads, and the leader orders each group: close in, stand off and shoot, hold the line, or keep away. The wounded are pulled out to heal; a man in a lost fight may run for good.",
                "Your own recruits take orders only from you."),
            txt(B("Picking a side:") + " in a battle between two towns you belong to neither, the " + B("first soldier you hit") + " decides: you have joined the other side. Your new side cannot hurt you, nor you them. Civilians take three swings to count.",
                "A bar at the top of the screen shows the two sides."),
            txt("If your side wins and you are still there, that faction remembers it: standing, paid once per fight, never per kill. Backing the loser costs nothing. The commitment ends with the battle.",
                B("Anger a town") + " and it sends a scout to size you up, then a party. It will not follow you into someone else's town."),
            txt(B("Restless nights:") + " kill a town's villager or soldier and your bed refuses you for the rest of that day, in war or peace. A war fought without a pause is a war fought in the dark.",
                "When a town loses most of its people the chat says so. A town with nobody left has perished; its buildings stay, and it can be resettled."),
        ]),
        ("leading", "Leading a Faction", "minecraft:golden_helmet", [
            txt("Found a town (" + L("towns/new_towns", "Reclaiming") + ") and you lead a faction. Nothing declares war, accepts an alliance or answers a call to arms without you: the town proposes, you decide. Refusing an ally's call breaks the alliance; ignoring it does not.",
                "A faction holds at most " + B("four") + " towns here."),
            txt(B("Scouting:") + " open the map (" + B("N") + "), enter command mode, right-click one of your towns, Send scouts, then click where to look. A report shows the defenders and their gear as they were that day, and puts the town's borders on your map.",
                "Each town can send a party every couple of minutes."),
            txt(B("Your shop:") + " the merchant's Offers tab sets what all your merchants buy and sell, and at what price. The Stock tab sets a " + B("reserve") + " per material that nothing will spend below. The Goods tab tells your towns to make an item, keep so many in stock and sell it.",
                "Your soldiers are always supplied first."),
            txt(B("Armoury:") + " your loadouts are yours: change one and your troops re-equip at once. Towns you lead keep researching on the tech tree in their own screen.",
                B("Moving troops:") + " a convoy between two of your own towns carries soldiers, who walk the road and can be met on it. Goods only travel to allies."),
        ]),
    ],
    # ===================================================================================== threats
    "threats": [
        ("night", "The Night", "minecraft:rotten_flesh", [
            txt("Mobs are tougher and smarter. Mutants wander rarely and are not ordinary zombies. Mowzie's and Cataclysm creatures guard places that look like they should be guarded. Savage & Ravage creepers come in flavours.",
                "Light still works. Walls still work. Dogs work best."),
            txt(B("Combat is Better Combat:") + " weapons swing in arcs with real reach, and holding attack keeps swinging. Daggers are fast, greatswords are slow and wide, spears and pikes hit before they reach you.",
                B("Spartan Weaponry") + " adds all of those plus longbows, heavy crossbows, javelins and throwing axes; " + B("Spartan Shields") + " add shields that actually differ."),
            craft("spartanweaponry:iron_spear", "Reach keeps a creeper where it belongs. Pair it with a shield.", recipe2="spartanshields:iron_basic_shield"),
            txt(B("Muskets") + " (Musket Mod): flintlock muskets, pistols and blunderbusses. Loud, slow to load, and they hit like a wall. Cartridges need gunpowder, which is on the ladder (Blasting, Mutant Creeper). Recruits will carry them too.",
                B("Corpses") + ": your items wait on your body. Nothing despawns."),
            txt(B("How fighting works:") + " hold the attack button and you keep swinging. Each weapon has an arc and a reach: a dagger is a stab, a greatsword sweeps three mobs, a spear hits two blocks out. Two-handed weapons empty your off hand. There is no attack cooldown to time; there is distance and timing.",
                "Shields block in a cone; a parrying dagger blocks fast. Fire from a musket breaks a shield."),
            txt(B("Dogs:") + " tame a wolf, then feed it a " + B("Training Treat") + " to make it a dog (Doggy Talents). Dogs learn talents, carry things, fight well and come back. Whistle commands are on " + B("Shift+1..4") + ".",
                "A dog bed is a home; a dog with Pack Puppy is a backpack with teeth."),
            craft("doggytalents:training_treat", "Treat a tamed wolf; a stick on the dog opens its talents.", recipe2="doggytalents:dog_bed"),
        ]),
        ("pillagers", "The Pillager Faction", "minecraft:crossbow", [
            txt("Pillagers are villagers who left (" + L("story/painted_ones", "The Painted Ones") + "). Outposts, forts, camps and the villages they hold are full of what they took, and their captains carry the ledgers of the old trade.",
                B("Illager Invasion") + " adds the ranks: basher, provoker, sorcerer, alchemist, firecaller, necromancer, archivist, inquisitor, marauder, and the " + B("Invoker") + " of a fort."),
            txt(B("Raids") + " come from Bad Omen (kill a captain, carry the curse into a town) and from the illagers themselves, who grow bolder as the server does. A village with guards and walls holds; one without does not.",
                B("Savage & Ravage") + " and " + B("Respillaged") + " make outposts worth the fight: loot, totems, creepers you did not expect."),
            ent("illagerinvasion:invoker", "The Invoker: the fort's master. Summons, shields, teleports, and does not fight alone. Bring recruits. It holds the trading ledgers: the Trading Floor Blueprint.", scale=0.8),
            txt(B("Totems") + " (Respillaged) summon captains when you are ready, which is how late Blueprints stay available on a busy server: nobody waits on worldgen for a boss that can be called."),
        ]),
    ],
    # ===================================================================================== bosses
    "bosses": [
        ("where_they_are", "Where They Are", "minecraft:compass", [
            txt(LI(B("Overworld, anywhere:") + " Mutant Zombie, Skeleton, Creeper, Enderman (they wander); Ferrous Wroughtnaut (a chamber under the ground, never under oceans)", B("Snow:") + " Frostmaw; Maledictus (Frosted Prison)", B("Savanna:") + " Umvuthi (Umvuthana grove)", B("Stony shores:") + " Naga")),
            txt(LI(B("Peaks:") + " the Sculptor's monastery", B("Desert:") + " Ancient Remnant (Cursed Pyramid)", B("Deep ocean:") + " the Leviathan (Sunken City); Scylla (Acropolis, warm ocean)", B("Underground:") + " the Harbinger (Ancient Factory)", B("Ocean monuments:") + " Elder Guardians", B("Illager country:") + " the Invoker (Illager Fort)")),
            txt(LI(B("Deep dark:") + " the Warden (ancient cities, deep under mountains)")),
            txt(LI(B("Nether:") + " Torte (Quartz Kitchen, quartz flats); Radiation Director (Nether Reactor, toxic heap); Ignis (Burning Arena, infernal dunes and ash); Netherite Monstrosity (Soul Blacksmith, withered forest); the Hovering Inferno (summoned at an Infernal Altar with a nether star; loot, not a Blueprint)", B("End:") + " Ender Guardian (Ruined Citadel)")),
            rel(["bosses/mutants", "bosses/mowzies", "bosses/illagers", "bosses/cataclysm", "bosses/incendium"], "Each family has a page with the fights.", title="Families"),
        ]),
        ("finding", "Finding a Boss", "minecraft:map", [
            txt("Bosses live in places. Finding the place is most of the fight, and the pack never lets you type a command for it.",
                B("Biomes:") + " Nature's Compass finds snow, savanna, desert, peaks. Half the ladder is biome-bound (" + L("bosses/where_they_are", "where they are") + ")."),
            txt(B("Rumour maps:") + " outposts, forts, Create workshops and underground villages carry maps in their chests that point at a boss structure. Loot an outpost, read the map, go.",
                B("Cartographers") + " will sell the same maps once a town knows the way. Ask in the capital first."),
            txt(B("Eyes") + " (Cataclysm): each dungeon has an Eye that points to it. Eyes are loot from other dungeons and from the lesser ruins (abandoned spires, temples, villages). The Harbinger's factory is underground; its Eye waits in the pyramid and the prison.",
                "Mark everything on the atlas. One shared atlas on a lectern in the capital is the server's map room."),
        ]),
        ("mutants", "The Mutants", "mutantmonsters:mutant_skeleton_rib_cage", [
            txt("Mutant Monsters are what the dark age did to ordinary mobs. They spawn rarely wherever their lesser kind does, so the first one you meet will be near home. Iron armor, a dog and a bed nearby are enough.",
                "They are Tier 1 of the " + L("tech/tier1", "ladder") + "."),
            ent("mutantmonsters:mutant_zombie", "Mutant Zombie: slams, throws, and gets back up once. Kite it, hit it while it recovers, finish it while it is down. Holds " + B("Brass") + ".", scale=0.55),
            ent("mutantmonsters:mutant_skeleton", "Mutant Skeleton: a long-range archer that melees when you close. Shields matter. Holds " + B("Recruiting") + ".", scale=0.55),
            ent("mutantmonsters:mutant_creeper", "Mutant Creeper: charges and explodes, spawning minions. Fight it away from anything you like; a spear and distance. Holds " + B("Blasting") + ".", scale=0.6),
            ent("mutantmonsters:mutant_snow_golem", "Mutant Snow Golem: never wild. Splash a snow golem with Chemical X and it becomes yours: a pet that hurls ice at your enemies. Holds nothing.", scale=0.6),
            ent("mutantmonsters:mutant_enderman", "Mutant Enderman: teleports, throws blocks, clones. Water hurts it; fight by a lake. Holds " + B("Brass") + ", like the Mutant Zombie: the second road to the hinge of the tree.", scale=0.5),
        ]),
        ("mowzies", "Mowzie's Guardians", "mowziesmobs:wrought_helmet", [
            txt("Mowzie's Mobs bosses stay where they are born and defend a place. Each has its own rules; the structure tells you the rules before the fight does.",
                "Ferrous Wroughtnaut, Naga, Umvuthi and the Frostmaw are all " + L("tech/tier2", "Tier 2") + "."),
            ent("mowziesmobs:ferrous_wroughtnaut", "Ferrous Wroughtnaut: an armoured knight in a chamber under the ground. Only its back is weak, and only after it swings. Patience, not damage. Holds " + B("Trains") + ".", scale=0.55),
            ent("mowziesmobs:naga", "Naga: coastal cliff flyers that spit acid and dive. Shoot them while they hover; they land when hurt. Holds " + B("Ships") + ".", scale=0.6),
            ent("mowziesmobs:umvuthi", "Umvuthi: the sun chief of an Umvuthana grove in the savanna. His followers come first; he fights with solar fire. Holds " + B("Diesel") + ".", scale=0.6),
            ent("mowziesmobs:frostmaw", "Frostmaw: a sleeping giant on an ice crystal in the snow. Wake it and it charges, freezes, slams. Warm clothes and a wall to hide behind. Holds " + B("Climate control") + ".", scale=0.45),
            ent("mowziesmobs:sculptor", "The Sculptor on the peaks is not a fight but a test of climbing. Pass it and it gives a tool. Not on the ladder, worth the climb.", scale=0.8),
        ]),
        ("illagers", "The Illager Masters", "minecraft:white_banner", [
            txt("Illager bosses are fought with their armies. They are the social tier: a squad of recruits and a friend are the intended answer.",
                "The Invoker and the totem captains of Respillaged all hold the " + L("tech/tier2", "Tier 2") + " Trading Floor."),
            ent("illagerinvasion:invoker", "The Invoker in the Illager Fort. Shields itself, calls fangs, blinks. Kill the fort's garrison first or it never ends. Holds the " + B("Trading Floor") + ".", scale=0.8),
            ent("illagerinvasion:necromancer", "Necromancers raise the dead you have already killed. In a raid they are the first target. Not a boss, but the reason raids end badly.", scale=0.8),
            txt(B("Totem captains") + " (Illage & Spillage, Respillaged): summoned with totems looted from outposts. Spellcasters and brutes with phases. They are summonable, so a full server never waits on worldgen for them.",
                "They hold the richest loot in the pack, and the illagers' stolen ledgers: any of them can drop the " + B("Trading Floor") + " Blueprint."),
        ]),
        ("cataclysm", "Cataclysm's Titans", "cataclysm:ignitium_ingot", [
            txt("L_Ender's Cataclysm bosses live in dungeons that are fights in themselves. Each dungeon drops an Eye that points to the next. They are Tier 3 and 4.",
                "Bring two people and a plan. These are not soloed in iron."),
            ent("cataclysm:ancient_remnant", "Ancient Remnant in the Cursed Pyramid (deserts). A desert king with charges and sandstorms. The pyramid's traps are half the fight. Shares " + B("Netherite") + " with the Monstrosity.", scale=0.45),
            ent("cataclysm:maledictus", "Maledictus in the Frosted Prison (snow). A knight with a halberd and lightning phases. Fought in a ring; do not leave it. Holds " + B("Cannons") + ".", scale=0.55),
            ent("cataclysm:the_harbinger", "The Harbinger in the Ancient Factory (underground). A machine of lasers and missiles. Fight it in the open floor; the walls shoot back.", scale=0.4),
            ent("cataclysm:ignis", "Ignis in the Burning Arena (Nether dunes and ash). A flame knight with a shield to break. Fire resistance is mandatory. Holds " + B("Arcane industry") + " (as does the Harbinger).", scale=0.55),
            ent("cataclysm:netherite_monstrosity", "Netherite Monstrosity in the Soul Blacksmith (withered forest). Lava, slams, a magma bombardment. Holds " + B("Netherite") + " and heavy calibres.", scale=0.35),
            ent("cataclysm:the_leviathan", "The Leviathan in the Sunken City (deep ocean). Invincible outside water; fight it in its element with water breathing. Shares the " + B("precision parts") + " with the Director.", scale=0.3),
            ent("cataclysm:scylla", "Scylla in the Acropolis (warm ocean). Storm and sea. Shares " + B("Ender logistics") + " with the Ender Guardian: the road for those who never reach the End.", scale=0.4),
            ent("cataclysm:ender_guardian", "Ender Guardian in the Ruined Citadel (the End). The last fight. Holds " + B("Ender logistics") + ": the lost capital's last secret.", scale=0.55),
            ent("minecraft:warden", "The Warden, in the ancient cities of the deep dark. Blind; it hunts by sound. Sneak, or bring friends and a plan. Holds " + B("Ender logistics") + ", the road for those who stay underground.", scale=0.5),
        ]),
        ("incendium", "The Nether's Keepers", "minecraft:blaze_powder", [
            txt("Incendium's bosses are vanilla mobs rebuilt, so they do not pose for a portrait. They are found by structure.",
                B("Torte") + ", the skeleton chef, in the " + B("Quartz Kitchen") + " of the quartz flats. Fast, throws cake, deadly cake. Holds " + B("Advanced cooking") + " (Tier 2: the Nether is the trip)."),
            txt(B("Radiation Director") + " in the " + B("Nether Reactor") + " of the toxic heap: a wither skeleton overseer in a maze of radiation, far tougher than it looks once roused. Holds the reactor's " + B("precision parts") + " (Tier 3).",
                B("Hovering Inferno") + ": summoned at an " + B("Infernal Altar") + " in the dunes with a nether star. You do not kill it; you survive it. Not on the ladder: it holds loot, not a Blueprint."),
        ]),
    ],
    # ===================================================================================== tech
    "tech": [
        ("how_blueprints_work", "How Blueprints Work", "minecraft:paper", [
            txt("Technology is unlocked " + B("per player") + ". Killing a boss does not unlock it for the server: it drops " + B("Blueprints") + ", one for every player who fought, plus one spare.",
                "Use a Blueprint and you learn that technology. The spare is for someone who was not there."),
            txt("Blueprints are ordinary items: trade them, sell them, gift them, or take them off a corpse. A new player on an old server catches up by trading, not by grinding the same boss.",
                "Stuck on a boss? Every Blueprint also has a " + B("charter") + " recipe: expensive, emerald-priced, and always available. Slow, but never blocked."),
            txt("Recipes you have not learned are " + B("visible but locked") + ": EMI shows them, the tooltip names the boss. Gated blocks check too: a brass machine handed to someone who has not learned brass will not run for them.",
                "Players who want to share progress can form a team; a team's Blueprint teaches the team."),
            txt("A Blueprint is a blue sheet that names its technology. Right-click to learn it; it is used up. Hover any locked item and the tooltip names the Blueprint and the boss.",
                "The ladder is four tiers. Each tier is a kind of fight, not a difficulty number."),
            rel(["tech/tier1", "tech/tier2", "tech/tier3", "tech/tier4"], title="The ladder"),
        ]),
        ("tier1", "Tier 1: Iron and a Dog", "minecraft:iron_ingot", [
            txt("Beatable alone in iron armour with a dog. These are the dark age's fallout, not its masters. They wander near home and you will meet them whether you look or not.",
                LI(B("Mutant Zombie") + " and the " + B("Mutant Enderman") + " hold " + B("Brass") + ".", B("Mutant Skeleton") + " holds " + B("Recruiting") + ".", B("Mutant Creeper") + " holds " + B("Blasting") + ".")),
            txt(B("Fires, furnaces, insulation and waterskins") + " are never locked: the hearth (Climate control) is Tier 2, and so is Slice & Dice (Advanced cooking), because Torte keeps it in the Nether.",
                "The " + B("Mutant Snow Golem") + " is a pet you make, not a boss: it holds nothing."),
            spot("create:brass_ingot", "Brass is the hinge of the whole tree: mechanical crafters, deployers, arms, trains, the smart funnels and filters that make a factory think. Zinc plus copper in a mixer over a blaze burner. The dead took the knowledge; the Mutant Zombie carries it.", title="Why brass"),
            txt(B("Blasting") + " covers TNT, gunpowder recipes, the blaze burner and musket cartridges. " + B("Recruiting") + " is hiring from Village Recruits; guards stay free.",
                "A fresh server should clear Tier 1 in its first week."),
            rel(["bosses/mutants"], title="Who to fight"),
        ]),
        ("tier2", "Tier 2: Bring Recruits", "minecraft:diamond", [
            txt("Bosses that guard a place. Bring a squad, or a friend. Diamond or good iron with enchantments; food with Comfort; a way home.",
                LI(B("Ferrous Wroughtnaut") + ": " + B("Trains") + " (Steam 'n' Rails)", B("Naga") + ": " + B("Ships"), B("The Invoker") + ": the " + B("Trading Floor"), B("Umvuthi") + ": " + B("Diesel"))),
            txt(LI(B("Elder Guardians") + ": " + B("Diving"), B("Frostmaw") + ": " + B("Climate control"), B("Torte") + " (Nether): " + B("Advanced cooking")),
                "Climate control and cooking are the two homestead comforts the dead age took furthest: a hearth that heats a house, and machines that cook."),
            txt("Trains and ships are the two ways to move ore between regions that do not involve a horse. Diesel is the engine that does not need a river. The Trading Floor is the market that runs without you.",
                "The Invoker's ledgers also turn up on the totem captains. Tier 2 is where a server's economy stops being one person's chest."),
            rel(["bosses/mowzies", "bosses/illagers", "bosses/incendium"], title="Who to fight"),
        ]),
        ("tier3", "Tier 3: The Reactor", "minecraft:netherite_scrap", [
            txt("Two or more, with a plan, in the Nether and the deep.",
                LI(B("Radiation Director") + " and the " + B("Leviathan") + ": " + B("Precision mechanisms") + ", mechanical arms and the reactor's own parts.", B("Netherite Monstrosity") + " and the " + B("Ancient Remnant") + ": " + B("Netherite") + ".", B("Maledictus") + ": " + B("Cannons") + " (Big Cannons).")),
            txt("Maledictus and the Remnant also drop the " + B("Ancient Factory's") + " Eye.",
                "Cannons are a server rule as much as a technology: they damage " + B("mobs and players") + " but not the land. Griefing is off; sieges are on."),
            rel(["bosses/cataclysm", "bosses/incendium"], title="Who to fight"),
        ]),
        ("tier4", "Tier 4: The Last Chapter", "minecraft:end_crystal", [
            txt(LI(B("The Harbinger") + " and " + B("Ignis") + ": " + B("Arcane industry") + ", enchantment as a factory, dragon's breath as a fluid.", B("Ender Guardian") + " (the End), " + B("Scylla") + " (warm ocean) and the " + B("Warden") + " (the deep dark): " + B("Ender logistics") + ", ender chests, portable interfaces, item vaults.")),
            txt(B("Hovering Inferno") + " holds loot, not knowledge: the best artifacts in the Nether.",
                "Two Blueprints at the end of the world, and both of them about moving things."),
            rel(["bosses/cataclysm", "bosses/illagers", "bosses/incendium"], title="Who to fight"),
        ]),
        ("charters", "Charters: Buying a Blueprint", "minecraft:emerald_block", [
            txt("Every Blueprint can be " + B("bought") + " instead of fought for: paper, one key item, and emerald blocks by tier (2, 4, 6, 8). Slow, expensive, never blocked. The recipes are below; EMI has them too.",
                "A charter is how a new player on an old server catches up, and how a stuck server routes around a boss nobody can beat yet."),
            craft("peacock:charter/brass", "Brass: zinc is the key. Tier 1."),
            craft("peacock:charter/recruiting", "Recruiting: an iron sword. Tier 1.", recipe2="peacock:charter/blasting"),
            craft("peacock:charter/climate", "Climate control: snow. Tier 2.", recipe2="peacock:charter/cooking"),
            craft("peacock:charter/trains", "Trains: a rail. Tier 2.", recipe2="peacock:charter/ships"),
            craft("peacock:charter/trade", "Trading Floor: a lectern. Tier 2.", recipe2="peacock:charter/diesel"),
            craft("peacock:charter/diving", "Diving: a prismarine shard. Tier 2."),
            craft("peacock:charter/precision", "Precision: a cogwheel. Tier 3.", recipe2="peacock:charter/netherite"),
            craft("peacock:charter/cannons", "Cannons: TNT, which itself needs Blasting. Tier 3."),
            craft("peacock:charter/arcane", "Arcane industry: an enchanting table. Tier 4.", recipe2="peacock:charter/ender"),
        ]),
        ("what_is_locked", "What Exactly Is Locked", "minecraft:iron_door", [
            txt("Only " + B("crafting-table recipes") + " can be locked, so the rule is: the things built " + I("from") + " a material are locked, the material is not. Anyone can mix brass in a basin; nobody without the Blueprint can make a casing or a funnel from it.",
                "Locked recipes are also locked to " + B("place") + ": a brass machine handed to you will not go down until you have learned it."),
            txt(LI(B("Brass:") + " every recipe with brass in it or brass out of it, and the mechanical crafter.", B("Blasting:") + " everything made with gunpowder, TNT, the empty blaze burner, muskets and cartridges, powder charges.", B("Climate:") + " the hearth, boiler and icebox.", B("Cooking:") + " Slice & Dice slicer and sprinkler."), title="Tier 1 and 2"),
            txt(LI(B("Trains:") + " track, stations, controls, schedules, signals, train doors, railway casing, all of Steam 'n' Rails.", B("Ships:") + " the dockyard, ship cannon and shot; airships and their parts.", B("Trading Floor:") + " the depot.", B("Diesel:") + " all of Create Diesel Generators.", B("Diving:") + " Create's backtank, diving helmet and boots; the conduit.")),
            txt(LI(B("Precision:") + " everything made with a precision mechanism: arms, speed controllers, sequenced gearshifts, extendo grips.", B("Netherite:") + " ingots and anything crafted from them (smithing is not locked).", B("Cannons:") + " Create Big Cannons; the biplane, warship and aircraft guns."), title="Tier 3"),
            txt(LI(B("Arcane:") + " Enchantment Industry and Dragons Plus.", B("Ender:") + " ender chests, portable interfaces, item vaults, smart chutes, stockpile switches."), title="Tier 4"),
            txt(B("Recruiting") + " locks the act of hiring, not an item: emeralds on a recruit do nothing until you have learned it. Guards and your own dogs are never locked.",
                "Hover anything grey in EMI: the tooltip names the Blueprint and the boss that holds it."),
        ]),
    ],
    # ===================================================================================== build
    "building": [
        ("decor", "Building Blocks", "mcwroofs:oak_roof", [
            txt(B("Macaw's") + " roofs, doors, windows, fences, bridges, paths, stairs, trapdoors, lights, paintings and furniture: a catalogue of shapes in every wood and stone. Search EMI by wood name.",
                B("Supplementaries") + " gives the small things: sacks, ropes, pulleys, bellows, notice boards, sign posts, hourglasses, globes, jars, planters, flags, safes."),
            txt(B("Create Deco") + " and " + B("Interiors") + " cover industrial trim: catwalks, cages, placards, seats, chairs and tables that contraptions can carry.",
                B("Every Compat") + " makes every wood work with every furniture mod, so a BOP wood roof exists. " + B("Visual Workbench") + " shows the recipe on the table. " + B("Easy Anvils") + " keep items in and never say Too Expensive."),
            txt(B("Falling leaves") + ", " + B("Particle Rain") + " weather, " + B("3D skins") + " and " + B("capes") + " are cosmetic and free to turn off if frames matter (see " + L("tools/performance", "Performance") + ")."),
        ]),
        ("wagons", "Wagons", "minecraft:lead", [
            txt(B("Trotting Wagons") + ": a wagon hitched to a horse with storage in the back. Lead the horse, the wagon follows. This is the first bulk transport.",
                B("Caravans & Convoys") + " wagons travel in trains behind a leader, carry chests, and can be sent along routes between stops."),
            txt("Roads matter: Macaw's paths and Supplementaries' ropes and pulleys make a road and a loading dock out of nothing.",
                "A wagon of zinc clusters from the mountains to the capital is the first trade route this server will have."),
        ]),
        ("ships", "Ships and Aircraft", "smallships:oak_cog", [
            txt(B("Small Ships") + ": build a " + B("dockyard") + " beside water and it builds the ship from the stores you give it: cog, brig, galley, drakkar, caravel, dhow, galleon. Cannons go on deck; recruits captains can sail them and crew the guns.",
                "Rivers and coasts are everywhere here. A cog moves more than ten wagons."),
            craft(staged("smallships:dockyard"), "The dockyard: place it by the water. The ship's hull, sails and cannons come from what you load into it."),
            txt(B("Immersive Aircraft") + ": hull, sail, engine and propeller make an airship, a gyrodyne you pedal, or a quadrocopter. Aluminum hulls and propellers come two to a craft.",
                B("Ships are Tier 2") + ": the Naga hold the dockyard and the airships. The " + B("biplane") + ", " + B("warship") + " and aircraft guns are " + B("Cannons") + " (Tier 3)."),
            txt("Cannon shot is lead or iron; a bronze cannon is cast from bronze blocks."),
        ]),
        ("trains", "Trains", "create:railway_casing", [
            txt(B("Create") + " tracks, stations, schedules and signals, extended by " + B("Steam 'n' Rails") + ": conductors, handcars, couplers, track switches, fuel tanks, and a locomotive palette.",
                "Trains are " + B("Tier 2") + " (Ferrous Wroughtnaut). Tracks need brass casing; brass needs Tier 1."),
            craft(staged("create:crafting/kinetics/track_station"), "A station names a stop; a schedule tells the train where to go and what to wait for. Depots (Trading Floor) let a train trade at a town."),
            craft(staged("railways:crafting/handcar"), "The handcar is a rail bicycle: no engine, no fuel, two players pumping. The first thing to build on a new line."),
            txt("The dream the survivors remembered: a line from the capital to the mountain mine, a dock at the river, a depot in every town, ore moving while everyone sleeps.",
                "Build the roadbed before the Blueprint. Track is fast to lay once you can."),
        ]),
        ("cannons", "Cannons", "createbigcannons:cannon_mount", [
            txt(B("Create Big Cannons") + ": cast or build cannons block by block, mount them, load them, aim with a controller or a contraption. Autocannons for defence, big guns for sieges.",
                B("Tier 3") + ": Maledictus, in the Frosted Prison, holds the knowledge."),
            craft(staged("createbigcannons:cannon_mount"), "A mount turns a cannon into a turret. Cannons on a ship or a train are contraptions like any other."),
            txt(B("Server rules:") + " shells hurt " + B("mobs and players") + " in their blast but " + B("do not break blocks") + ". You can defend a town and fight a ship; you cannot level a town. Explosions from cannons are AOE only.",
                "Muskets are the handheld cousins and follow the Blasting Blueprint, not this one."),
        ]),
    ],
    # ===================================================================================== rules
    "rules": [
        ("claims", "Claiming Land", "minecraft:oak_fence", [
            txt("Press " + B("J") + " for the claim manager (FTB Chunks). Left-click a chunk to claim it for your team, right-click to unclaim. Claimed land cannot be broken, opened or blown up by anyone outside your team or its allies.",
                "The capital is claimed by the server. Claim your own place as soon as you have one worth keeping."),
            txt(B("Teams:") + " you are your own team until you make a party. " + B("/ftbteams party create") + " then " + B("/ftbteams party invite <name>") + " shares claims and chests. Allies see and can use your things; they can also be set to only see.",
                "Up to 200 chunks per team. Nobody needs that many; if you do, you have built a city."),
            txt(B("Force-loading") + " (shift-click a claimed chunk) keeps it running while you are away, as long as someone on your team is online: crops grow, machines turn. " + B("Four chunks per team") + ", hard cap; while you are all offline, a Steward keeps land running for a fee. Enough for one farm or one Create line; not enough for a factory, on purpose.",
                "The server has one game thread. What you keep loaded, everybody pays for."),
        ]),
        ("commands", "Commands You Have", "minecraft:command_block", [
            txt(B("/spawn") + " walks you to the capital after a five-second warm-up; one use a minute. " + B("/back") + " returns you to where you died, once, within a while of dying. That is all the teleporting there is.",
                "No /home, /tpa, /rtp or warps, and none will be added: distance is the game. Build a dock."),
            txt(B("/ftbteams") + " party commands (see Claiming Land). " + B("/kubejs errors") + " if the server tells you scripts failed: paste the result to the admin.",
                "Chat is plain chat; voice is in-game (" + L("tools/voice", "Voice Chat") + ")."),
        ]),
        ("what_we_dont_do", "What We Do Not Do", "minecraft:barrier", [
            txt(LI(B("No free minimap.") + " The atlas you fill as you explore is the map.", B("No fast travel.") + " Rails, ships, wagons and roads.", B("No trading halls.") + " Villagers trade well where they live well.")),
            txt(LI(B("No block griefing from cannons.") + " They hurt mobs and players; the land stays.", B("No thirst.") + " The seasons and the cold are the survival layer: what grows when, and a fire for winter nights.")),
            txt(B("Sleep is a vote:") + " when half the players online are in bed, the night skips; the action bar counts who is sleeping.",
                B("Tab") + " shows the server's TPS and everyone's ping. Twenty is healthy; if it sits below fifteen while nobody is doing anything unusual, tell the admin what everyone was doing."),
            txt(LI(B("Towns are capped") + " at about two dozen villagers; breeding stops when a town is full. Found another.", B("Depots need towns:") + " a bell and four beds within 32 blocks.", B("Technology is personal:") + " your Blueprints are yours. Trade them."),
                "Everything on this page is enforced by the pack, not by trust. The admin can switch any of it in " + B("kubejs/config/peacock.json") + "."),
        ]),
        ("manners", "Playing Together", "minecraft:cake", [
            txt("Two settlers today; a server tomorrow. The habits that scale:",
                "Claim before you build. Mark deposits and towns on the shared atlas. Leave the capital's farms replanted. Do not force-load what you are not using. Kill a boss with friends: a Blueprint drops for every fighter, plus a spare for someone who could not come."),
            txt("If the server stalls: note the time and what you were doing, and tell the admin. The watchdog keeps a dump; the time is what finds the cause.",
                "If something looks wrong in a recipe or a tooltip, " + B("/kubejs errors") + " and a screenshot."),
        ]),
    ],
    # ===================================================================================== tools
    "tools": [
        ("controls", "Keys", "minecraft:lever", [
            txt(LI(B("B") + " backpack", B("M") + " atlas, " + B("P") + " place a pin", B("J") + " claim manager", B("L") + " advancements", B("V") + " quiver", B("R / U") + " Recruits: command / team", B("Shift+1..4") + " dog whistles", B("Alt") + " (hold) Create tool menu", B("W") + " (hold, over a Create item) ponder")),
            txt(LI(B("K") + " shaders on/off, " + B("O") + " shader menu", B("R / U") + " recipes / uses of the hovered item (EMI)", B(",") + " voice chat menu, " + B(".") + " mute mic, " + B("Right Alt") + " push-to-talk", B("Z") + " zoom (scroll to adjust), only while you carry a spyglass", B("F3") + " debug screen (" + L("tools/info", "Finding Things Out") + ")"),
                "Options, Controls has a search box, so any bind can be found by name."),
            txt("The bar above your hotbar is the " + B("locator bar") + ": a dot per player, by direction, like the newer game. It is not a map; it is where your friends are.",
                B("J") + " opens the claim manager (FTB Chunks), the only map-shaped screen in the pack, and it shows claims, not terrain."),
        ]),
        ("controller", "Playing with a Controller", "minecraft:compass", [
            txt("Plug in a controller and " + B("Controlify") + " takes over: on-screen button hints, a cursor for menus, an on-screen keyboard for text. Xbox, PlayStation, Switch and Steam Deck are recognised and labelled.",
                B("Sticks") + " move and look. " + B("Right trigger") + " attacks, " + B("left trigger") + " uses. " + B("A") + " jumps, " + B("Y") + " inventory, " + B("X") + " swaps hands."),
            txt(LI(B("Bumpers:") + " hotbar", B("Click left stick:") + " sprint; " + B("right stick:") + " sneak", B("Start:") + " pause; " + B("Select:") + " camera", B("B:") + " backpack (the pack's bind)", B("D-pad:") + " up chat, down drop, left the atlas (the pack's bind), right the " + B("radial menu"))),
            txt("The radial menu starts empty and is yours to fill: Options, Controls, Controller Settings, Radial Menu. Good picks: Recruits command screen, place a pin, zoom, dog whistle, quiver, player list.",
                "Ships, airships and wagons steer with the sticks like walking."),
        ]),
        ("atlas", "The Atlas", "map_atlases:atlas", [
            spot("map_atlases:atlas", B("Map Atlases") + " collects maps into one book: craft an atlas from a book and a compass, feed it empty maps, carry it, and it fills as you travel. While it is on you it shows in the corner of the screen. " + B("M") + " opens it; " + B("P") + " drops a pin where you stand.", title="The atlas"),
            txt("Mark deposits, villages, docks and boss structures. Different map scales zoom the atlas. A shared atlas on a lectern in the capital is the server's map room.",
                "Supplementaries' " + B("globe") + " and Create's " + B("schematics") + " are the other two kinds of map: the world's shape, and a build's."),
        ]),
        ("info", "Finding Things Out", "minecraft:spyglass", [
            txt(B("Jade") + " names whatever you look at, with its health, contents or progress. Hold " + B("Shift") + " for more. Numpad 0 toggles it.",
                B("EMI") + " is the recipe book: " + B("R") + " for recipes, " + B("U") + " for uses, " + B("A") + " to favourite, drag to the side to pin. It knows Create, Farmer's Delight, loot tables and enchantments."),
            txt(B("Create") + " ponders with " + B("W") + ". " + B("Geolosys") + " gives you its own book on first join. Village Recruits is explained in " + L("towns/new_towns", "Towns & Trade") + ".",
                "This almanac links to the others where they exist, and does not repeat them."),
            txt(B("Advancements") + " (" + B("L") + ") has a " + B("Peacock") + " tab: every boss, the journals, the dead towns, the Blueprint tiers, the towns and the first winter. Bosses count for everyone who fought, not only the one who landed the blow."),
            txt(B("F3") + " is laid out for finding out why something is slow (BetterF3). Left: your " + B("FPS") + " and the " + B("server tick") + ". Right: your GPU and memory. Below: coordinates, biome, light, what you look at.",
                "Server tick under 20 TPS: the server; tell the group. Low FPS with TPS fine: your machine; Distant Horizons' range first, then shaders.", title="Reading F3"),
        ]),
        ("voice", "Voice Chat", "minecraft:note_block", [
            txt("Simple Voice Chat is built in and uses the server's port: nothing to set up. Voice carries 48 blocks and fades with distance; use groups (" + B(",") + " menu) to talk across the map.",
                "Default is voice activation; " + B("Right Alt") + " is push-to-talk if you switch. Mac: allow the microphone for your launcher when asked."),
        ]),
        ("performance", "Performance Profiles", "minecraft:redstone_torch", [
            txt("The pack ships graphics profiles by " + B("hardware") + ". Pick yours in-game with " + B("/peacock profile <tier>") + " and relaunch; the launcher applies it. (In Prism the PEACOCK_PROFILE variable still works as a fallback; CurseForge players pick the tier by which zip they install.)"),
            txt(LI(B("potato:") + " integrated graphics, an old or hot laptop; shaders off", B("low") + " (the default): integrated graphics with headroom, a fanless MacBook Air; Complementary at its lightest", B("medium:") + " a thin laptop with a fan", B("high:") + " a laptop with a real GPU", B("ultra:") + " a desktop with a dedicated GPU"), title="The tiers"),
            txt("Anything you change in the video or shader menus is kept; the profile only sets defaults. Shaders toggle with " + B("K") + ". If frames drop: lower Distant Horizons' radius first, shaders second, render distance last.",
                "Macs stay on plain Complementary; the Euphoria variant exceeds what macOS OpenGL offers."),
            txt(B("Distant Horizons") + " draws the far terrain from a low-detail copy the server builds as players explore. On a fresh world the horizon fills in over the first hour; a reset world starts over.",
                "Embeddium, ImmediatelyFast, Entity Culling, ModernFix and FerriteCore are the quiet half of the frame rate; leave them on. Sound Physics (cave echo) is off on potato. Particle mods can be turned down in their menus."),
            txt(B("Resource packs") + " are on by default: Fresh Animations (+ Details, Objects), Optimized Bushy Leaves over Better Leaves, Fast Better Grass, rainbow's foliage, 3D Default, Cubic Sun & Moon, Enhanced Boss Bars, xali's books and potions, Low on Fire.",
                "All optional (Options, Resource Packs). Potato leaves out 3D Default and the Fresh Animations family. Smooth Steps eases the camera up each slab and block you step onto."),
        ]),
    ],
    # ===================================================================================== mods
    "mods": [
        ("world", "World", "minecraft:grass_block", [
            txt(B("Tectonic, Terralith, Biomes O' Plenty") + " shape and fill the land. " + B("Incendium") + " is the Nether, " + B("Nullscape") + " the End. " + B("Serene Seasons") + " runs the year, " + B("Cold Sweat") + " the temperature.",
                B("Geolosys") + " places ore in regional deposits. " + B("Paxi") + " loads the pack's own datapack over everything else."),
            txt(B("Distant Horizons") + " draws the far terrain. " + B("ChoiceTheorem's Overhauled Village") + " builds the villages (every one a ruin now); " + B("Streams Reflowing") + " the flowing streams; " + B("Terrain Slabs") + " the soft slopes; " + B("YUNG's") + " mineshafts, dungeons and API; " + B("Structory") + " ruins; " + B("Create Structures") + " old workshops.",
                B("Village Spawn Point") + " puts everyone in the capital."),
            txt(B("YUNG's Extras") + " and " + B("YUNG's Bridges") + " add small finds and bridges. " + B("Repurposed Structures") + " adds mineshafts and dungeons in each biome's own style (its villages and surface structures are switched off). " + B("Artifacts") + " hides wearable treasures in chests and underground campsites."),
        ]),
        ("machines", "Machines & Logistics", "create:cogwheel", [
            txt(B("Create") + " and its family: " + B("Steam 'n' Rails") + " (trains), " + B("Big Cannons") + ", " + B("Diesel Generators") + ", " + B("Enchantment Industry") + ", " + B("Dragons Plus") + ", " + B("Trading Floor") + " (depots), " + B("Create Deco") + " and " + B("Interiors") + " (looks), " + B("Create Better Villagers") + " (trades), " + B("Slice & Dice") + " (kitchen).",
                B("Small Ships") + " and " + B("Immersive Aircraft") + " carry goods by sea and air."),
            txt(B("Trotting Wagons") + " and " + B("Caravans & Convoys") + " move goods by horse. " + B("Storage Drawers") + " (+Create compat) are visible bulk storage. " + B("Proximity Crafting") + "'s table crafts from the chests around it; " + B("Workshop") + " adds tables, tool racks and shelves. " + B("Backpacked") + " is the backpack; " + B("Supplementaries") + " the sacks, ropes, pulleys and a hundred small things."),
            txt(B("Macaw's") + " nine mods are doors, roofs, windows, fences, bridges, paths, stairs, trapdoors, lights, paintings and furniture; " + B("Every Compat") + " makes every wood work with all of it.",
                B("FallingTree") + " fells a tree from its bottom log; " + B("Passable Foliage") + " lets you walk through leaves; " + B("Nether Portal Fix") + " links portals sensibly."),
        ]),
        ("people", "People & Towns", "minecraft:emerald", [
            txt(B("Village Recruits") + " (the base mod) hires soldiers; its " + B("Village Expansion") + " addon gives towns names, factions, politics and growth. " + B("Guard Villagers") + " man the walls. " + B("Villager Workers") + " are hired labour. " + B("Villager Comfort") + ", " + B("Villager Names") + " and sleeping to restock make villagers people."),
            txt(B("Bountiful") + " posts jobs. " + B("Doggy Talents") + " makes dogs. " + B("More Mob Variants") + " breeds the farm animals; " + B("Naturalist") + " makes the wild ones; " + B("Aquaculture") + " (+Delight) fish; " + B("Farmer's Delight") + " the kitchen."),
        ]),
        ("fights", "Fights", "minecraft:iron_sword", [
            txt(B("Better Combat") + " is how swinging works. " + B("Spartan Weaponry") + " and " + B("Spartan Shields") + " are the arsenal; " + B("Musket Mod") + " the guns.",
                B("Mutant Monsters") + ", " + B("Mowzie's Mobs") + ", " + B("L_Ender's Cataclysm") + ", " + B("Illager Invasion") + ", " + B("Savage & Ravage") + ", " + B("Illage & Spillage Respillaged") + " are the bosses and the raids. " + B("Corpse") + " keeps your things when you fall."),
        ]),
        ("quality", "Quality of Life", "minecraft:spyglass", [
            txt(B("EMI") + " (recipes; " + B("EMIffect") + " adds potion effects, " + B("Distraction Free Recipes") + " quiets the recipe book), " + B("Jade") + " (what am I looking at), " + B("AppleSkin") + ", " + B("Mouse Tweaks") + ", " + B("Controlling") + ", " + B("Controlify") + " (controllers), " + B("BetterF3") + " (a tidier F3 screen), " + B("Easy Anvils") + ", " + B("Visual Workbench") + ", " + B("Patchouli") + " (this book)."),
            txt(B("Map Atlases") + ", " + B("Nature's Compass") + ", " + B("Locator Bar") + ", " + B("Just Zoom") + " (with a spyglass in your pack), " + B("Simple Voice Chat") + ", " + B("Chat Animation") + ", " + B("No Chat Reports") + ".",
                B("FTB Chunks / Teams / Essentials") + " are claims, parties, /spawn and /back."),
            txt(B("Performance:") + " Embeddium, Oculus (shaders), ImmediatelyFast, Entity Culling, ModernFix, FerriteCore; on the server Canary, Clumps (merged XP) and Let Me Despawn (far, unfought mobs leave). " + B("Looks:") + " Subtle Effects, Particle Rain, Falling Leaves, Smooth Steps, Better Biome Reblend, Wavey Capes, 3D Skin Layers, Not Enough Animations, Entity Model and Texture Features, and the resource packs."),
            txt(B("Under the hood:") + " KubeJS runs the pack's rules; Game Stages and Recipe Stages hold the ladder; Paxi carries the datapack; Default Options sets first-run settings; the launcher jar applies your hardware profile."),
        ]),
    ],
    # ===================================================================================== faq
    "faq": [
        ("cold", "...stop freezing?", "minecraft:campfire", [
            txt("Stand near a lit campfire, furnace or fire, under a roof. Sew wool into your armour at a sewing table. Warm a waterskin at the fire and keep it in your hotbar. Stay off the peaks and out of the rain at night. See " + L("land/warmth", "Staying Warm") + "."),
        ]),
        ("cant_craft", "...craft this?", "create:brass_casing", [
            txt("The recipe shows in EMI but the table gives nothing, or the tooltip is gold: it needs a " + B("Blueprint") + " you have not learned. The tooltip names which, and who holds it. Fight the boss, trade for the sheet, or buy a " + L("tech/charters", "charter") + ".",
                "Brass itself mixes fine; it is the things made from brass that are locked."),
        ]),
        ("crops", "...grow anything?", "minecraft:wheat_seeds", [
            txt("Out of season. Hover the seeds for their seasons; put a glass roof a few blocks over the field, or farm below Y 48, and the season stops mattering. See " + L("land/crops", "What Grows When") + "."),
        ]),
        ("ore", "...find any ore?", "geolosys:prospectors_pick", [
            txt("Because it is not everywhere. Look for small rock clusters on the surface (samples), tap the ground with a flint hammer, then a prospector's pick, and read " + L("ore/deposits", "where each metal lies") + ". Iron is shallow and common; zinc is under mountains; gold in dry land. Caves have deposits deep down and chests full of clusters."),
        ]),
        ("minimap", "...see a minimap?", "map_atlases:atlas", [
            txt("Not a free one. Craft an atlas, carry it and it draws itself in the corner as you explore; " + B("M") + " opens it, " + B("P") + " pins things. The locator bar shows your friends; " + B("J") + " shows claims. See " + L("tools/atlas", "The Atlas") + "."),
        ]),
        ("depot", "...place my trading depot?", "trading_floor:trading_depot", [
            txt("It needs a town: a bell and at least four beds within 32 blocks. The message tells you what it found. Build the depot in a village, or make your place a village first."),
        ]),
        ("hire", "...hire this recruit?", "minecraft:emerald", [
            txt("Recruiting is a Blueprint (the Mutant Skeleton's). Until you have it, emeralds do nothing. Guards (give a villager a weapon) work for everyone."),
        ]),
        ("far_terrain", "...see the far terrain?", "minecraft:spyglass", [
            txt("Distant Horizons needs the server to have generated the land first; a new world fills in over an hour or so, faster where people have walked. If it never appears: Options, Video, Distant Horizons, rendering on, and check your profile's radius (potato is 64 chunks)."),
        ]),
        ("fps", "...get more frames?", "minecraft:redstone_torch", [
            txt("Shaders off (" + B("K") + ") is the big one. Then Distant Horizons radius, then render distance. Profiles are picked with /peacock profile <tier> and applied on relaunch; the " + L("tools/performance", "Performance") + " entry has the table. Macs: plain Complementary only, and " + B("low") + " is the honest tier."),
        ]),
        ("tree", "...chop just one log?", "minecraft:oak_log", [
            txt("FallingTree: chop the bottom log and the tree comes down as logs. Sneak while chopping to take one log. Leaves let you walk through them, slowly. See " + L("start/differences", "Small Things That Differ") + "."),
        ]),
        ("tps", "...stop the stuttering?", "minecraft:clock", [
            txt("Press " + B("F3") + ". If the " + B("server tick") + " line is under 20 TPS, the server is busy: tell the group what everyone was doing. If TPS is fine and your " + B("FPS") + " is low, it is your machine: " + L("faq/fps", "more frames") + ". Hold " + B("Tab") + " for the server's TPS and everyone's ping."),
        ]),
        ("which_metal", "...choose a metal to wear?", "peacock:platinum_chestplate", [
            txt("Platinum if you have it; invar or constantan for everyday; lead at a gate (knockback resistance); silver against the undead; electrum for speed and enchanting if you can afford to replace it. The whole table is in " + L("ore/gear", "Tools & Armour in Every Metal") + "."),
        ]),
        ("lost_items", "...find my things after dying?", "minecraft:skeleton_skull", [
            txt("Your corpse holds everything where you fell. Walk back (" + B("/back") + " works once) and right-click it. Nothing despawns, but anyone can loot it. Mark the spot in the atlas before you log off."),
        ]),
    ],
}

def write(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

def budget(page, first):
    t = page["type"].split(":")[1]
    if t == "text": return LIMITS["text_first"] if first else LIMITS["text"]
    if t == "crafting": return LIMITS["crafting2"] if "recipe2" in page else LIMITS["crafting1"]
    return LIMITS[t]

CHARS_PER_LINE = 22   # Patchouli's 116-px text column in the default font, roughly

def lines(text):
    """Estimated rendered lines: a list item or $(br) starts a new line, so short bullets cost more than their
    characters say. Formatting codes other than breaks and bullets take no room."""
    t = text.replace("$(br2)", "\n\n").replace("$(br)", "\n").replace("$(li)", "\n\u2022 ")
    t = re.sub(r"\$\([^)]*\)", "", t)
    n = 0
    for ln in t.split("\n"):
        width = CHARS_PER_LINE - (2 if ln.startswith("\u2022") else 0)
        n += max(1, -(-len(ln) // width))
    return n

def check():
    problems = []
    ids = {f"{cid}/{eid}" for cid, es in ENTRIES.items() for eid, *_ in es}
    for cid, entries in ENTRIES.items():
        for eid, name, icon, pages in entries:
            for i, pg in enumerate(pages):
                text = re.sub(r"\$\([^)]*\)", "", pg.get("text", ""))   # formatting codes take no space on the page
                lim = budget(pg, i == 0)
                if pg.get("title") and pg["type"] == "patchouli:text": lim -= 40
                if len(text) > lim:
                    problems.append(f"{cid}/{eid} page {i+1} ({pg['type']}): {len(text)} chars > {lim}")
                maxlines = -(-lim // CHARS_PER_LINE) + 1  # the same budget in lines, one line of slack for the estimate
                if (nl := lines(pg.get("text", ""))) > maxlines:
                    problems.append(f"{cid}/{eid} page {i+1} ({pg['type']}): ~{nl} lines > {maxlines}")
                for ref in [r for r in text.split("$(l:patchouli:")[1:]]:
                    target = ref.split(")")[0]
                    if target not in ids: problems.append(f"{cid}/{eid}: dead link {target}")
                for e in pg.get("entries", []):
                    if e.removeprefix("patchouli:") not in ids: problems.append(f"{cid}/{eid}: dead relation {e}")
    if problems:
        raise SystemExit("almanac not written:\n  " + "\n  ".join(problems))

def main():
    check()  # never leave a half-written book behind
    if OUT.exists(): shutil.rmtree(OUT)
    write(OUT / "book.json", BOOK_JSON)
    lang = OUT / "en_us"
    for cid, (name, desc, icon, sortnum) in CATEGORIES.items():
        write(lang / "categories" / f"{cid}.json", {"name": name, "description": desc, "icon": icon, "sortnum": sortnum})
    n = p = 0
    for cid, entries in ENTRIES.items():
        for i, (eid, name, icon, pages) in enumerate(entries):
            write(lang / "entries" / cid / f"{eid}.json",
                  {"name": name, "icon": icon, "category": f"patchouli:{cid}", "sortnum": i, "pages": pages})
            n += 1; p += len(pages)
    print(f"wrote {len(CATEGORIES)} categories, {n} entries, {p} pages -> {OUT.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
