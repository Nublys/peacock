// Peacock — a wall around the capital (2026-10-20, Aaron: "Can we try generating walls for it?").
//
// Built once per world, a few seconds after the first load, around the capital at world spawn (peacock:capital,
// a CTOV plains town). It follows the town's outline, not a rectangle: the convex hull of every building piece
// (houses, the square, decorations — not the roads), pushed MARGIN blocks outward. Wherever a road piece crosses
// the wall line there is a gate: an open arch with a lantern, so every road out of town keeps working.
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
  var onRoad = (x, z) => fp.roads.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)
  cols.forEach(c => { c.gate = onRoad(c.x, c.z) })
  // a column next to a gate is a gate post
  for (var i = 0; i < cols.length; i++) {
    var prev = cols[(i - 1 + cols.length) % cols.length], next = cols[(i + 1) % cols.length]
    cols[i].post = !cols[i].gate && (prev.gate || next.gate)
  }
  return { cols: cols, top: top + 40, bottom: bottom - 12, roads: fp.roads.length, buildings: fp.buildings.length }
}

function brick(r) {
  return r < 0.12 ? 'minecraft:mossy_stone_bricks' : r < 0.2 ? 'minecraft:cracked_stone_bricks' : 'minecraft:stone_bricks'
}

// one column; returns the number of blocks set
function column(level, c, i, top, bottom, rng, gateRun) {
  var n = 0
  var set = (y, id, props) => { var b = level.getBlock(c.x, y, c.z); if (props) b.set(id, props); else b.set(id); n++ }
  var yg = null
  for (var y = top; y > bottom; y--) {
    if (!SOFT.test(String(level.getBlock(c.x, y, c.z).id))) { yg = y + 1; break }
  }
  if (yg === null) return 0
  if (c.gate) {
    for (var gy = yg; gy < yg + HEIGHT; gy++) if (String(level.getBlock(c.x, gy, c.z).id) !== 'minecraft:air') set(gy, 'minecraft:air')
    set(yg + HEIGHT, 'minecraft:stone_bricks')
    if (gateRun === 1) set(yg + HEIGHT - 1, 'minecraft:lantern', { hanging: 'true' })
    return n
  }
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

function build(server, log, done) {
  if (running) { log('wall: already being built'); return false }
  var level = server.overworld()
  var p = plan(level)
  if (!p) { log('wall: no capital at world spawn ' + level.getSharedSpawnPos() + ' — nothing built'); done(false); return false }
  running = true
  var seed = (p.cols[0].x * 31 + p.cols[0].z) >>> 0
  var rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  var i = 0, blocks = 0, gates = 0, run = 0, skipped = 0
  log('wall: ' + p.cols.length + ' columns around ' + p.buildings + ' buildings, ' + p.roads + ' road pieces; building over ' +
      Math.ceil(p.cols.length / COLUMNS_PER_TICK) + ' ticks')
  var step = () => {
    try {
      var end = Math.min(i + COLUMNS_PER_TICK, p.cols.length)
      for (; i < end; i++) {
        var c = p.cols[i]
        run = c.gate ? run + 1 : 0
        if (run === 1) gates++
        var loaded = true
        try { loaded = level.hasChunk(c.x >> 4, c.z >> 4) } catch (e) { loaded = true }
        if (!loaded) { skipped++; continue }
        blocks += column(level, c, i, p.top, p.bottom, rng, run)
      }
      if (i < p.cols.length) { server.scheduleInTicks(1, step); return }
      running = false
      log('wall: done — ' + p.cols.length + ' columns, ' + gates + ' gates, ' + blocks + ' blocks' + (skipped ? ', ' + skipped + ' columns skipped (chunk not loaded)' : ''))
      done(true)
    } catch (e) { running = false; log('wall: failed — ' + e); done(false) }
  }
  step()
  return true
}

ServerEvents.loaded(event => {
  var server = event.server
  if (server.persistentData.getBoolean(DONE)) return
  server.scheduleInTicks(160, () => {
    try { build(server, m => console.info('[peacock] ' + m), ok => { if (ok) server.persistentData.putBoolean(DONE, true) }) }
    catch (e) { console.error('[peacock] wall: failed — ' + e) }
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
        try { return build(src.server, log, ok => { if (ok) src.server.persistentData.putBoolean(DONE, true) }) ? 1 : 0 }
        catch (e) { src.sendSystemMessage(Text.red('wall failed: ' + e)); return 0 }
      })))
})
})()
