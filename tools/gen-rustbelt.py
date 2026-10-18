#!/usr/bin/env python3
"""The Rust Belt: Peacock's small story pieces, written as voxels and emitted as structures.

Three structure sets into pack/config/paxi/datapacks/peacock/:
  peacock:nature     fallen logs, boulders, a woodcutter's rest — common, terrain-matched
  peacock:rust_belt  what the rail age left: a derailed cart, a toppled wheel, a dead fan casing,
                     a station platform, a cairn, a signal post, a drill crater, a boarded well,
                     a chapel with a cracked bell, a grave wall — sparse
  peacock:war_camp   a pillager camp built from scavenged town blocks — rare, pillagers spawn inside

Pieces are authored at y=0 = the ground surface row (the structure's start height is -1 against the
WORLD_SURFACE_WG heightmap, so y=0 replaces the top ground block and y=1 is the first air block).
Only blocks that are set are written; everything else is left as the world had it.

Usage: python3 tools/gen-rustbelt.py
"""
from __future__ import annotations

import gzip
import io
import json
import random
from pathlib import Path

import nbtlib
from nbtlib import tag as T

ROOT = Path(__file__).resolve().parent.parent
DP = ROOT / "pack/config/paxi/datapacks/peacock/data"
DATA_VERSION = 3465  # 1.20.1

RUIN_LOOT = "peacock:chests/ruin_house"
PLUNDER_LOOT = "peacock:chests/plunder"


# ----------------------------------------------------------------------------- voxel piece
class Piece:
    def __init__(self, name: str):
        self.name = name
        self.blocks: dict[tuple[int, int, int], tuple[str, dict | None, dict | None]] = {}
        self.entities: list[tuple[float, float, float, dict]] = []
        self.rng = random.Random(name)

    def set(self, x, y, z, block, props=None, nbt=None):
        self.blocks[(x, y, z)] = (block, props, nbt)

    def fill(self, x1, y1, z1, x2, y2, z2, block, props=None):
        for x in range(min(x1, x2), max(x1, x2) + 1):
            for y in range(min(y1, y2), max(y1, y2) + 1):
                for z in range(min(z1, z2), max(z1, z2) + 1):
                    self.set(x, y, z, block, props)

    def scatter(self, x1, z1, x2, z2, y, choices, density):
        """Random ground dressing: choices is a list of (block, props) or block ids."""
        for x in range(min(x1, x2), max(x1, x2) + 1):
            for z in range(min(z1, z2), max(z1, z2) + 1):
                if self.rng.random() < density and (x, y, z) not in self.blocks:
                    c = self.rng.choice(choices)
                    if isinstance(c, str):
                        self.set(x, y, z, c)
                    else:
                        self.set(x, y, z, c[0], c[1])

    def entity(self, x, y, z, nbt: dict):
        self.entities.append((x, y, z, nbt))

    # -- common fixtures
    def sign(self, x, y, z, lines, rotation=0, wood="oak", wall_facing=None):
        msgs = [json.dumps({"text": l}) for l in (list(lines) + ["", "", "", ""])[:4]]
        text = {"messages": msgs, "color": "black", "has_glowing_text": False}
        nbt = {"id": "minecraft:sign", "front_text": text, "back_text": {"messages": ['{"text":""}'] * 4, "color": "black", "has_glowing_text": False}, "is_waxed": True}
        if wall_facing:
            self.set(x, y, z, f"minecraft:{wood}_wall_sign", {"facing": wall_facing}, nbt)
        else:
            self.set(x, y, z, f"minecraft:{wood}_sign", {"rotation": str(rotation)}, nbt)

    def chest(self, x, y, z, loot, facing="north"):
        self.set(x, y, z, "minecraft:chest", {"facing": facing}, {"id": "minecraft:chest", "LootTable": loot})

    def bounds(self):
        xs = [p[0] for p in self.blocks] + [int(e[0]) for e in self.entities]
        ys = [p[1] for p in self.blocks] + [int(e[1]) for e in self.entities]
        zs = [p[2] for p in self.blocks] + [int(e[2]) for e in self.entities]
        return min(xs), min(ys), min(zs), max(xs), max(ys), max(zs)

    def to_nbt(self) -> bytes:
        x0, y0, z0, x1, y1, z1 = self.bounds()
        palette: list[tuple[str, tuple]] = []
        index: dict[tuple, int] = {}
        blocks = T.List[T.Compound]()
        for (x, y, z), (block, props, nbt) in sorted(self.blocks.items()):
            key = (block, tuple(sorted((props or {}).items())))
            if key not in index:
                index[key] = len(palette)
                palette.append(key)
            entry = {"pos": T.List[T.Int]([T.Int(x - x0), T.Int(y - y0), T.Int(z - z0)]), "state": T.Int(index[key])}
            if nbt:
                entry["nbt"] = to_tag(nbt)
            blocks.append(T.Compound(entry))
        pal = T.List[T.Compound]()
        for block, props in palette:
            c = {"Name": T.String(block)}
            if props:
                c["Properties"] = T.Compound({k: T.String(str(v)) for k, v in props})
            pal.append(T.Compound(c))
        ents = T.List[T.Compound]()
        for x, y, z, nbt in self.entities:
            ents.append(T.Compound({
                "pos": T.List[T.Double]([T.Double(x - x0), T.Double(y - y0), T.Double(z - z0)]),
                "blockPos": T.List[T.Int]([T.Int(int(x) - x0), T.Int(int(y) - y0), T.Int(int(z) - z0)]),
                "nbt": to_tag(nbt),
            }))
        f = nbtlib.File({
            "size": T.List[T.Int]([T.Int(x1 - x0 + 1), T.Int(y1 - y0 + 1), T.Int(z1 - z0 + 1)]),
            "palette": pal, "blocks": blocks, "entities": ents, "DataVersion": T.Int(DATA_VERSION),
        })
        buf = io.BytesIO()
        f.save(buf, gzipped=True)
        return buf.getvalue(), (x0, y0, z0)


def to_tag(v):
    if isinstance(v, bool):
        return T.Byte(1 if v else 0)
    if isinstance(v, int):
        return T.Int(v)
    if isinstance(v, float):
        return T.Double(v)
    if isinstance(v, str):
        return T.String(v)
    if isinstance(v, list):
        if not v:
            return T.List[T.String]()
        items = [to_tag(i) for i in v]
        return T.List[type(items[0])](items)
    if isinstance(v, dict):
        return T.Compound({k: to_tag(x) for k, x in v.items()})
    raise TypeError(type(v))


# ----------------------------------------------------------------------------- vocab
MOSSY = ["minecraft:mossy_cobblestone", "minecraft:cobblestone", "minecraft:mossy_cobblestone", "minecraft:andesite"]
GROUND_DRESS = ["minecraft:coarse_dirt", "minecraft:grass_block", "minecraft:grass_block", "minecraft:podzol", "minecraft:gravel"]
PLANTS = ["minecraft:grass", "minecraft:fern", "minecraft:brown_mushroom", "minecraft:dead_bush", "minecraft:poppy", "minecraft:grass"]


def villager(prof="minecraft:none", vtype="minecraft:plains"):
    return {"id": "minecraft:villager", "PersistenceRequired": True,
            "VillagerData": {"type": vtype, "profession": prof, "level": 1}}


# ----------------------------------------------------------------------------- nature
def fallen_oak():
    p = Piece("fallen_oak")
    p.scatter(-1, -2, 8, 2, 0, GROUND_DRESS, 0.5)
    p.set(0, 1, 0, "minecraft:oak_log", {"axis": "y"})           # the stump
    p.set(0, 2, 0, "minecraft:oak_slab", {"type": "bottom"})
    for x in range(2, 9):
        p.set(x, 1, 0, "minecraft:oak_log", {"axis": "x"})
    for x in (3, 5, 6):
        p.set(x, 2, 0, p.rng.choice(["minecraft:moss_carpet", "minecraft:brown_mushroom", "minecraft:red_mushroom"]))
    p.set(8, 1, 1, "minecraft:oak_leaves", {"persistent": "true"})
    p.set(9, 1, 0, "minecraft:oak_leaves", {"persistent": "true"})
    p.scatter(-1, -2, 9, 2, 1, PLANTS, 0.25)
    return p, "terrain_matching"


def fallen_spruce():
    p = Piece("fallen_spruce")
    p.scatter(-2, -1, 2, 10, 0, GROUND_DRESS, 0.5)
    for z in range(0, 9):
        p.set(0, 1, z, "minecraft:spruce_log", {"axis": "z"})
    p.set(0, 1, 9, "minecraft:spruce_leaves", {"persistent": "true"})
    p.set(1, 1, 8, "minecraft:spruce_leaves", {"persistent": "true"})
    for z in (1, 4, 6):
        p.set(0, 2, z, p.rng.choice(["minecraft:moss_carpet", "minecraft:red_mushroom", "minecraft:cobweb"]))
    p.set(-1, 1, 3, "minecraft:mossy_cobblestone")
    p.scatter(-2, -1, 2, 10, 1, PLANTS, 0.25)
    return p, "terrain_matching"


def boulder_small():
    p = Piece("boulder_small")
    p.fill(0, 0, 0, 1, 1, 1, "minecraft:stone")
    for x in range(0, 2):
        for z in range(0, 2):
            p.set(x, 1, z, p.rng.choice(MOSSY))
    p.set(0, 2, 0, "minecraft:moss_carpet")
    p.set(2, 0, 1, "minecraft:gravel"); p.set(-1, 0, 0, "minecraft:coarse_dirt")
    p.scatter(-1, -1, 2, 2, 1, PLANTS, 0.2)
    return p, "terrain_matching"


def boulder_large():
    p = Piece("boulder_large")
    p.fill(0, 0, 0, 3, 1, 3, "minecraft:stone")
    p.fill(1, 2, 1, 2, 2, 2, "minecraft:stone")
    p.set(0, 2, 1, "minecraft:andesite"); p.set(3, 2, 2, "minecraft:mossy_cobblestone")
    p.set(1, 3, 1, "minecraft:mossy_cobblestone")
    for (x, y, z) in [(0, 1, 0), (3, 1, 3), (0, 1, 3), (2, 1, 0)]:
        p.set(x, y, z, p.rng.choice(["minecraft:tuff", "minecraft:mossy_cobblestone", "minecraft:deepslate"]))
    p.set(1, 3, 2, "minecraft:moss_carpet"); p.set(2, 3, 1, "minecraft:moss_carpet")
    p.set(4, 1, 1, "minecraft:vine", {"west": "true"})
    p.scatter(-1, -1, 4, 4, 0, ["minecraft:gravel", "minecraft:coarse_dirt", "minecraft:grass_block"], 0.45)
    return p, "rigid"


def woodcutters_rest():
    p = Piece("woodcutters_rest")
    p.scatter(-2, -2, 3, 3, 0, GROUND_DRESS, 0.5)
    p.set(0, 1, 0, "minecraft:oak_log", {"axis": "y"}); p.set(0, 2, 0, "minecraft:oak_log", {"axis": "y"})
    p.set(0, 3, 0, "minecraft:brown_mushroom")
    p.set(2, 1, 0, "minecraft:campfire", {"lit": "false", "facing": "north"})
    p.set(2, 1, 2, "minecraft:spruce_stairs", {"facing": "north"}); p.set(1, 1, 2, "minecraft:spruce_stairs", {"facing": "north"})
    p.set(3, 1, -1, "minecraft:oak_log", {"axis": "x"}); p.set(4, 1, -1, "minecraft:oak_log", {"axis": "x"})
    p.set(-1, 1, 1, "minecraft:lantern", {"hanging": "false"})
    p.sign(-1, 1, -1, ["Back by dusk.", "", "— T."], rotation=4)
    p.scatter(-2, -2, 4, 3, 1, PLANTS, 0.2)
    return p, "rigid"


# ----------------------------------------------------------------------------- rust belt
def derailed_cart():
    p = Piece("derailed_cart")
    p.fill(-1, 0, 0, 7, 0, 0, "minecraft:gravel")
    for x in range(-1, 4):
        p.set(x, 1, 0, "minecraft:rail", {"shape": "east_west"})
    p.set(4, 1, 0, "minecraft:rail", {"shape": "north_east"})       # the kink where it left the line
    p.set(5, 1, 1, "minecraft:rail", {"shape": "east_west"})
    p.set(6, 0, 1, "minecraft:coarse_dirt"); p.set(7, 0, 2, "minecraft:coarse_dirt")
    p.entity(6.5, 1.0, 2.5, {"id": "minecraft:chest_minecart", "LootTable": RUIN_LOOT, "Rotation": [35.0, 0.0]})
    p.set(7, 1, 0, "minecraft:cobweb"); p.set(5, 1, 3, "minecraft:lantern", {"hanging": "false"})
    p.set(2, 1, -1, "minecraft:dead_bush"); p.set(3, 1, 1, "minecraft:grass")
    p.scatter(-1, -2, 8, 3, 0, ["minecraft:gravel", "minecraft:coarse_dirt"], 0.3)
    return p, "rigid"


def toppled_wheel():
    p = Piece("toppled_wheel")
    # a wheel lying flat: ring of spruce planks/slabs, radius 3, axle of andesite casing with a shaft out
    for x in range(-3, 4):
        for z in range(-3, 4):
            d2 = x * x + z * z
            if 5 <= d2 <= 10:
                p.set(x, 1, z, "minecraft:spruce_planks" if (x + z) % 2 else "minecraft:spruce_slab", {"type": "bottom"} if (x + z) % 2 == 0 else None)
            elif d2 < 5 and (x == 0 or z == 0):
                p.set(x, 1, z, "minecraft:spruce_slab", {"type": "bottom"})
    p.set(0, 1, 0, "create:andesite_casing"); p.set(0, 2, 0, "create:shaft", {"axis": "y"})
    p.set(4, 1, 0, "minecraft:spruce_fence"); p.set(4, 2, 0, "minecraft:spruce_fence")      # the post it hung from
    p.set(4, 3, 0, "create:shaft", {"axis": "x"}); p.set(5, 3, 0, "create:andesite_casing")
    p.set(-2, 2, 1, "minecraft:moss_carpet"); p.set(2, 2, -2, "minecraft:cobweb")
    p.scatter(-4, -4, 5, 4, 0, ["minecraft:mud", "minecraft:coarse_dirt", "minecraft:grass_block"], 0.4)
    p.scatter(-4, -4, 5, 4, 1, ["minecraft:grass", "minecraft:fern"], 0.1)
    return p, "rigid"


def dead_fan():
    p = Piece("dead_fan")
    p.fill(0, 0, 0, 1, 0, 1, "create:andesite_casing")         # half buried
    p.set(0, 1, 0, "create:brass_casing"); p.set(1, 1, 1, "create:andesite_casing")
    p.set(0, 1, 1, "create:encased_fan", {"facing": "up"})
    p.set(1, 1, 0, "minecraft:cobweb")
    p.set(2, 1, 0, "create:shaft", {"axis": "x"}); p.set(3, 1, 0, "create:shaft", {"axis": "x"})
    p.set(-1, 1, 1, "minecraft:moss_carpet")
    p.scatter(-2, -2, 3, 3, 0, ["minecraft:coarse_dirt", "minecraft:gravel", "minecraft:grass_block"], 0.5)
    p.scatter(-2, -2, 3, 3, 1, PLANTS, 0.2)
    return p, "rigid"


def station_platform():
    p = Piece("station_platform")
    p.fill(0, 0, 0, 8, 0, 2, "minecraft:stone_bricks")
    for x in range(0, 9):
        for z in range(0, 3):
            if p.rng.random() < 0.3:
                p.set(x, 0, z, p.rng.choice(["minecraft:mossy_stone_bricks", "minecraft:cracked_stone_bricks"]))
    p.fill(0, 0, 3, 8, 0, 3, "minecraft:gravel")
    for x in range(0, 9):
        if x not in (3, 4):
            p.set(x, 1, 3, "minecraft:rail", {"shape": "east_west"})
    for x in (1, 7):
        for y in (1, 2, 3):
            p.set(x, y, 0, "minecraft:spruce_fence")
    p.fill(0, 4, 0, 8, 4, 2, "minecraft:spruce_slab", {"type": "bottom"})
    for x in (2, 5):
        p.set(x, 4, 1, "minecraft:air")                           # holes in the roof
    p.set(4, 3, 0, "minecraft:lantern", {"hanging": "true"})
    p.sign(4, 1, 0, ["DEPARTURES", "all services", "SUSPENDED", "by order"], rotation=8)
    p.sign(0, 2, 0, ["HALT 9", "", "mind the gap"], rotation=8)
    p.chest(8, 1, 0, RUIN_LOOT, facing="south")
    p.set(6, 1, 1, "minecraft:cobweb"); p.set(2, 1, 2, "minecraft:dead_bush")
    p.set(3, 1, 1, "minecraft:spruce_stairs", {"facing": "south"})   # a bench
    p.scatter(-1, -1, 9, 4, 0, ["minecraft:gravel", "minecraft:coarse_dirt"], 0.3)
    return p, "rigid"


def cairn():
    p = Piece("cairn")
    p.fill(-1, 1, -1, 1, 1, 1, "minecraft:cobblestone")
    for (x, z) in [(-1, -1), (1, 1), (0, -1)]:
        p.set(x, 1, z, "minecraft:mossy_cobblestone")
    p.set(0, 2, 0, "minecraft:cobblestone"); p.set(0, 3, 0, "minecraft:mossy_cobblestone_wall")
    p.set(0, 4, 0, "create:brass_block")
    p.sign(2, 1, 0, ["Here the road", "ended.", "", "Walk back."], rotation=12)
    p.scatter(-2, -2, 2, 2, 0, GROUND_DRESS, 0.4)
    return p, "rigid"


def signal_post():
    p = Piece("signal_post")
    p.set(0, 0, 0, "minecraft:stone_bricks")
    for y in (1, 2, 3, 4):
        p.set(0, y, 0, "minecraft:iron_bars")
    p.set(0, 5, 0, "minecraft:redstone_lamp", {"lit": "false"})
    p.set(0, 4, 1, "minecraft:lever", {"face": "wall", "facing": "south"})
    p.set(1, 1, 0, "minecraft:iron_bars"); p.set(2, 1, 0, "minecraft:iron_bars")  # the fallen arm
    p.set(3, 1, 0, "minecraft:redstone_lamp", {"lit": "false"})
    p.fill(-1, 0, 2, 3, 0, 2, "minecraft:gravel")
    for x in range(-1, 4):
        p.set(x, 1, 2, "minecraft:rail", {"shape": "east_west"})
    p.set(1, 1, 1, "minecraft:dead_bush")
    return p, "rigid"


def drill_crater():
    # start height -3: y=0..2 are below the surface, y=3 is the old ground row
    p = Piece("drill_crater")
    for x in range(-3, 4):
        for z in range(-3, 4):
            d2 = x * x + z * z
            if d2 <= 2:
                for y in (1, 2, 3):
                    p.set(x, y, z, "minecraft:air")
                p.set(x, 0, z, "minecraft:tuff")
            elif d2 <= 6:
                for y in (2, 3):
                    p.set(x, y, z, "minecraft:air")
                p.set(x, 1, z, p.rng.choice(["minecraft:tuff", "minecraft:coarse_dirt", "minecraft:gravel"]))
            elif d2 <= 10:
                p.set(x, 3, z, "minecraft:air")
                p.set(x, 2, z, p.rng.choice(["minecraft:coarse_dirt", "minecraft:gravel", "minecraft:tuff"]))
            elif d2 <= 13:
                p.set(x, 3, z, p.rng.choice(["minecraft:coarse_dirt", "minecraft:gravel", "minecraft:grass_block"]))
    p.set(0, 1, 0, "create:brass_casing"); p.set(0, 2, 0, "create:brass_casing")
    p.set(0, 3, 0, "create:mechanical_drill", {"facing": "down"})
    p.set(1, 1, 0, "create:shaft", {"axis": "x"}); p.set(-1, 2, 0, "minecraft:cobweb")
    p.set(2, 2, 1, "create:andesite_casing")
    p.set(3, 4, -3, "minecraft:dead_bush"); p.set(-3, 4, 2, "minecraft:dead_bush")
    p.sign(-4, 4, 0, ["GALLERY 7", "do not", "relight"], rotation=4)
    p.set(-4, 3, 0, "minecraft:coarse_dirt")
    return p, "rigid"


def boarded_well():
    p = Piece("boarded_well")
    p.fill(-1, 0, -1, 1, 0, 1, "minecraft:cobblestone")
    for (x, z) in [(-1, -1), (1, -1), (-1, 1), (1, 1), (0, -1), (1, 0), (-1, 0), (0, 1)]:
        p.set(x, 1, z, p.rng.choice(MOSSY))
    p.set(0, 1, 0, "minecraft:water")
    p.set(0, 2, 0, "minecraft:oak_trapdoor", {"half": "top", "facing": "north", "open": "false"})
    p.set(-1, 2, 0, "minecraft:oak_planks"); p.set(1, 2, 0, "minecraft:oak_slab", {"type": "bottom"})
    p.set(0, 2, -1, "minecraft:oak_fence"); p.set(0, 3, -1, "minecraft:oak_fence")
    p.set(0, 3, 1, "minecraft:oak_fence"); p.set(0, 2, 1, "minecraft:oak_fence")
    p.set(0, 4, -1, "minecraft:oak_slab", {"type": "bottom"}); p.set(0, 4, 0, "minecraft:oak_slab", {"type": "bottom"}); p.set(0, 4, 1, "minecraft:oak_slab", {"type": "bottom"})
    p.set(0, 3, 0, "minecraft:lantern", {"hanging": "true"})
    p.sign(2, 1, 0, ["KEEP OUT", "water is", "SICK", "— physician"], rotation=12)
    p.set(-2, 1, 1, "minecraft:cobweb")
    p.scatter(-3, -3, 3, 3, 0, GROUND_DRESS, 0.4)
    p.scatter(-3, -3, 3, 3, 1, ["minecraft:dead_bush", "minecraft:grass"], 0.15)
    return p, "rigid"


def cracked_chapel():
    p = Piece("cracked_chapel")
    p.fill(0, 0, 0, 4, 0, 6, "minecraft:stone_bricks")
    for x in (0, 4):
        for z in range(0, 7):
            h = p.rng.choice([1, 2, 3, 3])
            for y in range(1, h + 1):
                p.set(x, y, z, p.rng.choice(["minecraft:stone_bricks", "minecraft:mossy_stone_bricks", "minecraft:cracked_stone_bricks"]))
    for x in (1, 2, 3):
        for y in (1, 2, 3):
            if (x, y) != (2, 1):                                     # the door was here
                p.set(x, y, 6, p.rng.choice(["minecraft:stone_bricks", "minecraft:mossy_stone_bricks"]))
    for x in (1, 3):
        p.set(x, 1, 0, "minecraft:stone_bricks"); p.set(x, 2, 0, "minecraft:stone_bricks"); p.set(x, 3, 0, "minecraft:stone_bricks")
    p.set(2, 1, 0, "minecraft:stone_bricks"); p.set(2, 2, 0, "minecraft:air"); p.set(2, 3, 0, "minecraft:stone_bricks")  # a window
    p.set(2, 4, 3, "minecraft:spruce_log", {"axis": "x"}); p.set(1, 4, 3, "minecraft:spruce_log", {"axis": "x"}); p.set(3, 4, 3, "minecraft:spruce_log", {"axis": "x"})
    p.set(0, 4, 3, "minecraft:spruce_log", {"axis": "x"}); p.set(4, 4, 3, "minecraft:spruce_log", {"axis": "x"})
    p.set(2, 3, 3, "minecraft:bell", {"attachment": "ceiling", "facing": "north"})
    p.set(2, 1, 1, "minecraft:lectern", {"facing": "south"})
    for z in (3, 4):
        p.set(1, 1, z, "minecraft:spruce_stairs", {"facing": "north"}); p.set(3, 1, z, "minecraft:spruce_stairs", {"facing": "north"})
    p.chest(1, 1, 1, RUIN_LOOT, facing="east")
    p.set(3, 1, 1, "minecraft:flower_pot"); p.set(3, 2, 5, "minecraft:cobweb"); p.set(1, 3, 1, "minecraft:cobweb")
    p.set(2, 1, 5, "minecraft:moss_carpet"); p.set(2, 1, 2, "minecraft:moss_carpet")
    p.set(2, 0, 7, "minecraft:dirt_path"); p.set(2, 0, 8, "minecraft:dirt_path")
    p.sign(3, 1, 7, ["Built on the", "old fields.", "Forgive us", "the harvest."], rotation=0)
    p.scatter(-1, -1, 5, 8, 0, ["minecraft:coarse_dirt", "minecraft:grass_block", "minecraft:gravel"], 0.3)
    return p, "rigid"


def grave_wall():
    p = Piece("grave_wall")
    for x in range(0, 7):
        p.set(x, 1, 0, p.rng.choice(["minecraft:mossy_cobblestone_wall", "minecraft:cobblestone_wall"]))
    for x in range(0, 7, 2):
        p.set(x, 2, 0, "minecraft:mossy_cobblestone_wall")
    p.sign(1, 1, 1, ["Autumn", "nineteen"], rotation=0)
    p.sign(3, 1, 1, ["Winter", "forty-one"], rotation=0)
    p.sign(5, 1, 1, ["Spring", "—", "stopped", "counting"], rotation=0)
    p.set(0, 1, 2, "minecraft:lantern", {"hanging": "false"})
    p.set(6, 1, 2, "minecraft:rose_bush", {"half": "lower"}); p.set(6, 2, 2, "minecraft:rose_bush", {"half": "upper"})
    for x in range(0, 7):
        p.set(x, 0, 1, p.rng.choice(["minecraft:coarse_dirt", "minecraft:dirt", "minecraft:grass_block"]))
    p.set(2, 0, 1, "minecraft:coarse_dirt"); p.set(4, 0, 1, "minecraft:coarse_dirt")
    p.scatter(-1, -1, 7, 3, 1, ["minecraft:dead_bush", "minecraft:grass", "minecraft:poppy"], 0.15)
    return p, "rigid"


# ----------------------------------------------------------------------------- war camp
def war_camp():
    p = Piece("war_camp")
    R = 10
    # trodden ground
    for x in range(-R, R + 1):
        for z in range(-R, R + 1):
            if x * x + z * z <= R * R:
                p.set(x, 0, z, p.rng.choice(["minecraft:dirt_path", "minecraft:dirt_path", "minecraft:coarse_dirt", "minecraft:grass_block"]))
    # palisade of scavenged fences and logs, with gaps
    for x in range(-R, R + 1):
        for z in range(-R, R + 1):
            d2 = x * x + z * z
            if (R - 1) ** 2 < d2 <= R * R and p.rng.random() < 0.8:
                if p.rng.random() < 0.25:
                    p.set(x, 1, z, "minecraft:spruce_log", {"axis": "y"}); p.set(x, 2, z, "minecraft:spruce_log", {"axis": "y"})
                else:
                    p.set(x, 1, z, p.rng.choice(["minecraft:spruce_fence", "minecraft:oak_fence", "minecraft:dark_oak_fence"]))
    for z in (-1, 0, 1):                                            # the gate, east side
        for y in (1, 2):
            p.blocks.pop((R, y, z), None); p.blocks.pop((R - 1, y, z), None)
    p.set(R, 3, -1, "minecraft:spruce_fence"); p.set(R, 3, 1, "minecraft:spruce_fence")
    p.set(R, 1, -2, "minecraft:spruce_log", {"axis": "y"}); p.set(R, 2, -2, "minecraft:spruce_log", {"axis": "y"}); p.set(R, 3, -2, "minecraft:spruce_log", {"axis": "y"})
    p.set(R, 1, 2, "minecraft:spruce_log", {"axis": "y"}); p.set(R, 2, 2, "minecraft:spruce_log", {"axis": "y"}); p.set(R, 3, 2, "minecraft:spruce_log", {"axis": "y"})
    p.set(R, 4, -2, "minecraft:white_banner", {"rotation": "4"}); p.set(R, 4, 2, "minecraft:white_banner", {"rotation": "4"})

    def tent(cx, cz, colour, facing_x=True):
        # a wool tent: two slopes of stairs meeting on a ridge, open at the ends
        for i in (-1, 0, 1):
            if facing_x:
                p.set(cx - 1, 1, cz + i, f"minecraft:{colour}_wool"); p.set(cx + 1, 1, cz + i, f"minecraft:{colour}_wool")
                p.set(cx - 1, 2, cz + i, "minecraft:spruce_stairs", {"facing": "east"}); p.set(cx + 1, 2, cz + i, "minecraft:spruce_stairs", {"facing": "west"})
                p.set(cx, 2, cz + i, "minecraft:spruce_slab", {"type": "top"})
                p.set(cx, 3, cz + i, "minecraft:spruce_slab", {"type": "bottom"})
            else:
                p.set(cx + i, 1, cz - 1, f"minecraft:{colour}_wool"); p.set(cx + i, 1, cz + 1, f"minecraft:{colour}_wool")
                p.set(cx + i, 2, cz - 1, "minecraft:spruce_stairs", {"facing": "south"}); p.set(cx + i, 2, cz + 1, "minecraft:spruce_stairs", {"facing": "north"})
                p.set(cx + i, 2, cz, "minecraft:spruce_slab", {"type": "top"})
                p.set(cx + i, 3, cz, "minecraft:spruce_slab", {"type": "bottom"})
        p.set(cx, 1, cz, "minecraft:white_carpet" if colour != "white" else "minecraft:brown_carpet")

    tent(-6, -5, "brown"); tent(-6, 4, "white", facing_x=False); tent(5, -6, "gray"); tent(6, 5, "brown", facing_x=False)
    # the fire pit: a stolen bell for a cookpot
    p.set(0, 1, -5, "minecraft:campfire", {"lit": "true", "facing": "north"})
    p.set(0, 2, -5, "minecraft:bell", {"attachment": "ceiling", "facing": "north"})
    p.set(0, 3, -5, "minecraft:spruce_fence"); p.set(-1, 3, -5, "minecraft:spruce_fence"); p.set(1, 3, -5, "minecraft:spruce_fence")
    p.set(-1, 1, -5, "minecraft:spruce_fence"); p.set(-1, 2, -5, "minecraft:spruce_fence"); p.set(1, 1, -5, "minecraft:spruce_fence"); p.set(1, 2, -5, "minecraft:spruce_fence")
    p.set(2, 1, -4, "minecraft:spruce_stairs", {"facing": "west"}); p.set(-2, 1, -4, "minecraft:spruce_stairs", {"facing": "east"})
    # the chopping block: a lectern and a hay bale
    p.set(3, 1, -1, "minecraft:lectern", {"facing": "west"}); p.set(4, 1, -1, "minecraft:hay_block")
    p.set(3, 1, 0, "minecraft:iron_bars")
    # captain's pavilion: a plank floor under a wool roof, the plunder inside
    p.fill(-3, 0, 1, 3, 0, 6, "minecraft:spruce_planks")
    for (x, z) in [(-3, 1), (3, 1), (-3, 6), (3, 6)]:
        for y in (1, 2, 3):
            p.set(x, y, z, "minecraft:spruce_log", {"axis": "y"})
    p.fill(-3, 4, 1, 3, 4, 6, "minecraft:red_wool")
    p.set(0, 4, 3, "minecraft:white_wool"); p.set(0, 5, 3, "minecraft:white_banner", {"rotation": "0"})
    p.chest(-2, 1, 5, PLUNDER_LOOT, facing="south"); p.chest(2, 1, 5, PLUNDER_LOOT, facing="south")
    p.set(0, 1, 5, "minecraft:barrel", {"facing": "up"}, {"id": "minecraft:barrel", "LootTable": PLUNDER_LOOT})
    p.set(0, 1, 2, "minecraft:crafting_table"); p.set(-2, 1, 2, "minecraft:lantern", {"hanging": "false"}); p.set(2, 1, 2, "minecraft:lantern", {"hanging": "false"})
    p.set(-1, 3, 2, "minecraft:cobweb")
    # the cages: iron bars on a cobblestone floor, the taken inside
    for (cx, cz) in [(6, -1), (-7, 0)]:
        p.fill(cx - 1, 0, cz - 1, cx + 1, 0, cz + 1, "minecraft:cobblestone")
        for x in (cx - 1, cx + 1):
            for z in (cz - 1, cz, cz + 1):
                p.set(x, 1, z, "minecraft:iron_bars"); p.set(x, 2, z, "minecraft:iron_bars")
        for z in (cz - 1, cz + 1):
            p.set(cx, 1, z, "minecraft:iron_bars"); p.set(cx, 2, z, "minecraft:iron_bars")
        p.fill(cx - 1, 3, cz - 1, cx + 1, 3, cz + 1, "minecraft:spruce_slab", {"type": "bottom"})
        p.set(cx, 3, cz, "minecraft:oak_trapdoor", {"half": "bottom", "facing": "north", "open": "false"})
    p.entity(6.5, 1.0, -0.5, villager("minecraft:farmer"))
    p.entity(-6.5, 1.0, 0.5, villager("minecraft:librarian"))
    p.entity(-6.5, 1.0, 0.5, villager("minecraft:none"))
    # odds and ends
    p.set(-4, 1, -8, "minecraft:hay_block"); p.set(-5, 1, -8, "minecraft:hay_block"); p.set(-4, 2, -8, "minecraft:hay_block")
    p.set(7, 1, 7, "minecraft:composter"); p.set(8, 1, 6, "minecraft:barrel", {"facing": "up"}, {"id": "minecraft:barrel", "LootTable": RUIN_LOOT})
    p.set(-8, 1, -4, "minecraft:cauldron"); p.set(-8, 1, -3, "minecraft:campfire", {"lit": "false", "facing": "north"})
    p.set(4, 1, 8, "minecraft:spruce_fence"); p.set(4, 2, 8, "minecraft:white_banner", {"rotation": "8"})
    p.sign(R + 1, 1, 0, ["EAT FIRST", "", "bring what", "you carry"], rotation=12)
    p.set(0, 1, 8, "minecraft:bell", {"attachment": "floor", "facing": "north"})   # a second stolen bell, floor-mounted
    p.set(-2, 1, -8, "minecraft:cobweb"); p.set(8, 1, 3, "minecraft:dead_bush")
    return p, "rigid"


# ----------------------------------------------------------------------------- emit
NATURE = [fallen_oak, fallen_spruce, boulder_small, boulder_large, woodcutters_rest]
RUST = [derailed_cart, toppled_wheel, dead_fan, station_platform, cairn, signal_post, drill_crater, boarded_well, cracked_chapel, grave_wall]
CAMP = [war_camp]
START_HEIGHT = {"drill_crater": -4}          # others: -1 (y=0 replaces the top ground block)
ADAPT = {"station_platform": "beard_thin", "cracked_chapel": "beard_thin", "war_camp": "beard_thin", "boulder_large": "beard_thin"}

NATURE_BIOMES = ["#minecraft:is_forest", "#minecraft:is_taiga", "#minecraft:is_jungle",
                 "#minecraft:has_structure/village_plains", "#minecraft:has_structure/village_taiga",
                 "#minecraft:has_structure/village_savanna", "#minecraft:has_structure/village_snowy"]
RUST_BIOMES = ["#minecraft:has_structure/village_plains", "#minecraft:has_structure/village_taiga",
               "#minecraft:has_structure/village_savanna", "#minecraft:has_structure/village_snowy",
               "#minecraft:has_structure/village_desert", "#minecraft:has_structure/pillager_outpost",
               "#minecraft:is_forest", "#minecraft:is_taiga"]
CAMP_SPAWNS = {"monster": {"bounding_box": "full", "spawns": [
    {"type": "minecraft:pillager", "weight": 6, "minCount": 1, "maxCount": 2},
    {"type": "minecraft:vindicator", "weight": 3, "minCount": 1, "maxCount": 1},
    {"type": "minecraft:evoker", "weight": 1, "minCount": 1, "maxCount": 1},
]}}


def write_json(rel: str, obj):
    p = DP / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, indent=1) + "\n", encoding="utf-8")


def emit(group: str, makers, biome_tag: str, spawns, placement):
    ids = []
    for mk in makers:
        piece, projection = mk()
        data, origin = piece.to_nbt()
        (DP / f"peacock/structures/{group}").mkdir(parents=True, exist_ok=True)
        (DP / f"peacock/structures/{group}/{piece.name}.nbt").write_bytes(data)
        write_json(f"peacock/worldgen/template_pool/{group}/{piece.name}.json", {
            "name": f"peacock:{group}/{piece.name}", "fallback": "minecraft:empty",
            "elements": [{"weight": 1, "element": {"element_type": "minecraft:single_pool_element", "projection": projection,
                                                    "location": f"peacock:{group}/{piece.name}", "processors": "minecraft:empty"}}]})
        # the piece is authored around its own origin; the template's corner is bounds-min, so shift the start
        write_json(f"peacock/worldgen/structure/{group}/{piece.name}.json", {
            "type": "minecraft:jigsaw", "biomes": biome_tag, "step": "surface_structures",
            "spawn_overrides": spawns, "terrain_adaptation": ADAPT.get(piece.name, "none"),
            "start_pool": f"peacock:{group}/{piece.name}", "size": 1,
            "start_height": {"absolute": START_HEIGHT.get(piece.name, -1) + origin[1]},
            "project_start_to_heightmap": "WORLD_SURFACE_WG", "max_distance_from_center": 32, "use_expansion_hack": False,
        })
        ids.append(f"peacock:{group}/{piece.name}")
    write_json(f"peacock/worldgen/structure_set/{group}.json", {
        "structures": [{"structure": s, "weight": 1} for s in ids], "placement": placement})
    write_json(f"peacock/tags/worldgen/structure/{group}.json", {"replace": False, "values": ids})
    return ids


def main() -> None:
    write_json("peacock/tags/worldgen/biome/nature.json", {"replace": False, "values": NATURE_BIOMES})
    write_json("peacock/tags/worldgen/biome/rust_belt.json", {"replace": False, "values": RUST_BIOMES})
    n = emit("nature", NATURE, "#peacock:nature", {}, {
        "type": "minecraft:random_spread", "spacing": 7, "separation": 3, "salt": 20261018})
    r = emit("rust_belt", RUST, "#peacock:rust_belt", {}, {
        "type": "minecraft:random_spread", "spacing": 22, "separation": 9, "salt": 20261019,
        "exclusion_zone": {"other_set": "peacock:capital", "chunk_count": 6}})
    c = emit("war_camp", CAMP, "#peacock:rust_belt", CAMP_SPAWNS, {
        "type": "minecraft:random_spread", "spacing": 64, "separation": 30, "salt": 20261020,
        "exclusion_zone": {"other_set": "peacock:capital", "chunk_count": 14}})
    print(f"nature {len(n)}, rust belt {len(r)}, camp {len(c)} pieces written under {DP.relative_to(ROOT)}/peacock")


if __name__ == "__main__":
    main()
