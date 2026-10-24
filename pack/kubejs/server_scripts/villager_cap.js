// Peacock — villager density cap per town.
//
// Villager Comfort makes happy villages breed; Village Expansion and Villager Workers add more. Villager
// AI was 44% of the server tick before Canary, so a town's population is capped: a newborn villager is
// removed if more than CAP villagers already live within RADIUS blocks. Only *fresh* babies are affected:
// every villager that joins the level is tagged, so villagers re-entering from an unloaded chunk (which
// also fire this event) are never touched. Breeding items are still consumed, so a full town stops
// growing on its own. Switch: "villagerCap" in kubejs/config/peacock.json.

// KubeJS loads every server script into one shared scope; a bare `{}` block does not isolate `const` in
// its Rhino ("redeclaration of var"), so the body lives in a function scope.
;(() => {
// Entity.distanceTo / distanceToSqr are not reachable from scripts on the server ("Cannot find function distanceTo",
// 2026-10-24: a Mutant Skeleton died and gave no Blueprint); x/y/z do work, so distance is worked out from them
function dist2(a, b) { var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z; return dx * dx + dy * dy + dz * dz }
const SWV = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const VILLAGER_CAP_ON = SWV.villagerCap !== false
const CAP = typeof SWV.villagerCapCount === 'number' ? SWV.villagerCapCount : 24
const RADIUS = 48

EntityEvents.spawned('minecraft:villager', event => {
  const v = event.entity
  if (!VILLAGER_CAP_ON) return
  if (v.persistentData.getBoolean('peacock_seen')) return
  v.persistentData.putBoolean('peacock_seen', true)
  if (!v.isBaby()) return
  const level = event.level
  const near = level.getEntitiesWithin(v.boundingBox.inflate(RADIUS, 24, RADIUS)).filter(e => String(e.type) === 'minecraft:villager' && String(e.uuid) !== String(v.uuid))
  if (near.length < CAP) return
  level.players.forEach(p => {
    if (dist2(p, v) < RADIUS * RADIUS * 4) p.tell(Text.gray('This town is full (' + CAP + ' villagers). Found another one, or grow this one outward.'))
  })
  // KubeJS: cancel() throws to end the handler at once, so it must come last (2026-10-23)
  event.cancel()
})
})()
