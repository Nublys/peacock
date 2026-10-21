// Peacock — Geolosys metals get uses beyond Spartan weapons (2026-10-21).
//
// Aaron: "The geolosys mod adds many many ores that are ONLY used when crafting spartan weaponry." Before this,
// silver, nickel, platinum and aluminium fed nothing but Spartan weapons and shields, and lead only Supplementaries'
// spiky bomb. This script registers what the recipes in server_scripts/metals.js need, and the villager trades:
//   • alloy ingots and nuggets: electrum (gold + silver), constantan (copper + nickel), invar (iron + nickel), each in
//     its forge:ingots/forge:nuggets tag, which also unlocks Spartan's electrum, constantan and invar weapons
//   • storage blocks for lead, silver, nickel, aluminium, platinum and the three alloys (tin, bronze and steel blocks
//     come from Create: Ironworks); a lead block also switches Supplementaries' cannonballs from iron to lead
//   • aluminium sheet (Eureka balloons) and platinum sheet (a shorter precision mechanism); other sheets come from
//     Create and Ironworks, and none is made that nothing uses
//   • villagers buy tin, lead, silver, nickel, aluminium and platinum for emeralds (Forge's VillagerTradesEvent; the
//     offers appear when a villager reaches that level, so an already-levelled villager keeps its old list)
// Textures are recoloured from Geolosys' ingots, Create's iron sheet and the vanilla iron block.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants.
;(() => {
const ALLOYS = ['electrum', 'constantan', 'invar']
const BLOCKS = ['lead', 'silver', 'nickel', 'aluminum', 'platinum', 'electrum', 'constantan', 'invar']
const SHEETS = ['aluminum', 'platinum']

StartupEvents.registry('item', event => {
  ALLOYS.forEach(m => {
    event.create('peacock:' + m + '_ingot').texture('peacock:item/' + m + '_ingot').tag('forge:ingots').tag('forge:ingots/' + m)
    event.create('peacock:' + m + '_nugget').texture('peacock:item/' + m + '_nugget').tag('forge:nuggets').tag('forge:nuggets/' + m)
  })
  SHEETS.forEach(m => {
    event.create('peacock:' + m + '_sheet').texture('peacock:item/' + m + '_sheet').tag('forge:plates').tag('forge:plates/' + m)
  })
})

StartupEvents.registry('block', event => {
  BLOCKS.forEach(m => {
    event.create('peacock:' + m + '_block')
      .textureAll('peacock:block/' + m + '_block')
      .soundType('metal')
      .hardness(5).resistance(6).requiresTool(true)
      .tagBlock('minecraft:mineable/pickaxe').tagBlock('minecraft:needs_stone_tool')
      .tagBoth('forge:storage_blocks').tagBoth('forge:storage_blocks/' + m)
  })
})

// ---------------------------------------------------------------- villager trades
// [profession, level, item, count the villager wants, emeralds paid]
const BUYS = [
  ['toolsmith', 2, 'create_ironworks:tin_ingot', 6, 1],
  ['weaponsmith', 2, 'geolosys:lead_ingot', 6, 1],
  ['cleric', 2, 'geolosys:silver_ingot', 3, 1],
  ['armorer', 3, 'geolosys:nickel_ingot', 4, 1],
  ['toolsmith', 3, 'geolosys:aluminum_ingot', 5, 1],
  ['cleric', 4, 'geolosys:platinum_ingot', 1, 2],
]
const BasicItemListing = Java.loadClass('net.minecraftforge.common.BasicItemListing')

ForgeEvents.onEvent('net.minecraftforge.event.village.VillagerTradesEvent', event => {
  var prof
  try { prof = String(event.getType().name()) } catch (e) { return }
  if (prof.indexOf(':') >= 0) prof = prof.substring(prof.indexOf(':') + 1)
  BUYS.forEach(b => {
    if (b[0] !== prof) return
    try {
      var list = event.getTrades().get(b[1])
      if (list) list.add(new BasicItemListing(Item.of(b[2], b[3]), Item.of('minecraft:emerald', b[4]), 12, 10 * b[1], 0.05))
    } catch (e) { console.warn('[peacock] metals: could not add the ' + b[2] + ' trade to ' + prof + ': ' + e) }
  })
})
})()
