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
// taller tower at each corner of the outline. Trees in the way are cut through, and notched where they hang over it.
//
// The work is spread over server ticks (COLUMNS_PER_TICK) so the server never stalls. `peacock_capital_wall2` in
// server persistentData marks it done; `/peacock wall` (op) builds it again in place (harmless).
// A column whose chunk is not loaded is skipped (capital_keepalive.js holds the capital loaded while it is first built).
// Since 2026-10-28 the wall also takes in the Capital Works buildings and moves out once to do it (`regrow`, called
// by capital_layout.js with the chunks held); `peacock_wall_extras` remembers what it encloses.
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
// What the ground scan passes through. Until 2026-10-22 only vanilla names counted, so a tree from another mod
// (Biomes O' Plenty at the town's edge), a bee nest or a huge mushroom read as ground and the wall went up on the
// canopy (Aaron: "The capital walls gen ontop of threes"). Now any mod's leaves, logs, wood, saplings and carpets,
// those vanilla extras, and anything tagged leaves, logs, saplings, flowers or replaceable-by-trees.
const SOFT = /^(minecraft:(air|cave_air|void_air|grass|tall_grass|fern|large_fern|snow|vine|dead_bush|sweet_berry_bush|dandelion|poppy|blue_orchid|allium|azure_bluet|oxeye_daisy|cornflower|lily_of_the_valley|sunflower|lilac|rose_bush|peony|lily_pad|seagrass|tall_seagrass|kelp|kelp_plant|bee_nest|cocoa|azalea|flowering_azalea|mangrove_roots|bamboo|pink_petals|glow_lichen|hanging_roots|mushroom_stem|brown_mushroom_block|red_mushroom_block)|[a-z0-9_.-]+:[a-z0-9_/.-]*(_leaves|_log|_wood|_sapling|_carpet|_tulip|mushroom))$/
const SOFT_TAGS = ['minecraft:leaves', 'minecraft:logs', 'minecraft:saplings', 'minecraft:flowers', 'minecraft:replaceable_by_trees']
// tree material: cut where it overhangs the wall, and the sign of a wall built on a canopy (repairTreeTops)
const TREE = /^([a-z0-9_.-]+:[a-z0-9_/.-]*(_leaves|_log|_wood)|minecraft:(bee_nest|mushroom_stem|brown_mushroom_block|red_mushroom_block|mangrove_roots))$/
const WALL = /^minecraft:(stone_bricks|mossy_stone_bricks|cracked_stone_bricks|stone_brick_wall|lantern)$/
const TREES_FIXED = 'peacock_capital_wall_trees'
var running = false

function hasAnyTag(b, tags) {
  try { for (var t = 0; t < tags.length; t++) if (b.hasTag(tags[t])) return true } catch (e) { }
  return false
}
// water stays ground (the wall stands on a pond's surface and its foundation fills down), though replaceable_by_trees
// lists it
function soft(b) { var id = String(b.id); return id !== 'minecraft:water' && (SOFT.test(id) || hasAnyTag(b, SOFT_TAGS)) }
function tree(b) { return TREE.test(String(b.id)) || hasAnyTag(b, ['minecraft:leaves', 'minecraft:logs']) }

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

// `extras`: the Capital Works buildings the wall takes in (capital_layout.js, 2026-10-28), as [x0, z0, x1, z1]; each is
// kept WORKS_MARGIN blocks inside the wall. Without extras this is the wall as first built, exactly.
const WORKS_MARGIN = 7
function plan(level, extras) {
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
  var cx = 0, cz = 0
  fp.buildings.forEach(b => { cx += (b.x0 + b.x1) / 2; cz += (b.z0 + b.z1) / 2 })
  cx /= fp.buildings.length; cz /= fp.buildings.length
  var works = (extras || []).map(e => ({ x0: e[0], z0: e[1], x1: e[2], z1: e[3], y0: bottom, y1: top }))
  works.forEach(b => {
    var m = WORKS_MARGIN
    pts.push([b.x0 - m, b.z0 - m], [b.x1 + m, b.z0 - m], [b.x0 - m, b.z1 + m], [b.x1 + m, b.z1 + m])
  })
  var corners = hull(pts)
  var cols = wallColumns(corners)
  var p = { cols: cols, hull: corners, top: top + 40, bottom: bottom - 12, roads: fp.roads.length, buildings: fp.buildings.length,
            roadBoxes: fp.roads, buildingBoxes: fp.buildings.concat(works), townBoxes: fp.buildings, cx: cx, cz: cz }
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
    if (!soft(level.getBlock(x, y, z))) return y + 1
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
      if (above !== 'minecraft:air' && soft(level.getBlock(px, yg, pz)) && !/_log$|_wood$/.test(above)) { level.getBlock(px, yg, pz).set('minecraft:air'); n++ }
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
    var fb = level.getBlock(c.x, fy, c.z)
    if (String(fb.id) !== 'minecraft:water' && !soft(fb)) break
    set(fy, 'minecraft:stone_bricks')
  }
  var pillar = c.corner || c.post || i % PILLAR_EVERY === 0
  var h = yg + HEIGHT + (c.corner ? 2 : pillar ? 1 : 0)
  for (var wy = yg; wy < h; wy++) set(wy, brick(rng()))
  if (pillar) set(h, 'minecraft:lantern', { hanging: 'false' })
  else set(h, 'minecraft:stone_brick_wall')
  // a notch through any tree hanging over the wall, so leaves never sit on the cap
  for (var ty = h + 1; ty <= h + 12 && tree(level.getBlock(c.x, ty, c.z)); ty++) set(ty, 'minecraft:air')
  return n
}

// A wall built before 2026-10-22 may stand on a canopy where the old scan took leaves for ground. For each column:
// skip air and tree from the top, walk down the wall's own blocks, and if what they stand on is tree, take that
// stretch of wall down and build the column again on the real ground. Columns standing on ground are not touched.
function repairColumn(level, c, i, p, rng) {
  if (c.gate) return 0
  var y = p.top, b
  for (; y > p.bottom; y--) { b = level.getBlock(c.x, y, c.z); if (String(b.id) !== 'minecraft:air' && !tree(b)) break }
  if (y <= p.bottom || !WALL.test(String(level.getBlock(c.x, y, c.z).id))) return 0
  var wTop = y
  for (; y > p.bottom && WALL.test(String(level.getBlock(c.x, y, c.z).id)); y--) { }
  if (!tree(level.getBlock(c.x, y, c.z))) return 0
  for (var yy = wTop; yy > y; yy--) level.getBlock(c.x, yy, c.z).set('minecraft:air')
  column(level, c, i, p.top, p.bottom, rng)
  return 1
}

function repairTreeTops(server, log, done) {
  var level = server.overworld()
  var p = plan(level, extrasOf(server))
  if (!p) { log('wall: tree check skipped — no capital at world spawn ' + level.getSharedSpawnPos()); done(); return }
  log('wall: checking ' + p.cols.length + ' columns for any standing on a tree')
  var seed = (p.cols[0].x * 37 + p.cols[0].z) >>> 0
  var rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  var i = 0, fixed = 0
  var step = () => {
    try {
      var end = Math.min(i + COLUMNS_PER_TICK, p.cols.length)
      for (; i < end; i++) fixed += repairColumn(level, p.cols[i], i, p, rng)
      if (i < p.cols.length) { server.scheduleInTicks(1, step); return }
      log('wall: ' + (fixed ? fixed + ' column(s) that stood on trees rebuilt on the ground' : 'no column stood on a tree'))
      done()
    } catch (e) { log('wall: tree repair failed — ' + e) }
  }
  step()
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
  var p = plan(level, extrasOf(server))
  if (!p) { log('wall gates: no capital at world spawn'); return false }
  var g = cutGates(level, p)
  log('wall gates: ' + g.gates + ' gates cut into the existing wall (' + g.blocks + ' blocks)' + (g.where.length ? ' at ' + g.where.join(' ') : ''))
  return true
}

function build(server, log, done) {
  if (running) { log('wall: already being built'); return false }
  var level = server.overworld()
  var p = plan(level, extrasOf(server))
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

// ---------------------------------------------------------------- the wall moves out (capital_layout.js, 2026-10-28)
// The Capital Works buildings inside the wall, as last built: "x0,z0,x1,z1;…" in persistentData
const EXTRAS = 'peacock_wall_extras'
function extrasOf(server) {
  var s = String(server.persistentData.getString(EXTRAS) || '')
  return s ? s.split(';').map(t => t.split(',').map(Number)) : []
}
function colKey(c) { return c.x + ',' + c.z }

// take an old wall column down to the ground around it: only the wall's own blocks (stone bricks, the cap, lanterns),
// so anything a player built against it stays; the foundation below ground stays too, its top turned to grass
function demolish(level, c, p, oldKeys) {
  var n = 0, hs = []
  ;[[2, 0], [-2, 0], [0, 2], [0, -2], [3, 0], [-3, 0], [0, 3], [0, -3]].forEach(d => {
    var k = (c.x + d[0]) + ',' + (c.z + d[1])
    if (oldKeys[k] !== undefined) return
    var y = groundAt(level, c.x + d[0], c.z + d[1], p.top, p.bottom)
    if (y !== null) hs.push(y)
  })
  if (!hs.length) return 0
  // down to the lowest ground beside it: only wall blocks are taken, so the natural ground under the column is safe,
  // and a building standing next to the wall cannot make the ground read high
  var yn = Math.min.apply(null, hs), y
  for (y = p.top; y >= yn; y--) {
    var b = level.getBlock(c.x, y, c.z)
    if (WALL.test(String(b.id))) { b.set('minecraft:air'); n++ }
  }
  for (y = yn + 6; y > yn - 12; y--) {
    var t = level.getBlock(c.x, y, c.z)
    if (String(t.id) === 'minecraft:air') continue
    if (WALL.test(String(t.id))) { t.set('minecraft:grass_block'); n++ }
    break
  }
  return n
}

// every column either plan touches (old and new), for loading their chunks first
function columnsOf(pOld, pNew) {
  var seen = {}, out = []
  pOld.cols.concat(pNew.cols).forEach(c => {
    ;[[0, 0], [3, 3], [3, -3], [-3, 3], [-3, -3]].forEach(d => {
      var a = (c.x + d[0]) >> 4, b = (c.z + d[1]) >> 4, k = a + ',' + b
      if (!seen[k]) { seen[k] = true; out.push([a, b]) }
    })
  })
  pNew.sites.forEach(s => {
    var g = pNew.cols[s.i], x0 = (Math.min(g.x, s.road[0]) - 3) >> 4, x1 = (Math.max(g.x, s.road[0]) + 3) >> 4
    var z0 = (Math.min(g.z, s.road[1]) - 3) >> 4, z1 = (Math.max(g.z, s.road[1]) + 3) >> 4
    for (var a = x0; a <= x1; a++) for (var b = z0; b <= z1; b++) { var k = a + ',' + b; if (!seen[k]) { seen[k] = true; out.push([a, b]) } }
  })
  return out
}

// from the wall standing (old extras) to the wall around `extras`: the new stretch first, then the old stretch that is
// now inside the town comes down, then the gates. The chunks must be loaded (the caller holds them). Spread over ticks.
function regrow(server, extras, log, done) {
  if (running) { log('wall: busy; not moved'); done(false); return }
  var level = server.overworld()
  var pOld = plan(level, extrasOf(server)), pNew = plan(level, extras)
  if (!pOld || !pNew) { log('wall: no capital; not moved'); done(false); return }
  var oldKeys = {}, newKeys = {}
  pOld.cols.forEach((c, i) => { oldKeys[colKey(c)] = i })
  pNew.cols.forEach((c, i) => { newKeys[colKey(c)] = i })
  var raise = [], razeList = []
  pNew.cols.forEach((c, i) => {
    var o = oldKeys[colKey(c)]
    if (o === undefined || (pOld.cols[o].gate && !c.gate)) raise.push(i)
  })
  pOld.cols.forEach(c => { if (newKeys[colKey(c)] === undefined) razeList.push(c) })
  running = true
  var seed = (pNew.cols[0].x * 31 + pNew.cols[0].z) >>> 0
  var rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  var i = 0, j = 0, built = 0, razed = 0
  log('wall: moving out around ' + extras.length + ' Works buildings: ' + raise.length + ' new columns, ' + razeList.length + ' old ones to take down')
  var step = () => {
    try {
      var end = Math.min(i + COLUMNS_PER_TICK, raise.length)
      for (; i < end; i++) built += column(level, pNew.cols[raise[i]], raise[i], pNew.top, pNew.bottom, rng)
      if (i < raise.length) { server.scheduleInTicks(1, step); return }
      var end2 = Math.min(j + COLUMNS_PER_TICK, razeList.length)
      for (; j < end2; j++) razed += demolish(level, razeList[j], pOld, oldKeys)
      if (j < razeList.length) { server.scheduleInTicks(1, step); return }
      var g = cutGates(level, pNew)
      server.persistentData.putString(EXTRAS, extras.map(e => e.join(',')).join(';'))
      running = false
      log('wall: moved — ' + built + ' blocks built, ' + razed + ' taken down; ' + g.gates + ' gates' + (g.where.length ? ' at ' + g.where.join(' ') : ''))
      done(true, pNew)
    } catch (e) { running = false; log('wall: moving failed — ' + e); done(false) }
  }
  step()
}

global.PEACOCK_WALL = { plan: plan, extrasOf: extrasOf, columnsOf: columnsOf, regrow: regrow, soft: soft, WALL: WALL }

ServerEvents.loaded(event => {
  var server = event.server
  var pd = server.persistentData
  var log = m => console.info('[peacock] ' + m)
  if (pd.getBoolean(DONE) && pd.getBoolean(GATES)) return
  server.scheduleInTicks(160, () => {
    try {
      if (pd.getBoolean(DONE)) { if (addGates(server, log)) pd.putBoolean(GATES, true) }
      else build(server, log, ok => { if (ok) { pd.putBoolean(DONE, true); pd.putBoolean(GATES, true); pd.putBoolean(TREES_FIXED, true) } })
    } catch (e) { console.error('[peacock] wall: failed — ' + e) }
  })
})

ServerEvents.loaded(event => {
  var server = event.server
  var pd = server.persistentData
  if (!pd.getBoolean(DONE) || pd.getBoolean(TREES_FIXED)) return   // a wall built from now on is built right
  server.scheduleInTicks(200, () => {
    try { repairTreeTops(server, m => console.info('[peacock] ' + m), () => pd.putBoolean(TREES_FIXED, true)) }
    catch (e) { console.error('[peacock] wall: tree repair failed — ' + e) }
  })
})

ServerEvents.commandRegistry(event => {
  var Commands = event.commands
  event.register(Commands.literal('peacock')
    .then(Commands.literal('wall')
      .requires(src => src.hasPermission(2))
      // `/peacock wall trees`: the tree check again, by hand (rebuilds only columns that stand on a tree)
      .then(Commands.literal('trees').executes(ctx => {
        var src = ctx.source
        var log = m => { console.info('[peacock] ' + m); src.sendSystemMessage(Text.gray(m)) }
        try { repairTreeTops(src.server, log, () => src.server.persistentData.putBoolean(TREES_FIXED, true)); return 1 }
        catch (e) { src.sendSystemMessage(Text.red('wall tree check failed: ' + e)); return 0 }
      }))
      .executes(ctx => {
        var src = ctx.source
        var log = m => { console.info('[peacock] ' + m); src.sendSystemMessage(Text.gray(m)) }
        try { return build(src.server, log, ok => { if (ok) { var d = src.server.persistentData; d.putBoolean(DONE, true); d.putBoolean(GATES, true); d.putBoolean(TREES_FIXED, true) } }) ? 1 : 0 }
        catch (e) { src.sendSystemMessage(Text.red('wall failed: ' + e)); return 0 }
      })))
})
})()
