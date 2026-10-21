// Peacock — the capital's bounty boards, in a pavilion near the bell (2026-10-20; pavilion 2026-10-21).
//
// The boards used to be a 3x3 plaza in the capital's house pool. Jigsaw tries a slot's elements one after another
// until one fits, so the plaza took every slot no house fitted, whatever its weight: 50+ boards along one street.
// Then two lone boards beside the bell, hard to spot (Aaron, 2026-10-21: "tuff to spot as they are a single block on
// the ground ... create buildings around them"). Now, once per world, an open 7x7 pavilion with both boards back to
// back on its centre post: stone-brick plinth, oak floor, oak log posts and beams, a red nether-brick hip roof, six
// hanging lanterns, a "Bounties" hanging sign over the north and south openings, oak railings east and west, and a
// flagpole with a yellow banner (red diamond and border) that reads from across town and on the DH skyline.
//
// Several pavilions per capital (Aaron, 2026-10-21 15:06: "The pavilions just need to be in the town, and there should
// be multiple to make them easier to find"): `boardPavilions` in peacock.json (default 3), at least 32 blocks apart,
// nearest the bell first. A spot must be inside the hull of the town's pieces (capital_wall.js walls outside it),
// clear of houses (piece bounding boxes plus one; the town centre piece, the square, counts as open ground; paths
// are fine, the pavilion is open north and south), and open ground in all 49 columns (grass, dirt, stone, sand, path,
// farmland…; leaves, flowers and crops pass; no log, water or block standing on it), with at most 3, then 6, then 8
// blocks of rise (the last step also allows the town's edge). The patch is levelled. Each step that comes up short
// logs why spots were passed over. No capital: the same around world spawn. No room anywhere: bare boards by spawn,
// tried again next start.
// persistentData: `peacock_board_pavilion_sites` (those standing), `peacock_board_pavilion_site` (the one being
// built, so a failed build is finished in place), `peacock_board_pavilions_v4` (done). Worlds from the one-pavilion
// versions keep theirs and get the rest; bare boards from a fallback are taken up first.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// every loop variable declared before its loops.
;(() => {
const DONE = 'peacock_capital_boards'
const PAVILION = 'peacock_board_pavilion'
const V3 = 'peacock_board_pavilion_v3'   // the one-pavilion version's done flag
const SITE = 'peacock_board_pavilion_site'
const BOARD = 'bountiful:bountyboard'
const GROUND = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|sand|red_sand|gravel|stone|cobblestone|mossy_cobblestone|stone_bricks|mossy_stone_bricks|cracked_stone_bricks|andesite|polished_andesite|smooth_stone|packed_mud|mud_bricks|granite|diorite|tuff|calcite|clay|snow_block|dirt_path|farmland)$/
const SOFT = /^minecraft:(air|cave_air|grass|tall_grass|fern|large_fern|dandelion|poppy|blue_orchid|allium|azure_bluet|red_tulip|orange_tulip|white_tulip|pink_tulip|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony|snow|dead_bush|sweet_berry_bush|pink_petals|[a-z_]+_leaves|vine|glow_lichen|wheat|carrots|potatoes|beetroots)$/
const FILLABLE = /^minecraft:(air|cave_air|water|grass|tall_grass|fern|large_fern|snow)$/
const R = 3        // half width: the pavilion is 7x7

function capitalStart(level) {
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var s = level.registryAccess().registryOrThrow(Registries.STRUCTURE).get(new ResourceLocation('peacock', 'capital'))
  if (!s) return null
  var start = level.structureManager().getStructureAt(level.getSharedSpawnPos(), s)
  return start && start.isValid() ? start : null
}

function findBell(level, bb) {
  var x, y, z
  for (x = bb.minX(); x <= bb.maxX(); x++)
    for (z = bb.minZ(); z <= bb.maxZ(); z++)
      for (y = bb.minY(); y <= bb.maxY(); y++)
        if (String(level.getBlock(x, y, z).id) === 'minecraft:bell') return { x: x, y: y, z: z }
  return null
}

// the capital's pieces as boxes: buildings and roads (as capital_wall.js reads them)
function layout(start) {
  var ArrayList = Java.loadClass('java.util.ArrayList')
  var pieces = new ArrayList(start.getPieces())   // a JDK immutable list Rhino cannot reflect on: copy first
  var out = { buildings: [], roads: [], first: null, square: null, top: -9999 }
  for (var i = 0; i < pieces.size(); i++) {
    var p = pieces.get(i)
    var name = ''
    try { name = String(p.getElement()) } catch (e) { name = '' }
    var b = p.getBoundingBox()
    var box = { x0: b.minX(), x1: b.maxX(), z0: b.minZ(), z1: b.maxZ() }
    if (b.maxY() > out.top) out.top = b.maxY()
    // the first piece is the town centre: the square itself, the open ground the pavilion belongs on. It counts for
    // the hull but is not a building to keep away from (2026-10-21 14:09: with it, nothing near the bell qualified)
    if (i === 0) { out.first = b; out.square = box; continue }
    if (name.indexOf('/roads/') >= 0) out.roads.push(box)
    else if (name.indexOf('/villager') < 0) out.buildings.push(box)
  }
  return out
}

// convex hull (monotone chain) of points [x, z], counter-clockwise
function hull(points) {
  var pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  var cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  var lower = [], upper = [], i
  for (i = 0; i < pts.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop()
    lower.push(pts[i])
  }
  for (i = pts.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop()
    upper.push(pts[i])
  }
  upper.pop(); lower.pop()
  return lower.concat(upper)
}

function insideHull(h, x, z) {
  if (h.length < 3) return true
  for (var i = 0; i < h.length; i++) {
    var a = h[i], b = h[(i + 1) % h.length]
    if ((b[0] - a[0]) * (z - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false
  }
  return true
}

// y of the first air above open ground in this column, or null (log, water, a block standing on it, nothing)
function openGround(level, x, z, top, bottom) {
  for (var y = top; y > bottom; y--) {
    var id = String(level.getBlock(x, y, z).id)
    if (SOFT.test(id)) continue
    return GROUND.test(id) ? y + 1 : null
  }
  return null
}

// floor height for the 7x7 patch centred here, or null; the centre and corners first, so most spots fail fast
function site(level, cx, cz, top, bottom, rise, why) {
  var ys = [], cells = [[0, 0], [-R, -R], [R, -R], [-R, R], [R, R]], dx, dz
  for (dx = -R; dx <= R; dx++)
    for (dz = -R; dz <= R; dz++)
      if (!(dx === 0 && dz === 0) && !(Math.abs(dx) === R && Math.abs(dz) === R)) cells.push([dx, dz])
  for (var i = 0; i < cells.length; i++) {
    var y = openGround(level, cx + cells[i][0], cz + cells[i][1], top, bottom)
    if (y === null) { why.blocked++; return null }
    ys.push(y)
    if (Math.max.apply(null, ys) - Math.min.apply(null, ys) > rise) { why.steep++; return null }
  }
  ys.sort((a, b) => a - b)
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
  // every loop variable declared up here: this Rhino scopes `for (var d ...)` to its loop, so a second
  // `for (d = ...)` threw "Assignment to undeclared variable d" mid-build on 2026-10-21 (posts and beams, no roof)
  var x, y, z, dx, dz, d
  // clear the space, lay the plinth and floor, and fill under it where the ground dips
  for (dx = -R; dx <= R; dx++)
    for (dz = -R; dz <= R; dz++) {
      x = cx + dx; z = cz + dz
      for (y = y0; y <= y0 + 12; y++) set(level, x, y, z, 'minecraft:air')
      var edge = Math.abs(dx) === R || Math.abs(dz) === R
      set(level, x, y0 - 1, z, edge ? 'minecraft:stone_bricks' : 'minecraft:oak_planks')
      for (y = y0 - 2; y > y0 - 8 && FILLABLE.test(String(level.getBlock(x, y, z).id)); y--) set(level, x, y, z, 'minecraft:cobblestone')
    }
  // corner posts (5 high, to the beam line) and the centre post up to the roof cap
  ;[[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(c => {
    for (var py = y0; py <= y0 + 4; py++) set(level, cx + c[0], py, cz + c[1], 'minecraft:oak_log', { axis: 'y' })
  })
  for (y = y0; y <= y0 + 5; y++) set(level, cx, y, cz, 'minecraft:oak_log', { axis: 'y' })
  // beams between the posts
  for (d = -1; d <= 1; d++) {
    set(level, cx + d, y0 + 4, cz - 2, 'minecraft:oak_log', { axis: 'x' })
    set(level, cx + d, y0 + 4, cz + 2, 'minecraft:oak_log', { axis: 'x' })
    set(level, cx - 2, y0 + 4, cz + d, 'minecraft:oak_log', { axis: 'z' })
    set(level, cx + 2, y0 + 4, cz + d, 'minecraft:oak_log', { axis: 'z' })
  }
  // railings on the east and west sides; north and south stay open
  for (d = -1; d <= 1; d++) {
    set(level, cx - 2, y0, cz + d, 'minecraft:oak_fence', { north: 'true', south: 'true', east: 'false', west: 'false', waterlogged: 'false' })
    set(level, cx + 2, y0, cz + d, 'minecraft:oak_fence', { north: 'true', south: 'true', east: 'false', west: 'false', waterlogged: 'false' })
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
  for (y = y0 + 7; y <= y0 + 10; y++) set(level, cx, y, cz, 'minecraft:oak_fence')
  var cmd = c => server.runCommandSilent(c)
  cmd('setblock ' + cx + ' ' + (y0 + 11) + ' ' + cz + ' minecraft:yellow_banner[rotation=0]{Patterns:[{Pattern:"mr",Color:14},{Pattern:"bo",Color:14}]} replace')
  // lanterns under the beams, and a sign over each open side
  ;[[-1, -2], [1, -2], [-1, 2], [1, 2], [-2, 0], [2, 0]].forEach(l => set(level, cx + l[0], y0 + 3, cz + l[1], 'minecraft:lantern', { hanging: 'true', waterlogged: 'false' }))
  var text = "messages:['{\"text\":\"\"}','{\"text\":\"Bounties\",\"bold\":true}','{\"text\":\"Work for pay\"}','{\"text\":\"\"}']"
  ;[-2, 2].forEach(sz => cmd('setblock ' + cx + ' ' + (y0 + 3) + ' ' + (cz + sz) +
    ' minecraft:oak_hanging_sign[rotation=0]{front_text:{' + text + '},back_text:{' + text + '},is_waxed:1b} replace'))
  // the two boards, back to back on the centre post
  set(level, cx, y0, cz - 1, BOARD)
  set(level, cx, y0, cz + 1, BOARD)
  return [[cx, y0, cz - 1], [cx, y0, cz + 1]]
}

// the frame of an unfinished pavilion (the 2026-10-21 run stopped after posts and beams): a log centre post on a
// plank floor with log corner posts at (±2, ±2). Returns its floor height and centre, or null
function unfinished(level, cx, cz, top, bottom) {
  var LOG = /^minecraft:(oak|spruce)_log$/
  for (var x = cx - 48; x <= cx + 48; x++)
    for (var z = cz - 48; z <= cz + 48; z++)
      for (var y = bottom; y <= top; y++) {
        if (!LOG.test(String(level.getBlock(x, y, z).id))) continue
        if (!/^minecraft:(oak|spruce)_planks$/.test(String(level.getBlock(x, y - 1, z).id))) continue
        if (LOG.test(String(level.getBlock(x - 2, y, z - 2).id)) && LOG.test(String(level.getBlock(x + 2, y, z + 2).id)) &&
            LOG.test(String(level.getBlock(x + 2, y, z - 2).id)) && LOG.test(String(level.getBlock(x - 2, y, z + 2).id)))
          return [x, y, z]
      }
  return null
}

// a world from 2026-10-20 has two bare boards near the square: take them up before the pavilion goes in
function removeBareBoards(level, cx, cz, top, bottom, reach) {
  var found = []
  for (var x = cx - reach; x <= cx + reach; x++)
    for (var z = cz - reach; z <= cz + reach; z++)
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

// How many pavilions a capital gets (Aaron, 2026-10-21 15:06: "The pavilions just need to be in the town, and there
// should be multiple to make them easier to find"): `boardPavilions` in kubejs/config/peacock.json, default 3, at
// least SPACING blocks apart, anywhere in the town.
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const COUNT = (typeof CFG.boardPavilions === 'number' && CFG.boardPavilions >= 1) ? Math.floor(CFG.boardPavilions) : 3
const SPACING = 32
const SITES = 'peacock_board_pavilion_sites'    // "x,y,z;x,y,z" of the pavilions standing
const V4 = 'peacock_board_pavilions_v4'         // set once the town has its pavilions (or the town has no more room)
// Where a pavilion may go, loosened step by step: inside the hull of the town's pieces (the wall stays outside it),
// clear of houses (their bounding boxes plus one), paths allowed (the pavilion is open north and south), with at
// most `rise` blocks between the highest and lowest column; the last step also allows the edge outside the hull.
const STEPS = [{ rise: 3, hull: true }, { rise: 6, hull: true }, { rise: 8, hull: false }]

// summed-area table of the cells covered by these boxes (each grown by one block), over the search area:
// any 7x7 is then checked in constant time instead of against every piece (~380 boxes in a capital)
function coverage(boxes, ox, oz, nx, nz) {
  var sum = [], cell = [], x, z, i
  for (i = 0; i < (nx + 1) * (nz + 1); i++) sum.push(0)
  for (i = 0; i < nx * nz; i++) cell.push(0)
  boxes.forEach(b => {
    var ax = Math.max(0, b.x0 - 1 - ox), bx = Math.min(nx - 1, b.x1 + 1 - ox)
    var az = Math.max(0, b.z0 - 1 - oz), bz = Math.min(nz - 1, b.z1 + 1 - oz)
    for (var gx = ax; gx <= bx; gx++) for (var gz = az; gz <= bz; gz++) cell[gx * nz + gz] = 1
  })
  for (x = 0; x < nx; x++)
    for (z = 0; z < nz; z++)
      sum[(x + 1) * (nz + 1) + z + 1] = cell[x * nz + z] + sum[x * (nz + 1) + z + 1] + sum[(x + 1) * (nz + 1) + z] - sum[x * (nz + 1) + z]
  return { sum: sum, ox: ox, oz: oz, nx: nx, nz: nz }
}

function covered(c, x0, x1, z0, z1) {
  var a = x0 - c.ox, b = x1 - c.ox + 1, d = z0 - c.oz, e = z1 - c.oz + 1, m = c.nz + 1
  if (a < 0 || d < 0 || b > c.nx || e > c.nz) return true
  return c.sum[b * m + e] - c.sum[a * m + e] - c.sum[b * m + d] + c.sum[a * m + d] > 0
}

function far(chosen, x, z) {
  for (var i = 0; i < chosen.length; i++) {
    var dx = chosen[i][0] - x, dz = chosen[i][2] - z
    if (dx * dx + dz * dz < SPACING * SPACING) return false
  }
  return true
}

// up to `want` new sites, nearest the bell first, each SPACING from every other pavilion
function findSites(level, ctx, chosen, want, log) {
  var found = [], list = [], x, z, i, k
  for (x = ctx.x0; x <= ctx.x1; x++)
    for (z = ctx.z0; z <= ctx.z1; z++) {
      var d2 = (x - ctx.x) * (x - ctx.x) + (z - ctx.z) * (z - ctx.z)
      if (d2 >= 36) list.push([x, z, d2])        // not on top of the bell and well
    }
  list.sort((a, b) => a[2] - b[2])
  var ox = ctx.x0 - R - 2, oz = ctx.z0 - R - 2, nx = ctx.x1 - ctx.x0 + 2 * R + 5, nz = ctx.z1 - ctx.z0 + 2 * R + 5
  var bcov = ctx.lay ? coverage(ctx.lay.buildings, ox, oz, nx, nz) : null
  for (k = 0; k < STEPS.length && found.length < want; k++) {
    var st = STEPS[k], why = { building: 0, hull: 0, blocked: 0, steep: 0, spacing: 0 }
    for (i = 0; i < list.length && found.length < want; i++) {
      var cx = list[i][0], cz = list[i][1]
      if (!far(chosen.concat(found), cx, cz)) { why.spacing++; continue }
      var x0 = cx - R, x1 = cx + R, z0 = cz - R, z1 = cz + R
      if (bcov && covered(bcov, x0, x1, z0, z1)) { why.building++; continue }
      if (ctx.lay && st.hull && (!insideHull(ctx.hull, x0, z0) || !insideHull(ctx.hull, x1, z0) || !insideHull(ctx.hull, x0, z1) || !insideHull(ctx.hull, x1, z1))) { why.hull++; continue }
      var y0 = site(level, cx, cz, ctx.top, ctx.bottom, st.rise, why)
      if (y0 === null) continue
      found.push([cx, y0, cz])
      log('site ' + (chosen.length + found.length) + ' at step ' + (k + 1) + ' (rise ' + st.rise + (st.hull ? '' : ', edge of town allowed') + '): ' + cx + ',' + y0 + ',' + cz)
    }
    if (found.length < want) log('step ' + (k + 1) + ' done, ' + found.length + ' of ' + want + ' found — spots passed over: ' + why.building + ' touch a house, ' +
      why.spacing + ' too close to another pavilion, ' + why.hull + ' outside the town, ' + why.blocked + ' not open ground, ' + why.steep + ' too steep')
  }
  return found
}

function readSites(data) {
  var s = String(data.getString(SITES) || '')
  return s ? s.split(';').map(t => t.split(',').map(n => parseInt(n, 10))) : []
}
function writeSites(data, sites) { data.putString(SITES, sites.map(p => p.join(',')).join(';')) }

function place(server) {
  var level = server.overworld()
  var data = server.persistentData
  var log = m => console.info('[peacock] capital boards: ' + m)
  var sp = level.getSharedSpawnPos()
  var start = capitalStart(level)
  var ctx = { x: sp.getX(), z: sp.getZ(), x0: sp.getX() - 48, x1: sp.getX() + 48, z0: sp.getZ() - 48, z1: sp.getZ() + 48,
              top: sp.getY() + 24, bottom: sp.getY() - 16, lay: null, hull: [] }
  var bell = null
  if (start) {
    var lay = layout(start)
    if (lay.first) {
      bell = findBell(level, lay.first)
      var pts = []
      lay.buildings.concat(lay.square ? [lay.square] : []).forEach(b => { pts.push([b.x0, b.z0], [b.x1, b.z0], [b.x0, b.z1], [b.x1, b.z1]) })
      var xs = pts.map(p => p[0]), zs = pts.map(p => p[1])
      var by = bell ? bell.y : lay.first.minY()
      ctx = { x: bell ? bell.x : (lay.first.minX() + lay.first.maxX()) >> 1, z: bell ? bell.z : (lay.first.minZ() + lay.first.maxZ()) >> 1,
              x0: Math.min.apply(null, xs), x1: Math.max.apply(null, xs), z0: Math.min.apply(null, zs), z1: Math.max.apply(null, zs),
              top: by + 32, bottom: by - 32, lay: lay, hull: hull(pts) }
    }
  }

  // what stands already: the sites list, or the single site of the one-pavilion version (built once V3 was set;
  // saved but unbuilt otherwise), or the frame of the very first run, which failed before sites were saved
  var sites = readSites(data), pending = []
  var single = String(data.getString(SITE) || '')
  if (!sites.length && single) {
    var p1 = single.split(',').map(n => parseInt(n, 10))
    if (data.getBoolean(V3)) sites.push(p1); else pending.push(p1)
  }
  if (!sites.length && !pending.length && !data.getBoolean(V3)) {
    var frame = unfinished(level, ctx.x, ctx.z, (bell ? bell.y : sp.getY()) + 12, (bell ? bell.y : sp.getY()) - 12)
    if (frame) pending.push(frame)
  }

  // a world whose earlier run left bare boards and no pavilion: take them up (near the bell, and beside spawn)
  if (data.getBoolean(DONE) && !sites.length) {
    var ry = bell ? bell.y : sp.getY()
    var gone = removeBareBoards(level, ctx.x, ctx.z, ry + 12, ry - 12, 48)
      .concat(removeBareBoards(level, sp.getX(), sp.getZ(), sp.getY() + 16, sp.getY() - 16, 6))
    if (gone.length) log('took up ' + gone.length + ' bare board(s): ' + gone.map(p => p.join(',')).join(' and '))
  }

  var want = Math.max(0, COUNT - sites.length - pending.length)
  var fresh = want ? findSites(level, ctx, sites.concat(pending), want, log) : []
  var todo = pending.concat(fresh)
  todo.forEach(p => {
    data.putString(SITE, p.join(','))   // the one being built, so a failure is finished in place next start
    var boards = build(server, level, p[0], p[1], p[2])
    sites.push(p)
    writeSites(data, sites)
    data.putString(SITE, '')
    log('pavilion ' + sites.length + ' at ' + p.join(',') + (bell ? ', ' + Math.round(Math.sqrt((p[0] - bell.x) * (p[0] - bell.x) + (p[2] - bell.z) * (p[2] - bell.z))) +
        ' blocks from the bell' : '') + '; boards ' + boards.map(b => b.join(',')).join(' and '))
  })
  if (sites.length) {
    if (sites.length < COUNT) log(sites.length + ' of ' + COUNT + ' pavilions: no more room in the town')
    return true
  }
  var placed = []
  lastResort(level, placed)
  log('no room for a pavilion anywhere in the town — ' + placed.length + ' bare board(s) beside spawn' +
      (placed.length ? ': ' + placed.map(p => p.join(',')).join(' and ') : '') + '; trying again next start')
  return false
}

ServerEvents.loaded(event => {
  var server = event.server
  var data = server.persistentData
  if (data.getBoolean(V4)) return
  server.scheduleInTicks(100, () => {
    try {
      // only standing pavilions end it: bare boards are put out again at the next start, so a later fix still
      // gets its chance in this world
      var built = place(server)
      data.putBoolean(DONE, true)
      if (built) { data.putBoolean(PAVILION, true); data.putBoolean(V3, true); data.putBoolean(V4, true) }
    } catch (e) { console.error('[peacock] capital boards: failed — ' + e) }
  })
})
})()
