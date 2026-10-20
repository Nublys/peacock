// Peacock — only the capital at spawn is alive (Aaron, 2026-10-20).
//
// The capital is a scattered structure (peacock:capital, one candidate per ~2,000 blocks; see tools/gen-ruins.py), so
// other copies of it generate far out in the world. Aaron wants the spawn capital to be the only living old town:
// every other copy's villagers become zombie villagers the moment the town generates (curable, as in the ruins —
// "cure the zombie villagers ... and found a new town on the old bones"), and its iron golems and guards are removed.
//
// What is touched: a villager, iron golem or guard that joins the world inside a peacock:capital that is NOT the one
// at world spawn, in a chunk players have spent (almost) no time in — i.e. created with the town at worldgen.
// What is never touched: the spawn capital; Village Recruits towns (their villagers appear only after a player
// arrives, and anything inside a VR tower's area is skipped anyway); villagers players bring or breed later (the
// chunk has inhabited time by then); anything already checked once (persistent tag).
// If world spawn is not in a capital at all, nothing is touched.
//
// The work happens one tick after the join, never inside it: a worldgen entity joins while its chunk is being
// promoted to full, and a chunk or structure lookup from inside that can block (the Supplementaries road-sign hang).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const TYPES = { 'minecraft:villager': 'zombify', 'minecraft:iron_golem': 'remove', 'guardvillagers:guard': 'remove' }
const CHECKED = 'peacock_dead_capital_checked'
const FRESH_TICKS = 20          // chunk inhabited time below this = generated just now, no player has been here
var spawnStart = undefined      // "x,z" of the spawn capital's start chunk; null = spawn has no capital; undefined = not known yet
const logged = {}

function structure(level, ns, path) {
  var Registries = Java.loadClass('net.minecraft.core.registries.Registries')
  var ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
  return level.registryAccess().registryOrThrow(Registries.STRUCTURE).get(new ResourceLocation(ns, path))
}

function startKey(level, pos, s) {
  if (!s) return null
  var start = level.structureManager().getStructureAt(pos, s)
  if (!start || !start.isValid()) return null
  var c = start.getChunkPos()
  return Number(c.x) + ',' + Number(c.z)
}

function spawnCapital(level, cap) {
  if (spawnStart !== undefined) return spawnStart
  var key = startKey(level, level.getSharedSpawnPos(), cap)
  if (key) spawnStart = key
  return key   // null now may become known later (spawn chunks still loading): not cached
}

function zombify(level, v) {
  var CompoundTag = Java.loadClass('net.minecraft.nbt.CompoundTag')
  var old = v.nbt
  var tag = new CompoundTag()
  var keep = ['VillagerData', 'Offers', 'Xp']
  for (var i = 0; i < keep.length; i++) { if (old.contains(keep[i])) tag.put(keep[i], old.get(keep[i])) }
  tag.putBoolean('PersistenceRequired', true)
  if (old.contains('Age') && old.getInt('Age') < 0) tag.putBoolean('IsBaby', true)
  var z = level.createEntity('minecraft:zombie_villager')
  z.setPosition(v.x, v.y, v.z)
  z.mergeNbt(tag)
  z.spawn()
}

function check(level, e) {
  if (!e.isAlive()) return
  var pd = e.persistentData
  if (pd.getBoolean(CHECKED)) return
  pd.putBoolean(CHECKED, true)
  if (String(level.dimension) !== 'minecraft:overworld') return
  var pos = e.blockPosition()
  if (Number(level.getChunkAt(pos).getInhabitedTime()) >= FRESH_TICKS) return
  var cap = structure(level, 'peacock', 'capital')
  var here = startKey(level, pos, cap)
  if (!here) return
  var home = spawnCapital(level, cap)
  if (!home || here === home) return
  if (startKey(level, pos, structure(level, 'village_recruits', 'tower_spawner'))) return
  var what = TYPES[String(e.type)]
  if (what === 'zombify') zombify(level, e)
  e.discard()
  if (!logged[here]) { logged[here] = true; console.info('[peacock] dead capital at chunk ' + here + ': its villagers are zombies (spawn capital ' + home + ')') }
}

EntityEvents.spawned(event => {
  var e = event.entity
  if (!TYPES[String(e.type)]) return
  var level = event.level
  if (level.isClientSide()) return
  level.server.scheduleInTicks(1, () => { try { check(level, e) } catch (err) { console.warn('[peacock] dead capital: ' + err) } })
})
})()
