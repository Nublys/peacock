// Peacock — a wall around the capital (2026-10-20, Aaron: "Can we try generating walls for it?").
//
// Built once per world, a few seconds after the first load, around the capital at world spawn (peacock:capital,
// a CTOV plains town). It follows the town's outline, not a rectangle: the convex hull of every building piece
// (houses, the square, decorations — not the roads), pushed MARGIN blocks outward. CTOV's streets end inside the
// town, so gates are placed on purpose: the road reaching farthest north, east, south and west each gets a 3-wide
// arched gate with a lantern in the wall nearest its end, and a path out to it. A world walled before gates
// existed gets the gates cut into its standing wall on the next start (`peacock_capital_wall_gates`).
// The wall is HEIGHT blocks of stone bricks (some mossy, some cracked) on a foundation that fills down through
// water, plants and soft ground, capped with a stone brick wall; a lantern post every PILLAR_EVERY blocks and a
// taller tower at each corner of the outline. Trees in the way are cut through.
//
// The work is spread over server ticks (COLUMNS_PER_TICK) so the server never stalls. `peacock_capital_wall2` in
// server persistentData marks it done; `/peacock wall` (op) builds it again in place (harmless).
// Every column is in the spawn chunks, which are always loaded; a column whose chunk is not loaded is skipped.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
// Java lists from the game are copied into an ArrayList before use (Rhino cannot reflect on JDK immutable lists).
;(() => {
const DONE = 'peacock_capital_wall2'
const GATES = 'peacock_capital_wall_gates'
const MARGIN = 5
const HEIGHT = 5
const PILLAR_EVERY = 8
const COLUMNS_PER_TICK = 40
const SOFT = /^minecraft:(air|cave_air|void_air|grass|tall_grass|fern|large_fern|snow|vine|dead_bush|sweet_berry_bush|.*_leaves|.*_log|.*_wood|.*_sapling|.*_carpet|dandelion|poppy|blue_orchid|allium|azure_bluet|.*_tulip|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony|.*mushroom|lily_pad|seagrass|tall_seagrass|kelp|kelp_plant)$/
var running = false

function capitalStart(level) {
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var s = level.registryAccess().registryOrThrow(Registries.STRUCTURE).get(new ResourceLocation('peacock', 'capital'))
  if (!s) return null
  var start = level.structureManager().getStructureAt(level.getSharedSpawnPos(), s)
  return start && start.isValid() ? start : null
}

// building footprints and road footprints, from the structure's pieces
function footprints(start) {
  var ArrayList = Java.loadClass('java.util.ArrayList')
  var pieces = new ArrayList(start.getPieces())
  var buildings = [], roads = []
  for (var i = 0; i < pieces.size(); i++) {
    var p = pieces.get(i)
    var name = ''
    try { name = String(p.getElement()) } catch (e) { name = '' }
    var b = p.getBoundingBox()
    var box = { x0: b.minX(), x1: b.maxX(), z0: b.minZ(), z1: b.maxZ(), y0: b.minY(), y1: b.maxY() }
    if (name.indexOf('/roads/') >= 0) roads.push(box)
    else if (name.indexOf('/villager') < 0) buildings.push(box)
  }
  return { buildings: buildings, roads: roads }
}

// convex hull (monotone chain) of points [x, z], counter-clockwise, no repeated end point
function hull(points) {
  var pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  var cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  var lower = [], upper = []
  for (var i = 0; i < pts.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop()
    lower.push(pts[i])
  }
  for (var j = pts.length - 1; j >= 0; j--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[j]) <= 0) upper.pop()
    upper.push(pts[j])
  }
  upper.pop(); lower.pop()
  return lower.concat(upper)
}

// the wall line: hull edges stepped one block at a time, 4-connected (no diagonal gaps), each column once
function wallColumns(corners) {
  var cols = [], seen = {}
  var add = (x, z, corner) => {
    var k = x + ',' + z
    if (seen[k] !== undefined) { if (corner) cols[seen[k]].corner = true; return }
    seen[k] = cols.length
    cols.push({ x: x, z: z, corner: !!corner })
  }
  for (var i = 0; i < corners.length; i++) {
    var a = corners[i], b = corners[(i + 1) % corners.length]
    var x = a[0], z = a[1]
    var dx = Math.abs(b[0] - x), dz = Math.abs(b[1] - z)
    var sx = b[0] > x ? 1 : -1, sz = b[1] > z ? 1 : -1
    var err = dx - dz
    add(x, z, true)
    while (x !== b[0] || z !== b[1]) {
      var e2 = 2 * err
      if (e2 > -dz) { err -= dz; x += sx } else { err += dx; z += sz }
      add(x, z, false)
    }
  }
  return cols
}

function plan(level) {
  var start = capitalStart(level)
  if (!start) return null
  var fp = footprints(start)
  if (fp.buildings.length === 0) return null
  var pts = [], top = -9999, bottom = 9999
  fp.buildings.forEach(b => {
    pts.push([b.x0 - MARGIN, b.z0 - MARGIN], [b.x1 + MARGIN, b.z0 - MARGIN], [b.x0 - MARGIN, b.z1 + MARGIN], [b.x1 + MARGIN, b.z1 + MARGIN])
    if (b.y1 > top) top = b.y1
    if (b.y0 < bottom) bottom = b.y0
  })
  var cols = wallColumns(hull(pts))
  var cx = 0, cz = 0
  fp.buildings.forEach(b => { cx += (b.x0 + b.x1) / 2; cz += (b.z0 + b.z1) / 2 })
  cx /= fp.buildings.length; cz /= fp.buildings.length
  var p = { cols: cols, top: top + 40, bottom: bottom - 12, roads: fp.roads.length, buildings: fp.buildings.length,
            roadBoxes: fp.roads, buildingBoxes: fp.buildings, cx: cx, cz: cz }
  markGates(p)
  return p
}

// Gates. CTOV's streets end at houses inside the town, so no road ever crosses the wall line by itself (first
// wall, 2026-10-20 15:05: 105 road pieces, 0 gates). Instead: the road reaching farthest north, east, south and west
// each gets a GATE_WIDTH gate at the wall column nearest its far end, and a path from the road's end out to it.
const GATE_WIDTH = 3
function markGates(p) {
  var cols = p.cols, n = cols.length
  cols.forEach(c => { c.gate = false; c.post = false; c.lamp = false })
  p.sites = []
  if (!p.roadBoxes.length || n < 20) return
  var ends = [
    best(p.roadBoxes, r => -r.z0, r => [Math.round((r.x0 + r.x1) / 2), r.z0]),   // north
    best(p.roadBoxes, r => r.x1, r => [r.x1, Math.round((r.z0 + r.z1) / 2)]),    // east
    best(p.roadBoxes, r => r.z1, r => [Math.round((r.x0 + r.x1) / 2), r.z1]),    // south
    best(p.roadBoxes, r => -r.x0, r => [r.x0, Math.round((r.z0 + r.z1) / 2)]),   // west
  ]
  var half = (GATE_WIDTH - 1) / 2
  ends.forEach(e => {
    var bi = 0, bd = 1e18
    for (var i = 0; i < n; i++) {
      var d = (cols[i].x - e[0]) * (cols[i].x - e[0]) + (cols[i].z - e[1]) * (cols[i].z - e[1])
      if (d < bd) { bd = d; bi = i }
    }
    // two directions can share an end (a small town): one gate is enough there
    if (p.sites.some(s => Math.min(Math.abs(s.i - bi), n - Math.abs(s.i - bi)) < GATE_WIDTH + 8)) return
    p.sites.push({ i: bi, road: e })
    for (var k = -half; k <= half; k++) cols[(bi + k + n) % n].gate = true
    cols[bi].lamp = true
    cols[(bi - half - 1 + n) % n].post = true
    cols[(bi + half + 1) % n].post = true
  })
}

function best(list, score, point) {
  var b = null, bs = -1e18
  list.forEach(x => { var s = score(x); if (s > bs) { bs = s; b = x } })
  return point(b)
}

function brick(r) {
  return r < 0.12 ? 'minecraft:mossy_stone_bricks' : r < 0.2 ? 'minecraft:cracked_stone_bricks' : 'minecraft:stone_bricks'
}

// first air block above the ground in this column (water counts as ground), or null
function groundAt(level, x, z, top, bottom) {
  for (var y = top; y > bottom; y--) {
    if (!SOFT.test(String(level.getBlock(x, y, z).id))) return y + 1
  }
  return null
}

// a gate column. The ground is read two blocks inside the wall, so this also works on a wall already standing
// (its column reads as solid up to the cap). Clears the opening and anything left above it, lays the lintel.
function gateColumn(level, p, c) {
  var n = 0
  var set = (y, id, props) => { var b = level.getBlock(c.x, y, c.z); if (props) b.set(id, props); else b.set(id); n++ }
  var dx = p.cx - c.x, dz = p.cz - c.z, len = Math.sqrt(dx * dx + dz * dz) || 1
  var yg = groundAt(level, c.x + Math.round(dx / len * 2), c.z + Math.round(dz / len * 2), p.top, p.bottom)
  if (yg === null) return 0
  for (var y = yg; y < yg + HEIGHT; y++) if (String(level.getBlock(c.x, y, c.z).id) !== 'minecraft:air') set(y, 'minecraft:air')
  set(yg - 1, 'minecraft:dirt_path')
  set(yg + HEIGHT, 'minecraft:stone_bricks')
  for (var a = yg + HEIGHT + 1; a <= yg + HEIGHT + 3; a++) if (String(level.getBlock(c.x, a, c.z).id) !== 'minecraft:air') set(a, 'minecraft:air')
  if (c.lamp) set(yg + HEIGHT - 1, 'minecraft:lantern', { hanging: 'true' })
  return n
}

// the path from a road's far end out to its gate, three wide, on open ground only (never inside a building)
function gatePath(level, p, site) {
  var n = 0, g = p.cols[site.i]
  var x = site.road[0], z = site.road[1]
  var dx = Math.abs(g.x - x), dz = Math.abs(g.z - z), sx = g.x > x ? 1 : -1, sz = g.z > z ? 1 : -1, err = dx - dz
  var wide = dx > dz ? [[0, -1], [0, 0], [0, 1]] : [[-1, 0], [0, 0], [1, 0]]
  var inBuilding = (bx, bz) => p.buildingBoxes.some(b => bx >= b.x0 && bx <= b.x1 && bz >= b.z0 && bz <= b.z1)
  for (var guard = 0; guard < 200; guard++) {
    for (var w = 0; w < wide.length; w++) {
      var px = x + wide[w][0], pz = z + wide[w][1]
      if (inBuilding(px, pz)) continue
      var yg = groundAt(level, px, pz, p.top, p.bottom)
      if (yg === null) continue
      var id = String(level.getBlock(px, yg - 1, pz).id)
      if (/^minecraft:(grass_block|dirt|coarse_dirt|podzol|rooted_dirt|mycelium)$/.test(id)) { level.getBlock(px, yg - 1, pz).set('minecraft:dirt_path'); n++ }
      var above = String(level.getBlock(px, yg, pz).id)
      if (above !== 'minecraft:air' && SOFT.test(above) && !/_log$|_wood$/.test(above)) { level.getBlock(px, yg, pz).set('minecraft:air'); n++ }
    }
    if (x === g.x && z === g.z) break
    var e2 = 2 * err
    if (e2 > -dz) { err -= dz; x += sx } else { err += dx; z += sz }
  }
  return n
}

// a wall column; returns the number of blocks set
function column(level, c, i, top, bottom, rng) {
  var n = 0
  var set = (y, id, props) => { var b = level.getBlock(c.x, y, c.z); if (props) b.set(id, props); else b.set(id); n++ }
  var yg = groundAt(level, c.x, c.z, top, bottom)
  if (yg === null) return 0
  if (c.gate) return 0          // gates are cut afterwards, see cutGates
  // foundation: water counts as ground for the scan above, so a wall over a pond stands on the surface; fill
  // the water (and anything soft under it) with stone bricks down to the bed, at most 8 deep
  for (var fy = yg - 1; fy > yg - 9; fy--) {
    var id = String(level.getBlock(c.x, fy, c.z).id)
    if (id !== 'minecraft:water' && !SOFT.test(id)) break
    set(fy, 'minecraft:stone_bricks')
  }
  var pillar = c.corner || c.post || i % PILLAR_EVERY === 0
  var h = yg + HEIGHT + (c.corner ? 2 : pillar ? 1 : 0)
  for (var wy = yg; wy < h; wy++) set(wy, brick(rng()))
  if (pillar) set(h, 'minecraft:lantern', { hanging: 'false' })
  else set(h, 'minecraft:stone_brick_wall')
  return n
}

function cutGates(level, p) {
  var blocks = 0, where = []
  p.cols.forEach(c => { if (c.gate) blocks += gateColumn(level, p, c) })
  p.sites.forEach(s => { blocks += gatePath(level, p, s); where.push(p.cols[s.i].x + ',' + p.cols[s.i].z) })
  return { gates: p.sites.length, blocks: blocks, where: where }
}

// gates only, into a wall that is already standing (worlds walled before gates existed)
function addGates(server, log) {
  var level = server.overworld()
  var p = plan(level)
  if (!p) { log('wall gates: no capital at world spawn'); return false }
  var g = cutGates(level, p)
  log('wall gates: ' + g.gates + ' gates cut into the existing wall (' + g.blocks + ' blocks)' + (g.where.length ? ' at ' + g.where.join(' ') : ''))
  return true
}

function build(server, log, done) {
  if (running) { log('wall: already being built'); return false }
  var level = server.overworld()
  var p = plan(level)
  if (!p) { log('wall: no capital at world spawn ' + level.getSharedSpawnPos() + ' — nothing built'); done(false); return false }
  running = true
  var seed = (p.cols[0].x * 31 + p.cols[0].z) >>> 0
  var rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  var i = 0, blocks = 0, skipped = 0
  log('wall: ' + p.cols.length + ' columns around ' + p.buildings + ' buildings, ' + p.roads + ' road pieces; building over ' +
      Math.ceil(p.cols.length / COLUMNS_PER_TICK) + ' ticks')
  var step = () => {
    try {
      var end = Math.min(i + COLUMNS_PER_TICK, p.cols.length)
      for (; i < end; i++) {
        var c = p.cols[i]
        var loaded = true
        try { loaded = level.hasChunk(c.x >> 4, c.z >> 4) } catch (e) { loaded = true }
        if (!loaded) { skipped++; continue }
        blocks += column(level, c, i, p.top, p.bottom, rng)
      }
      if (i < p.cols.length) { server.scheduleInTicks(1, step); return }
      running = false
      var g = cutGates(level, p)
      log('wall: done — ' + p.cols.length + ' columns, ' + blocks + ' blocks' + (skipped ? ', ' + skipped + ' columns skipped (chunk not loaded)' : '') +
          '; ' + g.gates + ' gates (' + g.blocks + ' blocks)' + (g.where.length ? ' at ' + g.where.join(' ') : ''))
      done(true)
    } catch (e) { running = false; log('wall: failed — ' + e); done(false) }
  }
  step()
  return true
}

ServerEvents.loaded(event => {
  var server = event.server
  var pd = server.persistentData
  var log = m => console.info('[peacock] ' + m)
  if (pd.getBoolean(DONE) && pd.getBoolean(GATES)) return
  server.scheduleInTicks(160, () => {
    try {
      if (pd.getBoolean(DONE)) { if (addGates(server, log)) pd.putBoolean(GATES, true) }
      else build(server, log, ok => { if (ok) { pd.putBoolean(DONE, true); pd.putBoolean(GATES, true) } })
    } catch (e) { console.error('[peacock] wall: failed — ' + e) }
  })
})

ServerEvents.commandRegistry(event => {
  var Commands = event.commands
  event.register(Commands.literal('peacock')
    .then(Commands.literal('wall')
      .requires(src => src.hasPermission(2))
      .executes(ctx => {
        var src = ctx.source
        var log = m => { console.info('[peacock] ' + m); src.sendSystemMessage(Text.gray(m)) }
        try { return build(src.server, log, ok => { if (ok) { src.server.persistentData.putBoolean(DONE, true); src.server.persistentData.putBoolean(GATES, true) } }) ? 1 : 0 }
        catch (e) { src.sendSystemMessage(Text.red('wall failed: ' + e)); return 0 }
      })))
})
})()
