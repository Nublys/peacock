// Peacock — at most four bats around each player (2026-10-23).
//
// Aaron: "Why do bats use up so much? If there is a fix for them that is better then removing them." A bat costs about
// a quarter of a villager (spark: block collision every tick because it is always flying, the base entity checks, and
// every mod's per-creature hook); the profile simply held 14 of them, because Minecraft fills the cave-creature cap
// (about 15 per player) and bats are the only creature in it, so a lower spawn weight changes nothing. Bats stay, but
// once a second the bats within 128 blocks of each player are counted, and a bat appearing near a player who already
// has four around is cancelled. The check at spawn is a lookup of that count (bumped as bats are let in), so the many
// cancelled spawn attempts cost next to nothing. Bats saved in a chunk beyond the limit vanish when it loads.
// Replaces the biome modifier that removed bat spawns earlier the same day. Switch: "batCap" (number, default 4;
// false = vanilla).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants; event.cancel() last.
;(() => {
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const LIMIT = CFG.batCap === false ? -1 : (typeof CFG.batCap === 'number' ? CFG.batCap : 4)
const RANGE = 128
const BAT = Java.loadClass('net.minecraft.world.entity.EntityType').BAT
var counts = {}                       // player uuid → bats within RANGE, refreshed every second

ServerEvents.tick(event => {
  if (LIMIT < 0) return
  var server = event.server
  if (server.tickCount % 20 !== 13) return
  try {
    var next = {}
    server.getAllLevels().forEach(level => {
      var players = level.players
      if (players.isEmpty()) return
      var bats = level.getEntities(BAT, e => true)
      players.forEach(p => {
        var n = 0
        bats.forEach(b => { if (Math.abs(b.x - p.x) <= RANGE && Math.abs(b.z - p.z) <= RANGE) n++ })
        next[String(p.uuid)] = n
      })
    })
    counts = next
  } catch (e) { console.warn('[peacock] bat cap: ' + e) }
})

EntityEvents.spawned('minecraft:bat', event => {
  if (LIMIT < 0) return
  var bat = event.entity, best = null, bestD = RANGE * RANGE
  event.level.players.forEach(p => {
    var dx = p.x - bat.x, dz = p.z - bat.z, d = dx * dx + dz * dz
    if (d <= bestD) { bestD = d; best = p }
  })
  if (!best) return
  var key = String(best.uuid), n = counts[key] || 0
  if (n < LIMIT) { counts[key] = n + 1; return }
  event.cancel()
})
})()
