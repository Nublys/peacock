#!/usr/bin/env python3
"""Generate the Peacock advancement tab into the pack datapack.

Writes pack/config/paxi/datapacks/peacock/data/peacock/advancements/** (a fresh tree every run).

Vanilla triggers wherever one fits (journals picked up, ruins entered, a fire drill made, a charter crafted, a
hearth placed, armour insulated). Everything vanilla cannot see is `minecraft:impossible` and granted by
pack/kubejs/server_scripts/achievements.js: boss kills (anyone who hit the boss and is still near it, like the
Blueprint drops — and Incendium's bosses are vanilla mobs with a name), Blueprints learned, joining a town, a first
recruit, a sealed rumour opened, a winter survived. The ids here and the BOSSES table there must match; this script
prints the table so the two can be compared.

    python3 tools/gen-advancements.py && (cd pack && packwiz refresh)
"""
import json, shutil, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "pack"
OUT = PACK / "config/paxi/datapacks/peacock/data/peacock/advancements"
JOURNALS = json.loads((ROOT / "tools/data/journals.json").read_text())["journals"]
RUINS = json.loads(zipfile.ZipFile(PACK / "config/paxi/datapacks/peacock-ruins.zip")
                   .read("data/peacock/tags/worldgen/structure/ruins.json"))["values"]
LADDER_RUNGS = ["brass", "recruiting", "blasting", "climate", "cooking", "trains", "ships", "trade", "diesel",
                "precision", "netherite", "cannons", "arcane", "ender"]

# id, title, description, icon, frame, entity key ("ns:type" or "ns:type|Custom Name"), holds a Blueprint?
BOSSES = [
    ("mutant_zombie", "It Got Back Up", "Defeat a Mutant Zombie", "minecraft:zombie_head", "task", "mutantmonsters:mutant_zombie", True),
    ("mutant_skeleton", "Bone of Contention", "Defeat a Mutant Skeleton", "minecraft:skeleton_skull", "task", "mutantmonsters:mutant_skeleton", True),
    ("mutant_creeper", "Stand Well Back", "Defeat a Mutant Creeper", "minecraft:creeper_head", "task", "mutantmonsters:mutant_creeper", True),
    ("mutant_snow_golem", "Snowblind", "Defeat a Mutant Snow Golem", "minecraft:carved_pumpkin", "task", "mutantmonsters:mutant_snow_golem", True),
    ("mutant_enderman", "Do Not Look", "Defeat a Mutant Enderman", "minecraft:ender_eye", "goal", "mutantmonsters:mutant_enderman", False),
    ("torte", "Compliments to the Chef", "Defeat Torte in the Quartz Kitchen", "minecraft:cake", "goal", "minecraft:skeleton|Torte", True),
    ("ferrous_wroughtnaut", "Iron Will", "Defeat the Ferrous Wroughtnaut", "minecraft:iron_block", "goal", "mowziesmobs:ferrous_wroughtnaut", True),
    ("naga", "Sea Serpent", "Defeat a Naga", "minecraft:prismarine_shard", "goal", "mowziesmobs:naga", True),
    ("umvuthi", "Sunset for the Sunbird", "Defeat Umvuthi, the Sunbird", "minecraft:sunflower", "goal", "mowziesmobs:umvuthi", True),
    ("invoker", "Ledgers Recovered", "Defeat the Invoker", "minecraft:totem_of_undying", "goal", "illagerinvasion:invoker", True),
    ("frostmaw", "Thaw", "Defeat the Frostmaw", "minecraft:blue_ice", "goal", "mowziesmobs:frostmaw", True),
    ("sculptor", "Carved in Stone", "Defeat Tongbi, the Sculptor", "minecraft:chiseled_stone_bricks", "goal", "mowziesmobs:sculptor", False),
    ("radiation_director", "Meltdown Averted", "Defeat the Radiation Director in the Nether Reactor", "minecraft:wither_skeleton_skull", "challenge", "minecraft:wither_skeleton|Radiation Director", True),
    ("leviathan", "Out of the Deep", "Defeat the Leviathan", "minecraft:heart_of_the_sea", "challenge", "cataclysm:the_leviathan", True),
    ("netherite_monstrosity", "Slag", "Defeat the Netherite Monstrosity", "minecraft:netherite_block", "challenge", "cataclysm:netherite_monstrosity", True),
    ("harbinger", "Factory Reset", "Defeat the Harbinger", "minecraft:nether_star", "challenge", "cataclysm:the_harbinger", True),
    ("ignis", "Fire Walk", "Defeat Ignis", "minecraft:blaze_rod", "challenge", "cataclysm:ignis", True),
    ("ender_guardian", "Citadel Fallen", "Defeat the Ender Guardian", "minecraft:end_stone_bricks", "challenge", "cataclysm:ender_guardian", True),
    ("ancient_remnant", "Sand in the Gears", "Defeat the Ancient Remnant", "minecraft:sandstone", "challenge", "cataclysm:ancient_remnant", False),
    ("maledictus", "Curse Lifted", "Defeat Maledictus", "minecraft:soul_lantern", "challenge", "cataclysm:maledictus", False),
    ("scylla", "Storm's End", "Defeat Scylla", "minecraft:trident", "challenge", "cataclysm:scylla", False),
    ("hovering_inferno", "Risen and Fallen", "Defeat the Hovering Inferno", "minecraft:fire_charge", "challenge", "minecraft:blaze|Hovering Inferno", False),
    ("spiritcaller", "Spirits Dismissed", "Defeat a Spiritcaller", "minecraft:soul_torch", "goal", "illageandspillage:spiritcaller", False),
    ("magispeller", "Spell Broken", "Defeat a Magispeller", "minecraft:enchanted_book", "goal", "illageandspillage:magispeller", False),
    ("freakager", "Freak Out", "Defeat a Freakager", "minecraft:rotten_flesh", "goal", "illageandspillage:freakager", False),
    ("ragno", "Unwebbed", "Defeat Ragno", "minecraft:cobweb", "goal", "illageandspillage:ragno", False),
    ("elder_guardian", "Old Eyes", "Defeat an Elder Guardian", "minecraft:sponge", "goal", "minecraft:elder_guardian", False),
    ("warden", "Hush", "Defeat a Warden", "minecraft:sculk_shrieker", "challenge", "minecraft:warden", False),
    ("wither", "Unwithered", "Defeat the Wither", "minecraft:nether_star", "challenge", "minecraft:wither", False),
    ("ender_dragon", "The Last Line", "Defeat the Ender Dragon", "minecraft:dragon_head", "challenge", "minecraft:ender_dragon", False),
]


def adv(path, title, desc, icon, parent, criteria, requirements=None, frame="task", hidden=False, toast=True,
        announce=True, background=None, nbt=None):
    display = {"title": {"text": title}, "description": {"text": desc}, "icon": {"item": icon},
               "frame": frame, "show_toast": toast, "announce_to_chat": announce, "hidden": hidden}
    if nbt:
        display["icon"]["nbt"] = nbt
    if background:
        display["background"] = background
    data = {"display": display, "criteria": criteria}
    if parent:
        data["parent"] = f"peacock:{parent}"
    if requirements:
        data["requirements"] = requirements
    f = OUT / f"{path}.json"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


IMPOSSIBLE = {"granted": {"trigger": "minecraft:impossible"}}


def journal_nbt(j):
    return "{title:" + json.dumps(j["title"], ensure_ascii=False) + ",author:" + json.dumps(j["author"], ensure_ascii=False) + "}"


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    # ---------------------------------------------------------------- root
    adv("root", "Year One", "The capital still stands. Everything else is the question.", "peacock:blueprint", None,
        {"joined": {"trigger": "minecraft:tick"}}, toast=False, announce=False,
        background="minecraft:textures/block/cracked_stone_bricks.png")

    # ---------------------------------------------------------------- story
    ruins = {f"ruin_{i}": {"trigger": "minecraft:location", "conditions": {"player": [{
        "condition": "minecraft:entity_properties", "entity": "this",
        "predicate": {"location": {"structure": r}}}]}} for i, r in enumerate(RUINS)}
    adv("story/old_stone", "Old Stone", "Walk into a dead town", "minecraft:mossy_stone_bricks", "root",
        ruins, requirements=[list(ruins)])
    held = [r for r in RUINS if r.split(":")[1].startswith("ruin_h")]
    kills = {f"held_{i}": {"trigger": "minecraft:player_killed_entity", "conditions": {"entity": [{
        "condition": "minecraft:entity_properties", "entity": "this",
        "predicate": {"type": "#minecraft:raiders", "location": {"structure": r}}}]}} for i, r in enumerate(held)}
    adv("story/painted_ones", "The Painted Ones", "Kill a pillager in a town they hold", "minecraft:crossbow",
        "story/old_stone", kills, requirements=[list(kills)])
    books = {j["id"]: {"trigger": "minecraft:inventory_changed", "conditions": {"items": [
        {"items": ["minecraft:written_book"], "nbt": journal_nbt(j)}]}} for j in JOURNALS}
    adv("story/found_writings", "Found Writings", "Pick up a journal the survivors left", "minecraft:written_book",
        "root", books, requirements=[list(books)])
    adv("story/whole_story", "The Whole Story", f"Find all {len(JOURNALS)} journals", "minecraft:lectern",
        "story/found_writings", books, requirements=[[k] for k in books], frame="challenge")

    # ---------------------------------------------------------------- bosses
    adv("bosses/first", "Something That Fights Back", "Defeat a boss", "minecraft:iron_sword", "root", IMPOSSIBLE,
        frame="goal")
    for bid, title, desc, icon, frame, _key, _bp in BOSSES:
        adv(f"bosses/{bid}", title, desc, icon, "bosses/first", IMPOSSIBLE, frame=frame)
    adv("bosses/ledger", "Every Line of the Ledger", "Defeat every boss that holds a Blueprint", "minecraft:writable_book",
        "bosses/first", IMPOSSIBLE, frame="challenge")

    # ---------------------------------------------------------------- blueprints
    adv("blueprints/first", "The Knowledge Returns", "Learn a Blueprint", "peacock:blueprint", "root", IMPOSSIBLE)
    for tier, title in [(1, "Tinkerer"), (2, "Engineer"), (3, "Industrialist"), (4, "Arcanist")]:
        adv(f"blueprints/tier{tier}", title, f"Learn every Tier {tier} Blueprint", "peacock:blueprint",
            "blueprints/first", IMPOSSIBLE, frame="goal")
    adv("blueprints/all", "Civilization", "Learn every Blueprint", "minecraft:beacon", "blueprints/tier4", IMPOSSIBLE,
        frame="challenge")
    charters = {r: {"trigger": "minecraft:recipe_crafted", "conditions": {"recipe_id": f"peacock:charter/{r}"}}
                for r in LADDER_RUNGS}
    adv("blueprints/charter", "Paid in Full", "Buy a Blueprint with a charter", "minecraft:emerald_block",
        "blueprints/first", charters, requirements=[list(charters)])

    # ---------------------------------------------------------------- towns
    adv("towns/take_work", "Help Wanted", "Take a job from a bounty board", "bountiful:bountyboard", "root",
        {"bounty": {"trigger": "minecraft:inventory_changed", "conditions": {"items": [{"items": ["bountiful:bounty"]}]}}})
    adv("towns/rumour", "Sealed Rumour", "Break the seal on a rumour", "minecraft:filled_map", "towns/take_work", IMPOSSIBLE)
    adv("towns/sworn_in", "Sworn In", "Enlist in a town", "minecraft:white_banner", "root", IMPOSSIBLE)
    adv("towns/first_recruit", "A Company of One", "Hire a recruit", "minecraft:iron_sword", "towns/sworn_in", IMPOSSIBLE)

    # ---------------------------------------------------------------- survival
    adv("survival/fire_drill", "Fire from Sticks", "Make a fire drill", "peacock:fire_drill", "root",
        {"drill": {"trigger": "minecraft:inventory_changed", "conditions": {"items": [{"items": ["peacock:fire_drill"]}]}}})
    adv("survival/sewn_in", "Sewn In", "Insulate a piece of armour at a sewing table", "cold_sweat:sewing_table",
        "survival/fire_drill", {"insulated": {"trigger": "cold_sweat:armor_insulated"}})
    adv("survival/hearth", "Hearth and Home", "Place a hearth", "cold_sweat:hearth", "survival/sewn_in",
        {"hearth": {"trigger": "minecraft:placed_block", "conditions": {"location": [{
            "condition": "minecraft:location_check", "predicate": {"block": {"blocks": ["cold_sweat:hearth"]}}}]}}},
        frame="goal")
    adv("survival/winter", "First Thaw", "Live through a winter and see the spring", "minecraft:snow_block",
        "survival/fire_drill", IMPOSSIBLE, frame="goal")

    n = sum(1 for _ in OUT.rglob("*.json"))
    print(f"wrote {n} advancements -> {OUT.relative_to(ROOT)}")
    print("achievements.js BOSSES table:")
    for bid, *_rest in BOSSES:
        key, bp = _rest[-2], _rest[-1]
        print(f"  '{key}': ['{bid}', {str(bp).lower()}],")


if __name__ == "__main__":
    main()
