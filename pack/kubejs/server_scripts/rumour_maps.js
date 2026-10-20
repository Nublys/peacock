// Peacock — rumour maps: structure loot carries maps to the bosses' homes.
//
// A rumour map is a vanilla exploration map (minecraft:exploration_map) pointed at a structure tag
// from the Paxi datapack (data/peacock/tags/worldgen/structure/rumour_*.json). Chests in the places a
// settler already visits (outposts, illager forts, cartographer rooms, Create workshops) have a chance
// to hold one. The ladder reads: outposts and cartographers → Tier 1–2 homes; illager forts and the
// Umvuthana grove → Tier 3; the labyrinth and the monastery → Tier 4.
//
// Cost note: the map's structure search runs on the server thread when the chest's loot generates.
// Search radii are kept small for the dense structure sets (Mowzie's, spacing 25 chunks) and wider
// for the sparse ones (Cataclysm, spacing 80–112), so each search checks only a handful of cells.
// If outpost chests ever cause visible stalls, set "rumourMaps": false in kubejs/config/peacock.json.

// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
const SWITCHES = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const RUMOUR_MAPS_ON = SWITCHES.rumourMaps !== false

// id -> [display name, search radius in chunks, decoration]
const RUMOURS = {
  wrought_chamber: ['Rumour: the Iron Knight\'s chamber', 40, 'red_x'],
  frostmaw:        ['Rumour: the sleeping giant of the snows', 40, 'red_x'],
  umvuthana_grove: ['Rumour: the sun chief\'s grove', 40, 'red_x'],
  monastery:       ['Rumour: the monastery on the peaks', 40, 'red_x'],
  illager_fort:    ['Rumour: the illager fort', 60, 'target_point'],
  cursed_pyramid:  ['Rumour: the cursed pyramid', 100, 'red_x'],
  frosted_prison:  ['Rumour: the frosted prison', 100, 'red_x'],
  ancient_factory: ['Rumour: the factory under the ground', 120, 'red_x'],
  sunken_city:     ['Rumour: the sunken city', 120, 'red_x'],
  acropolis:       ['Rumour: the acropolis in the warm sea', 100, 'red_x'],
  survivors_tower: ['Rumour: smoke from a new tower', 20, 'target_point'],
}

// loot table -> [chance that the chest holds a rumour at all, [rumour ids with equal weight]]
const CHESTS = {
  'minecraft:chests/pillager_outpost':                [0.5,  ['wrought_chamber', 'umvuthana_grove', 'frostmaw', 'illager_fort']],
  'minecraft:chests/village/village_cartographer':    [0.3,  ['wrought_chamber', 'umvuthana_grove', 'frostmaw', 'monastery']],
  'create_structures:chests/village/village_windmill':[0.35, ['wrought_chamber']],
  'illagerinvasion:chests/illusioner_tower_stairs':   [0.5,  ['illager_fort']],
  'illagerinvasion:chests/sorcerer_hut':              [0.3,  ['illager_fort', 'frostmaw']],
  'illagerinvasion:chests/illager_fort_tower':        [0.4,  ['cursed_pyramid', 'frosted_prison', 'sunken_city']],
  'illagerinvasion:chests/illager_fort_ground':       [0.25, ['cursed_pyramid', 'frosted_prison']],
  'mowziesmobs:chests/umvuthana_grove_chest':         [0.4,  ['cursed_pyramid', 'illager_fort']],
  'mowziesmobs:chests/monastery_chest':               [0.5,  ['frosted_prison', 'ancient_factory']],
  'illagerinvasion:chests/labyrinth':                 [0.3,  ['ancient_factory', 'acropolis']],
  'cataclysm:chests/desert_treasure':                 [0.5,  ['ancient_factory', 'sunken_city']],
  'cataclysm:chests/frosted_prison_treasure':         [0.5,  ['ancient_factory', 'acropolis']],
}

ServerEvents.chestLootTables(event => {
  if (!RUMOUR_MAPS_ON) { console.info('[peacock] rumour maps disabled by kubejs/config/peacock.json'); return }
  Object.keys(CHESTS).forEach(tableId => {
    const chance = CHESTS[tableId][0], ids = CHESTS[tableId][1]
    event.modify(tableId, table => {
      table.addPool(pool => {
        pool.setUniformRolls(1, 1)
        pool.addCondition({ condition: 'minecraft:random_chance', chance: chance })
        ids.forEach(id => {
          const r = RUMOURS[id]
          pool.addItem('minecraft:map')
            .addFunction({
              function: 'minecraft:exploration_map',
              destination: 'peacock:rumour_' + id,
              decoration: r[2],
              zoom: 1,
              search_radius: r[1],
              skip_existing_chunks: false,
            })
            .addFunction({ function: 'minecraft:set_name', name: { text: r[0], italic: false, color: 'gold' } })
        })
      })
    })
  })
})
})()
