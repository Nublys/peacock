// Peacock — what caving is for.
//
// Geolosys removes every vanilla ore feature, so a cave has no ore in its walls. Caves are for the
// deep deposits (galena, kimberlite, azurite, cinnabar, limonite, beryl...) and for structures: YUNG's
// Better Mineshafts and Dungeons, Cataclysm's Ancient Factory and
// abandoned ruins. This script makes their chests pay in ore: every underground chest gets an extra
// pool of clusters (the same items the deposits drop), coal, and now and then a prospector's pick, plus
// a smaller pool of supplies (torches, rope, rails, bread, powder) so a chest is never only ore. The
// tables' own pools (tools, books, golden apples, horse armor...) are untouched.
// 2026-10-27, Aaron ("players need a reason to cave"): deeper chests pay better. A chest below Y 0 rolls an extra
// pool of the rare and deep metals, and one below Y -32 a further roll at diamonds and platinum (loot condition
// location_check on the chest's own position, so the same mineshaft pays more where it runs deep). Repurposed
// Structures' overworld mineshafts and dungeons are cave chests too.
// Switch: "caveLoot" in kubejs/config/peacock.json.

;(() => {
const CAVE_SW = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
if (CAVE_SW.caveLoot === false) return

// item, weight, [min, max]
const ORE_POOL = [
  ['geolosys:iron_cluster', 30, [3, 8]],
  ['geolosys:copper_cluster', 25, [3, 8]],
  ['minecraft:coal', 20, [4, 12]],
  ['geolosys:zinc_cluster', 12, [2, 5]],
  ['geolosys:gold_cluster', 10, [1, 3]],
  ['geolosys:tin_cluster', 8, [2, 4]],
  ['minecraft:lapis_lazuli', 8, [2, 6]],
  ['minecraft:redstone', 8, [3, 8]],
  ['geolosys:lead_cluster', 6, [1, 3]],
  ['geolosys:silver_cluster', 6, [1, 3]],
  ['geolosys:nickel_cluster', 4, [1, 2]],
  ['geolosys:aluminum_cluster', 4, [1, 3]],
  ['minecraft:diamond', 3, [1, 2]],
  ['minecraft:emerald', 3, [1, 1]],
  ['geolosys:platinum_cluster', 2, [1, 1]],
  ['geolosys:prospectors_pick', 2, [1, 1]],
]

// A second pool so a chest is never only ore: the things a settler actually wants underground.
// item, weight, [min, max]
const SUPPLY_POOL = [
  ['minecraft:torch', 20, [4, 12]],
  ['minecraft:bread', 14, [1, 4]],
  ['supplementaries:rope', 12, [2, 6]],
  ['minecraft:rail', 10, [4, 10]],
  ['minecraft:lantern', 8, [1, 2]],
  ['create:andesite_alloy', 8, [1, 3]],
  ['minecraft:gunpowder', 6, [1, 3]],
  ['musketmod:cartridge', 5, [2, 6]],
  ['minecraft:string', 6, [2, 5]],
  ['minecraft:arrow', 6, [4, 12]],
  ['minecraft:bucket', 3, [1, 1]],
  ['farmersdelight:cooking_pot', 2, [1, 1]],
  ['minecraft:name_tag', 2, [1, 1]],
  ['geolosys:field_manual', 1, [1, 1]],
]

// below Y 0: the metals the deep deposits hold, and the rarer ones; item, weight, [min, max]
const DEEP_POOL = [
  ['geolosys:silver_cluster', 10, [1, 3]],
  ['geolosys:nickel_cluster', 10, [1, 3]],
  ['geolosys:lead_cluster', 8, [2, 4]],
  ['geolosys:gold_cluster', 8, [1, 3]],
  ['geolosys:platinum_cluster', 6, [1, 2]],
  ['geolosys:tin_cluster', 6, [2, 4]],
  ['minecraft:diamond', 1, [1, 1]],
  ['minecraft:amethyst_shard', 6, [2, 6]],
]
// below Y -32: one more roll at the best of it
const DEEPEST_POOL = [
  ['geolosys:platinum_cluster', 5, [1, 2]],
  ['minecraft:diamond', 2, [1, 1]],
  ['geolosys:silver_cluster', 3, [2, 4]],
  ['minecraft:echo_shard', 1, [1, 1]],
]
const below = y => ({ condition: 'minecraft:location_check', predicate: { position: { y: { max: y } } } })

// table -> [rolls min, rolls max]; deeper and rarer places roll more
const CAVE_CHESTS = {
  'minecraft:chests/abandoned_mineshaft': [1, 3],
  'minecraft:chests/simple_dungeon': [1, 2],
  'minecraft:chests/stronghold_corridor': [1, 2],
  'minecraft:chests/stronghold_crossing': [1, 3],
  'minecraft:chests/ancient_city': [2, 4],
  'betterdungeons:skeleton_dungeon/chests/common': [1, 2],
  'betterdungeons:skeleton_dungeon/chests/middle': [2, 3],
  'betterdungeons:zombie_dungeon/chests/common': [1, 2],
  'betterdungeons:zombie_dungeon/chests/special': [2, 3],
  'betterdungeons:zombie_dungeon/chests/tombstone': [1, 2],
  'betterdungeons:small_dungeon/chests/loot_piles': [0, 1],
  'betterdungeons:spider_dungeon/chests/egg_room': [1, 2],
  'cataclysm:chests/abandoned': [1, 2],
  'cataclysm:chests/abandoned_treasure': [2, 3],
}
// Repurposed Structures' overworld mineshafts and dungeons (the only parts of it the pack keeps)
;['taiga', 'jungle', 'savanna', 'icy', 'desert', 'ocean', 'swamp', 'birch', 'dark_forest', 'stone'].forEach(b => { CAVE_CHESTS['repurposed_structures:chests/mineshafts/' + b] = [1, 3] })
;['jungle', 'badlands', 'deep', 'icy', 'desert', 'ocean', 'swamp', 'mushroom', 'snow', 'dark_forest'].forEach(b => { CAVE_CHESTS['repurposed_structures:chests/dungeons/' + b] = [1, 2] })
function addPool(table, rolls, items, condition) {
  table.addPool(pool => {
    pool.setUniformRolls(rolls[0], rolls[1])
    if (condition) pool.addCondition(condition)
    items.forEach(e => {
      pool.addItem(e[0], e[1]).addFunction({ function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: e[2][0], max: e[2][1] } })
    })
  })
}

ServerEvents.chestLootTables(event => {
  Object.keys(CAVE_CHESTS).forEach(tableId => {
    const rolls = CAVE_CHESTS[tableId]
    event.modify(tableId, table => {
      table.addPool(pool => {
        pool.setUniformRolls(rolls[0], rolls[1])
        ORE_POOL.forEach(e => {
          pool.addItem(e[0], e[1]).addFunction({ function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: e[2][0], max: e[2][1] } })
        })
      })
      table.addPool(pool => {
        pool.setUniformRolls(0, 2)
        SUPPLY_POOL.forEach(e => {
          pool.addItem(e[0], e[1]).addFunction({ function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min: e[2][0], max: e[2][1] } })
        })
      })
      // 0-1 rolls each: a mineshaft has dozens of chest minecarts, and there are two kinds of mineshaft (2026-10-27)
      addPool(table, [0, 1], DEEP_POOL, below(0))
      addPool(table, [0, 1], DEEPEST_POOL, below(-32))
    })
  })
  // Artifacts (2026-10-27) adds its accessories to the vanilla mineshaft table, which YUNG's mineshafts use; Repurposed
  // Structures' mineshafts have tables of their own, so they get the same Artifacts roll (its own 30% chance inside)
  ;['taiga', 'jungle', 'savanna', 'icy', 'desert', 'ocean', 'swamp', 'birch', 'dark_forest', 'stone'].forEach(b => {
    event.modify('repurposed_structures:chests/mineshafts/' + b, table => {
      table.addPool(pool => { pool.addLootTable('artifacts:inject/chests/abandoned_mineshaft') })
    })
  })
})
})()
