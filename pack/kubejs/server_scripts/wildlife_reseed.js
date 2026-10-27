// Peacock — wildlife for land generated before the animal replacement (2026-10-23).
//
// Aaron, planning it: "Could you spawn in that new wild life so the already gened stuff isnt bare". Animania replaced
// the vanilla animals at world generation, so with Animania gone every chunk generated before had its cows, sheep,
// pigs, chickens, rabbits, goats, foxes and the rest removed with it, and Minecraft only places a biome's animals once,
// when a chunk is generated. Naturalist's animals likewise only appear in new land.
// So each overworld chunk that was generated before this script existed gets, once, the same pass Minecraft runs when
// it generates a chunk (NaturalSpawner.spawnMobsForChunkGeneration: the biome's animals, at the biome's density,
// vanilla and modded alike). It happens when a player first loads the chunk again, two chunks per tick.
//   • A chunk generated from now on is generated with its animals and marked done as it appears (ChunkEvent.Load
//     with isNewChunk(), relayed by startup_scripts/forge_hooks.js); an old chunk is one read from disk unmarked.
//   • Claimed land (FTB Chunks) and the capital are skipped: no lion appears in anyone's base or in the streets.
//   • Done chunks are remembered per region (32 × 32 chunks) as a 1024-bit string in server persistentData
//     `peacock_reseed`, so nothing is seeded twice, across restarts.
// Switch: "wildlifeReseed" in kubejs/config/peacock.json (false = off; done chunks stay done).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants,
// loop variables declared before their loops.
;(() => {
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const ON = CFG.wildlifeReseed !== false
const KEY = 'peacock_reseed'
const PER_TICK = 2

const NaturalSpawner = Java.loadClass('net.minecraft.world.level.NaturalSpawner')
const ChunkPos = Java.loadClass('net.minecraft.world.level.ChunkPos')
const BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const Heightmap = Java.loadClass('net.minecraft.world.level.levelgen.Heightmap$Types')
let FTB = null, ChunkDimPos = null
try {
  FTB = Java.loadClass('dev.ftb.mods.ftbchunks.api.FTBChunksAPI')
  ChunkDimPos = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
} catch (e) { console.warn('[peacock] reseed: FTB Chunks API not found, claimed land is not skipped: ' + e) }

// ---------------------------------------------------------------- done chunks, one bit each
var cache = {}, dirty = {}, anyDirty = false
function regionKey(cx, cz) { return (cx >> 5) + ',' + (cz >> 5) }
function bits(server, k) {
  if (cache[k]) return cache[k]
  var s = String(server.persistentData.getCompound(KEY).getString(k) || ''), a = [], i
  for (i = 0; i < 32; i++) a.push(s.length === 256 ? (parseInt(s.substring(i * 8, i * 8 + 8), 16) | 0) : 0)
  cache[k] = a
  return a
}
function isDone(server, cx, cz) {
  var idx = ((cz & 31) << 5) | (cx & 31)
  return ((bits(server, regionKey(cx, cz))[idx >> 5] >>> (idx & 31)) & 1) === 1
}
function markDone(server, cx, cz) {
  var k = regionKey(cx, cz), idx = ((cz & 31) << 5) | (cx & 31), a = bits(server, k)
  a[idx >> 5] = a[idx >> 5] | (1 << (idx & 31))
  dirty[k] = true
  anyDirty = true
}
function flush(server) {
  var c = server.persistentData.getCompound(KEY)
  Object.keys(dirty).forEach(k => c.putString(k, cache[k].map(n => ('00000000' + (n >>> 0).toString(16)).slice(-8)).join('')))
  server.persistentData.put(KEY, c)
  dirty = {}
  anyDirty = false
}

// ---------------------------------------------------------------- where not to put animals
var capitalBox = undefined          // [x0, z0, x1, z1] in chunks, null if there is no capital; found once
function capital(level) {
  if (capitalBox !== undefined) return capitalBox
  capitalBox = null
  try {
    var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
    var RL = Java.loadClass('net.minecraft.resources.ResourceLocation')
    var s = level.registryAccess().registryOrThrow(Registries.STRUCTURE).get(new RL('peacock', 'capital'))
    var start = s ? level.structureManager().getStructureAt(level.getSharedSpawnPos(), s) : null
    if (start && start.isValid()) {
      var bb = start.getBoundingBox()
      capitalBox = [(bb.minX() >> 4) - 1, (bb.minZ() >> 4) - 1, (bb.maxX() >> 4) + 1, (bb.maxZ() >> 4) + 1]
    }
  } catch (e) { console.warn('[peacock] reseed: capital lookup: ' + e) }
  return capitalBox
}
// true: skip; false: seed; null: cannot tell yet (claims not loaded), try again later
function skip(level, cx, cz) {
  var b = capital(level)
  if (b && cx >= b[0] && cx <= b[2] && cz >= b[1] && cz <= b[3]) return true
  if (!FTB) return false
  try {
    var api = FTB.api()
    if (!api.isManagerLoaded()) return null
    return api.getManager().getChunk(new ChunkDimPos(level, new BlockPos(cx * 16, 64, cz * 16))) != null
  } catch (e) { return false }
}

function seed(level, cx, cz) {
  var x = cx * 16 + 8, z = cz * 16 + 8
  var y = level.getHeight(Heightmap.WORLD_SURFACE, x, z)
  NaturalSpawner.spawnMobsForChunkGeneration(level, level.getBiome(new BlockPos(x, y, z)), new ChunkPos(cx, cz), level.getRandom())
}

// ---------------------------------------------------------------- old chunks in, a few per tick out
var queue = [], queued = {}, seeded = 0, skipped = 0, lastReport = 0

global.PEACOCK_ON_CHUNK_LOAD = !ON ? null : event => {
  var level = event.getLevel()
  if (!level || level.isClientSide() || String(level.dimension) !== 'minecraft:overworld') return
  var pos = event.getChunk().getPos(), cx = pos.x, cz = pos.z, server = level.server
  if (event.isNewChunk()) { markDone(server, cx, cz); return }
  if (isDone(server, cx, cz) || queued[cx + ',' + cz]) return
  queued[cx + ',' + cz] = true
  queue.push([cx, cz])
}

ServerEvents.tick(event => {
  if (!ON) return
  var server = event.server
  try {
    var level = server.overworld(), n = 0
    while (queue.length && n < PER_TICK) {
      var c = queue[0]
      var s = isDone(server, c[0], c[1]) || !level.hasChunk(c[0], c[1]) ? true : skip(level, c[0], c[1])
      if (s === null) break                                 // claims not loaded yet: keep the queue for later
      queue.shift()
      delete queued[c[0] + ',' + c[1]]
      if (isDone(server, c[0], c[1]) || !level.hasChunk(c[0], c[1])) continue   // unloaded since: it comes back
      markDone(server, c[0], c[1])
      n++
      if (s) { skipped++; continue }
      seed(level, c[0], c[1])
      seeded++
    }
    if (anyDirty && server.tickCount % 20 === 0) flush(server)
    if ((seeded || skipped) && server.tickCount - lastReport > 6000) {
      console.info('[peacock] reseed: ' + seeded + ' old chunks given their wildlife, ' + skipped + ' skipped (claimed or the capital) since the last report')
      seeded = 0; skipped = 0; lastReport = server.tickCount
    }
  } catch (e) { console.warn('[peacock] reseed: ' + e) }
})

ServerEvents.unloaded(event => { if (anyDirty) flush(event.server) })
})()
