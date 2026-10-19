// Peacock — the capital's founder and its wall.
//
// THE WALL. CTOV's "fortified" variants are a stone keep in the middle of town, not a wall around it
// (2026-10-18: "no walls around the capital", twice). No village mod on Forge 1.20.1 builds a perimeter, so the
// pack does: once, after the world's first start, this finds the capital's bounding box at world spawn and
// raises a stone-brick wall six blocks outside it — three high with a crenellated top, a lantern pillar every
// eight blocks, towers on the corners, and a gate in the middle of each side. It follows the terrain column by
// column and fills its own foundation down to solid ground. A bounty board stands just inside each gate — those
// four are the capital's boards (a pool-injected board piece won every contested house slot and gave the town
// twenty of them, 2026-10-18).
//
// THE FOUNDER. Worldgen places the capital with a concentric-ring structure set: exactly one position, eight-odd
// chunks from the origin, nudged onto a `#peacock:capital_biomes` biome if one lies within 112 blocks. Nothing
// else in vanilla placement can be told "gentle land, not ocean": a seed whose ring position is mid-ocean (the
// sixth world, 2026-10-19) or in mountains either gets a capital there or — with the strict biome list the pack
// ships now — none at all. So when the server starts and there is no capital at spawn, this script founds one:
// it samples biomes and the generator's terrain height around the origin (no chunks loaded for that), picks the
// flattest spot in the nearest ring of gentle, dry land clear of ruins, force-loads that footprint, generates
// the Terralith fortified village there with the game's own jigsaw code (the `/place structure` path), moves
// the world spawn onto it and walls it. Operators can run it by hand: `/peacock found` (same search),
// `/peacock found here` (at your feet), `force` to found a second capital on purpose.
//
// It runs 10 s after the server loads if it has not run before (server persistentData). `/peacock wall`
// rebuilds the wall in place (harmless). `capitalWall: false` / `capitalFound: false` in
// kubejs/config/peacock.json disable the two halves.
//
// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope — and every loop variable in a
// function has its own name, for the same reason.
;(() => {
const SWITCHES = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const WALL_ON = SWITCHES.capitalWall !== false
const FOUND_ON = SWITCHES.capitalFound !== false
// the capital is Terralith's fortified village since 2026-10-18: a castle town, but — like CTOV's "fortified"
// variants — without a perimeter wall. This script is the wall.
const CAPITALS = [['terralith', 'fortified_village'], ['peacock', 'capital/plains'], ['peacock', 'capital/taiga']]
const MARGIN = 6          // blocks outside the structure's bounding box
const HEIGHT = 3          // wall body; crenellations on top
const PILLAR_EVERY = 8
const GATE_HALF = 1       // gate is 2*GATE_HALF+1 wide

const J = name => Java.loadClass(name)
const RL = (ns, path) => new (J('net.minecraft.resources.ResourceLocation'))(ns, path)

// ------------------------------------------------------------------------------------------ finding the capital
function savedBounds(server) {
  // a capital founded by this script is not registered with the structure manager, so its bounds are kept here
  const s = server.persistentData.getString('peacock_capital_bb')
  if (!s) return null
  const v = s.split(',').map(n => parseInt(n, 10))
  if (v.length !== 6 || v.some(n => isNaN(n))) return null
  return new (J('net.minecraft.world.level.levelgen.structure.BoundingBox'))(v[0], v[1], v[2], v[3], v[4], v[5])
}

function findCapital(server, level) {
  const Registries = J('net.minecraft.core.registries.Registries')
  const reg = level.registryAccess().registryOrThrow(Registries.STRUCTURE)
  const sm = level.structureManager()
  const spawn = level.getSharedSpawnPos()
  for (let i = 0; i < CAPITALS.length; i++) {
    const structure = reg.get(RL(CAPITALS[i][0], CAPITALS[i][1]))
    if (!structure) continue
    const start = sm.getStructureAt(spawn, structure)
    if (start && start.isValid()) return { variant: CAPITALS[i].join(':'), bb: start.getBoundingBox(), spawn: spawn }
  }
  const saved = savedBounds(server)
  if (saved) return { variant: 'founded terralith:fortified_village', bb: saved, spawn: spawn }
  return null
}

// ------------------------------------------------------------------------------------------------- the wall
const SOFT = id => id === 'minecraft:air' || id === 'minecraft:cave_air' || id.endsWith('_leaves') || id.endsWith('_log')
  || id.endsWith('grass') || id.endsWith('fern') || id.endsWith('_bush') || id.endsWith('flower') || id === 'minecraft:snow'
  || id.includes('water') || id.endsWith('_sapling') || id.endsWith('_carpet') || id === 'minecraft:vine' || id.endsWith('mushroom')

function groundY(level, Heightmap, x, z) {
  // first air block above anything that blocks motion (leaves ignored), i.e. one above the ground block
  return level.getHeight(Heightmap.MOTION_BLOCKING_NO_LEAVES, x, z)
}

function brick(rng) {
  const r = rng()
  return r < 0.12 ? 'minecraft:mossy_stone_bricks' : r < 0.2 ? 'minecraft:cracked_stone_bricks' : 'minecraft:stone_bricks'
}

function build(level, bb, log) {
  const Heightmap = J('net.minecraft.world.level.levelgen.Heightmap$Types')
  const x0 = bb.minX() - MARGIN, x1 = bb.maxX() + MARGIN, z0 = bb.minZ() - MARGIN, z1 = bb.maxZ() + MARGIN
  let seed = (x0 * 31 + z0) >>> 0
  const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const cols = []
  for (let ax = x0; ax <= x1; ax++) cols.push([ax, z0, 'n'])
  for (let az = z0 + 1; az <= z1; az++) cols.push([x1, az, 'e'])
  for (let bx = x1 - 1; bx >= x0; bx--) cols.push([bx, z1, 's'])
  for (let bz = z1 - 1; bz > z0; bz--) cols.push([x0, bz, 'w'])
  const midX = Math.floor((x0 + x1) / 2), midZ = Math.floor((z0 + z1) / 2)
  const isGate = (x, z, side) => (side === 'n' || side === 's') ? Math.abs(x - midX) <= GATE_HALF : Math.abs(z - midZ) <= GATE_HALF
  const isGatePost = (x, z, side) => (side === 'n' || side === 's') ? Math.abs(x - midX) === GATE_HALF + 1 : Math.abs(z - midZ) === GATE_HALF + 1
  const isCorner = (x, z) => (x === x0 || x === x1) && (z === z0 || z === z1)
  let placed = 0
  const set = (x, y, z, id, props) => { const b = level.getBlock(x, y, z); props ? b.set(id, props) : b.set(id); placed++ }

  for (let i = 0; i < cols.length; i++) {
    const x = cols[i][0], z = cols[i][1], side = cols[i][2]
    const yg = groundY(level, Heightmap, x, z)
    // foundation: stone down through soft blocks and water to something solid (at most 8)
    for (let fy = yg - 1; fy > yg - 9; fy--) {
      const fid = level.getBlock(x, fy, z).id
      if (!SOFT(fid) && fy < yg - 1) break
      set(x, fy, z, 'minecraft:stone_bricks')
    }
    if (isGate(x, z, side)) {
      for (let gy = yg; gy < yg + HEIGHT; gy++) { if (level.getBlock(x, gy, z).id !== 'minecraft:air') set(x, gy, z, 'minecraft:air') }
      set(x, yg - 1, z, 'minecraft:dirt_path')
      set(x, yg + HEIGHT, z, 'minecraft:stone_bricks')                                   // the arch
      if (Math.abs((side === 'n' || side === 's') ? x - midX : z - midZ) === 0) {
        set(x, yg + HEIGHT - 1, z, 'minecraft:lantern', { hanging: 'true' })
        // the notice board just inside each gate: the capital's bounty boards live here (four, one per gate)
        const ix = side === 'e' ? x - 3 : side === 'w' ? x + 3 : x + 2
        const iz = side === 'n' ? z + 3 : side === 's' ? z - 3 : z + 2
        const by = groundY(level, Heightmap, ix, iz)
        set(ix, by - 1, iz, 'minecraft:dirt_path')
        set(ix, by, iz, 'bountiful:bountyboard')
        set(ix + (side === 'n' || side === 's' ? 1 : 0), by, iz + (side === 'e' || side === 'w' ? 1 : 0), 'minecraft:lantern', { hanging: 'false' })
      }
      continue
    }
    const corner = isCorner(x, z), pillar = corner || isGatePost(x, z, side) || i % PILLAR_EVERY === 0
    const top = yg + HEIGHT + (corner ? 2 : pillar ? 1 : 0)
    for (let wy = yg; wy < top; wy++) set(x, wy, z, brick(rng))
    if (pillar) set(x, top, z, 'minecraft:lantern', { hanging: 'false' })
    else set(x, top, z, 'minecraft:stone_brick_wall')
  }
  log('wall: ' + cols.length + ' columns, ' + placed + ' blocks, from ' + x0 + ',' + z0 + ' to ' + x1 + ',' + z1)
  return placed
}

function runWall(server, log) {
  const level = server.overworld()
  const cap = findCapital(server, level)
  if (!cap) { log('wall: no capital structure at world spawn ' + level.getSharedSpawnPos() + ' — nothing built'); return false }
  log('wall: capital (' + cap.variant + ') bounds ' + cap.bb.minX() + ',' + cap.bb.minZ() + ' to ' + cap.bb.maxX() + ',' + cap.bb.maxZ())
  build(level, cap.bb, log)
  server.persistentData.putBoolean('peacock_capital_wall', true)
  return true
}

// ---------------------------------------------------------------------------------------------- the founder
const GRID = 5, GRID_STEP = 44          // 5x5 samples, ±88 blocks: most of the capital's footprint
const STRICT_SPREAD = 16, LOOSE_SPREAD = 30   // max height difference across the grid, in blocks
const RING_FROM = 6, RING_TO = 62, RING_STEP = 4   // candidate rings, in chunks from the origin

function biomeTag(ns, path) {
  const Registries = J('net.minecraft.core.registries.Registries')
  return J('net.minecraft.tags.TagKey').create(Registries.BIOME, RL(ns, path))
}

function sampler(level) {
  const BlockPos = J('net.minecraft.core.BlockPos')
  const Heightmap = J('net.minecraft.world.level.levelgen.Heightmap$Types')
  const cs = level.getChunkSource()
  const gen = cs.getGenerator()
  const rs = cs.randomState()
  const gentle = biomeTag('peacock', 'capital_biomes')
  const wet = [biomeTag('minecraft', 'is_ocean'), biomeTag('minecraft', 'is_deep_ocean'), biomeTag('minecraft', 'is_river'), biomeTag('minecraft', 'is_beach')]
  const sea = gen.getSeaLevel()
  // the ruins' structure set, to keep the capital off the top of an old town (positional check, no chunk loads)
  let ruins = null
  try {
    const Registries = J('net.minecraft.core.registries.Registries')
    const ResourceKey = J('net.minecraft.resources.ResourceKey')
    const sets = level.registryAccess().registryOrThrow(Registries.STRUCTURE_SET)
    ruins = sets.getHolder(ResourceKey.create(Registries.STRUCTURE_SET, RL('minecraft', 'village'))).orElse(null)
  } catch (e) { ruins = null }
  const state = cs.getGeneratorState()
  return {
    sea: sea,
    biomeAt: (x, z) => level.getBiome(new BlockPos(x, 64, z)),
    isGentle: h => h.is(gentle),
    isWet: h => wet.some(t => h.is(t)),
    // terrain height straight from the generator's noise: no chunk is generated or loaded for this
    heightAt: (x, z) => gen.getBaseHeight(x, z, Heightmap.WORLD_SURFACE_WG, level, rs),
    nearRuin: (cx, cz) => ruins ? state.hasStructureChunkInRange(ruins, cx, cz, 8) : false,
  }
}

// Looks at a 5x5 grid around (x, z). Returns null if the centre is water, else a report.
function survey(S, x, z) {
  let gentleN = 0, wetN = 0, dryN = 0, hmin = 9999, hmax = -9999
  const half = Math.floor(GRID / 2)
  for (let gi = -half; gi <= half; gi++) {
    for (let gj = -half; gj <= half; gj++) {
      const sx = x + gi * GRID_STEP, sz = z + gj * GRID_STEP
      const b = S.biomeAt(sx, sz)
      if (S.isGentle(b)) gentleN++
      if (S.isWet(b)) wetN++
      const h = S.heightAt(sx, sz)
      if (h > S.sea + 1) dryN++
      if (h < hmin) hmin = h
      if (h > hmax) hmax = h
    }
  }
  return { gentle: gentleN, wet: wetN, dry: dryN, spread: hmax - hmin, n: GRID * GRID }
}

// Picks the capital's chunk: the flattest gentle, dry, ruin-free spot in the nearest ring that has one; failing
// that the flattest dry land anywhere in reach; failing that nothing (an all-ocean kilometre around the origin).
function scan(S, log) {
  let loose = null
  for (let R = RING_FROM; R <= RING_TO; R += RING_STEP) {
    const n = Math.max(8, Math.round(2 * Math.PI * R / 6))
    let best = null
    for (let k = 0; k < n; k++) {
      const a = 2 * Math.PI * k / n + R * 0.37      // rotate each ring so candidates do not line up
      const cx = Math.round(Math.cos(a) * R), cz = Math.round(Math.sin(a) * R)
      const x = cx * 16 + 8, z = cz * 16 + 8
      const centre = S.biomeAt(x, z)
      if (S.isWet(centre)) continue
      if (!S.isGentle(centre) && loose && loose.score < 12) continue   // enough looseness in hand; skip the noise
      const r = survey(S, x, z)
      if (r.dry < r.n - 1 || r.wet > 1) continue
      // the fallback: any dry, reasonably flat land, nearest and flattest first
      const looseScore = r.spread + (R - RING_FROM) / RING_STEP * 3 + (r.n - r.gentle)
      if (r.spread <= LOOSE_SPREAD && (!loose || looseScore < loose.score)) loose = { cx: cx, cz: cz, score: looseScore, r: r, R: R }
      // the real thing: gentle biomes almost everywhere, flat, not on a ruin
      if (r.gentle >= r.n - 2 && r.spread <= STRICT_SPREAD && !S.nearRuin(cx, cz) && (!best || r.spread < best.r.spread)) best = { cx: cx, cz: cz, r: r, R: R }
    }
    if (best) { log('found: gentle land at chunk ' + best.cx + ',' + best.cz + ' (ring ' + R + ', height spread ' + best.r.spread + ', ' + best.r.gentle + '/' + best.r.n + ' gentle)'); return best }
  }
  if (loose) { log('found: no gentle ring; nearest dry flat land at chunk ' + loose.cx + ',' + loose.cz + ' (ring ' + loose.R + ', height spread ' + loose.r.spread + ', ' + loose.r.gentle + '/' + loose.r.n + ' gentle)'); return loose }
  return null
}

// Generates the structure's layout (no blocks yet) at a chunk; a few seeds, since a jigsaw start can come out empty.
function layout(level, cx, cz) {
  const Registries = J('net.minecraft.core.registries.Registries')
  const ChunkPos = J('net.minecraft.world.level.ChunkPos')
  const structure = level.registryAccess().registryOrThrow(Registries.STRUCTURE).get(RL('terralith', 'fortified_village'))
  if (!structure) throw new Error('terralith:fortified_village is not registered')
  const cs = level.getChunkSource(), gen = cs.getGenerator()
  for (let attempt = 0; attempt < 4; attempt++) {
    const start = structure.generate(level.registryAccess(), gen, gen.getBiomeSource(), cs.randomState(), level.getStructureManager(),
      level.getSeed() + attempt, new ChunkPos(cx, cz), 0, level, b => true)
    if (start && start.isValid()) return start
  }
  return null
}

function place(level, start, log) {
  const ChunkPos = J('net.minecraft.world.level.ChunkPos')
  const BoundingBox = J('net.minecraft.world.level.levelgen.structure.BoundingBox')
  const bb = start.getBoundingBox()
  const cs = level.getChunkSource(), gen = cs.getGenerator()
  const yLo = level.getMinBuildHeight(), yHi = level.getMaxBuildHeight() - 1
  let chunks = 0
  for (let px = bb.minX() >> 4; px <= bb.maxX() >> 4; px++) {
    for (let pz = bb.minZ() >> 4; pz <= bb.maxZ() >> 4; pz++) {
      if (!level.hasChunk(px, pz)) level.getChunk(px, pz)   // the few the force-load window missed
      start.placeInChunk(level, level.structureManager(), gen, level.getRandom(),
        new BoundingBox(px * 16, yLo, pz * 16, px * 16 + 15, yHi, pz * 16 + 15), new ChunkPos(px, pz))
      chunks++
    }
  }
  log('found: placed the capital over ' + chunks + ' chunks, bounds ' + bb.minX() + ',' + bb.minZ() + ' to ' + bb.maxX() + ',' + bb.maxZ())
  return bb
}

// The whole founding, in stages: survey (now), force-load the footprint (ticket, asynchronous), wait for the
// chunks, place, move spawn, wall. `where` is {cx, cz} or null for the search; `force` founds beside an existing capital.
function found(server, where, force, log) {
  const level = server.overworld()
  const existing = findCapital(server, level)
  if (existing && !force) { log('found: a capital already stands at spawn (' + existing.variant + '); `/peacock found force` to found another'); return false }
  const BlockPos = J('net.minecraft.core.BlockPos')
  const Heightmap = J('net.minecraft.world.level.levelgen.Heightmap$Types')
  let pick = where
  if (!pick) {
    const t0 = Date.now()
    pick = scan(sampler(level), log)
    log('found: survey took ' + (Date.now() - t0) + ' ms')
    if (!pick) { log('found: no dry land within ' + RING_TO * 16 + ' blocks of the origin — nothing founded'); return false }
  }
  const start = layout(level, pick.cx, pick.cz)
  if (!start) { log('found: the fortified village layout came out empty at chunk ' + pick.cx + ',' + pick.cz); return false }
  const bb = start.getBoundingBox()
  const c0x = bb.minX() >> 4, c0z = bb.minZ() >> 4, c1x = bb.maxX() >> 4, c1z = bb.maxZ() >> 4
  // /forceload takes at most 256 chunks per command; the footprint is ~15x15, split in two to stay under
  const midz = Math.floor((c0z + c1z) / 2)
  const cmds = [
    'forceload add ' + (c0x * 16) + ' ' + (c0z * 16) + ' ' + (c1x * 16 + 15) + ' ' + (midz * 16 + 15),
    'forceload add ' + (c0x * 16) + ' ' + ((midz + 1) * 16) + ' ' + (c1x * 16 + 15) + ' ' + (c1z * 16 + 15),
  ]
  cmds.forEach(c => server.runCommandSilent(c))
  const total = (c1x - c0x + 1) * (c1z - c0z + 1)
  log('found: generating ' + total + ' chunks for the capital at chunk ' + pick.cx + ',' + pick.cz + ' …')
  let polls = 0
  const tick = () => {
    let ready = 0
    for (let qx = c0x; qx <= c1x; qx++) for (let qz = c0z; qz <= c1z; qz++) if (level.hasChunk(qx, qz)) ready++
    polls++
    if (ready < total && polls < 180) {       // up to three minutes; then load the rest synchronously in place()
      if (polls % 10 === 0) log('found: ' + ready + '/' + total + ' chunks ready')
      server.scheduleInTicks(20, tick)
      return
    }
    try {
      place(level, start, log)
      const sx = pick.cx * 16 + 8, sz = pick.cz * 16 + 8
      const sy = level.getHeight(Heightmap.MOTION_BLOCKING_NO_LEAVES, sx, sz)
      level.setDefaultSpawnPos(new BlockPos(sx, sy, sz), 0.0)
      server.persistentData.putString('peacock_capital_bb', [bb.minX(), bb.minY(), bb.minZ(), bb.maxX(), bb.maxY(), bb.maxZ()].join(','))
      server.persistentData.putBoolean('peacock_capital_founded', true)
      log('found: world spawn moved to ' + sx + ',' + sy + ',' + sz)
      if (WALL_ON) { build(level, bb, log); server.persistentData.putBoolean('peacock_capital_wall', true) }
    } catch (e) {
      log('found: failed while placing — ' + e)
    } finally {
      cmds.forEach(c => server.runCommandSilent(c.replace('forceload add', 'forceload remove')))
    }
  }
  server.scheduleInTicks(20, tick)
  return true
}

// ------------------------------------------------------------------------------------------------- wiring
ServerEvents.loaded(event => {
  const server = event.server
  if (server.persistentData.getBoolean('peacock_capital_wall')) return
  server.scheduleInTicks(200, () => {
    const log = m => console.info('[peacock] ' + m)
    try {
      const level = server.overworld()
      if (findCapital(server, level)) { if (WALL_ON) runWall(server, log) }
      else if (FOUND_ON && !server.persistentData.getBoolean('peacock_capital_founded')) found(server, null, false, log)
      else log('wall: no capital structure at world spawn ' + level.getSharedSpawnPos() + ' — nothing built')
    } catch (e) { console.error('[peacock] capital: failed — ' + e + '. `/peacock wall` or `/peacock found` to retry.') }
  })
})

ServerEvents.commandRegistry(event => {
  const { commands: Commands } = event
  const logger = src => m => { console.info('[peacock] ' + m); src.sendSystemMessage(Text.gray(m)) }
  const guard = (src, fn) => {
    try { return fn() ? 1 : 0 }
    catch (e) { src.sendSystemMessage(Text.red('failed: ' + e)); console.error('[peacock] ' + e); return 0 }
  }
  event.register(Commands.literal('peacock')
    .then(Commands.literal('wall')
      .requires(src => src.hasPermission(2))
      .executes(ctx => guard(ctx.source, () => runWall(ctx.source.server, logger(ctx.source)))))
    .then(Commands.literal('found')
      .requires(src => src.hasPermission(2))
      .executes(ctx => guard(ctx.source, () => found(ctx.source.server, null, false, logger(ctx.source))))
      .then(Commands.literal('force')
        .executes(ctx => guard(ctx.source, () => found(ctx.source.server, null, true, logger(ctx.source)))))
      .then(Commands.literal('here')
        .executes(ctx => guard(ctx.source, () => {
          const p = ctx.source.getPosition()
          return found(ctx.source.server, { cx: Math.floor(p.x) >> 4, cz: Math.floor(p.z) >> 4 }, true, logger(ctx.source))
        })))))
})
})()
