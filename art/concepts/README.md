# Concept art (not shipped)

ChatGPT images Aaron made on 2026-10-24 from the prompts in docs/DECISIONS.md ("Gear and item art"). The pack's
textures are made from them:

- `gear/<metal>.png` → 16 × 16 tool and armour icons: `python3 tools/import-gear-art.py <client-1.20.1.jar> art/concepts/gear`,
  then the worn layers: `python3 tools/gen-metal-gear.py <client.jar> <geolosys.jar> <create_ironworks.jar> <create.jar>`.
  `aluminum_layer_*_concept.png` were the style guide for the worn aluminium armour.
- `blocks/<metal>.png` are already 16 × 16 (ChatGPT delivered them as files) and are copied as `<metal>_block.png`.
- `items/items.png` was drawn at about 32 × 32 and does not shrink cleanly; the icons are redrawn by hand in
  `tools/draw-items.py` after it.
