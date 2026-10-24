#!/usr/bin/env python3
"""Peacock — textures for the metal tool and armour sets (startup_scripts/metal_gear.js), 2026-10-24.

Each set is vanilla iron's art recoloured: every neutral-grey pixel of the iron tool, armour item and worn-armour layer
textures is mapped, by brightness, onto the colours of that metal's own ingot (Geolosys, Create: Ironworks, or the
pack's alloy ingots). The iron ingot's greys are the anchors, so the iron ingot's darkest grey becomes the target
ingot's darkest colour, its brightest the brightest, and everything between is interpolated. Worn-armour layers use the brighter half of
the ingot's colours (see layer_ramp). Wood (sticks) and
anything else that is not grey is kept.

usage: python3 tools/gen-metal-gear.py <minecraft-1.20.1-client.jar> <geolosys.jar> <create_ironworks.jar> <create.jar>
Writes pack/kubejs/assets/peacock/textures/item/<metal>_<piece>.png and
pack/kubejs/assets/peacock/textures/models/armor/<metal>_layer_{1,2}.png (the armour tier is named peacock:<metal>),
and the lead and invar sheets (Create's iron sheet, recoloured the same way): peacock/textures/item/<metal>_sheet.png.
"""
import io, sys, zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'pack/kubejs/assets'
TOOLS = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword']
ARMOUR = ['helmet', 'chestplate', 'leggings', 'boots']
# metal -> where its ingot texture lives: (jar key or None for the pack, path)
INGOTS = {
    'tin': ('ironworks', 'assets/create_ironworks/textures/item/tin_ingot.png'),
    'lead': ('geolosys', 'assets/geolosys/textures/item/lead_ingot.png'),
    'silver': ('geolosys', 'assets/geolosys/textures/item/silver_ingot.png'),
    'nickel': ('geolosys', 'assets/geolosys/textures/item/nickel_ingot.png'),
    'aluminum': ('geolosys', 'assets/geolosys/textures/item/aluminum_ingot.png'),
    'platinum': ('geolosys', 'assets/geolosys/textures/item/platinum_ingot.png'),
    'electrum': (None, 'peacock/textures/item/electrum_ingot.png'),
    'constantan': (None, 'peacock/textures/item/constantan_ingot.png'),
    'invar': (None, 'peacock/textures/item/invar_ingot.png'),
}


SHEETS = ['lead', 'invar']   # new plates for lead pipes and invar fittings (server_scripts/metals.js)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def colours(im):
    return sorted({p[:3] for p in im.convert('RGBA').getdata() if p[3] > 0}, key=lum)


def ramp(src_anchors, tgt):
    """grey value -> target colour: position among the iron ingot's greys, then that position along the target."""
    def at(t):
        t = max(0.0, min(1.0, t)) * (len(tgt) - 1)
        i = int(t); f = t - i
        a = tgt[i]; b = tgt[min(i + 1, len(tgt) - 1)]
        return tuple(round(a[k] + (b[k] - a[k]) * f) for k in range(3))
    lo, hi = src_anchors[0], src_anchors[-1]

    def f(g):
        if g < lo:   # darker than the iron ingot's darkest (outlines): darken the target's darkest in proportion
            c = at(0.0); s = g / lo if lo else 0
            return tuple(round(v * s) for v in c)
        for i in range(len(src_anchors) - 1):
            a, b = src_anchors[i], src_anchors[i + 1]
            if a <= g <= b:
                t = (i + ((g - a) / (b - a) if b > a else 0)) / (len(src_anchors) - 1)
                return at(t)
        return at(1.0)
    return f


def layer_ramp(im, tgt):
    """Worn-armour layers are all light greys (183-255 on iron's): spread their own range over the brighter half
    of the target ingot's colours, so the armour keeps some depth instead of all landing on the ingot's highlights."""
    greys = sorted({p[0] for p in im.convert('RGBA').getdata() if p[3] and p[0] == p[1] == p[2]})
    lo, hi = greys[0], greys[-1]
    base = 0.65 if lum(tgt[len(tgt) // 2]) < 100 else 0.45     # a dark ingot (lead) starts higher, or it reads black
    def f(g):
        t = base + (1 - base) * ((g - lo) / (hi - lo) if hi > lo else 1)
        t = max(0.0, min(1.0, t)) * (len(tgt) - 1)
        i = int(t); fr = t - i
        a = tgt[i]; b = tgt[min(i + 1, len(tgt) - 1)]
        return tuple(round(a[k] + (b[k] - a[k]) * fr) for k in range(3))
    return f


def recolour(im, f):
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a and r == g == b:
                px[x, y] = f(r) + (a,)
    return im


def main():
    client, geolosys, ironworks, create = (zipfile.ZipFile(p) for p in sys.argv[1:5])
    jars = {'geolosys': geolosys, 'ironworks': ironworks}
    van = lambda p: Image.open(io.BytesIO(client.read('assets/minecraft/textures/' + p)))
    iron = sorted({c[0] for c in colours(van('item/iron_ingot.png'))})
    for metal, (jar, path) in INGOTS.items():
        ingot = Image.open(io.BytesIO(jars[jar].read(path))) if jar else Image.open(ASSETS / path)
        f = ramp(iron, colours(ingot))
        for piece in TOOLS + ARMOUR:
            out = ASSETS / 'peacock/textures/item' / f'{metal}_{piece}.png'
            out.parent.mkdir(parents=True, exist_ok=True)
            recolour(van(f'item/iron_{piece}.png'), f).save(out, optimize=True)
        for layer in (1, 2):
            out = ASSETS / 'peacock/textures/models/armor' / f'{metal}_layer_{layer}.png'
            out.parent.mkdir(parents=True, exist_ok=True)
            src = van(f'models/armor/iron_layer_{layer}.png')
            recolour(src, layer_ramp(src, colours(ingot))).save(out, optimize=True)
        if metal in SHEETS:
            sheet = Image.open(io.BytesIO(create.read('assets/create/textures/item/iron_sheet.png')))
            recolour(sheet, ramp(sorted({c[0] for c in colours(sheet) if c[0] == c[1] == c[2]}), colours(ingot))).save(
                ASSETS / 'peacock/textures/item' / f'{metal}_sheet.png', optimize=True)
    print('wrote', len(INGOTS) * (len(TOOLS) + len(ARMOUR) + 2), 'textures')


if __name__ == '__main__':
    main()
