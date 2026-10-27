#!/usr/bin/env python3
"""Peacock — the Geolosys deposit set: size variety, the deep layer, and weights (2026-10-27).

Geolosys places ore once per chunk with a 1 - chunkSkipChance chance, picking `numPlutonsPerChunk` (2) deposits by
`generationWeight` among those allowed in the chunk's biome. Its dense and sparse deposits vary only about ±15% in size,
so every find of a metal is much the same. Aaron (2026-10-27): "There's no randomness to the vein size? Can there be?"

This writes, into the pack datapack (Paxi loads it above Geolosys):
  data/geolosys/deposits/**   every deposit Geolosys ships, weights x10 (integer weights; the split below needs room)
  data/peacock/deposits/ore/  the small and large variants, and the deep layer (with its own variants)

Size variety: each overworld ore deposit (dense, sparse, dike) becomes three: a small pocket (most of the rest), the
normal deposit (most finds) and a rare large strike (about one in ten). The small/large weights are solved from a
simulation of Geolosys' own generate() code (seeded, below) so the AVERAGE ore per deposit, and so the ore per chunk,
stays what it was. Layers (the coals), stones, peat, the Nether and the End are left as they are, weights x10.

The deep layer: lead/silver, nickel, platinum, tin and gold also generate below about Y -16 under every biome, sized so
each gives roughly a third of its regional deposit's ore per chunk (gold less: it is already broad). See DECISIONS.md.

Input: tools/data/geolosys-deposits.json (Geolosys 8.0.5 with the pack's earlier overrides). After running, set
chunkSkipChance in pack/config/geolosys-common.toml to the value printed, then refresh and validate:

    python3 tools/gen-deposits.py && (cd pack && packwiz refresh) && python3 tools/validate.py
"""
import json, math, random, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "pack/config/paxi/datapacks/peacock/data"
BASE = json.loads((ROOT / "tools/data/geolosys-deposits.json").read_text())["deposits"]

WEIGHT_SCALE = 10
# Blob ore grows with roughly size^2.7 (longer AND thicker), so modest size steps: small ~0.4x the ore, large ~2.5x.
# Dikes are columns: their ore is linear in height, so they vary by height (centred on the deposit's own band).
BLOB_SMALL, BLOB_LARGE = 0.72, 1.40
DIKE_SMALL, DIKE_LARGE = 0.45, 2.0
LARGE_SHARE = 0.10                # about one find in ten is a large strike
WEIGHT_OVERRIDE = {"ore/bauxite": 4}
NO_VARIANTS = {"ore/beryl", "ore/teallite_and_emerald"}   # emeralds are the currency: no jackpot strikes   # aluminum: 2 -> 4 (2026-10-27; it has jobs now and was the rarest by far)

# deep layer: name -> (source deposit, yMin, yMax, weight, parameter overrides); all #minecraft:is_overworld
DEEP = {
    "deep_galena":      ("ore/galena",      -56, -16, 4, {"size": 24}),
    "deep_limonite":    ("ore/limonite",    -56, -44, 2, {"baseRadius": 4}),
    "deep_platinum":    ("ore/platinum",    -56, -20, 2, {"baseRadius": 3}),
    "deep_cassiterite": ("ore/cassiterite", -56, -16, 3, {"size": 20}),
    "deep_gold":        ("ore/gold",        -64, -24, 3, {"size": 26}),
}


# ---------------------------------------------------------------- Geolosys' generate(), ore blocks placed in solid stone
def sim_blob(size, rng):
    """DenseDeposit / SparseDeposit: a line of `size` spheres with random radius (sparse also scatters them)."""
    placed = set()
    a = rng.random() * math.pi
    x1, x2 = 8 + math.sin(a) * size / 8, 8 - math.sin(a) * size / 8
    z1, z2 = 8 + math.cos(a) * size / 8, 8 - math.cos(a) * size / 8
    y1, y2 = rng.randrange(3) - 2, rng.randrange(3) - 2
    for i in range(size):
        t = i / size
        xn, yn, zn = x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, z1 + (z2 - z1) * t
        rad = (math.sin(math.pi * t) + 1) * (rng.random() * size / 16) + 1
        for x in range(math.floor(xn - rad / 2), math.floor(xn + rad / 2) + 1):
            for y in range(math.floor(yn - rad / 2), math.floor(yn + rad / 2) + 1):
                for z in range(math.floor(zn - rad / 2), math.floor(zn + rad / 2) + 1):
                    if ((x + .5 - xn) ** 2 + (y + .5 - yn) ** 2 + (z + .5 - zn) ** 2) / (rad / 2) ** 2 < 1:
                        placed.add((x, y, z))
    return len(placed)


def sim_dike(c, rng):
    """DikeDeposit: a column over (most of) the y range whose radius wanders up then down."""
    h = abs(c["yMax"] - c["yMin"])
    y0 = c["yMin"] + rng.randrange(max(1, h // 4))
    y1 = c["yMax"] - rng.randrange(max(1, h // 4))
    rad, n, sub, ht = c["baseRadius"] // 2, 0, False, abs(y1 - y0)
    for dy in range(y0, y1 + 1):
        n += sum(1 for dx in range(-rad, rad + 1) for dz in range(-rad, rad + 1) if dx * dx + dz * dz <= rad)
        if y0 + ht // 2 <= dy:
            sub = True
        if rng.randrange(3) == 0:
            rad += -1 if sub else 1
            if rad <= 0:
                break
    return n


def ore_share(c):
    return sum(b["chance"] for b in c["blocks"]["default"] if b.get("block") and "ore" in b["block"])


def mean_ore(dep, n=160):
    c, kind = dep["config"], dep["type"].split(":")[1]
    rng = random.Random(1808)   # seeded: the same weights every run
    f = (lambda: sim_dike(c, rng)) if kind == "deposit_dike" else (lambda: sim_blob(c["size"], rng))
    return sum(f() for _ in range(n)) / n * ore_share(c)


def scaled(dep, which):
    d = json.loads(json.dumps(dep))
    c = d["config"]
    if d["type"] == "geolosys:deposit_dike":
        f = DIKE_SMALL if which == "small" else DIKE_LARGE
        mid, half = (c["yMin"] + c["yMax"]) / 2, abs(c["yMax"] - c["yMin"]) / 2 * f
        c["yMin"], c["yMax"] = max(-64, round(mid - half)), min(300, round(mid + half))
        if c["yMax"] - c["yMin"] < 4:
            c["yMax"] = c["yMin"] + 4
    else:
        c["size"] = max(4, round(c["size"] * (BLOB_SMALL if which == "small" else BLOB_LARGE)))
    return d


def varied(dep):
    kind = dep["type"].split(":")[1]
    tag = dep["config"].get("biomeTag", "")
    return (kind in ("deposit_dense", "deposit_sparse", "deposit_dike") and "nether" not in tag and "is_end" not in tag
            and ore_share(dep["config"]) > 0)   # the stone plutons (andesite, diorite, granite) stay as they are


def split(name, dep, weight):
    """normal/small/large deposits whose weighted mean ore equals the normal deposit's."""
    total = weight * WEIGHT_SCALE
    small, large = scaled(dep, "small"), scaled(dep, "large")
    m0, ms, ml = mean_ore(dep), mean_ore(small), mean_ore(large)
    wl = max(1, round(LARGE_SHARE * total))
    ws = round(wl * (ml - m0) / max(1e-6, m0 - ms))
    while total - wl - ws < 0.4 * total and wl > 1:      # keep the normal deposit the usual find
        wl -= 1
        ws = round(wl * (ml - m0) / max(1e-6, m0 - ms))
    wn = total - wl - ws
    out = []
    for suffix, d, w, m in (("", dep, wn, m0), ("_small", small, ws, ms), ("_large", large, wl, ml)):
        d = json.loads(json.dumps(d))
        d["config"]["generationWeight"] = w
        out.append((name + suffix, d, w, m))
    mean = sum(w * m for _, _, w, m in out) / total
    print(f"  {name:22s} w{weight:<2} small {ms:5.0f} x{ws:<3} normal {m0:5.0f} x{wn:<3} large {ml:5.0f} x{wl:<3}"
          f" mean {mean:5.0f} ({mean / m0 * 100:3.0f}% of normal)")
    return out, m0


def write(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n")


def main():
    for d in (DATA / "geolosys/deposits", DATA / "peacock/deposits"):
        if d.exists():
            shutil.rmtree(d)
    supply = {}
    print("variants (ore blocks in solid stone; weights x10):")
    for rel, dep in sorted(BASE.items()):
        dep = json.loads(json.dumps(dep))
        w = WEIGHT_OVERRIDE.get(rel, dep["config"]["generationWeight"])
        if not varied(dep) or rel in NO_VARIANTS:
            dep["config"]["generationWeight"] = w * WEIGHT_SCALE
            write(DATA / "geolosys/deposits" / f"{rel}.json", dep)
            continue
        parts, m0 = split(rel.split("/")[1], dep, w)
        supply[rel] = w * m0
        (name, d, _, _), rest = parts[0], parts[1:]
        write(DATA / "geolosys/deposits" / f"{rel}.json", d)
        for name, d, _, _ in rest:
            write(DATA / "peacock/deposits/ore" / f"{name}.json", d)
    print("deep layer (ore per chunk relative to the regional deposit, inside its own biome):")
    deep_weight = 0
    for name, (src, y0, y1, w, over) in DEEP.items():
        dep = json.loads(json.dumps(BASE[src]))
        c = dep["config"]
        c.update({"yMin": y0, "yMax": y1, "biomeTag": "#minecraft:is_overworld", **over})
        c.pop("biomes", None)
        parts, m0 = split(name, dep, w)
        print(f"  {'':22s} -> {w * m0 / supply[src] * 100:3.0f}% of {src.split('/')[1]}'s")
        for n, d, _, _ in parts:
            write(DATA / "peacock/deposits/ore" / f"{n}.json", d)
        deep_weight += w
    # the surface rate stays where it was: a biome with no special tags had weight W0 before any of this
    w0 = sum(d["config"]["generationWeight"] for d in BASE.values()
             if d["config"].get("biomeTag") == "#minecraft:is_overworld")
    w1 = w0 + sum(WEIGHT_OVERRIDE[r] - BASE[r]["config"]["generationWeight"] for r in WEIGHT_OVERRIDE) + deep_weight
    print(f"overworld base weight {w0} -> {w1}: set chunkSkipChance = {1 - 0.1 * w1 / w0:.3f} (it was 0.9)")


if __name__ == "__main__":
    main()
