#!/usr/bin/env python3
"""Peacock — the electrum pickaxe and storage block, redrawn (2026-10-24).

Aaron: "The pickaxe texture [is] screwed up, and the block texture just does not look good." ChatGPT drew electrum's
pickaxe as a symmetric two-armed head, which the import (tools/import-gear-art.py) squeezed onto vanilla's one-armed
footprint and mangled; and its electrum block was flat (a white bar and a cross). Both are now vanilla's own shapes in
electrum's colours, which is what electrum is: a paler, greener gold.
  pickaxe: vanilla golden pickaxe, its gold mapped by brightness onto electrum's colours (no stud: at 16 px it
           broke the head's outline);
  block:   vanilla gold block, its colours mapped by brightness onto the electrum ingot's, with an engraved sun disc
           and four short rays in the middle.

usage: python3 tools/fix-electrum-art.py <minecraft-1.20.1-client.jar>
"""
import io, sys, zipfile
from pathlib import Path
from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / 'pack/kubejs/assets/peacock/textures'
INGOT = ['#68402b', '#a47d44', '#c0a450', '#d4c678', '#ededd1', '#ffffff']   # the electrum ingot, darkest first
hx = lambda c: (int(c[1:3], 16), int(c[3:5], 16), int(c[5:7], 16))
lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def by_rank(im, targets):
    """Map each colour of im, by brightness rank, onto the target colours (spread evenly)."""
    cs = sorted({p[:3] for p in im.getdata() if p[3]}, key=lum)
    m = {c: targets[round(i * (len(targets) - 1) / max(1, len(cs) - 1))] for i, c in enumerate(cs)}
    out = im.copy(); px = out.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a: px[x, y] = m[(r, g, b)] + (a,)
    return out


def main():
    client = zipfile.ZipFile(sys.argv[1])
    van = lambda p: Image.open(io.BytesIO(client.read('assets/minecraft/textures/' + p))).convert('RGBA')
    # pickaxe: vanilla's golden pickaxe (the closest shape and shading), its gold mapped by brightness onto electrum;
    # the stick (the four vanilla wood colours) is kept
    pick = van('item/golden_pickaxe.png'); px = pick.load()
    # golden pickaxe's five metal colours, darkest first -> electrum
    m = {(63, 46, 14): hx('#3c2410'), (130, 93, 22): hx('#a47d44'), (233, 177, 21): hx('#c0a450'),
         (234, 238, 87): hx('#ededd1'), (253, 255, 118): hx('#ffffff')}
    for y in range(16):
        for x in range(16):
            if px[x, y][3] and px[x, y][:3] in m:
                px[x, y] = m[px[x, y][:3]] + (255,)
    pick.save(ASSETS / 'item/electrum_pickaxe.png', optimize=True)
    # block
    block = by_rank(van('block/gold_block.png'), [hx(c) for c in INGOT[1:]]); bp = block.load()
    disc = [(7, 6), (8, 6), (6, 7), (9, 7), (6, 8), (9, 8), (7, 9), (8, 9)]
    for x, y in disc:
        bp[x, y] = hx('#a47d44') + (255,)
    for x, y in [(7, 7), (8, 8)]:
        bp[x, y] = hx('#ffffff') + (255,)
    for x, y in [(8, 7), (7, 8)]:
        bp[x, y] = hx('#ededd1') + (255,)
    for x, y in [(7, 4), (8, 4), (4, 7), (4, 8), (11, 7), (11, 8), (7, 11), (8, 11)]:
        bp[x, y] = hx('#c0a450') + (255,)
    block.save(ASSETS / 'block/electrum_block.png', optimize=True)
    print('wrote electrum pickaxe and block')


if __name__ == '__main__':
    main()
