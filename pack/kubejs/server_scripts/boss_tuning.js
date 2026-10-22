// Peacock — boss stats the mods do not set themselves (2026-10-22).
//
// Aaron asked for a boss rebalance ("Make the changes"). Incendium builds the Radiation Director from a plain wither
// skeleton (20 HP, structure NBT), yet it holds a Tier 3 Blueprint (Precision mechanisms, shared with the 400 HP
// Leviathan). The first time a Director is hit it becomes a real Tier 3 fight: 250 max health, armour 10, full
// knockback resistance, healed to full before that first hit lands. Once per entity (persistentData).
// Matched by the name Incendium gives it (as blueprints.js matches it) or by Incendium's own `in.director` tag.
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const TUNED = 'peacock_boss_tuned'
const BOSSES = [
  { type: 'minecraft:wither_skeleton', name: 'Radiation Director', tag: 'in.director',
    attributes: { 'minecraft:generic.max_health': 250, 'minecraft:generic.armor': 10, 'minecraft:generic.knockback_resistance': 1 } },
]

function matches(e, b) {
  if (String(e.type) !== b.type) return false
  var name = ''
  try { name = String(e.name.getString()) } catch (err) { name = '' }
  if (name === b.name) return true
  try { return !!e.tags.contains(b.tag) } catch (err) { return false }
}

EntityEvents.hurt(event => {
  var e = event.entity
  if (!e || e.persistentData.getBoolean(TUNED)) return
  var b = null
  for (var i = 0; i < BOSSES.length; i++) if (matches(e, BOSSES[i])) { b = BOSSES[i]; break }
  if (!b) return
  e.persistentData.putBoolean(TUNED, true)
  try {
    var server = e.level.server
    var uuid = String(e.uuid)
    Object.keys(b.attributes).forEach(a => server.runCommandSilent('attribute ' + uuid + ' ' + a + ' base set ' + b.attributes[a]))
    var hp = b.attributes['minecraft:generic.max_health']
    try { e.setHealth(hp) } catch (err) { e.health = hp }
    console.info('[peacock] boss tuning: ' + b.name + ' at ' + Math.round(e.x) + ',' + Math.round(e.y) + ',' + Math.round(e.z) + ' raised to ' + hp + ' HP')
  } catch (err) { console.warn('[peacock] boss tuning: ' + b.name + ' — ' + err) }
})
})()
