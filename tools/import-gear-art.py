#!/usr/bin/env python3
"""Peacock — turn concept art of a metal's tool and armour set into the pack's 16 × 16 icons (2026-10-24).

The concept sheets are ChatGPT images Aaron made from the prompt in docs/DECISIONS.md ("Gear art"): one per metal, a
5 × 2 grid (pickaxe, axe, shovel, hoe, sword / helmet, chestplate, leggings, boots), each piece drawn on a 16-px grid
but upscaled to about 25 screen pixels per pixel and never quite on the grid. For each piece this:
  1. finds the drawing in its cell and stretches vanilla iron's footprint for that piece over it, so the icon keeps
     vanilla's exact size and position;
  2. samples the middle of every pixel (median, so seams and anti-aliasing do not bleed in);
  3. gives tools vanilla's own stick pixels, so every handle is the same wood;
  4. snaps the metal to one palette shared by the whole set (9 colours, median cut), keeping the accent colours a
     metal is allowed (aluminium's amber visor, platinum's blue gem);
  5. adds back the small details the sampling cannot hold (DETAILS below), drawn by hand pixel by pixel.

usage: python3 tools/import-gear-art.py <minecraft-1.20.1-client.jar> <dir with aluminum.png, tin.png, ...>
Writes pack/kubejs/assets/peacock/textures/item/<metal>_<piece>.png. Worn layers: tools/gen-metal-gear.py.
"""
import colorsys, io, sys, zipfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'pack/kubejs/assets/peacock/textures/item'
NAMES = ['pickaxe', 'axe', 'shovel', 'hoe', 'sword', 'helmet', 'chestplate', 'leggings', 'boots']
TOOLS = NAMES[:5]
METALS = ['aluminum', 'tin', 'lead', 'silver', 'nickel', 'electrum', 'constantan', 'invar', 'platinum']
# metal -> [(hue range, min saturation, colours)]: pixels kept as an accent instead of joining the metal palette
ACCENT = {
    'aluminum': [((0.05, 0.16), 0.35, [(0xd9, 0xa4, 0x41), (0xa8, 0x76, 0x2a)])],
    'platinum': [((0.45, 0.60), 0.25, [(0x9f, 0xd7, 0xe6), (0x4f, 0xa8, 0xc4)])],
}
# metal -> piece -> [(x, y, colour)]; colour 'L'/'M'/'D' = the set's light / middle / dark metal tone
DETAILS = {
    'aluminum': {  # rivets at the plate corners
        'chestplate': [(6, 9, 'D'), (9, 9, 'D'), (6, 12, 'D'), (9, 12, 'D')],
        'leggings': [(5, 5, 'D'), (10, 5, 'D')],
    },
    'silver': {  # a crescent moon on brow and breast
        'helmet': [(8, 4, '#c9b27a'), (7, 5, '#c9b27a'), (8, 6, '#c9b27a')],
        'chestplate': [(8, 8, '#c9b27a'), (7, 9, '#c9b27a'), (7, 10, '#c9b27a'), (8, 11, '#c9b27a')],
    },
    'electrum': {  # the sun disc
        'helmet': [(7, 4, '#a47d44'), (8, 4, '#a47d44'), (7, 5, '#ffffff'), (8, 5, '#a47d44')],
        'chestplate': [(7, 8, '#a47d44'), (8, 8, '#a47d44'), (6, 9, '#a47d44'), (7, 9, '#ffffff'), (8, 9, '#ededd1'),
                       (9, 9, '#a47d44'), (7, 10, '#a47d44'), (8, 10, '#a47d44')],
    },
    'invar': {  # square bolt heads: a light pixel over a dark one
        'chestplate': [(5, 7, 'L'), (5, 8, 'D'), (10, 7, 'L'), (10, 8, 'D'), (5, 11, 'L'), (5, 12, 'D'), (10, 11, 'L'), (10, 12, 'D')],
        'leggings': [(4, 6, 'L'), (11, 6, 'L'), (4, 11, 'L'), (11, 11, 'L')],
    },
}
WRAP = {'constantan'}   # wire-wrapped handles: every fourth step along the stick is a band of metal


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def hexc(s):
    return tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))


def main():
    client = zipfile.ZipFile(sys.argv[1]); src = Path(sys.argv[2])
    van = {n: np.array(Image.open(io.BytesIO(client.read(f'assets/minecraft/textures/item/iron_{n}.png'))).convert('RGBA')).astype(int)
           for n in NAMES}
    wood = {n: (van[n][:, :, 3] > 0) & ~((van[n][:, :, 0] == van[n][:, :, 1]) & (van[n][:, :, 1] == van[n][:, :, 2])) if n in TOOLS
            else np.zeros((16, 16), bool) for n in NAMES}
    for m in METALS:
        im = np.array(Image.open(src / f'{m}.png').convert('RGBA')).astype(float)
        H, W = im.shape[:2]; cw, ch = W / 5, H / 2
        raw = {}
        for i, n in enumerate(NAMES):
            cell = im[int((i // 5) * ch):int((i // 5 + 1) * ch), int((i % 5) * cw):int((i % 5 + 1) * cw)]
            ys, xs = np.where(cell[:, :, 3] > 128)
            x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            vy, vx = np.where(van[n][:, :, 3] > 0)
            vx0, vy0, vx1, vy1 = vx.min(), vy.min(), vx.max() + 1, vy.max() + 1
            bw, bh = (x1 - x0) / (vx1 - vx0), (y1 - y0) / (vy1 - vy0)
            r = max(1, int(min(bw, bh) * 0.2))
            spr = np.zeros((16, 16, 4), int)
            for gy in range(vy0, vy1):
                for gx in range(vx0, vx1):
                    px, py = int(x0 + (gx - vx0 + 0.5) * bw), int(y0 + (gy - vy0 + 0.5) * bh)
                    patch = cell[py - r:py + r + 1, px - r:px + r + 1].reshape(-1, 4)
                    if len(patch) == 0 or np.median(patch[:, 3]) < 128:
                        continue
                    spr[gy, gx] = list(np.median(patch[patch[:, 3] > 128][:, :3], axis=0).astype(int)) + [255]
            raw[n] = spr
        # one palette for the set, accents aside
        metal_px, acc = [], {}
        for n, a in raw.items():
            am = np.zeros((16, 16), bool)
            for y in range(16):
                for x in range(16):
                    if a[y, x, 3] == 0 or wood[n][y, x]:
                        continue
                    h, s, v = colorsys.rgb_to_hsv(*(a[y, x, :3] / 255))
                    for (h0, h1), smin, _ in ACCENT.get(m, []):
                        if h0 <= h <= h1 and s >= smin and v > 0.3:
                            am[y, x] = True
                    if not am[y, x]:
                        metal_px.append(a[y, x, :3])
            acc[n] = am
        q = Image.fromarray(np.array(metal_px, dtype='uint8').reshape(1, -1, 3), 'RGB').quantize(9, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pal = np.array(q.getpalette()[:27]).reshape(-1, 3)
        tones = sorted([tuple(c) for c in pal], key=lum)
        tone = {'D': tones[1], 'M': tones[4], 'L': tones[-2]}
        for n, a in raw.items():
            o = np.zeros((16, 16, 4), int)
            for y in range(16):
                for x in range(16):
                    if wood[n][y, x]:
                        o[y, x] = van[n][y, x]
                    elif a[y, x, 3] == 0:
                        continue
                    elif acc[n][y, x]:
                        cols = ACCENT[m][0][2]
                        o[y, x] = list(min(cols, key=lambda c: sum((a[y, x, :3] - np.array(c)) ** 2))) + [255]
                    else:
                        o[y, x] = list(pal[np.argmin(((pal - a[y, x, :3]) ** 2).sum(1))]) + [255]
            if m in WRAP and n in TOOLS:
                for y in range(16):
                    for x in range(16):
                        if wood[n][y, x] and (x - y) % 4 == 0:
                            o[y, x] = list(tone['L'] if (x + y) % 2 else tone['M']) + [255]
            for x, y, c in DETAILS.get(m, {}).get(n, []):
                if o[y, x, 3]:
                    o[y, x] = list(tone[c] if c in tone else hexc(c)) + [255]
            OUT.mkdir(parents=True, exist_ok=True)
            Image.fromarray(o.astype('uint8'), 'RGBA').save(OUT / f'{m}_{n}.png', optimize=True)
    print('wrote', len(METALS) * len(NAMES), 'icons')


if __name__ == '__main__':
    main()
