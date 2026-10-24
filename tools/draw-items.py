#!/usr/bin/env python3
"""Peacock — hand-drawn 16 × 16 icons for the pack's own paper items (2026-10-24).

Drawn pixel by pixel after Aaron's ChatGPT concepts (a rolled blueprint with a gear, a bow drill on its fireboard, a
wax-sealed letter, a signed contract with a ribbon seal); ChatGPT drew them at about 32 × 32, which does not shrink
cleanly. Each map below is the icon: one character per pixel, '.' transparent, the rest from that item's palette.

usage: python3 tools/draw-items.py   (writes pack/kubejs/assets/peacock/textures/item/<item>.png)
"""
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / 'pack/kubejs/assets/peacock/textures/item'

ITEMS = {
    'blueprint': ({'O': '#0b1a3d', 'D': '#1d3f8a', 'M': '#2c5cc5', 'L': '#4f86e0', 'W': '#e8f0ff', 'C': '#8b6a3e', 'c': '#5a4426'}, [
        '................',
        '.OOOOOOCcOOOOOO.',
        'OLLLLLLCcLLLLLLO',
        'OMMMMMMCcMMMMMMO',
        'ODDDDDDCcDDDDDDO',
        '.OOODDDDDDDDOOO.',
        '..OLMMMMMMMMDO..',
        '..OLMMMWWMMMDO..',
        '..OLMMWWWWMMDO..',
        '..OLMWWMMWWMDO..',
        '..OLMWWMMWWMDO..',
        '..OLMMWWWWMMDO..',
        '..OLMMMWWMMMDO..',
        '..OLWMWMWMWMDO..',
        '..ODDDDDDDDDDO..',
        '...OOOOOOOOOO...',
    ]),
    'fire_drill': ({'O': '#2a1a0c', '1': '#5a3d1e', '2': '#7d5630', '3': '#a37a46', 'S': '#d8d0b8', 'E': '#ff9a2e', 'e': '#ffd25a', 'K': '#9a9a9a', 'k': '#c4c4c4'}, [
        '.......OOO......',
        '.......O3O......',
        '.......O2O......',
        '.O.....O2O....O.',
        '.O3....O2O...3O.',
        '.O3SSSSS2SSSS3O.',
        '..O3...O2O..3O..',
        '...O333O2O333O..',
        '....OOOO2OOOO...',
        '.......O2O.kK...',
        '.......O2OK.k...',
        '..OOOOOO2OeOOO..',
        '.O33333O2E33333O',
        '.O2222222222222O',
        '.O1111111111111O',
        '..OOOOOOOOOOOOO.',
    ]),
    'rumour_voucher': ({'O': '#3a2a14', '1': '#efe3c2', '2': '#d9c7a0', '3': '#c4ad80', '4': '#a88f62', 'R': '#9e1b1b', 'A': '#c93030', 'X': '#6e1010'}, [
        '................',
        '................',
        '................',
        '.OOOOOOOOOOOOOO.',
        '.O411111111114O.',
        '.O241111111142O.',
        '.O224111111422O.',
        '.O22242RR24222O.',
        '.O2223RAAR3222O.',
        '.O1222RAAX2221O.',
        '.O22222XX22222O.',
        '.O2222R22R2222O.',
        '.O333333333333O.',
        '.OOOOOOOOOOOOOO.',
        '................',
        '................',
    ]),
    'steward_contract': ({'O': '#4a3d26', '1': '#efe6cf', '2': '#d8ccae', '3': '#b8a982', 'I': '#3a3a46', 'A': '#b02a2a', 'B': '#7d1a1a'}, [
        '................',
        '...OOOOOOOOOO...',
        '...O11111112O...',
        '...O1IIII1I2O...',
        '...O11111112O...',
        '...O1III1II2O...',
        '...O11111112O...',
        '...O1IIIII12O...',
        '...O11111112O...',
        '...O1II1III2O...',
        '...O11111AA2O...',
        '...O1I1I1AB2O...',
        '...O11I11BB2O...',
        '...O33333B3BO...',
        '...OOOOOOBOBO...',
        '................',
    ]),
}


def hammer():
    """The Flint Prospector's Hammer: a blocky knapped-flint head across the end of a stick, lashed with twine.
    Drawn in rotated coordinates: u = x - y runs along the head, v = x + y along the handle (vanilla tools lie on
    v = 15); the head sits at the stick's top end, square across it."""
    F = ['#1f1c22', '#2f2c32', '#47434a', '#5e5962', '#7d7880', '#a6a0a8']
    WOOD = ['#281e0b', '#493615', '#684e1e', '#896727']
    TW = ['#b9b092', '#d9d2b8']
    hx = lambda c: (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255)
    im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); px = im.load()
    chips = {(11, 4), (9, 8), (12, 7), (8, 4)}
    for y in range(16):
        for x in range(16):
            u, v = x - y, x + y
            if 3 <= u <= 7 and 9 <= v <= 21:                  # the head
                t = (v - 9) / 12                               # 0 top-left .. 1 bottom-right
                shade = 5 if v <= 10 or u == 7 and v <= 14 else 4 if t < 0.35 else 3 if t < 0.7 else 2
                if (x, y) in chips: shade = 2 if shade > 2 else 1
                px[x, y] = hx(F[shade])
            elif -13 <= u <= 2 and v in (15, 16):              # the stick
                px[x, y] = hx(WOOD[3 if v == 15 and u % 2 else 2] if v == 15 else WOOD[1 if u % 3 else 2])
    for y in range(16):                                        # twine where head meets stick
        for x in range(16):
            u, v = x - y, x + y
            if u in (2, 3) and 14 <= v <= 17:
                px[x, y] = hx(TW[(u + v) % 2])
    out = im.copy(); po = out.load()                           # dark outline around everything
    for y in range(16):
        for x in range(16):
            if px[x, y][3] == 0 and any(0 <= x + dx < 16 and 0 <= y + dy < 16 and px[x + dx, y + dy][3]
                                        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                po[x, y] = hx(F[0] if x + y < 17 else WOOD[0])
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (pal, rows) in ITEMS.items():
        assert len(rows) == 16 and all(len(r) == 16 for r in rows), name
        im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); px = im.load()
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch != '.':
                    c = pal[ch]; px[x, y] = (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16), 255)
        im.save(OUT / f'{name}.png', optimize=True)
    hammer().save(OUT / 'flint_prospectors_hammer.png', optimize=True)
    print('wrote', len(ITEMS) + 1, 'icons')


if __name__ == '__main__':
    main()
