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


# ----------------------------------------------------------------------------- main
def main() -> None:
    bp = "bountiful/bounty_pools"
    write(f"{bp}/bountiful/_all_rews.json", ALL_REWS)
    write(f"{bp}/bountiful/_all_objs.json", ALL_OBJS)
    write(f"{bp}/bountiful/_equip_rews.json", EQUIP_REWS)
    write(f"{bp}/bountiful/librarian_rews.json", LIBRARIAN_REWS)
    write(f"{bp}/bountiful/mapper_rews.json", MAPPER_REWS)
    write(f"{bp}/bountiful/cleric_rews.json", CLERIC_REWS)
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
