// Peacock — two bounty boards on the capital's square (2026-10-20).
//
// The boards used to be a 3x3 plaza in the capital's house pool. Jigsaw tries a slot's elements one after another
// until one fits, so the plaza took every slot no house fitted, whatever its weight: 50+ boards along one street.
// Instead this places two boards once per world, beside the town bell when the capital's centre has one (CTOV's
// plains square does, at the well), else just outside the centre piece's corners (the fortified variant's keep has
// no bell). A spot must be open ground — the first solid block from the sky is ground, not a roof or a road — with
// two blocks of air above it. Runs 5 s after the first load; `peacock_capital_boards` in server persistentData
// marks it done (also when spawn has no capital, so it never rescans).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const DONE = 'peacock_capital_boards'
const BOARD = 'bountiful:bountyboard'
const GROUND = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|sand|red_sand|gravel|stone|cobblestone|mossy_cobblestone|stone_bricks|mossy_stone_bricks|cracked_stone_bricks|andesite|polished_andesite|smooth_stone|packed_mud|mud_bricks)$/
const SOFT = /^minecraft:(air|cave_air|grass|tall_grass|fern|large_fern|dandelion|poppy|blue_orchid|allium|azure_bluet|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony|snow|dead_bush)$/

function capitalStart(level) {
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var s = level.registryAccess().registryOrThrow(Registries.STRUCTURE).get(new ResourceLocation('peacock', 'capital'))
  if (!s) return null
  var start = level.structureManager().getStructureAt(level.getSharedSpawnPos(), s)
  return start && start.isValid() ? start : null
}

// y of the first air block above open ground in this column, or null (roof, road, water, nothing)
function openGround(level, x, z, top, bottom) {
  for (var y = top; y > bottom; y--) {
    var id = String(level.getBlock(x, y, z).id)
    if (SOFT.test(id)) continue
    if (!GROUND.test(id)) return null
    var above = String(level.getBlock(x, y + 1, z).id), above2 = String(level.getBlock(x, y + 2, z).id)
    return SOFT.test(above) && SOFT.test(above2) ? y + 1 : null
  }
  return null
}

function findBell(level, bb) {
  for (var x = bb.minX(); x <= bb.maxX(); x++)
    for (var z = bb.minZ(); z <= bb.maxZ(); z++)
      for (var y = bb.minY(); y <= bb.maxY(); y++)
        if (String(level.getBlock(x, y, z).id) === 'minecraft:bell') return { x: x, y: y, z: z }
  return null
}

function candidates(bb, bell) {
  var out = []
  if (bell) {
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
    for (var r = 3; r <= 7; r++)
      for (var i = 0; i < dirs.length; i++) out.push([bell.x + dirs[i][0] * r, bell.z + dirs[i][1] * r])
  }
  var m = 2
  out.push([bb.minX() - m, bb.minZ() - m], [bb.maxX() + m, bb.maxZ() + m], [bb.maxX() + m, bb.minZ() - m], [bb.minX() - m, bb.maxZ() + m])
  return out
}

function place(server) {
  var level = server.overworld()
  var log = m => console.info('[peacock] capital boards: ' + m)
  var start = capitalStart(level)
  if (!start) { log('no capital at world spawn — none placed'); return true }
  var bb = start.getPieces().get(0).getBoundingBox()
  var bell = findBell(level, bb)
  var top = bb.maxY() + 6, bottom = bb.minY() - 6
  var placed = []
  var list = candidates(bb, bell)
  for (var i = 0; i < list.length && placed.length < 2; i++) {
    var x = list[i][0], z = list[i][1]
    if (placed.length && Math.abs(placed[0][0] - x) + Math.abs(placed[0][2] - z) < 4) continue
    var y = openGround(level, x, z, top, bottom)
    if (y === null) continue
    level.getBlock(x, y, z).set(BOARD)
    placed.push([x, y, z])
  }
  log(placed.length + ' placed ' + (bell ? 'by the bell at ' + bell.x + ',' + bell.y + ',' + bell.z : '(no bell on the square)') +
      (placed.length ? ': ' + placed.map(p => p.join(',')).join(' and ') : ''))
  return true
}

ServerEvents.loaded(event => {
  var server = event.server
  if (server.persistentData.getBoolean(DONE)) return
  server.scheduleInTicks(100, () => {
    try { if (place(server)) server.persistentData.putBoolean(DONE, true) }
    catch (e) { console.error('[peacock] capital boards: failed — ' + e) }
  })
})
})()
