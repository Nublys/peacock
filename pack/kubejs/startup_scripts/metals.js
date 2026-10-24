// Peacock — Geolosys metals get uses beyond Spartan weapons (2026-10-21).
//
// Aaron: "The geolosys mod adds many many ores that are ONLY used when crafting spartan weaponry." Before this,
// silver, nickel, platinum and aluminium fed nothing but Spartan weapons and shields, and lead only Supplementaries'
// spiky bomb. This script registers what the recipes in server_scripts/metals.js need (the villager trades are there):
//   • alloy ingots and nuggets: electrum (gold + silver), constantan (copper + nickel), invar (iron + nickel), each in
//     its forge:ingots/forge:nuggets tag, which also unlocks Spartan's electrum, constantan and invar weapons
//   • storage blocks for lead, silver, nickel, aluminium, platinum and the three alloys (tin, bronze and steel blocks
//     come from Create: Ironworks); a lead block also switches Supplementaries' cannonballs from iron to lead
//   • aluminium sheet (made Eureka balloons until 2026-10-24; kept for the ship/air replacement) and platinum sheet (a shorter precision mechanism); other sheets come from
//     Create and Ironworks, and none is made that nothing uses
// Textures are recoloured from Geolosys' ingots, Create's iron sheet and the vanilla iron block.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants.
;(() => {
const ALLOYS = ['electrum', 'constantan', 'invar']
const BLOCKS = ['lead', 'silver', 'nickel', 'aluminum', 'platinum', 'electrum', 'constantan', 'invar']
const SHEETS = ['aluminum', 'platinum', 'lead', 'invar']   // lead and invar sheets: 2026-10-24 (lead pipes, invar fittings)

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

})()
