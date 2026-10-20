#!/usr/bin/env python3
"""Generate the Peacock ruin states and the capital from CTOV's own pieces.

Reads ChoiceTheorem's Overhauled Village jar and writes a Paxi datapack
(pack/config/paxi/datapacks/peacock-ruins.zip) in which EVERY CTOV village is dead:

  ruin_a  — abandoned: decayed blocks, overgrown roads, zombie villagers in the
            houses, modest "what they left" chests, no golems.
  ruin_h  — pillager-held: lighter decay, no villagers, pillagers / vindicators /
            evokers spawning inside the bounds, chests swapped to plunder.

plus the CAPITAL: a large living CTOV plains town (`peacock:capital`) on temperate land,
one candidate per ~2,000 blocks (random_spread 128/64); Terralith's castle town is
silenced.  Village Spawn Point moves the world spawn into the nearest one (#peacock:capital).

Why NBTs are copied: CTOV's jigsaw blocks name their target pools INSIDE the
.nbt files (ctov:village/plains/house …), so a ruin that only changed JSON would
chain straight back into CTOV's living pools after the first piece.  Each state
therefore gets its own copy of the 921 templates with the pool names rewritten,
and matching template pools / processor lists under its own prefix.

Usage:  python3 tools/gen-ruins.py
CTOV and its ctov-* compat jars are downloaded from the URLs in pack/mods/*.pw.toml
(cached in ~/.cache/peacock); pass one jar path to use only that jar.
"""
from __future__ import annotations

import io
import json
import re
import shutil
import sys
import tomllib
import urllib.request
import zipfile
from pathlib import Path

import nbtlib
from nbtlib import tag as T

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / "pack"
OUT = ROOT / "build" / "peacock-ruins"          # staging; zipped into the pack below
ZIP = PACK / "config" / "paxi" / "datapacks" / "peacock-ruins.zip"
CACHE = Path.home() / ".cache" / "peacock"

STATES = {
    # prefix: (weight multiplier against CTOV's own size weights, label)
    "ruin_a": (6, "abandoned"),
    "ruin_h": (4, "pillager-held"),
}
SIZES = ("small", "medium", "large")
BIOMES = ("beach", "dark_forest", "jungle", "mesa", "mountain", "mushroom",
          "swamp", "desert", "plains", "savanna", "snowy", "taiga")
# vanilla villager pool -> zombie villager type
VILLAGER_TYPES = {"plains": "plains", "desert": "desert", "savanna": "savanna",
                  "snowy": "snow", "taiga": "taiga"}


# ----------------------------------------------------------------------------- helpers
def jar_paths(arg: str | None) -> list[Path]:
    """CTOV itself first, then its compat add-ons (ctov-create-structures, ctov-farmers-delight-compat,
    ctov-savage-and-ravage-compat): they ship extra pieces and override CTOV's pools under the same
    `ctov:` namespace, so the ruin copies must see the merged view, later jars winning."""
    if arg:
        return [Path(arg)]
    metas = []
    for toml in sorted((PACK / "mods").glob("*.pw.toml")):
        with open(toml, "rb") as f:
            meta = tomllib.load(f)
        if meta["filename"].startswith("ctov"):
            metas.append(meta)
    metas.sort(key=lambda m: (not m["filename"].startswith("ctov-3"), m["filename"]))  # base jar first
    CACHE.mkdir(parents=True, exist_ok=True)
    out = []
    for meta in metas:
        dest = CACHE / meta["filename"]
        if not dest.exists():
            print(f"downloading {meta['download']['url']}")
            urllib.request.urlretrieve(meta["download"]["url"], dest)
        out.append(dest)
    return out


def terralith_jar() -> zipfile.ZipFile:
    with open(PACK / "mods" / "terralith.pw.toml", "rb") as f:
        meta = tomllib.load(f)
    dest = CACHE / meta["filename"]
    if not dest.exists():
        print(f"downloading {meta['download']['url']}")
        urllib.request.urlretrieve(meta["download"]["url"], dest)
    return zipfile.ZipFile(dest)


class Merged:
    """Read-only merged view over several jars; the last jar that has a path wins."""
    def __init__(self, paths):
        self.zips = [zipfile.ZipFile(p) for p in paths]
        self.where = {}
        for i, z in enumerate(self.zips):
            for n in z.namelist():
                self.where[n] = i
    def namelist(self):
        return sorted(self.where)
    def read(self, n):
        return self.zips[self.where[n]].read(n)


def write_json(rel: str, obj) -> None:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, separators=(",", ":")) + "\n", encoding="utf-8")


def rule(inp, out, prob=None, props_in=None, props_out=None, be=None):
    """One rule-processor rule.  inp/out are block ids; prob makes it random."""
    if prob is None:
        pred = {"predicate_type": "minecraft:block_match", "block": inp}
        if props_in:
            pred = {"predicate_type": "minecraft:blockstate_match",
                    "block_state": {"Name": inp, "Properties": props_in}}
    else:
        pred = {"predicate_type": "minecraft:random_block_match", "block": inp, "probability": prob}
    r = {
        "position_predicate": {"predicate_type": "minecraft:always_true"},
        "input_predicate": pred,
        "location_predicate": {"predicate_type": "minecraft:always_true"},
        "output_state": {"Name": out, **({"Properties": props_out} if props_out else {})},
    }
    if be:
        r["block_entity_modifier"] = be
    return r


def chest_rules(loot: str):
    """Point every single chest at `loot` while keeping its facing."""
    rules = []
    for facing in ("north", "south", "east", "west"):
        rules.append(rule("minecraft:chest", "minecraft:chest",
                          props_in={"facing": facing, "type": "single", "waterlogged": "false"},
                          props_out={"facing": facing, "type": "single", "waterlogged": "false"},
                          be={"type": "minecraft:append_loot", "loot_table": loot}))
    for facing in ("north", "south", "east", "west", "up", "down"):
        rules.append(rule("minecraft:barrel", "minecraft:barrel",
                          props_in={"facing": facing, "open": "false"},
                          props_out={"facing": facing, "open": "false"},
                          be={"type": "minecraft:append_loot", "loot_table": loot}))
    return rules


def decay_processors(state: str):
    """Rule processors appended to every CTOV processor list for a state."""
    heavy = state == "ruin_a"
    k = 1.0 if heavy else 0.45          # held villages are lived in; lighter rot
    rules = [
        rule("minecraft:cobblestone", "minecraft:mossy_cobblestone", 0.35 * k),
        rule("minecraft:stone_bricks", "minecraft:mossy_stone_bricks", 0.25 * k),
        rule("minecraft:stone_bricks", "minecraft:cracked_stone_bricks", 0.2 * k),
        rule("minecraft:cobblestone_wall", "minecraft:mossy_cobblestone_wall", 0.4 * k),
        rule("minecraft:stone_brick_wall", "minecraft:mossy_stone_brick_wall", 0.4 * k),
        rule("minecraft:dirt_path", "minecraft:grass_block", 0.45 * k),
        rule("minecraft:dirt_path", "minecraft:coarse_dirt", 0.15 * k),
        rule("minecraft:farmland", "minecraft:coarse_dirt", 0.7 * k),
        rule("minecraft:wheat", "minecraft:dead_bush", 0.5 * k),
        rule("minecraft:carrots", "minecraft:dead_bush", 0.5 * k),
        rule("minecraft:potatoes", "minecraft:dead_bush", 0.5 * k),
        rule("minecraft:beetroots", "minecraft:dead_bush", 0.5 * k),
        rule("minecraft:hay_block", "minecraft:air", 0.5 * k),
        rule("minecraft:lantern", "minecraft:air", 0.75 * k),
        rule("minecraft:torch", "minecraft:air", 0.75 * k),
        rule("minecraft:wall_torch", "minecraft:air", 0.75 * k),
        rule("minecraft:glass_pane", "minecraft:air", 0.6 * k),
        rule("minecraft:white_stained_glass_pane", "minecraft:air", 0.6 * k),
        rule("minecraft:brown_stained_glass_pane", "minecraft:air", 0.6 * k),
        rule("minecraft:yellow_stained_glass_pane", "minecraft:air", 0.6 * k),
        rule("minecraft:glass", "minecraft:air", 0.5 * k),
        rule("minecraft:bookshelf", "minecraft:air", 0.3 * k),
        rule("minecraft:flower_pot", "minecraft:air", 0.5 * k),
    ]
    for wood in ("oak", "spruce", "birch", "jungle", "acacia", "dark_oak", "mangrove", "cherry"):
        rules.append(rule(f"minecraft:{wood}_planks", "minecraft:air", 0.07 * k))
        rules.append(rule(f"minecraft:{wood}_fence", "minecraft:air", 0.2 * k))
        rules.append(rule(f"minecraft:{wood}_slab", "minecraft:air", 0.08 * k))
        if heavy:
            rules.append(rule(f"minecraft:{wood}_door", "minecraft:air"))
    for col in ("white", "orange", "magenta", "light_blue", "yellow", "lime", "pink", "gray",
                "light_gray", "cyan", "purple", "blue", "brown", "green", "red", "black"):
        rules.append(rule(f"minecraft:{col}_wool", "minecraft:cobweb", 0.1 * k))
        rules.append(rule(f"minecraft:{col}_carpet", "minecraft:air", 0.5 * k))
    if heavy:
        rules.append(rule("minecraft:bell", "minecraft:air", 0.5))
        rules.append(rule("minecraft:grass_block", "minecraft:moss_block", 0.08))
        rules.append(rule("minecraft:smooth_stone", "minecraft:cobweb", 0.03))
    loot = "peacock:chests/ruin_house" if heavy else "peacock:chests/plunder"
    return [
        {"processor_type": "minecraft:rule", "rules": rules},
        {"processor_type": "minecraft:rule", "rules": chest_rules(loot)},
    ]


# ----------------------------------------------------------------------------- pool renaming
def pool_mapper(state: str):
    def m(name: str) -> str:
        if name.startswith("ctov:"):
            return f"peacock:{state}/" + name[len("ctov:"):]
        if name == "minecraft:village/common/iron_golem":
            return "minecraft:empty"
        if name == "minecraft:village/common/cats":
            return name if state == "ruin_a" else "minecraft:empty"
        mm = re.fullmatch(r"minecraft:village/(plains|desert|savanna|snowy|taiga)/villagers", name)
        if mm:
            return f"peacock:{state}/villagers/{mm.group(1)}" if state == "ruin_a" else "minecraft:empty"
        return name
    return m


def rewrite_nbt(data: bytes, mapper) -> bytes:
    nbt = nbtlib.File.load(io.BytesIO(data), gzipped=True)
    root = nbt  # File is the root compound
    for blk in root.get("blocks", []):
        be = blk.get("nbt")
        if be is not None and str(be.get("id", "")) == "minecraft:jigsaw":
            pool = str(be.get("pool", ""))
            if pool:
                be["pool"] = T.String(mapper(pool))
    buf = io.BytesIO()
    nbt.save(buf, gzipped=True)
    return buf.getvalue()


def jigsaw_nbt(name: str, target: str = "minecraft:empty", final_state: str = "minecraft:air") -> T.Compound:
    """A jigsaw block entity. A pool element can only attach to its parent through a jigsaw block whose `name`
    equals the parent jigsaw's `target` and whose front faces the parent — a template without one is never
    placed (the first ruin build shipped villager and bounty pieces without jigsaws, and nothing appeared)."""
    return T.Compound({"id": T.String("minecraft:jigsaw"), "name": T.String(name), "target": T.String(target),
                       "pool": T.String("minecraft:empty"), "final_state": T.String(final_state), "joint": T.String("rollable")})


def zombie_piece(vtype: str) -> bytes:
    """A 1x2x1 template holding one persistent zombie villager (the house's dead owner). CTOV's houses call
    their villager pools from a jigsaw facing up with target `minecraft:bottom`, so the piece carries a
    jigsaw named `minecraft:bottom` facing down, as vanilla's villager templates do."""
    ent = T.Compound({
        "pos": T.List[T.Double]([T.Double(0.5), T.Double(0.0), T.Double(0.5)]),
        "blockPos": T.List[T.Int]([T.Int(0), T.Int(0), T.Int(0)]),
        "nbt": T.Compound({
            "id": T.String("minecraft:zombie_villager"),
            "PersistenceRequired": T.Byte(1),
            "VillagerData": T.Compound({
                "type": T.String(f"minecraft:{vtype}"),
                "profession": T.String("minecraft:none"),
                "level": T.Int(1),
            }),
        }),
    })
    f = nbtlib.File({
        "size": T.List[T.Int]([T.Int(1), T.Int(2), T.Int(1)]),
        "entities": T.List[T.Compound]([ent]),
        "blocks": T.List[T.Compound]([T.Compound({"pos": T.List[T.Int]([T.Int(0), T.Int(0), T.Int(0)]), "state": T.Int(1),
                                                  "nbt": jigsaw_nbt("minecraft:bottom")})]),
        "palette": T.List[T.Compound]([T.Compound({"Name": T.String("minecraft:air")}),
                                       T.Compound({"Name": T.String("minecraft:jigsaw"), "Properties": T.Compound({"orientation": T.String("down_north")})})]),
        "DataVersion": T.Int(3465),
    })
    buf = io.BytesIO()
    f.save(buf, gzipped=True)
    return buf.getvalue()


def spawn_overrides(state: str):
    if state == "ruin_a":
        return {"monster": {"bounding_box": "full", "spawns": [
            {"type": "minecraft:zombie_villager", "weight": 6, "minCount": 1, "maxCount": 2},
            {"type": "minecraft:zombie", "weight": 3, "minCount": 1, "maxCount": 2},
            {"type": "minecraft:skeleton", "weight": 2, "minCount": 1, "maxCount": 1},
            {"type": "minecraft:spider", "weight": 2, "minCount": 1, "maxCount": 1},
        ]}}
    return {"monster": {"bounding_box": "full", "spawns": [
        {"type": "minecraft:pillager", "weight": 6, "minCount": 1, "maxCount": 2},
        {"type": "minecraft:vindicator", "weight": 2, "minCount": 1, "maxCount": 1},
        {"type": "minecraft:evoker", "weight": 1, "minCount": 1, "maxCount": 1},
        {"type": "minecraft:witch", "weight": 1, "minCount": 1, "maxCount": 1},
    ]}}


# ----------------------------------------------------------------------------- main
def main() -> None:
    jars = jar_paths(sys.argv[1] if len(sys.argv) > 1 else None)
    print("jars:", ", ".join(j.name for j in jars))
    z = Merged(jars)
    names = z.namelist()
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    write_json("pack.mcmeta", {"pack": {"pack_format": 15,
               "description": "Peacock — CTOV villages as ruins (generated by tools/gen-ruins.py; do not edit)"}})

    # villages only: CTOV's outposts keep generating from the mod's own set, and the
    # underground village has its own (disabled) set, so neither belongs in the ruin copies
    skip = ("/pillager_outpost/", "/underground/")
    nbts = [n for n in names if n.startswith("data/ctov/structures/") and n.endswith(".nbt")
            and not any(k in n for k in skip)]
    pools = [n for n in names if n.startswith("data/ctov/worldgen/template_pool/") and n.endswith(".json")
             and not any(k in n for k in skip)]
    procs = [n for n in names if n.startswith("data/ctov/worldgen/processor_list/") and n.endswith(".json")]
    structs = [n for n in names if re.fullmatch(r"data/ctov/worldgen/structure/(small|medium|large)/village_[a-z_]+\.json", n)
               and "village_underground" not in n]
    print(f"ctov: {len(nbts)} templates, {len(pools)} pools, {len(procs)} processor lists, {len(structs)} village structures")

    set_entries = []
    for state, (mult, label) in STATES.items():
        mapper = pool_mapper(state)
        # templates
        for n in nbts:
            rel = n[len("data/ctov/structures/"):]
            dest = OUT / "data/peacock/structures" / state / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(rewrite_nbt(z.read(n), mapper))
        # zombie villager pieces + pools
        if state == "ruin_a":
            for b, vt in VILLAGER_TYPES.items():
                (OUT / "data/peacock/structures" / state / "villagers").mkdir(parents=True, exist_ok=True)
                (OUT / "data/peacock/structures" / state / f"villagers/{b}.nbt").write_bytes(zombie_piece(vt))
                write_json(f"data/peacock/worldgen/template_pool/{state}/villagers/{b}.json", {
                    "name": f"peacock:{state}/villagers/{b}", "fallback": "minecraft:empty",
                    "elements": [
                        {"weight": 7, "element": {"element_type": "minecraft:single_pool_element", "projection": "rigid",
                                                  "processors": "minecraft:empty", "location": f"peacock:{state}/villagers/{b}"}},
                        {"weight": 3, "element": {"element_type": "minecraft:empty_pool_element"}},
                    ]})
        # processor lists
        decay = decay_processors(state)
        write_json(f"data/peacock/worldgen/processor_list/{state}/decay.json", {"processors": decay})
        for n in procs:
            rel = n[len("data/ctov/worldgen/processor_list/"):]
            pl = json.loads(z.read(n))
            pl["processors"] = list(pl.get("processors", [])) + decay
            write_json(f"data/peacock/worldgen/processor_list/{state}/{rel}", pl)
        # template pools
        for n in pools:
            rel = n[len("data/ctov/worldgen/template_pool/"):]
            pool = json.loads(z.read(n))
            pool["name"] = mapper(pool["name"])
            fb = pool.get("fallback", "minecraft:empty")
            pool["fallback"] = mapper(fb)
            if rel.startswith("village/common/villager/"):
                # CTOV's own villager pieces (jungle/swamp): dead owners too
                vt = "jungle" if "jungle" in rel else "swamp"
                pool["elements"] = [
                    {"weight": 7, "element": {"element_type": "minecraft:single_pool_element", "projection": "rigid",
                                              "processors": "minecraft:empty",
                                              "location": f"peacock:ruin_a/villagers/{vt}"}},
                    {"weight": 3, "element": {"element_type": "minecraft:empty_pool_element"}},
                ] if state == "ruin_a" else []
                if state == "ruin_a":
                    (OUT / "data/peacock/structures/ruin_a/villagers" / f"{vt}.nbt").write_bytes(zombie_piece(vt))
            else:
                for el in pool.get("elements", []):
                    e = el["element"]
                    if "location" in e:
                        e["location"] = mapper(e["location"])
                    pr = e.get("processors")
                    if isinstance(pr, dict):   # inline processor list
                        pr["processors"] = list(pr.get("processors", [])) + decay
                    elif isinstance(pr, list):
                        e["processors"] = pr + decay
                    elif pr is not None:
                        if pr.startswith("ctov:"):
                            e["processors"] = mapper(pr)
                        else:  # minecraft:empty → decay only
                            e["processors"] = f"peacock:{state}/decay"
                    else:
                        e["processors"] = f"peacock:{state}/decay"
            write_json(f"data/peacock/worldgen/template_pool/{state}/{rel}", pool)
        # structures
        for n in structs:
            m = re.fullmatch(r"data/ctov/worldgen/structure/(small|medium|large)/village_([a-z_]+)\.json", n)
            size, biome = m.group(1), m.group(2)
            st = json.loads(z.read(n))
            st["start_pool"] = mapper(st["start_pool"])
            st["spawn_overrides"] = spawn_overrides(state)
            sid = f"peacock:{state}/{size}/village_{biome}"
            write_json(f"data/peacock/worldgen/structure/{state}/{size}/village_{biome}.json", st)
            base = {"large": 1, "medium": 4, "small": 15}[size]
            set_entries.append({"structure": sid, "weight": base * mult})

    # the village structure set: ruins only, kept 14 chunks clear of the capital (it reaches ~7 chunks from its centre,
    # plus the wall; 6 let a ruin run into it — village review, 2026-10-19)
    ctov_set = json.loads(z.read("data/minecraft/worldgen/structure_set/village.json"))
    placement = ctov_set["placement"]
    placement["exclusion_zone"] = {"other_set": "peacock:capital", "chunk_count": 14}
    write_json("data/minecraft/worldgen/structure_set/village.json",
               {"structures": set_entries, "placement": placement})

    # ---------------------------------------------------------------- the capital
    # Since 2026-10-20 the capital is a large living CTOV plains town (Aaron: "just a large CTOV village in a
    # comfortable temperature biome, and a good terrain"; the walls and Terralith's castle dropped). It is no longer
    # one fixed position near the origin — about 25 seeds in a row on 2026-10-19 had no capital there, and the reroll
    # never found one — but a sparse random spread: one candidate per 128x128 chunks (~2,000 blocks), kept only on a
    # #peacock:capital_biomes biome. Village Spawn Point (locateVillageTag #peacock:capital) moves the world spawn
    # into the nearest one when the world is created; it searches 100 spacings out, i.e. the whole world. Other
    # capitals stand thousands of blocks apart. Ruins, nature pieces and war camps keep clear of every candidate
    # through their exclusion zones on `peacock:capital`.
    ctov_large = json.loads(z.read("data/ctov/worldgen/structure/large/village_plains.json"))
    cap = dict(ctov_large)
    cap["biomes"] = "#peacock:capital_biomes"
    cap["spawn_overrides"] = {}
    cap["size"] = 7                        # CTOV's large is 5: a bigger town
    cap["max_distance_from_center"] = 116
    write_json("data/peacock/worldgen/structure/capital.json", cap)
    cap_ids = ["peacock:capital"]
    write_json("data/peacock/worldgen/structure_set/capital.json", {
        "structures": [{"structure": s, "weight": 1} for s in cap_ids],
        "placement": {"type": "minecraft:random_spread", "spacing": 128, "separation": 64, "salt": 20260918},
    })
    # Bounty boards are NOT in the capital's pools: jigsaw tries a slot's elements one after another until one fits, so
    # a 3x3 plaza takes every slot no house fits whatever its weight (2026-10-20: 50+ boards on one street).
    # kubejs/server_scripts/capital_boards.js places two beside the town bell instead, once per world.
    # Terralith's own castle town stays silenced: the capital is the CTOV town
    tj = terralith_jar()
    rare = json.loads(tj.read("data/terralith/worldgen/structure_set/rare_village.json"))
    rare["placement"]["frequency"] = 0.0
    write_json("data/terralith/worldgen/structure_set/rare_village.json", rare)
    # The capital's land: temperate, flat-to-rolling, dry — comfortable in spring and autumn under Cold Sweat, with
    # a cold winter and a warm summer (Aaron, 2026-10-18: "somewhere the player is good during the fall and spring";
    # "the capital cannot spawn in extreme temperature environments"). Biome temperature 0.5-0.8 (plains are 0.8),
    # low ground only: Cold Sweat cools with altitude, so meadow, cherry grove and the plateaus are out, as are
    # savanna/shrubland (hot, dry) and taiga/steppe/valley clearings (cool). Terralith names are checked against the
    # jar so a renamed biome fails the generator, not the world.
    terralith_biomes = {n.rsplit("/", 1)[-1][:-5] for n in tj.namelist()
                        if n.startswith("data/terralith/worldgen/biome/") and n.endswith(".json")}
    gentle_terralith = ["temperate_highlands", "lavender_forest", "lavender_valley", "blooming_valley",
                        "sakura_grove", "sakura_valley", "moonlight_valley"]
    missing = [b for b in gentle_terralith if b not in terralith_biomes]
    if missing:
        sys.exit(f"capital_biomes: Terralith no longer has {missing}")
    capital_biomes = ["minecraft:plains", "minecraft:sunflower_plains", "minecraft:forest", "minecraft:flower_forest",
                      "minecraft:birch_forest", "minecraft:old_growth_birch_forest"] + [f"terralith:{b}" for b in gentle_terralith]
    write_json("data/peacock/tags/worldgen/biome/capital_biomes.json", {"replace": False, "values": capital_biomes})
    write_json("data/peacock/tags/worldgen/structure/capital.json", {"replace": False, "values": cap_ids})

    print("capital: peacock:capital (CTOV large plains, size 7, temperate biomes, spread 128/64; rare_village silenced)")
    ruin_ids = [e["structure"] for e in set_entries]
    write_json("data/peacock/tags/worldgen/structure/ruins.json", {"replace": False, "values": ruin_ids})
    write_json("data/minecraft/tags/worldgen/structure/village.json",
               {"replace": True, "values": cap_ids + ruin_ids})
    # one zip, not 2,500 loose files: packwiz indexes (and every client downloads) each file separately
    ZIP.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zout:
        for f in sorted(OUT.rglob("*")):
            if f.is_file():
                zout.write(f, f.relative_to(OUT).as_posix())
    print(f"wrote {ZIP.relative_to(ROOT)} ({ZIP.stat().st_size // 1024} KiB): "
          f"{len(set_entries)} ruin structures, capital = {cap_ids[0]}")


if __name__ == "__main__":
    main()
