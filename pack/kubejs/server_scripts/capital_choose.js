// Peacock — on a new world, the capital is the flattest one nearby, not just the nearest (2026-10-28).
//
// Aaron: "The town is also really stacked on top of each. Farms spawning on top of each other, some spawning
// underground. I understand this is fixed for this world, but the next one?" … "Awesome, make that update too."
// The capital is a large CTOV town (peacock:capital, one possible spot per 128 x 128 chunks, kept only where its centre
// is on a #peacock:capital_biomes biome) reaching ~116 blocks from its centre. Each piece settles at the ground height
// where it lands, so on a hillside one farm slides in under another and rigid buildings sink in. Only the centre's biome
// is ever checked, never the lie of the land. Village Spawn Point puts the world spawn in the nearest capital.
//
// Here, when a new world first loads (before anyone can join, and before the scripts that build at spawn run): every
// possible capital spot within RADIUS blocks of the origin is found from the structure set's own placement (no chunk
// is loaded or generated), kept if its centre's biome qualifies, and scored by the spread of 25 terrain heights over
// +-100 blocks read from the world generator, plus a little for distance. The world spawn moves to the best. The town
// there generates as normal the first time anyone goes near. An existing world is left alone.
// Log lines: `[peacock] capital: N possible spots …`, then `spawn moved to …` (or why not).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// every loop variable declared before its loops.
;(() => {
const FLAG = 'peacock_capital_chosen'
const RADIUS = 4500
const SPAN = 100, STEP = 50

function log(m) { console.info('[peacock] capital: ' + m) }

function choose(server) {
  var level = server.overworld()
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
  var TagKey = Java.loadClass('net.minecraft.tags.TagKey')
  var Heightmap = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
  var set = level.registryAccess().registryOrThrow(Registries.STRUCTURE_SET).get(new RL('peacock', 'capital'))
  if (!set) { log('no peacock:capital structure set; spawn left where it is'); return }
  var placement = set.placement()
  var cs = level.getChunkSource(), state = cs.getGeneratorState(), gen = cs.getGenerator(), rs = cs.randomState()
  var spacing = placement.spacing(), separation = placement.separation()
  var tag = TagKey.create(Registries.BIOME, new RL('peacock', 'capital_biomes'))
  var regions = Math.ceil(RADIUS / 16 / spacing), rx, rz, dx, dz, spots = []
  // a region's one possible chunk lies in its first (spacing - separation) chunks along each axis
  for (rx = -regions; rx < regions; rx++) for (rz = -regions; rz < regions; rz++) {
    var hit = null
    for (dx = 0; dx < spacing - separation && !hit; dx++) for (dz = 0; dz < spacing - separation && !hit; dz++) {
      var cx = rx * spacing + dx, cz = rz * spacing + dz
      if (placement.isStructureChunk(state, cx, cz)) hit = [cx, cz]
    }
    if (hit) spots.push(hit)
  }
  var height = (x, z) => gen.getBaseHeight(x, z, Heightmap.WORLD_SURFACE_WG, level, rs)
  var floor = (x, z) => gen.getBaseHeight(x, z, Heightmap.OCEAN_FLOOR_WG, level, rs)
  var best = null, ranked = [], kept = 0, inRange = 0, sp = level.getSharedSpawnPos(), here = null
  spots.forEach(c => {
    var x0 = c[0] * 16, z0 = c[1] * 16, dist = Math.sqrt(x0 * x0 + z0 * z0)
    if (dist > RADIUS) return
    inRange++
    var y0 = height(x0, z0)
    var biome = gen.getBiomeSource().getNoiseBiome(x0 >> 2, y0 >> 2, z0 >> 2, rs.sampler())
    if (!biome.is(tag)) return
    kept++
    var hs = [], wet = 0, a, b
    for (a = -SPAN; a <= SPAN; a += STEP) for (b = -SPAN; b <= SPAN; b += STEP) {
      var t = height(x0 + 8 + a, z0 + 8 + b), f = floor(x0 + 8 + a, z0 + 8 + b)
      hs.push(f)
      if (t > f) wet++
    }
    var spread = Math.max.apply(null, hs) - Math.min.apply(null, hs)
    var score = spread + wet * 4 + dist / 500
    var info = { x: x0 + 8, z: z0 + 8, y: y0, spread: spread, wet: wet, score: score }
    if (Math.abs(info.x - sp.getX()) < 160 && Math.abs(info.z - sp.getZ()) < 160) here = info
    ranked.push(info)
  })
  // best first; the game checks the biome at the town's first piece, a little off the chunk corner read here, so the
  // one chosen is the best where a capital really stands (its start is worked out; nothing is built yet)
  ranked.sort((a, b) => a.score - b.score)
  var BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
  var capital = level.registryAccess().registryOrThrow(Registries.STRUCTURE).get(new RL('peacock', 'capital'))
  for (var r = 0; r < ranked.length && r < 6 && !best; r++) {
    var cand = ranked[r]
    try {
      var start = capital ? level.structureManager().getStructureAt(new BlockPos(cand.x, cand.y, cand.z), capital) : null
      if (start && start.isValid()) best = cand
      else log('no capital stands at ' + cand.x + ', ' + cand.z + ' after all; next')
    } catch (e) { log('could not check ' + cand.x + ', ' + cand.z + ': ' + e) }
  }
  log(inRange + ' possible spots within ' + RADIUS + ' blocks, ' + kept + ' on capital land' +
      (here ? '; the nearest (where spawn is) spreads ' + here.spread + ' blocks' : ''))
  if (!best) { log('none qualifies; spawn left where it is'); return }
  if (here && here.x === best.x && here.z === best.z) { log('the nearest is also the flattest (' + best.spread + ' blocks of rise); spawn stays'); return }
  server.runCommandSilent('setworldspawn ' + best.x + ' ' + (best.y + 1) + ' ' + best.z)
  log('spawn moved to ' + best.x + ', ' + (best.y + 1) + ', ' + best.z + ': ' + best.spread + ' blocks of rise across the town' +
      (best.wet ? ', ' + best.wet + ' of 25 samples wet' : '') + (here ? ' (the nearest had ' + here.spread + ')' : ''))
}

ServerEvents.loaded(event => {
  var server = event.server, pd = server.persistentData
  if (pd.getBoolean(FLAG)) return
  pd.putBoolean(FLAG, true)
  try {
    if (Number(server.overworld().getGameTime()) > 1200) { log('an existing world: the capital stays where it is'); return }
    var t0 = Date.now()
    choose(server)
    log('looked in ' + (Date.now() - t0) + ' ms')
  } catch (e) { console.warn('[peacock] capital: choosing the flattest failed, spawn left where it is — ' + e) }
})
})()
