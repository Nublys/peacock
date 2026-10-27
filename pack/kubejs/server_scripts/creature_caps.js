// Peacock — gentle caps on fish near players and on otter group size (2026-10-24).
//
// The 2026-10-24 profile (one player, 20 TPS) had ocean fish at 4% of the tick and eight otters at 2%. Aaron: "Make all
// those changes ... but don't be so aggressive with the mob caps." So both stay common, just not crowded:
//   fish:   at most 12 fish (any kind: cod, salmon, tropical, puffer, Aquaculture's) within 128 blocks of a player.
//           Minecraft's own limit is about 20 per player, and fish come and go constantly (they despawn when far), so
//           the cap mostly trims the churn. Same scheme as the bat cap (bat_cap.js): counted once a second, and a fish
//           appearing near a player who already has 12 around is cancelled. Fish from a bucket or with a name are never
//           touched.
//   otters: Critters & Companions spawns them in rivers in groups of two to four; a fourth otter within 16 blocks of
//           three others is cancelled, so groups top out at three. Babies, tamed and named otters are never touched.
// Switches in kubejs/config/peacock.json: "fishCap" (number, default 12; false = vanilla), "otterGroup" (default 3;
// false = the mod's own).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no Math constants; event.cancel() last; no distanceTo.
;(() => {
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const FISH_MAX = CFG.fishCap === false ? -1 : (typeof CFG.fishCap === 'number' ? CFG.fishCap : 12)
const OTTER_MAX = CFG.otterGroup === false ? -1 : (typeof CFG.otterGroup === 'number' ? CFG.otterGroup : 3)
const RANGE = 128
let FISH = null
try { FISH = Java.loadClass('net.minecraft.world.entity.animal.AbstractFish') } catch (e) { console.warn('[peacock] creature caps: ' + e) }
var fishCounts = {}                   // player uuid → fish within RANGE, refreshed every second

// Java.loadClass gives the class's static side only, so Class.isInstance is not there ("no public instance field or
// method named isInstance", 2026-10-26, every entity join); Rhino's own instanceof works on it
const FISH_IDS = { 'minecraft:cod': true, 'minecraft:salmon': true, 'minecraft:tropical_fish': true, 'minecraft:pufferfish': true }
function isFish(e) {
  if (!FISH) return false
  try { return e instanceof FISH } catch (x) { return FISH_IDS[String(e.type)] === true }
}
function spared(e) {                  // a fish or otter someone cares about
  if (e.hasCustomName()) return true
  var nbt = e.nbt
  return nbt && (nbt.getBoolean('FromBucket') || nbt.contains('Owner'))
}

ServerEvents.tick(event => {
  if (FISH_MAX < 0 || !FISH) return
  var server = event.server
  if (server.tickCount % 20 !== 7) return
  try {
    var next = {}
    server.getAllLevels().forEach(level => {
      var players = level.players
      if (players.isEmpty()) return
      var fish = []
      level.getEntities().forEach(e => { if (isFish(e)) fish.push(e) })
      players.forEach(p => {
        var n = 0
        fish.forEach(f => { if (Math.abs(f.x - p.x) <= RANGE && Math.abs(f.z - p.z) <= RANGE) n++ })
        next[String(p.uuid)] = n
      })
    })
    fishCounts = next
  } catch (e) { console.warn('[peacock] fish cap: ' + e) }
})

EntityEvents.spawned(event => {
  var e = event.entity
  if (FISH_MAX >= 0 && isFish(e)) {
    var best = null, bestD = RANGE * RANGE
    event.level.players.forEach(p => {
      var dx = p.x - e.x, dz = p.z - e.z, d = dx * dx + dz * dz
      if (d <= bestD) { bestD = d; best = p }
    })
    if (!best) return
    var key = String(best.uuid), n = fishCounts[key] || 0
    if (n < FISH_MAX) { fishCounts[key] = n + 1; return }
    if (spared(e)) return
    event.cancel()
  }
  if (OTTER_MAX >= 0 && String(e.type) === 'crittersandcompanions:otter') {
    if (e.isBaby() || spared(e)) return
    var near = 0
    event.level.getEntities().forEach(o => {
      if (o !== e && String(o.type) === 'crittersandcompanions:otter' &&
          Math.abs(o.x - e.x) <= 16 && Math.abs(o.z - e.z) <= 16 && Math.abs(o.y - e.y) <= 8) near++
    })
    if (near < OTTER_MAX) return
    event.cancel()
  }
})
})()
