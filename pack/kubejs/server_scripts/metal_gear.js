// Peacock — recipes for the metal tool and armour sets, and silver against the undead (2026-10-24).
//
// Items and stats: startup_scripts/metal_gear.js (global.PEACOCK_GEAR_METALS). The recipes are vanilla's shapes with
// the metal's ingot and sticks; no Blueprint gates them (basic metal roles, as iron's are). The prospector's pick
// keeps Geolosys' own offset shape (handle on the right, flint_hammer.js) so it never matches a pickaxe.
//
// Silver: Spartan Weaponry's silver weapons already do extra damage to the undead (its undead_damage_bonus trait).
// The pack's silver sword, axe and tools match it: a melee hit on an undead mob with one in the main hand does 50%
// more (LivingHurtEvent, relayed by startup_scripts/forge_hooks.js as global.PEACOCK_ON_HURT).
//
// Rhino notes (see tools/validate.py): `var` inside functions, no `const`/`let` in try blocks, no Math constants.
;(() => {
const METALS = global.PEACOCK_GEAR_METALS || {}
const SHAPES = {
  pickaxe: ['III', ' S ', ' S '], axe: ['II', 'IS', ' S'], shovel: ['I', 'S', 'S'], hoe: ['II', ' S', ' S'], sword: ['I', 'I', 'S'],
  helmet: ['III', 'I I'], chestplate: ['I I', 'III', 'III'], leggings: ['III', 'I I', 'I I'], boots: ['I I', 'I I'],
}
const SILVER = 1.5

ServerEvents.recipes(event => {
  Object.keys(METALS).forEach(m => {
    Object.keys(SHAPES).forEach(piece => {
      var keys = { I: METALS[m].ingot }
      if (SHAPES[piece].join('').indexOf('S') >= 0) keys.S = '#forge:rods/wooden'
      event.shaped('peacock:' + m + '_' + piece, SHAPES[piece], keys).id('peacock:gear/' + m + '_' + piece)
    })
  })
})

global.PEACOCK_ON_HURT = event => {
  var target = event.getEntity()
  if (!target || !target.isUndead()) return
  var src = event.getSource()
  var attacker = src.actual
  if (!attacker || !attacker.isLiving()) return
  var direct = src.immediate
  if (direct && direct !== attacker) return                 // arrows and the like: only the blade counts
  var held = String(attacker.mainHandItem.id)
  if (held.indexOf('peacock:silver_') !== 0) return
  event.setAmount(event.getAmount() * SILVER)
}
})()
