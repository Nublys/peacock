#!/usr/bin/env python3
"""Peacock bounty boards, journals and rumour vouchers.

Writes, from tools/data/journals.json and the tables below:

  pack/config/paxi/datapacks/peacock/data/bountiful/bounty_pools/bountiful/*.json
      overrides of Bountiful's shared pools (_all_rews, _all_objs, _equip_rews) and the
      librarian / mapper / cleric reward pools — the filler goes, the pack's goods come in,
      the best of it sits behind board reputation (repRequired).
  .../bounty_pools/peacock/archivist_*.json  +  .../bounty_decrees/peacock/archivist.json
      the Archivist's Decree: paper-and-ink objectives, journals as rewards.
  pack/config/paxi/datapacks/peacock/data/peacock/loot_tables/rumour/<id>.json
      one exploration-map loot table per rumour; a Rumour Voucher (kubejs) redeems into one.
  pack/kubejs/config/journals.json
      the journals as written-book data for the chest-loot script.

Bountiful's worth scale: 1 emerald = 1000. A bounty's rewards sum to roughly its objectives'
worth, so unitWorth here decides how much of a thing one bounty pays, not whether it appears.

Usage: python3 tools/gen-bounties.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "pack"
DP = PACK / "config/paxi/datapacks/peacock/data"
JOURNALS = json.loads((ROOT / "tools/data/journals.json").read_text(encoding="utf-8"))["journals"]

# id -> (display name, search radius in chunks, decoration) — mirrors kubejs/server_scripts/rumour_maps.js
RUMOURS = {
    "wrought_chamber": ("Rumour: the Iron Knight's chamber", 40, "red_x"),
    "frostmaw":        ("Rumour: the sleeping giant of the snows", 40, "red_x"),
    "umvuthana_grove": ("Rumour: the sun chief's grove", 40, "red_x"),
    "monastery":       ("Rumour: the monastery on the peaks", 40, "red_x"),
    "illager_fort":    ("Rumour: the illager fort", 60, "target_point"),
    "cursed_pyramid":  ("Rumour: the cursed pyramid", 100, "red_x"),
    "frosted_prison":  ("Rumour: the frosted prison", 100, "red_x"),
    "ancient_factory": ("Rumour: the factory under the ground", 120, "red_x"),
    "sunken_city":     ("Rumour: the sunken city", 120, "red_x"),
    "acropolis":       ("Rumour: the acropolis in the warm sea", 100, "red_x"),
    "survivors_tower": ("Rumour: smoke from a new tower", 20, "target_point"),
}


# ----------------------------------------------------------------------------- helpers
def snbt_str(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def book_nbt(j) -> str:
    pages = ",".join(snbt_str(json.dumps({"text": p}, ensure_ascii=False)) for p in j["pages"])
    return ("{title:" + snbt_str(j["title"]) + ",author:" + snbt_str(j["author"]) +
            ",generation:1,resolved:1b,pages:[" + pages + "]}")


def entry(content, worth, lo=1, hi=1, rarity=None, rep=None, nbt=None, type_="item", weight=None, name=None):
    e = {"type": type_, "content": content, "amount": {"min": lo, "max": hi}, "unitWorth": worth}
    if rarity: e["rarity"] = rarity
    if rep is not None: e["repRequired"] = rep
    if nbt: e["nbt"] = nbt
    if weight is not None: e["weightMult"] = weight
    if name: e["name"] = name
    return e


def pool(entries: dict):
    return {"content": entries}


def write(rel: str, obj):
    p = DP / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")


def ench_book(ench: str, lvl: int, worth: int, rarity: str, rep=None):
    return entry("minecraft:enchanted_book", worth, rarity=rarity, rep=rep,
                 nbt="{StoredEnchantments:[{id:" + snbt_str("minecraft:" + ench) + ",lvl:" + str(lvl) + "s}]}")


def potion(kind: str, worth: int, lo=1, hi=1, rarity=None):
    return entry("minecraft:potion", worth, lo, hi, rarity=rarity, nbt="{Potion:" + snbt_str("minecraft:" + kind) + "}")


# ----------------------------------------------------------------------------- rewards
ALL_REWS = pool({
    "emerald":        entry("minecraft:emerald", 1000, 2, 6),
    "emerald_block":  entry("minecraft:emerald_block", 9000, 1, 2, "UNCOMMON"),
    "iron_ingot":     entry("minecraft:iron_ingot", 300, 3, 8),
    "gold_ingot":     entry("minecraft:gold_ingot", 900, 2, 5, "UNCOMMON"),
    "golden_apple":   entry("minecraft:golden_apple", 2500, 1, 2, "UNCOMMON"),
    "xp_bottle":      entry("minecraft:experience_bottle", 700, 3, 8, "UNCOMMON"),
    "saddle":         entry("minecraft:saddle", 4000, 1, 1, "UNCOMMON"),
    "name_tag":       entry("minecraft:name_tag", 3000, 1, 1, "UNCOMMON"),
    "lantern":        entry("minecraft:lantern", 350, 2, 6),
    "beef_stew":      entry("farmersdelight:beef_stew", 600, 2, 4),
    "bacon_eggs":     entry("farmersdelight:bacon_and_eggs", 500, 2, 4),
    # Starter pay (Aaron, 2026-10-20: "make the initial bounty rewards good, as a way to rope players in"). A
    # bounty's objectives cost what its rewards are worth, so a delivery broke even and iron-for-iron lost. These
    # COMMON rewards are priced well under what they are worth to a new settler (chainmail cannot be crafted, iron
    # is regional, winter is real), so a fresh board's first jobs pay out in kit: four zombies for an iron pickaxe.
    # Bountiful weights rewards by the board's level (finished bounties, shared by everyone): below level 5 commons
    # dominate; from level 5 their weight drops by 2.25x and from 15 by 5x, so this generosity fades as the board
    # grows into the rarer pay. Nothing here is Blueprint-gated (the musket cartridge was, and is gone).
    "iron_pickaxe":   entry("minecraft:iron_pickaxe", 900, 1, 1),
    "iron_sword":     entry("minecraft:iron_sword", 700, 1, 1),
    "iron_knife":     entry("farmersdelight:iron_knife", 500, 1, 1),
    "chain_helmet":   entry("minecraft:chainmail_helmet", 700, 1, 1),
    "chain_chest":    entry("minecraft:chainmail_chestplate", 1100, 1, 1),
    "chain_legs":     entry("minecraft:chainmail_leggings", 1000, 1, 1),
    "chain_boots":    entry("minecraft:chainmail_boots", 600, 1, 1),
    "fur_helmet":     entry("cold_sweat:goat_fur_helmet", 600, 1, 1),
    "fur_chest":      entry("cold_sweat:goat_fur_chestplate", 1000, 1, 1),
    "fur_legs":       entry("cold_sweat:goat_fur_leggings", 900, 1, 1),
    "fur_boots":      entry("cold_sweat:goat_fur_boots", 500, 1, 1),
    "waterskin":      entry("cold_sweat:waterskin", 400, 1, 1),
    "torch":          entry("minecraft:torch", 30, 16, 32),
    "cooked_beef":    entry("minecraft:cooked_beef", 150, 4, 10),
    "andesite_alloy": entry("create:andesite_alloy", 250, 4, 12),
    "map":            entry("minecraft:map", 500, 1, 2),
    "diamond":        entry("minecraft:diamond", 4000, 1, 3, "RARE"),
    "horse_armor_i":  entry("minecraft:iron_horse_armor", 6000, 1, 1, "RARE"),
    "horse_armor_g":  entry("minecraft:golden_horse_armor", 7000, 1, 1, "RARE"),
    "decree":         entry("bountiful:decree", 1500, 1, 1, "RARE"),
    "spyglass":       entry("minecraft:spyglass", 3500, 1, 1, "RARE"),
    "notch_apple":    entry("minecraft:enchanted_golden_apple", 16000, 1, 1, "EPIC", rep=10),
    "horse_armor_d":  entry("minecraft:diamond_horse_armor", 18000, 1, 1, "EPIC", rep=10),
    "totem":          entry("minecraft:totem_of_undying", 20000, 1, 1, "LEGENDARY", rep=15),
})

EQUIP_REWS = pool({
    "shield":      entry("minecraft:shield", 1200, 1, 1, "UNCOMMON", nbt="{Damage:0,Enchantments:[{id:\"minecraft:unbreaking\",lvl:2s}]}"),
    "iron_pick":   entry("minecraft:iron_pickaxe", 2500, 1, 1, "UNCOMMON", nbt="{Damage:0,Enchantments:[{id:\"minecraft:efficiency\",lvl:2s}]}"),
    "iron_axe":    entry("minecraft:iron_axe", 2500, 1, 1, "UNCOMMON", nbt="{Damage:0,Enchantments:[{id:\"minecraft:sharpness\",lvl:2s}]}"),
    "crossbow":    entry("minecraft:crossbow", 3500, 1, 1, "RARE", nbt="{Damage:0,Enchantments:[{id:\"minecraft:quick_charge\",lvl:2s}]}"),
    "bow":         entry("minecraft:bow", 3500, 1, 1, "RARE", nbt="{Damage:0,Enchantments:[{id:\"minecraft:power\",lvl:3s}]}"),
    "diamond_pick": entry("minecraft:diamond_pickaxe", 14000, 1, 1, "EPIC", rep=12,
                          nbt="{Damage:0,Enchantments:[{id:\"minecraft:efficiency\",lvl:3s},{id:\"minecraft:unbreaking\",lvl:2s}]}"),
})

LIBRARIAN_REWS = pool({
    "bookshelf":    entry("minecraft:bookshelf", 1200, 2, 6),
    "book":         entry("minecraft:book", 300, 2, 6),
    "lantern":      entry("minecraft:lantern", 500, 1, 3),
    "xp_bottle":    entry("minecraft:experience_bottle", 700, 2, 6),
    "name_tag":     entry("minecraft:name_tag", 3000, 1, 1, "UNCOMMON"),
    "b_unbreaking": ench_book("unbreaking", 3, 7000, "UNCOMMON"),
    "b_efficiency": ench_book("efficiency", 4, 7000, "UNCOMMON"),
    "b_sharpness":  ench_book("sharpness", 4, 7000, "UNCOMMON"),
    "b_protection": ench_book("protection", 4, 7000, "UNCOMMON"),
    "b_feather":    ench_book("feather_falling", 4, 5000, "UNCOMMON"),
    "b_respiration": ench_book("respiration", 3, 4500, "UNCOMMON"),
    "b_aqua":       ench_book("aqua_affinity", 1, 3500, "UNCOMMON"),
    "b_fortune":    ench_book("fortune", 3, 10000, "RARE", rep=8),
    "b_silk":       ench_book("silk_touch", 1, 9000, "RARE", rep=8),
    "b_looting":    ench_book("looting", 3, 9000, "RARE", rep=8),
    "b_infinity":   ench_book("infinity", 1, 9000, "RARE", rep=8),
    "b_mending":    ench_book("mending", 1, 15000, "EPIC", rep=15),
    "clock":        entry("minecraft:clock", 3000, 1, 1, "RARE"),
})

MAPPER_REWS = pool({
    "map":          entry("minecraft:map", 800, 1, 2),
    "item_frame":   entry("minecraft:item_frame", 300, 2, 6),
    "paper":        entry("minecraft:paper", 60, 8, 24),
    "compass":      entry("minecraft:compass", 2500, 1, 1, "UNCOMMON"),
    "spyglass":     entry("minecraft:spyglass", 3500, 1, 1, "UNCOMMON"),
    "banner_globe": entry("minecraft:globe_banner_pattern", 3000, 1, 1, "RARE"),
    "recovery":     entry("minecraft:recovery_compass", 8000, 1, 1, "EPIC", rep=12),
    # a Village Recruits tower: the survivors' new towns (2026-10-20)
    "rumour_survivors_tower": entry("peacock:rumour_voucher", 2500, 1, 1, "UNCOMMON", nbt="{rumour:\"survivors_tower\"}"),
    **{f"rumour_{rid}": entry("peacock:rumour_voucher", 6000, 1, 1, "RARE", rep=10,
                             nbt="{rumour:" + snbt_str(rid) + "}")
       for rid in ("wrought_chamber", "frostmaw", "umvuthana_grove", "monastery", "illager_fort")},
    **{f"rumour_{rid}": entry("peacock:rumour_voucher", 9000, 1, 1, "EPIC", rep=20,
                             nbt="{rumour:" + snbt_str(rid) + "}")
       for rid in ("cursed_pyramid", "frosted_prison", "ancient_factory", "sunken_city", "acropolis")},
})

CLERIC_REWS = pool({
    "redstone":     entry("minecraft:redstone", 400, 2, 8),
    "lapis":        entry("minecraft:lapis_lazuli", 700, 2, 6),
    "glowstone":    entry("minecraft:glowstone", 1500, 1, 3),
    "xp_bottle":    entry("minecraft:experience_bottle", 700, 3, 8),
    "p_healing":    potion("strong_healing", 1800, 1, 2),
    "p_regen":      potion("long_regeneration", 2200, 1, 1, "UNCOMMON"),
    "p_fire_res":   potion("long_fire_resistance", 2000, 1, 1, "UNCOMMON"),
    "p_strength":   potion("strong_strength", 2500, 1, 1, "RARE"),
    "golden_apple": entry("minecraft:golden_apple", 2500, 1, 2, "UNCOMMON"),
    "ghast_tear":   entry("minecraft:ghast_tear", 2000, 1, 2, "UNCOMMON"),
    "ender_pearl":  entry("minecraft:ender_pearl", 2500, 1, 3, "RARE"),
    "b_mending":    ench_book("mending", 1, 15000, "EPIC", rep=15),
    "totem":        entry("minecraft:totem_of_undying", 20000, 1, 1, "LEGENDARY", rep=15),
})

# ----------------------------------------------------------------------------- objectives
def ent(mob, worth, lo, hi, rarity=None):
    return entry(mob, worth, lo, hi, rarity=rarity, type_="entity")

ALL_OBJS = pool({
    "emerald":        entry("minecraft:emerald", 1000, 2, 16),
    "iron_ingot":     entry("minecraft:iron_ingot", 350, 4, 16),
    "copper_ingot":   entry("minecraft:copper_ingot", 150, 8, 32),
    "coal":           entry("minecraft:coal", 70, 16, 48),
    "bread":          entry("minecraft:bread", 80, 8, 24),
    "leather":        entry("minecraft:leather", 150, 4, 16),
    "string":         entry("minecraft:string", 60, 8, 32),
    "torch":          entry("minecraft:torch", 40, 16, 64),
    "oak_log":        entry("minecraft:logs", 30, 32, 64, type_="item_tag"),
    "wool":           entry("minecraft:wool", 90, 8, 24, type_="item_tag"),
    "gold_ingot":     entry("minecraft:gold_ingot", 700, 2, 8, "UNCOMMON"),
    "iron_block":     entry("minecraft:iron_block", 3300, 1, 4, "RARE"),
    "andesite_alloy": entry("create:andesite_alloy", 350, 8, 32, "UNCOMMON"),
    "brass_ingot":    entry("create:brass_ingot", 1500, 4, 12, "RARE"),
    "cooking_pot":    entry("farmersdelight:cooking_pot", 2500, 1, 1, "RARE"),
    "k_zombie":       ent("minecraft:zombie", 250, 4, 12),
    "k_skeleton":     ent("minecraft:skeleton", 300, 4, 10),
    "k_spider":       ent("minecraft:spider", 275, 3, 8),
    "k_creeper":      ent("minecraft:creeper", 550, 2, 6),
    "k_drowned":      ent("minecraft:drowned", 350, 2, 6),
    "k_zombie_villager": ent("minecraft:zombie_villager", 500, 2, 6, "UNCOMMON"),
    "k_pillager":     ent("minecraft:pillager", 600, 3, 8, "UNCOMMON"),
    "k_vindicator":   ent("minecraft:vindicator", 1100, 1, 4, "RARE"),
    "k_witch":        ent("minecraft:witch", 900, 1, 3, "RARE"),
    "k_evoker":       ent("minecraft:evoker", 4000, 1, 1, "EPIC"),
})

ARCHIVIST_OBJS = pool({
    "paper":        entry("minecraft:paper", 50, 12, 48),
    "book":         entry("minecraft:book", 300, 2, 8),
    "ink_sac":      entry("minecraft:ink_sac", 120, 4, 12),
    "candle":       entry("minecraft:candle", 150, 4, 12),
    "lantern":      entry("minecraft:lantern", 500, 2, 6),
    "feather":      entry("minecraft:feather", 40, 8, 24),
    "glass_pane":   entry("minecraft:glass_pane", 90, 8, 32),
    "iron_bars":    entry("minecraft:iron_bars", 220, 8, 24, "UNCOMMON"),
    "brass_sheet":  entry("create:brass_sheet", 1600, 2, 8, "RARE"),
    "k_zombie_villager": ent("minecraft:zombie_villager", 500, 3, 8),
    "k_pillager":   ent("minecraft:pillager", 600, 4, 10, "UNCOMMON"),
    "k_vindicator": ent("minecraft:vindicator", 1100, 2, 4, "RARE"),
})

TIER = {1: (3500, "UNCOMMON", 4), 2: (6500, "RARE", 14), 3: (10000, "EPIC", 24)}
ARCHIVIST_REWS = pool({
    "emerald":   entry("minecraft:emerald", 1000, 2, 5),
    "book":      entry("minecraft:book", 300, 2, 6),
    "lantern":   entry("minecraft:lantern", 500, 1, 3),
    "bookshelf": entry("minecraft:bookshelf", 1200, 1, 4),
    "xp_bottle": entry("minecraft:experience_bottle", 700, 2, 6, "UNCOMMON"),
    **{f"journal_{j['id']}": entry("minecraft:written_book", TIER[j["tier"]][0], 1, 1, TIER[j["tier"]][1],
                                   rep=TIER[j["tier"]][2], nbt=book_nbt(j)) for j in JOURNALS},
    # display names go through snbt_str: an apostrophe inside a single-quoted SNBT string broke the whole pool
    # ("Expected '}' at position 48: ...Archivist'<--[HERE]", 2026-10-18) and the Archivist decree had no rewards
    "warden_sword": entry("minecraft:iron_sword", 18000, 1, 1, "LEGENDARY", rep=30, nbt=(
        '{Damage:0,display:{Name:' + snbt_str(json.dumps({"text": "Warden of the Capital", "italic": False, "color": "gold"})) + '},'
        'Enchantments:[{id:"minecraft:sharpness",lvl:4s},{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:mending",lvl:1s}]}')),
    "warden_bow": entry("minecraft:crossbow", 18000, 1, 1, "LEGENDARY", rep=30, nbt=(
        '{Damage:0,display:{Name:' + snbt_str(json.dumps({"text": "The Archivist's Answer", "italic": False, "color": "gold"})) + '},'
        'Enchantments:[{id:"minecraft:quick_charge",lvl:3s},{id:"minecraft:piercing",lvl:3s},{id:"minecraft:mending",lvl:1s}]}')),
})


# ----------------------------------------------------------------------------- the mods on the boards
# Aaron, 2026-10-20: "ensure plenty of mod items can be rewarded or demanded by the bounty system ... a great way to
# force players to interact with unfamiliar mods ... don't over pollute to the point where players don't see
# Peacock's story-specific bounties." Bountiful divides every pool's weight by its entry count (Pool.finishMergedSetup),
# so a pool holds the same share of a board's picks however many entries it has. The mods therefore go into the
# trade decrees' own pools (farmer, fisherman, inventor ...), which never appear on an Archivist board, and the story
# pools (archivist_objs/rews, the pillager hunts in _all_objs, the mapper's rumour vouchers) keep their share.
# Datapack pools MERGE into Bountiful's built-in ones (the "replace" flag only works for config-folder files), so
# entries here are added to the defaults; None removes a default entry, a partial dict edits one (Kudzu graft).
def obj(c, worth, lo, hi, rarity=None, rep=None):
    return entry(c, worth, lo, hi, rarity=rarity, rep=rep)

def fish(c, worth=150, lo=2, hi=6, rarity=None):
    return entry(c, worth, lo, hi, rarity=rarity)

MOD_POOLS = {
    "farmer_objs": {
        "pk_cabbage": obj("farmersdelight:cabbage", 60, 8, 24), "pk_tomato": obj("farmersdelight:tomato", 60, 8, 24),
        "pk_onion": obj("farmersdelight:onion", 60, 8, 24), "pk_rice": obj("farmersdelight:rice", 50, 8, 32),
        "pk_straw": obj("farmersdelight:straw", 30, 16, 32), "pk_flax": obj("supplementaries:flax", 60, 8, 24),
        "pk_compost": obj("farmersdelight:organic_compost", 250, 2, 6, "UNCOMMON"),
        "pk_flour": obj("create:wheat_flour", 50, 16, 32, "UNCOMMON"),
    },
    "farmer_rews": {
        "pk_cabbage_seeds": entry("farmersdelight:cabbage_seeds", 40, 4, 12), "pk_tomato_seeds": entry("farmersdelight:tomato_seeds", 40, 4, 12),
        "pk_rice": entry("farmersdelight:rice", 40, 4, 12), "pk_flax_seeds": entry("supplementaries:flax_seeds", 40, 4, 12),
        "pk_rich_soil": entry("farmersdelight:rich_soil", 300, 4, 8, "UNCOMMON"),
        "pk_cooking_pot": entry("farmersdelight:cooking_pot", 2500, 1, 1, "RARE"),
    },
    "butcher_objs": {
        "pk_ham": obj("farmersdelight:ham", 300, 1, 4), "pk_minced_beef": obj("farmersdelight:minced_beef", 60, 8, 16),
        "pk_chicken_cuts": obj("farmersdelight:chicken_cuts", 50, 8, 16), "pk_venison": obj("naturalist:venison", 120, 4, 12),
        "pk_duck": obj("naturalist:duck", 100, 4, 8),
        "pk_beef_stew": obj("farmersdelight:beef_stew", 600, 2, 4, "UNCOMMON"),
        "pk_steak_potatoes": obj("farmersdelight:steak_and_potatoes", 700, 1, 4, "UNCOMMON"),
    },
    "butcher_rews": {
        "pk_cooked_venison": entry("naturalist:cooked_venison", 200, 4, 8), "pk_bacon": entry("farmersdelight:cooked_bacon", 120, 4, 12),
        "pk_smoked_ham": entry("farmersdelight:smoked_ham", 1200, 1, 2, "UNCOMMON"),
        "pk_skillet": entry("farmersdelight:skillet", 1500, 1, 1, "UNCOMMON"),
    },
    "fisherman_objs": {
        **{f"pk_{f}": fish(f"aquaculture:{f}") for f in ("bluegill", "perch", "smallmouth_bass", "brown_trout", "carp", "catfish",
                                                        "minnow", "gar", "pollock", "atlantic_herring")},
        "pk_piranha": fish("aquaculture:piranha", 400, 1, 3, "UNCOMMON"),
        "pk_tuna": fish("aquaculture:tuna", 900, 1, 2, "RARE"), "pk_arapaima": fish("aquaculture:arapaima", 1200, 1, 1, "RARE"),
        "pk_worm": obj("aquaculture:worm", 40, 4, 16), "pk_rope": obj("supplementaries:rope", 50, 8, 24),
        "pk_nat_bass": fish("naturalist:bass"), "pk_nat_catfish": fish("naturalist:catfish"),
    },
    "fisherman_rews": {
        "pk_worm": entry("aquaculture:worm", 30, 8, 16), "pk_fillet": entry("aquaculture:fish_fillet_cooked", 120, 4, 12),
        "pk_fish_chips": entry("aquaculturedelight:fish_and_chips", 500, 1, 3),
        "pk_iron_rod": entry("aquaculture:iron_fishing_rod", 1500, 1, 1, "UNCOMMON"),
        "pk_tackle_box": entry("aquaculture:tackle_box", 2500, 1, 1, "RARE"),
        "pk_neptunes_bounty": entry("aquaculture:neptunes_bounty", 6000, 1, 1, "EPIC", rep=10),
    },
    "fletcher_objs": {
        "pk_iron_arrow": obj("spartanweaponry:iron_arrow", 60, 8, 32, "UNCOMMON"), "pk_rope": obj("supplementaries:rope", 50, 8, 24),
        "pk_flax": obj("supplementaries:flax", 60, 8, 24),
        "pk_lead_ingot": obj("geolosys:lead_ingot", 250, 2, 8),   # lead is shot
    },
    "fletcher_rews": {
        "pk_iron_arrow": entry("spartanweaponry:iron_arrow", 60, 8, 24),
        "pk_slingshot": entry("supplementaries:slingshot", 1500, 1, 1, "UNCOMMON"),
        "pk_longbow": entry("spartanweaponry:iron_longbow", 3000, 1, 1, "UNCOMMON"),
        "pk_heavy_crossbow": entry("spartanweaponry:iron_heavy_crossbow", 3500, 1, 1, "RARE"),
        "pk_quiver": entry("supplementaries:quiver", 4000, 1, 1, "RARE"),
    },
    "toolsmith_objs": {
        "pk_iron_sheet": obj("create:iron_sheet", 450, 2, 8, "UNCOMMON"), "pk_iron_knife": obj("farmersdelight:iron_knife", 500, 1, 1),
        # Geolosys metals and Create: Ironworks' alloys have buyers (2026-10-21)
        "pk_tin_ingot": obj("create_ironworks:tin_ingot", 250, 4, 12),
        "pk_bronze_ingot": obj("create_ironworks:bronze_ingot", 450, 2, 8, "UNCOMMON"),
        "pk_steel_ingot": obj("create_ironworks:steel_ingot", 900, 1, 4, "RARE"),
    },
    "toolsmith_rews": {
        "pk_prospectors_pick": entry("geolosys:prospectors_pick", 1500, 1, 1, "UNCOMMON"),
        "pk_wrench": entry("create:wrench", 1500, 1, 1, "UNCOMMON"),
        "pk_throwing_knife": entry("spartanweaponry:iron_throwing_knife", 300, 2, 6),
        "pk_javelin": entry("spartanweaponry:iron_javelin", 400, 2, 4),
        "pk_dagger": entry("spartanweaponry:iron_dagger", 800, 1, 1),
        "pk_spear": entry("spartanweaponry:iron_spear", 1500, 1, 1, "UNCOMMON"),
        "pk_longsword": entry("spartanweaponry:iron_longsword", 2000, 1, 1, "UNCOMMON"),
        "pk_battleaxe": entry("spartanweaponry:iron_battleaxe", 2200, 1, 1, "UNCOMMON"),
        "pk_flanged_mace": entry("spartanweaponry:iron_flanged_mace", 2000, 1, 1, "UNCOMMON"),
        "pk_halberd": entry("spartanweaponry:iron_halberd", 2500, 1, 1, "RARE"),
        "pk_warhammer": entry("spartanweaponry:iron_warhammer", 2500, 1, 1, "RARE"),
        "pk_bronze_pickaxe": entry("create_ironworks:bronze_pickaxe", 1200, 1, 1, "UNCOMMON"),
        "pk_steel_hammer": entry("create_ironworks:steel_hammer", 4000, 1, 1, "RARE"),
        # Bountiful's own diamond tools and trident had no reputation gate
        "toolsmith_rew_diamond_pickaxe": {"repRequired": 12}, "toolsmith_rew_diamond_axe": {"repRequired": 12},
        "toolsmith_rew_diamond_hoe": {"repRequired": 12}, "toolsmith_rew_trident": {"repRequired": 10},
    },
    "armorer_objs": {
        "pk_goat_fur": obj("cold_sweat:goat_fur", 300, 2, 6), "pk_hoglin_hide": obj("cold_sweat:hoglin_hide", 600, 1, 4, "UNCOMMON"),
        "pk_iron_sheet": obj("create:iron_sheet", 450, 2, 8, "UNCOMMON"),
        "pk_bronze_ingot": obj("create_ironworks:bronze_ingot", 450, 2, 8, "UNCOMMON"),
        "pk_nickel_ingot": obj("geolosys:nickel_ingot", 350, 2, 6, "UNCOMMON"),
    },
    "armorer_rews": {
        "pk_iron_shield": entry("spartanshields:iron_basic_shield", 2000, 1, 1, "UNCOMMON"),
        "pk_iron_tower": entry("spartanshields:iron_tower_shield", 3000, 1, 1, "RARE"),
        "pk_hoglin_chest": entry("cold_sweat:hoglin_chestplate", 2500, 1, 1, "RARE"),
        "pk_bronze_chest": entry("create_ironworks:bronze_armor_chestplate", 2500, 1, 1, "RARE"),
        # netherite is a Blueprint (tier 3): never a reward; Bountiful's diamond armour waits for a grown board
        **{f"armorer_rew_nether_{p}": None for p in ("helm", "chest", "legs", "boots")},
        **{f"armorer_rew_diamond_{p}": {"repRequired": 12} for p in ("helm", "chest", "legs", "boots", "horse_armor")},
    },
    "leatherer_objs": {
        "pk_goat_fur": obj("cold_sweat:goat_fur", 300, 2, 8), "pk_canvas": obj("farmersdelight:canvas", 150, 4, 12, "UNCOMMON"),
        "pk_sack": obj("supplementaries:sack", 400, 1, 4, "UNCOMMON"), "pk_hoglin_hide": obj("cold_sweat:hoglin_hide", 600, 1, 4, "UNCOMMON"),
    },
    "leatherer_rews": {
        "pk_canvas": entry("farmersdelight:canvas", 100, 4, 8), "pk_sack": entry("supplementaries:sack", 300, 1, 2),
        "pk_sewing_table": entry("cold_sweat:sewing_table", 1500, 1, 1, "UNCOMMON"),
        "pk_lunch_basket": entry("supplementaries:lunch_basket", 1500, 1, 1, "UNCOMMON"),
        "pk_wool_collar": entry("doggytalents:wool_collar", 1200, 1, 1, "UNCOMMON"),
    },
    "shepherd_objs": {
        "pk_flax": obj("supplementaries:flax", 60, 8, 24), "pk_canvas": obj("farmersdelight:canvas", 150, 4, 12, "UNCOMMON"),
    },
    "shepherd_rews": {
        "pk_chair": entry("mcwfurnitures:oak_chair", 500, 1, 4), "pk_table": entry("mcwfurnitures:oak_table", 800, 1, 2),
        "pk_desk": entry("mcwfurnitures:oak_desk", 800, 1, 1), "pk_bookshelf": entry("mcwfurnitures:oak_bookshelf", 1000, 1, 2, "UNCOMMON"),
        "pk_wardrobe": entry("mcwfurnitures:oak_wardrobe", 1200, 1, 1, "UNCOMMON"),
        "pk_dog_bed": entry("doggytalents:dog_bed", 1500, 1, 1, "UNCOMMON"),
    },
    "inventor_objs": {
        "pk_cogwheel": obj("create:cogwheel", 120, 4, 12), "pk_shaft": obj("create:shaft", 40, 8, 24),
        "pk_andesite_casing": obj("create:andesite_casing", 400, 2, 8, "UNCOMMON"),
        "pk_belt": obj("create:belt_connector", 300, 2, 6, "UNCOMMON"), "pk_copper_sheet": obj("create:copper_sheet", 300, 2, 8, "UNCOMMON"),
        "pk_water_wheel": obj("create:water_wheel", 900, 1, 2, "UNCOMMON"), "pk_millstone": obj("create:millstone", 1200, 1, 1, "UNCOMMON"),
        "pk_basin": obj("create:basin", 600, 1, 2, "UNCOMMON"), "pk_depot": obj("create:depot", 500, 1, 2, "UNCOMMON"),
        "pk_press": obj("create:mechanical_press", 2500, 1, 1, "RARE"), "pk_fan": obj("create:encased_fan", 1500, 1, 1, "RARE"),
    },
    "inventor_rews": {
        "pk_cogwheel": entry("create:cogwheel", 150, 4, 12), "pk_large_cogwheel": entry("create:large_cogwheel", 300, 2, 6),
        "pk_drawers": entry("storagedrawers:oak_full_drawers_1", 600, 1, 4),
        "pk_wrench": entry("create:wrench", 1500, 1, 1, "UNCOMMON"), "pk_goggles": entry("create:goggles", 1500, 1, 1, "UNCOMMON"),
        "pk_water_wheel": entry("create:water_wheel", 1000, 1, 1, "UNCOMMON"),
        "pk_drill": entry("create:mechanical_drill", 2000, 1, 1, "RARE"), "pk_saw": entry("create:mechanical_saw", 2000, 1, 1, "RARE"),
        "pk_super_glue": entry("create:super_glue", 1500, 1, 1, "RARE"),
        "pk_drawer_controller": entry("storagedrawers:controller", 4000, 1, 1, "RARE"),
    },
    "librarian_objs": {
        "pk_antique_ink": obj("supplementaries:antique_ink", 500, 1, 3, "UNCOMMON"),
    },
    "mapper_objs": {
        # Geolosys: the surface pebbles that say what ore lies below; prospecting is the first adventure
        "pk_hematite_sample": obj("geolosys:hematite_ore_sample", 200, 1, 3),
        "pk_malachite_sample": obj("geolosys:malachite_ore_sample", 200, 1, 3),
        "pk_cassiterite_sample": obj("geolosys:cassiterite_ore_sample", 250, 1, 3, "UNCOMMON"),
        "pk_sphalerite_sample": obj("geolosys:sphalerite_ore_sample", 300, 1, 3, "UNCOMMON"),
        # the deep ones: samples of deposits most often found from a cave (2026-10-27)
        "pk_galena_sample": obj("geolosys:galena_ore_sample", 350, 1, 3, "UNCOMMON"),
        "pk_limonite_sample": obj("geolosys:limonite_ore_sample", 400, 1, 3, "UNCOMMON"),
        "pk_platinum_sample": obj("geolosys:platinum_ore_sample", 700, 1, 2, "RARE"),
        "pk_kimberlite_sample": obj("geolosys:kimberlite_ore_sample", 700, 1, 2, "RARE"),
    },
    "cleric_objs": {
        "pk_glow_goop": obj("naturalist:glow_goop", 300, 2, 6, "UNCOMMON"), "pk_snail_shell": obj("naturalist:snail_shell", 400, 1, 3, "UNCOMMON"),
        "pk_creeper_spores": obj("savage_and_ravage:creeper_spores", 300, 2, 6, "UNCOMMON"),
        "pk_illusionary_dust": obj("illagerinvasion:illusionary_dust", 800, 1, 3, "RARE"),
        "pk_silver_ingot": obj("geolosys:silver_ingot", 500, 1, 4, "UNCOMMON"),
        "pk_glow_ink_sac": obj("minecraft:glow_ink_sac", 250, 2, 6),
    },
    "cleric_rews": {
        "pk_training_treat": entry("doggytalents:training_treat", 500, 1, 3, "UNCOMMON"),
        "pk_soap": entry("supplementaries:soap", 200, 1, 4),
        "pk_soulspring_lamp": entry("cold_sweat:soulspring_lamp", 4000, 1, 1, "RARE"),
        "cleric_rew_ench_book_mending": {"repRequired": 15},
    },
    "fisherman_rews_gates": {},
}
MOD_POOLS["fisherman_rews"]["fisherman_rew_heart_sea"] = {"repRequired": 15}
del MOD_POOLS["fisherman_rews_gates"]

# added to the shared pools the pack already overrides
LIBRARIAN_EXTRA = {"pk_candle_holder": entry("supplementaries:candle_holder", 300, 1, 4),
                   "pk_chain_lantern": entry("mcwlights:chain_lantern", 400, 1, 4),
                   "pk_notice_board": entry("supplementaries:notice_board", 600, 1, 1),
                   "pk_hourglass": entry("supplementaries:hourglass", 1500, 1, 1, "UNCOMMON"),
                   "librarian_rew_glass": None, "librarian_rew_tinted_glass": None}
MAPPER_EXTRA = {"pk_atlas": entry("map_atlases:atlas", 3000, 1, 1, "UNCOMMON"),
                "pk_natures_compass": entry("naturescompass:naturescompass", 6000, 1, 1, "RARE"),
                "pk_altimeter": entry("supplementaries:altimeter", 800, 1, 1), "pk_wind_vane": entry("supplementaries:wind_vane", 600, 1, 1),
                "pk_field_manual": entry("patchouli:guide_book", 400, 1, 1, nbt='{"patchouli:book":"geolosys:field_manual"}'),   # a Patchouli book, not an item of its own
                "mapper_rew_black_dye": None, "mapper_rew_pink_banner": None, "mapper_rew_light_blue_banner": None}
# the pillager faction's own kind, in every decree: the story's enemies, not filler
ALL_OBJS_EXTRA = {
    "k_skeleton_villager": ent("savage_and_ravage:skeleton_villager", 400, 2, 6, "UNCOMMON"),
    "k_provoker": ent("illagerinvasion:provoker", 900, 1, 3, "UNCOMMON"),
    "k_basher": ent("illagerinvasion:basher", 900, 1, 3, "UNCOMMON"),
    "k_griefer": ent("savage_and_ravage:griefer", 900, 1, 3, "RARE"),
    "k_marauder": ent("illagerinvasion:marauder", 1200, 1, 2, "RARE"),
    "k_executioner": ent("savage_and_ravage:executioner", 1500, 1, 1, "RARE"),
    "k_igniter": ent("illageandspillage:igniter", 1500, 1, 1, "RARE"),
    "k_firecaller": ent("illagerinvasion:firecaller", 2000, 1, 1, "EPIC"),
    # Bountiful's own: dirt, cobblestone and stone bricks were filler; its emerald, zombie, spider, creeper and iron
    # block entries doubled the pack's own
    # precious metal is wanted everywhere (2026-10-21)
    "pk_platinum_ingot": obj("geolosys:platinum_ingot", 1500, 1, 2, "RARE"),
    # what only caves have (Aaron, 2026-10-27: "players need a reason to cave")
    "pk_amethyst_shard": obj("minecraft:amethyst_shard", 120, 4, 16),
    "pk_glow_lichen": obj("minecraft:glow_lichen", 40, 8, 24),
    "pk_pointed_dripstone": obj("minecraft:pointed_dripstone", 60, 4, 16),
    "pk_cobbled_deepslate": obj("minecraft:cobbled_deepslate", 15, 32, 64),
    "pk_glow_berries": obj("minecraft:glow_berries", 40, 8, 24),
    "pk_moss_block": obj("minecraft:moss_block", 40, 8, 24),
    "pk_spore_blossom": obj("minecraft:spore_blossom", 600, 1, 2, "UNCOMMON"),
    "pk_sculk": obj("minecraft:sculk", 150, 4, 12, "UNCOMMON"),
    "pk_echo_shard": obj("minecraft:echo_shard", 3000, 1, 1, "RARE"),
    **{f"all_obj_{k}": None for k in ("dirt", "cobblestone", "stonebrick", "primary_currency", "zombie", "spider", "creeper", "iron_block")},
}
ALL_REWS_EXTRA = {f"all_rew_{k}": None for k in ("arrow", "glow_ink", "prismarine_crystals", "minecart", "axolotl_bucket",
                                                 "totem_undying", "spyglass", "primary_currency", "primary_currency_rare_bargain")}
# silver and platinum pay like money (2026-10-21)
ALL_REWS_EXTRA["pk_silver_ingot"] = entry("geolosys:silver_ingot", 450, 2, 4, "UNCOMMON")
ALL_REWS_EXTRA["pk_platinum_ingot"] = entry("geolosys:platinum_ingot", 1500, 1, 2, "RARE")

# ----------------------------------------------------------------------------- main
def main() -> None:
    bp = "bountiful/bounty_pools"
    ALL_REWS["content"].update(ALL_REWS_EXTRA)
    ALL_OBJS["content"].update(ALL_OBJS_EXTRA)
    LIBRARIAN_REWS["content"].update(LIBRARIAN_EXTRA)
    MAPPER_REWS["content"].update(MAPPER_EXTRA)
    write(f"{bp}/bountiful/_all_rews.json", ALL_REWS)
    write(f"{bp}/bountiful/_all_objs.json", ALL_OBJS)
    write(f"{bp}/bountiful/_equip_rews.json", EQUIP_REWS)
    write(f"{bp}/bountiful/librarian_rews.json", LIBRARIAN_REWS)
    write(f"{bp}/bountiful/mapper_rews.json", MAPPER_REWS)
    CLERIC_REWS["content"].update(MOD_POOLS.pop("cleric_rews"))
    write(f"{bp}/bountiful/cleric_rews.json", CLERIC_REWS)
    for name, content in MOD_POOLS.items():
        write(f"{bp}/bountiful/{name}.json", pool(content))
    write(f"{bp}/peacock/archivist_objs.json", ARCHIVIST_OBJS)
    write(f"{bp}/peacock/archivist_rews.json", ARCHIVIST_REWS)
    write("bountiful/bounty_decrees/peacock/archivist.json", {
        "objectives": ["archivist_objs", "_all_objs"],
        "rewards": ["archivist_rews", "_all_rews"],
    })
    for rid, (name, radius, deco) in RUMOURS.items():
        write(f"peacock/loot_tables/rumour/{rid}.json", {"type": "minecraft:chest", "pools": [{"rolls": 1, "entries": [{
            "type": "minecraft:item", "name": "minecraft:map", "functions": [
                {"function": "minecraft:exploration_map", "destination": f"peacock:rumour_{rid}", "decoration": deco,
                 "zoom": 1, "search_radius": radius, "skip_existing_chunks": False},
                {"function": "minecraft:set_name", "name": {"text": name, "italic": False, "color": "gold"}},
            ]}]}]})
    kj = PACK / "kubejs/config/journals.json"
    kj.write_text(json.dumps({
        "_comment": "generated by tools/gen-bounties.py from tools/data/journals.json — edit there",
        "journals": [{"id": j["id"], "tier": j["tier"], "title": j["title"], "author": j["author"],
                      "pages": [json.dumps({"text": p}, ensure_ascii=False) for p in j["pages"]]} for j in JOURNALS],
    }, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    longest = max(len(p) for j in JOURNALS for p in j["pages"])
    print(f"{len(JOURNALS)} journals (longest page {longest} chars), {len(RUMOURS)} rumour tables, "
          f"{len(ALL_REWS['content'])+len(EQUIP_REWS['content'])+len(LIBRARIAN_REWS['content'])+len(MAPPER_REWS['content'])+len(CLERIC_REWS['content'])+len(ARCHIVIST_REWS['content'])} reward entries")


if __name__ == "__main__":
    main()
