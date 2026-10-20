// Peacock — found writings and sealed rumours.
//
// 1. Journals. The story of the fall is never told outright; it is pieced together from written books
//    left in the ruins. kubejs/config/journals.json (generated from tools/data/journals.json) holds them.
//    Chests in the dead places get a chance of one: ruined houses most of all, then plunder rooms,
//    mineshafts, dungeons and outposts. Tier 1 pages turn up often, tier 3 rarely — the town bounty
//    boards (Archivist's Records decree) are the sure way to the deeper pages.
// 2. Sealed Rumour (peacock:rumour_voucher). A bounty-board reward with NBT {rumour:"<id>"}; right-click
//    unseals it into the exploration map from loot table peacock:rumour/<id> (same tags as rumour_maps.js).
//    The loot is given by a server-side command so no player permission is involved.
//
// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
const DATA = (() => { try { return JsonIO.read('kubejs/config/journals.json') || {} } catch (e) { return {} } })()
const JOURNALS = DATA.journals || []
const TIER_WEIGHT = { 1: 6, 2: 3, 3: 1 }

// loot table -> chance that the chest holds one journal
const CHESTS = {
  'peacock:chests/ruin_house':                       0.22,
  'peacock:chests/plunder':                          0.12,
  'minecraft:chests/abandoned_mineshaft':            0.08,
  'minecraft:chests/simple_dungeon':                 0.10,
  'minecraft:chests/pillager_outpost':               0.12,
  'minecraft:chests/stronghold_library':             0.25,
  'betterdungeons:zombie_dungeon/chests/special':    0.12,
  'betterdungeons:skeleton_dungeon/chests/middle':   0.10,
  'cataclysm:chests/abandoned':                      0.10,
  'illagerinvasion:chests/illusioner_tower_stairs':  0.15,
}

function bookNbt(j) {
  return { title: j.title, author: j.author, generation: 1, resolved: true, pages: j.pages }
}

ServerEvents.chestLootTables(event => {
  if (!JOURNALS.length) { console.warn('[peacock] journals: kubejs/config/journals.json missing or empty'); return }
  Object.keys(CHESTS).forEach(tableId => {
    event.modify(tableId, table => {
      table.addPool(pool => {
        pool.setUniformRolls(1, 1)
        pool.addCondition({ condition: 'minecraft:random_chance', chance: CHESTS[tableId] })
        JOURNALS.forEach(j => pool.addItem(Item.of('minecraft:written_book', bookNbt(j)), TIER_WEIGHT[j.tier] || 1))
      })
    })
  })
  console.info('[peacock] journals: ' + JOURNALS.length + ' writings added to ' + Object.keys(CHESTS).length + ' chest tables')
})

const RUMOUR_NAMES = {
  wrought_chamber: 'the Iron Knight\'s chamber', frostmaw: 'the sleeping giant of the snows',
  umvuthana_grove: 'the sun chief\'s grove', monastery: 'the monastery on the peaks', illager_fort: 'the illager fort',
  cursed_pyramid: 'the cursed pyramid', frosted_prison: 'the frosted prison', ancient_factory: 'the factory under the ground',
  sunken_city: 'the sunken city', acropolis: 'the acropolis in the warm sea',
  survivors_tower: 'smoke from a new tower',
}

ItemEvents.rightClicked('peacock:rumour_voucher', event => {
  const player = event.player, item = event.item
  if (player.level.isClientSide()) return
  const id = item.nbt ? String(item.nbt.getString('rumour')) : ''
  if (!RUMOUR_NAMES[id]) { player.tell(Text.translate('peacock.rumour.blank')); return }
  // server-side give: no permission check on the player, and the map's structure search runs once here
  event.server.runCommandSilent('loot give ' + player.username + ' loot peacock:rumour/' + id)
  item.shrink(1)
  player.tell(Text.translate('peacock.rumour.unsealed', Text.gold(RUMOUR_NAMES[id])))
  player.swing()
})
})()
