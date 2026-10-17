// Peacock — what caving is for.
//
// Geolosys removes every vanilla ore feature, so a cave has no ore in its walls. Caves are for the
// deep deposits (galena, kimberlite, azurite, cinnabar, limonite, beryl...) and for structures: YUNG's
// Better Mineshafts and Dungeons, Stoneholm's underground villages, Cataclysm's Ancient Factory and
// abandoned ruins. This script makes their chests pay in ore: every underground chest gets an extra
// pool of clusters (the same items the deposits drop), coal, and now and then a prospector's pick.
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
  'betterdungeons:small_dungeon/chests/loot_piles': [1, 1],
  'betterdungeons:spider_dungeon/chests/egg_room': [1, 2],
  'stoneholm:miner': [2, 4],
  'stoneholm:armorer': [1, 2],
  'stoneholm:weaponsmith': [1, 2],
  'stoneholm:crypt': [1, 2],
  'stoneholm:forbidden_knowledge': [1, 2],
  'cataclysm:chests/abandoned': [1, 2],
  'cataclysm:chests/abandoned_treasure': [2, 3],
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
    })
  })
})
})()
