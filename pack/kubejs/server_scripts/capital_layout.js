// Peacock — the capital's town plan (2026-10-28): every Capital Works building on a planned lot from the start, standing
// as a ruin until it is paid for, inside a wall grown out around them, joined to the town by roads.
//
// Aaron: "Is there a way to incorporate the new buildings into the village? Drawing roads, changing the walls to go around
// them, and ensuring the spacing is good so it's never to close to anything or each other?"; "Lighthouse can be outside
// the wall, but a road should go to it"; "what if they're already there just in ruins, so the player is repairing them?"
// … "Yes, fold it in".
//
// Once per world (`peacock_layout_v1`), after the capital's own first-day jobs are done (capital_keepalive.js' flags):
//   1 Lots. For each building not yet standing, biggest first, the best lot outside the wall that keeps:
//     6 blocks from every building (the town's pieces and the other Works), 3 from every street, 4 blocks outside the
//     standing wall and at most 40 from it, dry, at most 3 blocks of rise, in no claimed chunk (FTB Chunks); preferring the
//     side of town with the fewest Works, then near the wall, then near a street. The Lighthouse goes outside the wall
//     as it will stand, 12-70 blocks out, on the highest ground. Terrain is read from the world generator (no chunk is
//     loaded for the search); the chosen lots are then checked on the real ground and re-planned if they fail.
//   2 Ruins. Each lot gets its building, put up whole by capital_projects.js' own builder, then decayed: everything of
//     value or use taken out (the beacon and its iron, lava, beds, workstations, glass, doors, ladders), most of the roof
//     and the upper walls fallen in, bricks cracked and mossy, cobwebs. A sign: "restore it at the Clerk".
//   3 The wall moves out once around every walled lot (capital_wall.js `regrow`): the new stretch first, then the old
//     stretch inside the town taken down to the ground; the gates move out with it.
//   4 Roads, three wide, in the town's own street block, from each building's front to the nearest street (or to the
//     nearest gate, from the Lighthouse): routed around buildings, the wall and anything built, at most a block of rise
//     per step, planks over water, a lantern post every 12 blocks, the odd worn patch.
// A world from before this (the Forge and the Scriptorium already built) gets the same: the two stay where they are,
// the rest appear as ruins, and the wall and roads take all of them in.
// Paying for a building restores its ruin (capital_projects.js `restore`). `/peacock layout` (op) runs the plan now
// (skipping what is placed already).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// every loop variable declared before its loops.
;(() => {
const FLAG = 'peacock_layout_v1'
const OW = 'minecraft:overworld'
const CLEAR_BUILDINGS = 6, CLEAR_ROADS = 3, CLEAR_WALL = 4, MAX_FROM_WALL = 40, GRID = 4, MAX_RISE = 3
const LIGHT_MIN = 12, LIGHT_MAX = 70
const WORKS_MARGIN = 7                         // as capital_wall.js
const ORDER = ['infirmary', 'market', 'station', 'hall', 'forge', 'scriptorium', 'lighthouse']   // biggest first
const SHORT = { forge: 'The Forge', scriptorium: 'Scriptorium', hall: 'Hall of Heroes', market: 'The Market',
  infirmary: 'The Infirmary', station: 'Rail Station', lighthouse: 'The Lighthouse' }
const WAIT_FOR = ['peacock_capital_boards', 'peacock_board_pavilions_v4', 'peacock_board_roofs_brick',
  'peacock_capital_wall2', 'peacock_capital_wall_gates', 'peacock_capital_wall_trees', 'peacock_clerk']
const GROUNDS = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|sand|red_sand|gravel|stone|andesite|diorite|granite|tuff|calcite|clay|snow_block|dirt_path|mud|packed_mud|terracotta|sandstone|deepslate|cobblestone|mossy_cobblestone)$/
// what a road may be laid over (a town street already there is left as it is)
const NATURAL = /^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|moss_block|sand|red_sand|stone|andesite|diorite|granite|tuff|calcite|clay|snow_block|mud|terracotta|sandstone|deepslate)$/
const STREET = /^minecraft:(dirt_path|gravel|cobblestone|mossy_cobblestone|stone_bricks|mossy_stone_bricks|cracked_stone_bricks|smooth_stone|andesite|polished_andesite|stone|coarse_dirt|packed_mud|mud_bricks|bricks|spruce_planks|oak_planks)$/
const STRIP = /^(minecraft:(beacon|iron_block|lava_cauldron|water_cauldron|cauldron|sea_lantern|lantern|blast_furnace|furnace|smoker|anvil|chipped_anvil|damaged_anvil|smithing_table|grindstone|lectern|cartography_table|bookshelf|brewing_stand|bell|barrel|campfire|glowstone|composter|chest|ladder|glass|glass_pane|oak_pressure_plate|[a-z_]+_bed|[a-z_]+_door|[a-z_]+_sign|[a-z_]+_wall_sign|[a-z_]+_carpet|[a-z_]+_banner)|create:track|bountiful:.+)$/
var running = false

var Heightmap = null, FTB = null, ChunkDimPos = null, BlockPos = null
try { Heightmap = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types'); BlockPos = Java.loadClass('net.minecraft.core.BlockPos') }
catch (e) { console.warn('[peacock] layout: ' + e) }
try {
  FTB = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI')
  ChunkDimPos = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
} catch (e) { console.warn('[peacock] layout: FTB Chunks API not found, claims are not checked: ' + e) }

function log(m) { console.info('[peacock] layout: ' + m) }
function W() { return global.PEACOCK_WORKS }
function key(x, z) { return x + ',' + z }

// ---------------------------------------------------------------- holding chunks loaded (shared with capital_projects.js)
// /forceload tickets per chunk, counted here so two jobs can share a chunk; only chunks this script added are released
var holds = {}
function fl(server, op, cx, cz) { server.runCommandSilent('execute in ' + OW + ' run forceload ' + op + ' ' + (cx * 16) + ' ' + (cz * 16)) }
function hold(server, list, ready) {
  var level = server.overworld(), added = [], seen = {}
  list.forEach(c => {
    var k = key(c[0], c[1])
    if (seen[k]) return
    seen[k] = true
    if (!holds[k]) { holds[k] = 0; fl(server, 'add', c[0], c[1]) }
    holds[k]++
    added.push(k)
  })
  var polls = 0
  var check = () => {
    var missing = 0
    added.forEach(k => { var c = k.split(',').map(Number); try { if (!level.hasChunk(c[0], c[1])) missing++ } catch (e) { } })
    if (missing && polls++ < 120) { server.scheduleInTicks(5, check); return }
    if (missing) log(missing + ' of ' + added.length + ' chunks still not loaded after 30 s; going on')
    ready(added)
  }
  server.scheduleInTicks(2, check)
}
function release(server, added) {
  added.forEach(k => {
    holds[k] = (holds[k] || 1) - 1
    if (holds[k] <= 0) { delete holds[k]; var c = k.split(',').map(Number); fl(server, 'remove', c[0], c[1]) }
  })
}
function chunksOf(box, pad) {
  var out = [], a, b
  for (a = (box[0] - pad) >> 4; a <= (box[2] + pad) >> 4; a++) for (b = (box[1] - pad) >> 4; b <= (box[3] + pad) >> 4; b++) out.push([a, b])
  return out
}

function claimed(level, x, z) {
  if (!FTB) return false
  try {
    var api = FTB.api()
    if (!api.isManagerLoaded()) return false
    return api.getManager().getChunk(new ChunkDimPos(level, new BlockPos(x, 64, z))) != null
  } catch (e) { return false }
}

// ---------------------------------------------------------------- geometry
function overlap(a, b, m) { return a[0] - m <= b[2] && a[2] + m >= b[0] && a[1] - m <= b[3] && a[3] + m >= b[1] }
function boxOf(t) { return [t.x0, t.z0, t.x1, t.z1] }
function cross(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]) }
// convex polygon (either winding): inside or on it
function inside(poly, x, z) {
  var sgn = 0, i
  for (i = 0; i < poly.length; i++) {
    var c = cross(poly[i], poly[(i + 1) % poly.length], [x, z])
    if (c === 0) continue
    if (sgn === 0) sgn = c > 0 ? 1 : -1
    else if ((c > 0 ? 1 : -1) !== sgn) return false
  }
  return true
}
function segDist(p, a, b) {
  var dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz
  var t = l ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l)) : 0
  var qx = a[0] + t * dx - p[0], qz = a[1] + t * dz - p[1]
  return Math.sqrt(qx * qx + qz * qz)
}
function rectDist(box, x, z) {
  var dx = Math.max(box[0] - x, 0, x - box[2]), dz = Math.max(box[1] - z, 0, z - box[3])
  return Math.sqrt(dx * dx + dz * dz)
}
// distance between a box and a convex polygon it does not touch; -1 if they touch or the box is inside
function boxPolyDist(box, poly) {
  var cs = [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]], d = 1e9, i, j
  for (i = 0; i < 4; i++) if (inside(poly, cs[i][0], cs[i][1])) return -1
  for (i = 0; i < poly.length; i++) if (rectDist(box, poly[i][0], poly[i][1]) === 0) return -1
  for (i = 0; i < 4; i++) for (j = 0; j < poly.length; j++) d = Math.min(d, segDist(cs[i], poly[j], poly[(j + 1) % poly.length]))
  for (j = 0; j < poly.length; j++) d = Math.min(d, rectDist(box, poly[j][0], poly[j][1]))
  return d
}
function hull(points) {
  var pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), lower = [], upper = [], i
  if (pts.length < 3) return pts
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
function grownPoly(poly, boxes) {
  var pts = poly.slice()
  boxes.forEach(b => { var m = WORKS_MARGIN; pts.push([b[0] - m, b[1] - m], [b[2] + m, b[1] - m], [b[0] - m, b[3] + m], [b[2] + m, b[3] + m]) })
  return hull(pts)
}
function quadrant(cx, cz, x, z) { var dx = x - cx, dz = z - cz; return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 1 : 3) : (dz > 0 ? 2 : 0) }

// ---------------------------------------------------------------- the terrain, from the generator (nothing loaded)
// grid[key] = [floor y (first open block above solid ground), wet]; grid.pts = [[x, z, distance to the wall], …].
// `dist(x, z)` is the distance from the standing wall, or -1 to leave the point out
function readGrid(server, region, dist, done) {
  var level = server.overworld(), cs = level.getChunkSource(), gen = cs.getGenerator(), rs = cs.randomState()
  var pts = [], grid = {}, x = Math.ceil(region[0] / GRID) * GRID, z, i = 0
  var gather = () => {
    var stop = x + GRID * 6
    for (; x <= region[2] && x < stop; x += GRID)
      for (z = Math.ceil(region[1] / GRID) * GRID; z <= region[3]; z += GRID) { var d = dist(x, z); if (d >= 0) pts.push([x, z, d]) }
    if (x <= region[2]) { server.scheduleInTicks(1, gather); return }
    log('reading the land around the capital (' + pts.length + ' points)')
    step()
  }
  var step = () => {
    try {
      var end = Math.min(i + 60, pts.length)
      for (; i < end; i++) {
        var px = pts[i][0], pz = pts[i][1]
        var floor = gen.getBaseHeight(px, pz, Heightmap.OCEAN_FLOOR_WG, level, rs)
        var top = gen.getBaseHeight(px, pz, Heightmap.WORLD_SURFACE_WG, level, rs)
        grid[key(px, pz)] = [floor, top > floor]
      }
      if (i < pts.length) { server.scheduleInTicks(1, step); return }
      grid.pts = pts
      done(grid)
    } catch (e) { log('reading the land failed — ' + e); done(null) }
  }
  gather()
}
function sampleGrid(grid, box) {
  var ys = [], wet = false, x, z
  for (x = Math.ceil(box[0] / GRID) * GRID; x <= box[2]; x += GRID)
    for (z = Math.ceil(box[1] / GRID) * GRID; z <= box[3]; z += GRID) {
      var g = grid[key(x, z)]
      if (!g) return null
      if (g[1]) wet = true
      ys.push(g[0])
    }
  if (!ys.length) return null
  ys.sort((a, b) => a - b)
  return { y: ys[ys.length >> 1], rise: ys[ys.length - 1] - ys[0], wet: wet }
}

// ---------------------------------------------------------------- choosing lots
// ctx: poly (the wall standing), cx/cz, town (boxes), roads (boxes), fixed [{id, box, outside}], ids, grid, banned, level.
// Returns a planner: step(n) looks at up to n candidate spots and returns true when every lot is chosen; then
// .result = { lots, poly2 (the wall as it will stand), walledBoxes }. Spread over ticks by the caller (KubeJS' Rhino is
// slow; ~10,000 spots per building).
function lotPlanner(ctx) {
  var F = W().FOOT, taken = ctx.fixed.map(f => f.box), sides = [0, 0, 0, 0], lots = {}
  ctx.fixed.forEach(f => { if (!f.outside) sides[quadrant(ctx.cx, ctx.cz, (f.box[0] + f.box[2]) / 2, (f.box[1] + f.box[3]) / 2)]++ })
  var cands = ctx.grid.pts
  var distTo = (poly, c) => { var d = 1e9, i; for (i = 0; i < poly.length; i++) d = Math.min(d, segDist(c, poly[i], poly[(i + 1) % poly.length])); return d }
  var near2 = null
  // the town's buildings by 32-block cell, so a spot only looks at the ones around it
  var buckets = {}
  ctx.town.forEach(t => { var a, b; for (a = (t[0] - 30) >> 5; a <= (t[2] + 30) >> 5; a++) for (b = (t[1] - 30) >> 5; b <= (t[3] + 30) >> 5; b++) { var k = a + ',' + b; (buckets[k] = buckets[k] || []).push(t) } })
  var townNear = (x, z) => buckets[(x >> 5) + ',' + (z >> 5)] || []
  var queue = ctx.ids.filter(id => !F[id].outside).concat(ctx.ids.filter(id => F[id].outside))
  var clear = (box, x, z) => !townNear(x, z).some(t => overlap(box, t, CLEAR_BUILDINGS)) && !taken.some(t => overlap(box, t, CLEAR_BUILDINGS)) &&
    !ctx.roads.some(r => overlap(box, r, CLEAR_ROADS))
  var unclaimed = box => {
    var a, b
    for (a = box[0] >> 4; a <= box[2] >> 4; a++) for (b = box[1] >> 4; b <= box[3] >> 4; b++) if (claimed(ctx.level, a * 16 + 8, b * 16 + 8)) return false
    return true
  }
  var poly2 = null, walledBoxes = null
  // where the gates will be: the town's streets reaching farthest north, east, south and west (as capital_wall.js picks
  // them), so the Lighthouse stands where its road to a gate stays short
  var hints = []
  if (ctx.roads.length) {
    var pick = sc => { var b = ctx.roads[0]; ctx.roads.forEach(r => { if (sc(r) > sc(b)) b = r }); return b }
    var n0 = pick(r => -r[1]), e0 = pick(r => r[2]), s0 = pick(r => r[3]), w0 = pick(r => -r[0])
    hints = [[(n0[0] + n0[2]) / 2, n0[1]], [e0[2], (e0[1] + e0[3]) / 2], [(s0[0] + s0[2]) / 2, s0[3]], [w0[0], (w0[1] + w0[3]) / 2]]
  }
  var wallAsBuilt = () => {
    walledBoxes = ctx.fixed.filter(fx => !fx.outside).map(fx => fx.box)
    Object.keys(lots).forEach(id => { if (lots[id] && !F[id].outside) walledBoxes.push(lots[id].box) })
    poly2 = grownPoly(ctx.poly, walledBoxes)
    near2 = null
  }
  var qi = 0, ci = 0, best = null, bestScore = 1e18
  var planner = { result: null }
  planner.step = n => {
    var budget = n
    while (qi < queue.length && budget > 0) {
      var id = queue[qi], f = F[id].box, out = !!F[id].outside, ban = ctx.banned[id] || {}
      if (out && !poly2) wallAsBuilt()
      // half the box's diagonal: how far its edge can be from its centre
      var reach = Math.sqrt((f[2] - f[0]) * (f[2] - f[0]) + (f[3] - f[1]) * (f[3] - f[1])) / 2 + 2
      for (; ci < cands.length && budget > 0; ci++, budget--) {
        var x = cands[ci][0], z = cands[ci][1]
        if (out) {
          if (!near2) near2 = []
          if (near2[ci] === undefined) near2[ci] = inside(poly2, x, z) ? -1 : distTo(poly2, cands[ci])
          if (near2[ci] < LIGHT_MIN - reach || near2[ci] > LIGHT_MAX + reach) continue
        } else if (cands[ci][2] > MAX_FROM_WALL + reach || cands[ci][2] < CLEAR_WALL - reach) continue
        if (ban[key(x, z)]) continue
        var box = [x + f[0], z + f[1], x + f[2], z + f[3]]
        var d = boxPolyDist(box, out ? poly2 : ctx.poly)
        if (out ? (d < LIGHT_MIN || d > LIGHT_MAX) : (d < CLEAR_WALL || d > MAX_FROM_WALL)) continue
        if (!clear(box, x, z)) continue
        var g = sampleGrid(ctx.grid, box)
        if (!g || g.wet || g.rise > MAX_RISE) continue
        var score
        if (out) {
          var dg = 1e9
          hints.forEach(h => { dg = Math.min(dg, Math.sqrt((h[0] - x) * (h[0] - x) + (h[1] - z) * (h[1] - z))) })
          score = -g.y * 2 + d * 0.3 + g.rise * 4 + (hints.length ? dg * 0.4 : 0)
        }
        else {
          var fx = x, fz = z + f[3] + 1, dRoad = 1e9
          ctx.roads.forEach(r => { dRoad = Math.min(dRoad, rectDist(r, fx, fz)) })
          score = sides[quadrant(ctx.cx, ctx.cz, x, z)] * 40 + d + Math.min(dRoad, 200) * 0.5 + g.rise * 4
        }
        if (score < bestScore && unclaimed(box)) { bestScore = score; best = { x: x, y: g.y, z: z, box: box } }
      }
      if (ci >= cands.length) {
        lots[id] = best
        if (best) { taken.push(best.box); if (!out) sides[quadrant(ctx.cx, ctx.cz, best.x, best.z)]++ }
        qi++; ci = 0; best = null; bestScore = 1e18
      }
    }
    if (qi < queue.length) return false
    if (!poly2) wallAsBuilt()
    planner.result = { lots: lots, poly2: poly2, walledBoxes: walledBoxes }
    return true
  }
  return planner
}
function planLots(ctx) { var p = lotPlanner(ctx); while (!p.step(100000)) { } return p.result }

// ---------------------------------------------------------------- the real ground (chunks loaded)
function soft(b) { return global.PEACOCK_WALL ? global.PEACOCK_WALL.soft(b) : String(b.id) === 'minecraft:air' }
// [y of the first open block above the ground, wet, blocked (something built stands there)]
function ground(level, x, z) {
  var y = level.getHeight(Heightmap.MOTION_BLOCKING_NO_LEAVES, x, z), floor = level.getMinBuildHeight(), b
  while (y > floor + 1) {
    b = level.getBlock(x, y - 1, z)
    if (String(b.id) === 'minecraft:water') return [y, true, false]
    if (!soft(b)) break
    y--
  }
  var id = String(level.getBlock(x, y - 1, z).id)
  return [y, false, !GROUNDS.test(id) && !STREET.test(id)]
}
function checkLot(level, lot) {
  var ys = [], x, z, box = lot.box
  for (x = box[0]; x <= box[2]; x += 2) for (z = box[1]; z <= box[3]; z += 2) {
    var g = ground(level, x, z)
    if (g[1]) return null
    ys.push(g[0])
  }
  ys.sort((a, b) => a - b)
  if (ys[ys.length - 1] - ys[0] > MAX_RISE + 1) return null
  return ys[ys.length >> 1]
}

// ---------------------------------------------------------------- ruins
function rngOf(seed) { var s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }
function decay(level, box, y0, y1, rng) {
  var x, y, z, n = 0, span = Math.max(1, y1 - y0)
  for (x = box[0]; x <= box[2]; x++) for (z = box[1]; z <= box[3]; z++) for (y = y1; y >= y0; y--) {
    var b = level.getBlock(x, y, z), id = String(b.id)
    if (id === 'minecraft:air') continue
    if (STRIP.test(id)) { b.set('minecraft:air'); n++; continue }
    var rel = (y - y0) / span, gone = 0.04 + 0.8 * rel * rel
    if (/_stairs$|_slab$/.test(id)) gone = Math.max(gone, 0.55)
    if (/_planks$|_fence$/.test(id)) gone += 0.15
    if (/_log$|_wood$/.test(id)) gone *= 0.4
    if (rng() < gone) { b.set('minecraft:air'); n++; continue }
    var r = rng()
    if (id === 'minecraft:stone_bricks') { if (r < 0.3) b.set('minecraft:cracked_stone_bricks'); else if (r < 0.45) b.set('minecraft:mossy_stone_bricks') }
    else if (id === 'minecraft:cobblestone' && r < 0.3) b.set('minecraft:mossy_cobblestone')
    else if (/terracotta$/.test(id) && r < 0.2) b.set('minecraft:cobblestone')
  }
  // cobwebs under what is left of the roof
  for (x = box[0]; x <= box[2]; x++) for (z = box[1]; z <= box[3]; z++) for (y = y0 + 1; y < y1; y++) {
    if (String(level.getBlock(x, y, z).id) !== 'minecraft:air') continue
    var above = level.getBlock(x, y + 1, z)
    if (String(above.id) !== 'minecraft:air' && !soft(above) && rng() < 0.07) level.getBlock(x, y, z).set('minecraft:cobweb')
  }
  return n
}
// put the building up whole, then let it fall; nobody moves in
function raiseRuin(server, id, s) {
  var level = server.overworld(), w = W().works(server), f = W().FOOT[id], box = W().footBox(id, s)
  W().BUILD[id](server, w, s)
  W().save(server, w)
  // what the builder told the rest of the pack (the Undertaker's graveyard, the Keeper's lamp) is not there yet
  var pd = server.persistentData, w2 = W().works(server)
  if (id === 'infirmary') { pd.remove('peacock_graveyard'); w2.remove('graveyard') }
  if (id === 'lighthouse') { pd.remove('peacock_lighthouse_lamp'); w2.remove('lamp') }
  var n = decay(level, box, s.y, s.y + f.height, rngOf(s.x * 73856093 ^ s.z * 19349663))
  // the sign beside the front, where the road will come in
  var sx = s.x + 3, sz = box[3] + 2, gy = ground(level, sx, sz)[0]
  W().put(server, sx, gy, sz, 'minecraft:oak_sign[rotation=0]' + W().signText(SHORT[id] || id, 'in ruins', 'Restore it at', 'the Clerk'))
  var sites = w2.getCompound('sites'); sites.putString(id, s.x + ',' + s.y + ',' + s.z); w2.put('sites', sites)
  var ruins = w2.getCompound('ruins'); ruins.putInt(id, 1); w2.put('ruins', ruins)
  var signs = w2.getCompound('ruinSigns'); signs.putString(id, sx + ',' + gy + ',' + sz); w2.put('ruinSigns', signs)
  var bs = String(w2.getString('boxes') || ''); w2.putString('boxes', (bs ? bs + ';' : '') + box.join(','))
  W().save(server, w2)
  log(id + ': ruin at ' + s.x + ',' + s.y + ',' + s.z + ' (' + n + ' blocks fallen or taken)')
}

// ---------------------------------------------------------------- roads
// a small binary heap of [cost, index]
function Heap() { this.a = [] }
Heap.prototype.push = function (c, i) {
  var a = this.a, k = a.length
  a.push([c, i])
  while (k > 0) { var p = (k - 1) >> 1; if (a[p][0] <= a[k][0]) break; var t = a[p]; a[p] = a[k]; a[k] = t; k = p }
}
Heap.prototype.pop = function () {
  var a = this.a, top = a[0], last = a.pop(), k = 0
  if (a.length) {
    a[0] = last
    for (;;) {
      var l = 2 * k + 1, r = l + 1, m = k
      if (l < a.length && a[l][0] < a[m][0]) m = l
      if (r < a.length && a[r][0] < a[m][0]) m = r
      if (m === k) break
      var t = a[m]; a[m] = a[k]; a[k] = t; k = m
    }
  }
  return top
}
// cheapest way from `from` to any cell `isTarget` accepts, inside `region`; null if there is none.
// cell(x, z) -> [y, wet, blocked] or null (off limits)
function route(region, from, isTarget, cell, maxRise) {
  var w = region[2] - region[0] + 1, h = region[3] - region[1] + 1, n = w * h
  var cost = [], prev = [], cache = [], i
  for (i = 0; i < n; i++) { cost.push(1e18); prev.push(-1); cache.push(undefined) }
  var at = (x, z) => (x - region[0]) + (z - region[1]) * w
  var get = (x, z) => {
    if (x < region[0] || x > region[2] || z < region[1] || z > region[3]) return null
    var k = at(x, z)
    if (cache[k] === undefined) cache[k] = cell(x, z)
    return cache[k]
  }
  var start = get(from[0], from[1])
  if (!start) return null
  var heap = new Heap(), s0 = at(from[0], from[1]), D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]], d
  cost[s0] = 0
  heap.push(0, s0)
  while (heap.a.length) {
    var top = heap.pop(), ci = top[1]
    if (top[0] > cost[ci]) continue
    var cx = region[0] + ci % w, cz = region[1] + Math.floor(ci / w)
    if (isTarget(cx, cz)) {
      var path = [], k = ci
      while (k >= 0) { path.push([region[0] + k % w, region[1] + Math.floor(k / w)]); k = prev[k] }
      return path.reverse()
    }
    var here = get(cx, cz)
    for (d = 0; d < 8; d++) {
      var nx = cx + D[d][0], nz = cz + D[d][1], c = get(nx, nz)
      if (!c || c[2]) continue
      if (d >= 4) { var o1 = get(cx + D[d][0], cz), o2 = get(cx, cz + D[d][1]); if (!o1 || o1[2] || !o2 || o2[2]) continue }
      var rise = Math.abs(c[0] - here[0])
      if (rise > maxRise) continue
      var step = (d >= 4 ? 1.414 : 1) + rise * 3 + (c[1] ? 3 : 0)
      var ni = at(nx, nz)
      if (cost[ci] + step < cost[ni]) { cost[ni] = cost[ci] + step; prev[ni] = ci; heap.push(cost[ni], ni) }
    }
  }
  return null
}

// the street block the town uses: the commonest one on its road pieces
function streetBlock(level, roads) {
  var count = {}, best = 'minecraft:dirt_path', n = 0
  roads.forEach(r => {
    var x = (r[0] + r[2]) >> 1, z = (r[1] + r[3]) >> 1
    try {
      if (!level.hasChunk(x >> 4, z >> 4)) return
      var g = ground(level, x, z), id = String(level.getBlock(x, g[0] - 1, z).id)
      if (STREET.test(id)) count[id] = (count[id] || 0) + 1
    } catch (e) { }
  })
  Object.keys(count).forEach(k => { if (count[k] > n) { n = count[k]; best = k } })
  return best
}

// lay a three-wide road along `path`
function pave(level, path, block, rng) {
  var placed = 0, i, a, b, y
  for (i = 0; i < path.length; i++) {
    var p = path[i], g0 = ground(level, p[0], p[1])
    for (a = -1; a <= 1; a++) for (b = -1; b <= 1; b++) {
      var x = p[0] + a, z = p[1] + b, g = ground(level, x, z)
      if (Math.abs(g[0] - g0[0]) > 1 || g[2]) continue
      var top = level.getBlock(x, g[0] - 1, z), id = String(top.id)
      if (g[1]) { top.set('minecraft:spruce_planks'); placed++ }
      else if (NATURAL.test(id) && id !== block) { top.set(rng() < 0.08 ? 'minecraft:coarse_dirt' : block); placed++ }
      for (y = g[0]; y <= g[0] + 3; y++) { var up = level.getBlock(x, y, z); if (String(up.id) !== 'minecraft:air' && soft(up)) up.set('minecraft:air') }
    }
    // a lantern post every 12 blocks, sides taking turns, two out from the middle
    if (i > 0 && i % 12 === 0 && i < path.length - 2) {
      var q = path[i - 1], dx = p[0] - q[0], dz = p[1] - q[1], side = (i / 12) % 2 ? 1 : -1
      var px = p[0] + (dz !== 0 ? 2 * side * (dz > 0 ? 1 : -1) : 0), pz = p[1] + (dx !== 0 ? -2 * side * (dx > 0 ? 1 : -1) : 0)
      if (dx !== 0 && dz !== 0) { px = p[0] + 2 * side; pz = p[1] - 2 * side }
      var gp = ground(level, px, pz)
      if (!gp[1] && !gp[2] && String(level.getBlock(px, gp[0], pz).id) === 'minecraft:air' && String(level.getBlock(px, gp[0] + 1, pz).id) === 'minecraft:air') {
        level.getBlock(px, gp[0], pz).set('minecraft:oak_fence')
        level.getBlock(px, gp[0] + 1, pz).set('minecraft:lantern')
      }
    }
  }
  return placed
}

function roadCells(w) { var s = String(w.getString('roadCells') || ''); return s ? s.split(';') : [] }
// one road: from a building's front to whatever `targets` names; chunks are held around the way, then let go
function road(server, from, targets, avoid, wallCols, done) {
  var level = server.overworld()
  var tgt = null, td = 1e18
  targets.boxes.forEach(r => { var dx = Math.max(r[0] - from[0], 0, from[0] - r[2]), dz = Math.max(r[1] - from[1], 0, from[1] - r[3]); var dd = dx * dx + dz * dz; if (dd < td) { td = dd; tgt = [Math.max(r[0], Math.min(from[0], r[2])), Math.max(r[1], Math.min(from[1], r[3]))] } })
  targets.cells.forEach(c => { var dd = (c[0] - from[0]) * (c[0] - from[0]) + (c[1] - from[1]) * (c[1] - from[1]); if (dd < td) { td = dd; tgt = c } })
  if (!tgt) { done(null); return }
  var m = 20, region = [Math.min(from[0], tgt[0]) - m, Math.min(from[1], tgt[1]) - m, Math.max(from[0], tgt[0]) + m, Math.max(from[1], tgt[1]) + m]
  if (region[2] - region[0] > 220 || region[3] - region[1] > 220) { log('road from ' + from + ': its street is too far (' + Math.round(Math.sqrt(td)) + ' blocks)'); done(null); return }
  var cellSet = {}
  targets.cells.forEach(c => { cellSet[key(c[0], c[1])] = true })
  var isTarget = (x, z) => cellSet[key(x, z)] || targets.boxes.some(r => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3])
  hold(server, chunksOf(region, 1), held => {
    var path = null
    try {
      var cell = (x, z) => {
        if (wallCols[key(x, z)]) return null
        if (!isTarget(x, z) && avoid.some(b => x >= b[0] - 1 && x <= b[2] + 1 && z >= b[1] - 1 && z <= b[3] + 1)) return null
        return ground(level, x, z)
      }
      path = route(region, from, isTarget, cell, 1) || route(region, from, isTarget, cell, 2)
      if (path) {
        var block = targets.block || streetBlock(level, targets.boxes)
        var n = pave(level, path, block, rngOf(from[0] * 31 + from[1]))
        log('road from ' + from.join(',') + ': ' + path.length + ' blocks long, ' + n + ' blocks laid (' + block + ')')
      } else log('road from ' + from.join(',') + ': no way found to ' + tgt.join(','))
    } catch (e) { log('road from ' + from.join(',') + ' failed — ' + e) }
    server.scheduleInTicks(20, () => release(server, held))
    done(path)
  })
}

// ---------------------------------------------------------------- the whole plan
function ready(server) {
  var pd = server.persistentData
  return !!(global.PEACOCK_WALL && W() && WAIT_FOR.every(f => pd.getBoolean(f)))
}

function run(server, reply) {
  if (running) { reply('the town plan is already being laid out'); return }
  var level = server.overworld(), works = W().works(server), F = W().FOOT
  var p0 = global.PEACOCK_WALL.plan(level, global.PEACOCK_WALL.extrasOf(server))
  if (!p0) { reply('no capital at world spawn; nothing to plan'); return }
  running = true
  var sites = works.getCompound('sites'), fixed = [], ids = []
  ORDER.forEach(id => {
    var at = String(sites.getString(id) || '')
    if (at) { var c = at.split(',').map(Number); fixed.push({ id: id, s: { x: c[0], y: c[1], z: c[2] }, box: W().footBox(id, { x: c[0], z: c[2] }), outside: !!F[id].outside }) }
    else ids.push(id)
  })
  var town = p0.townBoxes.map(boxOf), roads = p0.roadBoxes.map(boxOf), poly = p0.hull
  var xs = poly.map(q => q[0]), zs = poly.map(q => q[1]), pad = LIGHT_MAX + MAX_FROM_WALL + 30
  var region = [Math.min.apply(null, xs) - pad, Math.min.apply(null, zs) - pad, Math.max.apply(null, xs) + pad, Math.max.apply(null, zs) + pad]
  reply('laying out the capital: ' + (ids.length ? 'lots for ' + ids.join(', ') : 'no new lots') + (fixed.length ? '; already standing: ' + fixed.map(f => f.id).join(', ') : ''))
  var fail = m => { running = false; reply('town plan stopped — ' + m) }
  var afterLots = (lots, poly2, walledBoxes) => {
    // ruins, one a tick
    var place = ids.filter(id => lots[id])
    var raiseNext = () => {
      if (!place.length) { moveWall(walledBoxes); return }
      var id = place.shift(), lot = lots[id]
      hold(server, chunksOf(lot.box, 3), held => {
        try { raiseRuin(server, id, { x: lot.x, y: lot.y, z: lot.z }) } catch (e) { log(id + ': ruin failed — ' + e) }
        server.scheduleInTicks(40, () => release(server, held))
        server.scheduleInTicks(5, raiseNext)
      })
    }
    raiseNext()
  }
  var moveWall = walledBoxes => {
    var pOld = global.PEACOCK_WALL.plan(level, global.PEACOCK_WALL.extrasOf(server)), pNew = global.PEACOCK_WALL.plan(level, walledBoxes)
    hold(server, global.PEACOCK_WALL.columnsOf(pOld, pNew), held => {
      global.PEACOCK_WALL.regrow(server, walledBoxes, m => log(m), (ok, pW) => {
        server.scheduleInTicks(40, () => release(server, held))
        if (!ok) { fail('the wall did not move'); return }
        layRoads(pW)
      })
    })
  }
  var layRoads = pW => {
    var w = W().works(server), s2 = w.getCompound('sites'), done = w.getCompound('roaded'), all = [], wallCols = {}
    pW.cols.forEach(c => { if (!c.gate) wallCols[key(c.x, c.z)] = true })
    ORDER.forEach(id => {
      var at = String(s2.getString(id) || '')
      if (!at || done.getInt(id)) return
      var c = at.split(',').map(Number)
      all.push({ id: id, s: { x: c[0], y: c[1], z: c[2] }, box: W().footBox(id, { x: c[0], z: c[2] }) })
    })
    var avoid = town.concat(all.map(a => a.box)).concat(fixed.map(f => f.box))
    // nearest the town first, so later roads can join earlier ones; the Lighthouse last
    all.sort((a, b) => (F[a.id].outside ? 1 : 0) - (F[b.id].outside ? 1 : 0) ||
      (Math.abs(a.s.x - pW.cx) + Math.abs(a.s.z - pW.cz)) - (Math.abs(b.s.x - pW.cx) + Math.abs(b.s.z - pW.cz)))
    var block = null
    var next = () => {
      if (!all.length) { finishPlan(); return }
      var a = all.shift(), front = [a.s.x, a.box[3] + 1], cells = roadCells(W().works(server)).map(t => t.split(',').map(Number))
      var targets
      if (F[a.id].outside) {
        // the Lighthouse: to just outside the nearest gate
        var gates = pW.sites.map(st => {
          var g = pW.cols[st.i], dx = g.x - pW.cx, dz = g.z - pW.cz, l = Math.sqrt(dx * dx + dz * dz) || 1
          return [Math.round(g.x + dx / l * 3), Math.round(g.z + dz / l * 3)]
        })
        gates.sort((u, v) => ((u[0] - front[0]) * (u[0] - front[0]) + (u[1] - front[1]) * (u[1] - front[1])) - ((v[0] - front[0]) * (v[0] - front[0]) + (v[1] - front[1]) * (v[1] - front[1])))
        targets = { boxes: [], cells: gates.length ? [gates[0]] : [], block: block }
      } else targets = { boxes: roads, cells: cells, block: block }
      road(server, front, targets, avoid.filter(b => b !== a.box && !(b[0] === a.box[0] && b[1] === a.box[1])), wallCols, path => {
        var w2 = W().works(server)
        if (path) {
          if (!block) block = targets.block || null
          var rc = roadCells(w2)
          path.forEach((q, i) => { if (i % 2 === 0) rc.push(key(q[0], q[1])) })
          w2.putString('roadCells', rc.join(';'))
          var rd = w2.getCompound('roaded'); rd.putInt(a.id, 1); w2.put('roaded', rd)
          W().save(server, w2)
        }
        server.scheduleInTicks(10, next)
      })
    }
    next()
  }
  var finishPlan = () => {
    server.persistentData.putBoolean(FLAG, true)
    running = false
    reply('the capital is laid out: every Works building has its lot, the wall stands around them, roads join them to the town')
  }
  // 1 the land; 2 lots, checked on the real ground (and re-planned if one fails); then the rest
  var far = LIGHT_MAX + MAX_FROM_WALL + 25
  var distWall = (x, z) => {
    if (inside(poly, x, z)) return -1
    var d = 1e9, i
    for (i = 0; i < poly.length; i++) d = Math.min(d, segDist([x, z], poly[i], poly[(i + 1) % poly.length]))
    return d > far ? -1 : d
  }
  if (!ids.length) { afterLots({}, poly, fixed.filter(f => !f.outside).map(f => f.box)); return }
  readGrid(server, region, distWall, grid => {
    if (!grid) { fail('the land could not be read'); return }
    var banned = {}, round = 0
    var attempt = () => {
      var planner = null
      try { planner = lotPlanner({ poly: poly, cx: p0.cx, cz: p0.cz, town: town, roads: roads, fixed: fixed, ids: ids, grid: grid, banned: banned, level: level }) }
      catch (e) { fail('planning failed — ' + e); return }
      var stepPlan = () => {
        var finished = false
        try { finished = planner.step(250) } catch (e) { fail('planning failed — ' + e); return }
        if (finished) checkPlan(planner.result)
        else server.scheduleInTicks(1, stepPlan)
      }
      stepPlan()
    }
    var checkPlan = plan => {
      var chosen = ids.filter(id => plan.lots[id])
      ids.filter(id => !plan.lots[id]).forEach(id => log(id + ': no lot fits; it will be built on open ground when paid for'))
      var need = []
      chosen.forEach(id => { need = need.concat(chunksOf(plan.lots[id].box, 1)) })
      hold(server, need, held => {
        var bad = 0
        try {
          chosen.forEach(id => {
            var lot = plan.lots[id], y = checkLot(level, lot)
            if (y === null) { bad++; banned[id] = banned[id] || {}; banned[id][key(lot.x, lot.z)] = true; log(id + ': lot at ' + lot.x + ',' + lot.z + ' fails on the real ground; looking again') }
            else lot.y = y
          })
          // the wall as it will stand must not cross anyone's claim
          var pNew = global.PEACOCK_WALL.plan(level, plan.walledBoxes), hit = null
          for (var i = 0; i < pNew.cols.length && !hit; i += 4) if (claimed(level, pNew.cols[i].x, pNew.cols[i].z)) hit = pNew.cols[i]
          if (hit) {
            var near = null, nd = 1e18
            chosen.forEach(id => { if (F[id].outside) return; var dd = rectDist(plan.lots[id].box, hit.x, hit.z); if (dd < nd) { nd = dd; near = id } })
            if (near) { bad++; banned[near] = banned[near] || {}; banned[near][key(plan.lots[near].x, plan.lots[near].z)] = true; log(near + ': the wall around it would cross a claim at ' + hit.x + ',' + hit.z + '; looking again') }
          }
        } catch (e) { log('checking lots failed — ' + e) }
        server.scheduleInTicks(20, () => release(server, held))
        if (bad && round++ < 6) { server.scheduleInTicks(25, attempt); return }
        chosen.forEach(id => log(id + ': lot at ' + plan.lots[id].x + ',' + plan.lots[id].y + ',' + plan.lots[id].z))
        afterLots(plan.lots, plan.poly2, plan.walledBoxes)
      })
    }
    attempt()
  })
}

ServerEvents.loaded(event => {
  var server = event.server
  if (server.persistentData.getBoolean(FLAG)) return
  var tries = 0
  var check = () => {
    try {
      if (server.persistentData.getBoolean(FLAG) || running) return
      if (!ready(server)) {
        if (tries++ < 60) server.scheduleInTicks(400, check)
        else log("the capital's first-day jobs never finished; `/peacock layout` runs the plan by hand")
        return
      }
      if (!global.PEACOCK_WALL.plan(server.overworld(), [])) return      // no capital at spawn: nothing to lay out
      run(server, m => log(m))
    } catch (e) { log('failed — ' + e) }
  }
  server.scheduleInTicks(900, check)
})

ServerEvents.commandRegistry(event => {
  var Commands = event.commands
  event.register(Commands.literal('peacock')
    .then(Commands.literal('layout').requires(src => src.hasPermission(2)).executes(ctx => {
      var src = ctx.source
      try { run(src.server, m => { log(m); src.sendSystemMessage(Text.gray(m)) }); return 1 }
      catch (e) { src.sendSystemMessage(Text.red('town plan failed: ' + e)); return 0 }
    })))
})

global.PEACOCK_LAYOUT = { hold: hold, release: release, _test: { planLots: planLots, lotPlanner: lotPlanner, route: route, boxPolyDist: boxPolyDist, hull: hull, inside: inside, sampleGrid: sampleGrid, grownPoly: grownPoly } }
})()
