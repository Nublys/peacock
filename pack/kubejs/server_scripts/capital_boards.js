// Peacock — the capital's bounty boards, in a pavilion on the square (2026-10-20; pavilion 2026-10-21).
//
// The boards used to be a 3x3 plaza in the capital's house pool. Jigsaw tries a slot's elements one after another
// until one fits, so the plaza took every slot no house fitted, whatever its weight: 50+ boards along one street.
// Then two lone boards beside the bell, which were hard to spot (Aaron, 2026-10-21: "tuff to spot as they are a single
// block on the ground ... create buildings around them so they are easier to find"). Now: once per world, an open
// 7x7 timber pavilion near the town bell, with both boards back to back on its centre post.
//
//   stone-brick plinth, spruce floor; spruce log corner posts and beams; a steep red nether-brick hip roof; six
//   hanging lanterns; a "Bounties" hanging sign over each open side (north and south); spruce railings east and
//   west; a flagpole on the ridge with a yellow banner (red diamond, red border), the same in every world, seen
//   across town and on the Distant Horizons skyline.
//
// Site: the first 7x7 patch of open, nearly flat ground (every column's first solid block from the sky is ground,
// not a roof or a road; at most 2 blocks of rise) on rings around the bell (6 to 20 blocks), then around the
// capital's centre piece out to 48, then around world spawn. The patch is levelled: foundation under low columns,
// everything from the floor up cleared. With no site anywhere, two bare boards beside spawn as before.
// Flags in server persistentData: `peacock_capital_boards` (boards placed, the 2026-10-20 version) and
// `peacock_board_pavilion`. A world that already had the bare boards gets the pavilion once: the bare boards within
// 48 blocks of the square are removed first (their bounties start over, which on a new world is nothing).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const DONE = 'peacock_capital_boards'
const PAVILION = 'peacock_board_pavilion'
const BOARD = 'bountiful:bountyboard'
const GROUND = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|sand|red_sand|gravel|stone|cobblestone|mossy_cobblestone|stone_bricks|mossy_stone_bricks|cracked_stone_bricks|andesite|polished_andesite|smooth_stone|packed_mud|mud_bricks|granite|diorite|tuff|calcite|clay|snow_block)$/
const SOFT = /^minecraft:(air|cave_air|grass|tall_grass|fern|large_fern|dandelion|poppy|blue_orchid|allium|azure_bluet|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony|snow|dead_bush|sweet_berry_bush|pink_petals)$/
const FILLABLE = /^minecraft:(air|cave_air|water|grass|tall_grass|fern|large_fern|snow)$/
const R = 3   // half width: the pavilion is 7x7

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

// centre points on rings: 16 directions per ring
function rings(cx, cz, from, to, step, out) {
  var dirs = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2], [1, -2], [2, -1]]
  for (var r = from; r <= to; r += step)
    for (var k = 0; k < dirs.length; k++) {
      var len = Math.sqrt(dirs[k][0] * dirs[k][0] + dirs[k][1] * dirs[k][1])
      out.push([cx + Math.round(dirs[k][0] / len * r), cz + Math.round(dirs[k][1] / len * r)])
    }
  return out
}

// floor height for a 7x7 patch centred here, or null when it is not open, nearly flat ground
function site(level, cx, cz, top, bottom) {
  var ys = []
  for (var dx = -R; dx <= R; dx++)
    for (var dz = -R; dz <= R; dz++) {
      var y = openGround(level, cx + dx, cz + dz, top, bottom)
      if (y === null) return null
      ys.push(y)
    }
  ys.sort((a, b) => a - b)
  if (ys[ys.length - 1] - ys[0] > 2) return null
  return ys[ys.length >> 1]
}

function set(level, x, y, z, id, props) {
  if (props) level.getBlock(x, y, z).set(id, props)
  else level.getBlock(x, y, z).set(id)
}

// stairs on a roof ring: the high side faces the middle
function roofFacing(dx, dz, r) {
  if (dz === r) return 'north'
  if (dz === -r) return 'south'
  return dx === r ? 'west' : 'east'
}

function build(server, level, cx, y0, cz) {
  var x, y, z, dx, dz
  // clear the space, lay the plinth and floor, and fill under it where the ground dips
  for (dx = -R; dx <= R; dx++)
    for (dz = -R; dz <= R; dz++) {
      x = cx + dx; z = cz + dz
      for (y = y0; y <= y0 + 12; y++) set(level, x, y, z, 'minecraft:air')
      var edge = Math.abs(dx) === R || Math.abs(dz) === R
      set(level, x, y0 - 1, z, edge ? 'minecraft:stone_bricks' : 'minecraft:spruce_planks')
      for (y = y0 - 2; y > y0 - 8 && FILLABLE.test(String(level.getBlock(x, y, z).id)); y--) set(level, x, y, z, 'minecraft:cobblestone')
    }
  // corner posts (5 high, to the beam line) and the centre post up to the roof cap
  ;[[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(c => {
    for (var py = y0; py <= y0 + 4; py++) set(level, cx + c[0], py, cz + c[1], 'minecraft:spruce_log', { axis: 'y' })
  })
  for (y = y0; y <= y0 + 5; y++) set(level, cx, y, cz, 'minecraft:spruce_log', { axis: 'y' })
  // beams between the posts
  for (var d = -1; d <= 1; d++) {
    set(level, cx + d, y0 + 4, cz - 2, 'minecraft:spruce_log', { axis: 'x' })
    set(level, cx + d, y0 + 4, cz + 2, 'minecraft:spruce_log', { axis: 'x' })
    set(level, cx - 2, y0 + 4, cz + d, 'minecraft:spruce_log', { axis: 'z' })
    set(level, cx + 2, y0 + 4, cz + d, 'minecraft:spruce_log', { axis: 'z' })
  }
  // railings on the east and west sides; north and south stay open
  for (d = -1; d <= 1; d++) {
    set(level, cx - 2, y0, cz + d, 'minecraft:spruce_fence', { north: 'true', south: 'true', east: 'false', west: 'false', waterlogged: 'false' })
    set(level, cx + 2, y0, cz + d, 'minecraft:spruce_fence', { north: 'true', south: 'true', east: 'false', west: 'false', waterlogged: 'false' })
  }
  // hip roof: rings at |d| = 3, 2, 1, corners first so the edge stairs give them their outer shape, then the cap
  ;[[3, y0 + 4], [2, y0 + 5], [1, y0 + 6]].forEach(ring => {
    var r = ring[0], ry = ring[1], cells = []
    for (var ix = -r; ix <= r; ix++)
      for (var iz = -r; iz <= r; iz++)
        if (Math.abs(ix) === r || Math.abs(iz) === r) cells.push([ix, iz, Math.abs(ix) === r && Math.abs(iz) === r ? 0 : 1])
    cells.sort((a, b) => a[2] - b[2])
    cells.forEach(c => set(level, cx + c[0], ry, cz + c[1], 'minecraft:red_nether_brick_stairs',
      { facing: roofFacing(c[0], c[1], r), half: 'bottom', shape: 'straight', waterlogged: 'false' }))
  })
  set(level, cx, y0 + 6, cz, 'minecraft:red_nether_bricks')
  // flagpole and banner
  for (y = y0 + 7; y <= y0 + 10; y++) set(level, cx, y, cz, 'minecraft:spruce_fence')
  var cmd = c => server.runCommandSilent(c)
  cmd('setblock ' + cx + ' ' + (y0 + 11) + ' ' + cz + ' minecraft:yellow_banner[rotation=0]{Patterns:[{Pattern:"mr",Color:14},{Pattern:"bo",Color:14}]} replace')
  // lanterns under the beams, and a sign over each open side
  ;[[-1, -2], [1, -2], [-1, 2], [1, 2], [-2, 0], [2, 0]].forEach(l => set(level, cx + l[0], y0 + 3, cz + l[1], 'minecraft:lantern', { hanging: 'true', waterlogged: 'false' }))
  var text = "messages:['{\"text\":\"\"}','{\"text\":\"Bounties\",\"bold\":true}','{\"text\":\"Work for pay\"}','{\"text\":\"\"}']"
  ;[-2, 2].forEach(sz => cmd('setblock ' + cx + ' ' + (y0 + 3) + ' ' + (cz + sz) +
    ' minecraft:spruce_hanging_sign[rotation=0]{front_text:{' + text + '},back_text:{' + text + '},is_waxed:1b} replace'))
  // the two boards, back to back on the centre post
  set(level, cx, y0, cz - 1, BOARD)
  set(level, cx, y0, cz + 1, BOARD)
  return [[cx, y0, cz - 1], [cx, y0, cz + 1]]
}

// a world from 2026-10-20 has two bare boards near the square: take them up before the pavilion goes in
function removeBareBoards(level, cx, cz, top, bottom) {
  var found = []
  for (var x = cx - 48; x <= cx + 48; x++)
    for (var z = cz - 48; z <= cz + 48; z++)
      for (var y = bottom; y <= top; y++)
        if (String(level.getBlock(x, y, z).id) === BOARD) { set(level, x, y, z, 'minecraft:air'); found.push([x, y, z]) }
  return found
}

// last resort, so there are always boards: beside the world spawn, on whatever stands there
function lastResort(level, placed) {
  var sp = level.getSharedSpawnPos()
  var spots = [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, -3]]
  for (var i = 0; i < spots.length && placed.length < 2; i++) {
    var x = sp.getX() + spots[i][0], z = sp.getZ() + spots[i][1]
    for (var y = sp.getY() + 8; y > sp.getY() - 8; y--) {
      var id = String(level.getBlock(x, y, z).id)
      if (SOFT.test(id)) continue
      if (/water|lava/.test(id)) break
      set(level, x, y + 1, z, BOARD)
      placed.push([x, y + 1, z])
      break
    }
  }
}

function place(server) {
  var level = server.overworld()
  var log = m => console.info('[peacock] capital boards: ' + m)
  var sp = level.getSharedSpawnPos()
  var start = capitalStart(level)
  var list = [], top, bottom, bell = null, mid = { x: sp.getX(), z: sp.getZ() }
  if (start) {
    // getPieces() is a JDK immutable list (ImmutableCollections$ListN), whose members Rhino may not reflect on
    // ("IllegalAccessException … ListN", 2026-10-20 14:34): copy it into an ArrayList first
    var ArrayList = Java.loadClass('java.util.ArrayList')
    var pieces = new ArrayList(start.getPieces())
    if (!pieces.isEmpty()) {
      var bb = pieces.get(0).getBoundingBox()
      bell = findBell(level, bb)
      top = bb.maxY() + 8; bottom = bb.minY() - 8
      mid = { x: (bb.minX() + bb.maxX()) >> 1, z: (bb.minZ() + bb.maxZ()) >> 1 }
      if (bell) rings(bell.x, bell.z, 6, 20, 1, list)
      rings(mid.x, mid.z, 8, 48, 2, list)
    }
  }
  if (top === undefined) { top = sp.getY() + 24; bottom = sp.getY() - 16 }
  rings(sp.getX(), sp.getZ(), 6, 32, 2, list)

  // the bare boards stood on open ground beside the bell (or on the rings around the square): a band around the
  // bell's height is enough, and keeps this one-off scan short
  var removed = server.persistentData.getBoolean(DONE)
    ? removeBareBoards(level, bell ? bell.x : mid.x, bell ? bell.z : mid.z, bell ? bell.y + 12 : top, bell ? bell.y - 12 : bottom) : []
  if (removed.length) log('took up ' + removed.length + ' bare board(s): ' + removed.map(p => p.join(',')).join(' and '))

  for (var i = 0; i < list.length; i++) {
    var y0 = site(level, list[i][0], list[i][1], top, bottom)
    if (y0 === null) continue
    var boards = build(server, level, list[i][0], y0, list[i][1])
    log('pavilion at ' + list[i][0] + ',' + y0 + ',' + list[i][1] + (bell ? ' by the bell at ' + bell.x + ',' + bell.y + ',' + bell.z : '') +
        '; boards ' + boards.map(p => p.join(',')).join(' and '))
    return true
  }
  var placed = []
  lastResort(level, placed)
  log('no open 7x7 ground near the square — ' + placed.length + ' bare board(s) beside spawn' + (placed.length ? ': ' + placed.map(p => p.join(',')).join(' and ') : ''))
  return true
}

ServerEvents.loaded(event => {
  var server = event.server
  if (server.persistentData.getBoolean(PAVILION)) return
  server.scheduleInTicks(100, () => {
    try {
      if (place(server)) { server.persistentData.putBoolean(DONE, true); server.persistentData.putBoolean(PAVILION, true) }
    } catch (e) { console.error('[peacock] capital boards: failed — ' + e) }
  })
})
})()
