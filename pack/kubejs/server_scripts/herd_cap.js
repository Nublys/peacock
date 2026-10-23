// Peacock — herd cap: a pasture has room for so many of one animal (2026-10-23).
//
// Part of the animal replacement (Animania out, vanilla animals with More Mob Variants' breeds, Naturalist, Critters
// and Companions, Animal Feeding Trough in). The feeding trough breeds animals on its own, and a thousand cows in one
// pen is a thousand entities ticking for everyone on the server. Instead of a house rule ("don't build huge farms"),
// two animals cannot make a baby when HERD or more of their kind already live within RADIUS blocks; the parents go
// back to waiting as after any breeding (vanilla's 5-minute cooldown), the food is spent, and anyone nearby is told
// once a minute. Spread the herd out, or start another pasture. Babies already born and animals brought in are never
// touched. Hooked through startup_scripts/forge_hooks.js (Forge's BabyEntitySpawnEvent).
// Switch: "herdCap" (true) and "herdCapCount" (40) in kubejs/config/peacock.json.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const CFG = (() => { try { return JsonIO.read('kubejs/config/peacock.json') || {} } catch (e) { return {} } })()
const ON = CFG.herdCap !== false
const HERD = typeof CFG.herdCapCount === 'number' ? CFG.herdCapCount : 40
const RADIUS = 32
const TELL_EVERY = 1200                     // ticks between notices to one player
const LAST = 'peacock_herd_notice'

function gameTime(level) { return Number(level.getLevelData().getGameTime()) }

global.PEACOCK_ON_BREED = !ON ? null : event => {
  var a = event.getParentA()
  if (!a || a.level.isClientSide()) return
  var type = String(a.type), level = a.level
  if (type === 'minecraft:villager') return            // villagers have their own cap (villager_cap.js)
  var n = level.getEntitiesWithin(a.boundingBox.inflate(RADIUS, 16, RADIUS)).filter(e => String(e.type) === type).length
  if (n < HERD) return
  event.setCanceled(true)
  var key = 'entity.' + type.replace(':', '.'), now = gameTime(level)   // the animal's name, in the reader's language
  level.players.forEach(p => {
    if (p.distanceToSqr(a) > 24 * 24) return
    var last = Number(p.persistentData.getLong(LAST))
    if (last && now - last < TELL_EVERY) return
    p.persistentData.putLong(LAST, now)
    p.tell(Text.gray('This pasture is full: ' + n + ' × ').append(Text.translate(key)).append(Text.gray(' within ' + RADIUS +
      ' blocks, and ' + HERD + ' is the most one pasture holds. Move some on, or start another pasture.')))
  })
}
})()
